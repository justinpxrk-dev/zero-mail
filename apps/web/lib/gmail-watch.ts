import { setTimeout as sleep } from "node:timers/promises";

import { auth } from "../auth";
import { db } from "../db";
import { gmailWatch } from "../db/schema";

type EnsureGmailWatchParams = {
  /** Account id (`account.id`) — stored as the `gmail_watch` FK. */
  accountId: string;
  /** Google's account id (`account.account_id`) — used to fetch the token. */
  googleAccountId: string;
  /**
   * User id (`account.user_id`) — we call `getAccessToken` without request
   * headers, so it can't resolve the user.
   */
  userId: string;
};

/**
 * Attempts before giving the watch up to the next-request reconcile / renewal
 * cron.
 */
const MAX_ATTEMPTS = 3;

/** Transient HTTP statuses worth retrying: server errors. */
function isRetryableStatus(status: number): boolean {
  return status >= 500;
}

/**
 * Registers (or refreshes) a Gmail `users.watch` subscription so mailbox
 * changes are pushed to our Pub/Sub topic.
 *
 * Retries transient failures (network errors, 5xx) with backoff; a
 * non-transient 4xx (bad token, missing scope, bad topic) gives up at once.
 * Never throws to the caller — failures are caught and logged. Sign-in must
 * succeed even when the watch can't be set up; the daily renewal cron is the
 * backstop.
 */
export async function ensureGmailWatch({ accountId, googleAccountId, userId }: EnsureGmailWatchParams): Promise<void> {
  const topicName = process.env["GMAIL_PUBSUB_TOPIC"];
  if (!topicName) {
    // Unconfigured (e.g. dev) is an intentional skip, not a failure — and not
    // retryable.
    console.warn("[gmail-watch] GMAIL_PUBSUB_TOPIC is unset; skipping gmail.users.watch");
    return;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: "google", accountId: googleAccountId, userId },
      });

      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topicName, labelIds: ["INBOX"], labelFilterBehavior: "INCLUDE" }),
      });
      if (!res.ok) {
        const error = new Error(`gmail.users.watch ${res.status.toString()}: ${await res.text()}`);
        if (!isRetryableStatus(res.status)) {
          // A 4xx won't fix itself on retry — give up immediately.
          console.error("[gmail-watch] gmail.users.watch failed (non-retryable):", error);
          return;
        }
        throw error;
      }

      const { historyId, expiration } = (await res.json()) as { historyId: string; expiration: string };
      const watch = { historyId, expiration: new Date(Number(expiration)), topicName };

      await db
        .insert(gmailWatch)
        .values({ accountId, ...watch })
        .onConflictDoUpdate({ target: gmailWatch.accountId, set: watch });
      return;
    } catch (error) {
      const lastAttempt = attempt === MAX_ATTEMPTS;
      if (lastAttempt) {
        console.error(`[gmail-watch] gmail.users.watch failed after ${MAX_ATTEMPTS.toString()} attempts:`, error);
      } else {
        console.warn(
          `[gmail-watch] gmail.users.watch attempt ${attempt.toString()}/${MAX_ATTEMPTS.toString()} failed, retrying:`,
          error,
        );
        await sleep(attempt * 500);
      }
    }
  }
}
