/** @jest-environment node */

import { setTimeout as sleep } from "node:timers/promises";

import { auth } from "../auth";
import { db } from "../db";
import { gmailWatch } from "../db/schema";
import { ensureGmailWatch } from "../lib/gmail-watch";

/** Mocks */
// Factories reference no outer variables (they build their own `jest.fn()`), so
// they're safe under jest's hoisting; loose `jest.Mock` handles are pulled back
// out below for setup/assertions.
jest.mock("../auth", () => ({ auth: { api: { getAccessToken: jest.fn() } } }));
jest.mock("../db", () => ({ db: { insert: jest.fn() } }));
jest.mock("../db/schema", () => ({ gmailWatch: { accountId: "gmail_watch.account_id" } }));
jest.mock("node:timers/promises", () => ({ setTimeout: jest.fn() }));

const getAccessToken = auth.api.getAccessToken as unknown as jest.Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method -- a mock handle; `this` binding is irrelevant
const insert = db.insert as unknown as jest.Mock;
const sleepMock = sleep as unknown as jest.Mock;
const values = jest.fn();
const onConflictDoUpdate = jest.fn();
const fetch = jest.fn();
globalThis.fetch = fetch;

/** Fixtures */
// Inputs
const ENSURE_GMAIL_WATCH_MOCK_PARAM = {
  accountId: "account-1",
  googleAccountId: "google-account-1",
  userId: "user-1",
};
const ENV_MOCK_GMAIL_PUBSUB_TOPIC_KEY = "GMAIL_PUBSUB_TOPIC";
const ENV_MOCK_GMAIL_PUBSUB_TOPIC_VALUE = "projects/project/topics/topic";
// Responses
const GET_ACCESS_TOKEN_MOCK_RESPONSE = { accessToken: "access-token" };
const GET_ACCESS_TOKEN_MOCK_ERROR = new Error("token unavailable");
const FETCH_MOCK_RESPONSE_OK_BODY = { historyId: "42", expiration: "1700000000000" };
// Gmail returns `expiration` as int64-as-string; WATCH_EXPIRATION is the parsed
// Date we expect persisted.
const FETCH_MOCK_RESPONSE_OK_BODY_WATCH_EXPIRATION_DATE = new Date(Number(FETCH_MOCK_RESPONSE_OK_BODY.expiration));
// 503 is retried; 403 (like other 4xx) fails fast.
const FETCH_MOCK_ERROR_RETRYABLE = { status: 503, body: "Service Unavailable" };
const FETCH_MOCK_ERROR_NON_RETRYABLE = { status: 403, body: "Forbidden" };
// Expected call args
const GET_ACCESS_TOKEN_MOCK_PARAM = {
  body: {
    providerId: "google",
    accountId: ENSURE_GMAIL_WATCH_MOCK_PARAM.googleAccountId,
    userId: ENSURE_GMAIL_WATCH_MOCK_PARAM.userId,
  },
};
const FETCH_MOCK_PARAM_WATCH_URL = "https://gmail.googleapis.com/gmail/v1/users/me/watch";
const FETCH_MOCK_PARAM_WATCH_OPTIONS = {
  method: "POST",
  headers: {
    Authorization: `Bearer ${GET_ACCESS_TOKEN_MOCK_RESPONSE.accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    topicName: ENV_MOCK_GMAIL_PUBSUB_TOPIC_VALUE,
    labelIds: ["INBOX"],
    labelFilterBehavior: "INCLUDE",
  }),
};
const DB_MOCK_GMAIL_WATCH_RECORD = {
  historyId: FETCH_MOCK_RESPONSE_OK_BODY.historyId,
  expiration: FETCH_MOCK_RESPONSE_OK_BODY_WATCH_EXPIRATION_DATE,
  topicName: ENV_MOCK_GMAIL_PUBSUB_TOPIC_VALUE,
};
// Backoff sleeps between the 3 attempts (jest mock.calls shape)
const SLEEP_MOCK_PARAMS = [[500], [1000]];

const FETCH_MOCK_RESPONSE_OK = () => ({
  ok: true,
  json: () => Promise.resolve(FETCH_MOCK_RESPONSE_OK_BODY),
});
// A fetch Response stub for a non-OK status (only `ok`/`status`/`text` are
// read).
const buildErrorResponse =
  ({ status, body }: { status: number; body: string }) =>
  () => ({
    ok: false,
    status,
    text: () => Promise.resolve(body),
  });
const FETCH_MOCK_RESPONSE_RETRYABLE = buildErrorResponse(FETCH_MOCK_ERROR_RETRYABLE);
const FETCH_MOCK_RESPONSE_NON_RETRYABLE = buildErrorResponse(FETCH_MOCK_ERROR_NON_RETRYABLE);

/** Tests */
// Per-test setup; mock state is reset via the jest config, env via afterEach
beforeEach(() => {
  process.env[ENV_MOCK_GMAIL_PUBSUB_TOPIC_KEY] = ENV_MOCK_GMAIL_PUBSUB_TOPIC_VALUE;

  insert.mockReturnValue({ values });
  values.mockReturnValue({ onConflictDoUpdate });
  onConflictDoUpdate.mockResolvedValue(undefined);
  getAccessToken.mockResolvedValue(GET_ACCESS_TOKEN_MOCK_RESPONSE);
  sleepMock.mockResolvedValue(undefined);

  // Silence the watch's logging; we assert behavior, not console output.
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  Reflect.deleteProperty(process.env, ENV_MOCK_GMAIL_PUBSUB_TOPIC_KEY);
});

describe("ensureGmailWatch", () => {
  it(`skips (touching nothing) when ${ENV_MOCK_GMAIL_PUBSUB_TOPIC_KEY} is unset`, async () => {
    Reflect.deleteProperty(process.env, ENV_MOCK_GMAIL_PUBSUB_TOPIC_KEY);

    await ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM);

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("registers the watch and upserts the row on success", async () => {
    fetch.mockResolvedValue(FETCH_MOCK_RESPONSE_OK());

    await ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM);

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledWith(GET_ACCESS_TOKEN_MOCK_PARAM);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(FETCH_MOCK_PARAM_WATCH_URL, FETCH_MOCK_PARAM_WATCH_OPTIONS);
    expect(values).toHaveBeenCalledWith({
      accountId: ENSURE_GMAIL_WATCH_MOCK_PARAM.accountId,
      ...DB_MOCK_GMAIL_WATCH_RECORD,
    });
    expect(onConflictDoUpdate).toHaveBeenCalledWith({ target: gmailWatch.accountId, set: DB_MOCK_GMAIL_WATCH_RECORD });
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it("retries a retryable (5xx) response with backoff, then succeeds", async () => {
    fetch
      .mockResolvedValueOnce(FETCH_MOCK_RESPONSE_RETRYABLE())
      .mockResolvedValueOnce(FETCH_MOCK_RESPONSE_RETRYABLE())
      .mockResolvedValueOnce(FETCH_MOCK_RESPONSE_OK());

    await ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleepMock.mock.calls).toEqual(SLEEP_MOCK_PARAMS);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("gives up after 3 retryable failures without throwing", async () => {
    fetch.mockResolvedValue(FETCH_MOCK_RESPONSE_RETRYABLE());

    await expect(ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(sleepMock.mock.calls).toEqual(SLEEP_MOCK_PARAMS);
    expect(insert).not.toHaveBeenCalled();
  });

  it("gives up immediately on a non-retryable (4xx) response, without retrying", async () => {
    fetch.mockResolvedValue(FETCH_MOCK_RESPONSE_NON_RETRYABLE());

    await expect(ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM)).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("retries, then gives up, when the access-token fetch fails", async () => {
    getAccessToken.mockRejectedValue(GET_ACCESS_TOKEN_MOCK_ERROR);

    await expect(ensureGmailWatch(ENSURE_GMAIL_WATCH_MOCK_PARAM)).resolves.toBeUndefined();

    // The token is re-fetched each attempt.
    expect(getAccessToken).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
    expect(sleepMock.mock.calls).toEqual(SLEEP_MOCK_PARAMS);
    expect(insert).not.toHaveBeenCalled();
  });
});
