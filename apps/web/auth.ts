import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] ?? "",
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
      accessType: "offline",
      prompt: "consent",
    },
  },
  databaseHooks: {
    account: {
      // Register a Gmail watch when a Google account is first linked, so we
      // start receiving mailbox-change pushes immediately after sign-in.
      create: {
        after: async (account) => {
          if (account.providerId !== "google") return;
          // Dynamic import avoids a static auth <-> gmail-watch import cycle:
          // gmail-watch.ts imports `auth`, so auth.ts must not import it here.
          const { ensureGmailWatch } = await import("./lib/gmail-watch");
          await ensureGmailWatch({
            accountId: account.id,
            googleAccountId: account.accountId,
            userId: account.userId,
          });
        },
      },
    },
  },
  // nextCookies() must be last so it can forward cookies set by other plugins
  // when auth.api.* is called from server actions / components.
  plugins: [nextCookies()],
});
