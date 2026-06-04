# TODO

## v0 implementation

The five flows to build.

- [x] **Scaffold Project**
  - [x] Developer tooling (format/lint)
  - [x] Language/framework dependencies
  - [x] Claude context
  - [x] Claude skills
- [x] **Sign-up flow** — Better Auth Google OAuth → store refresh token in `account` → call `users.watch` first-time, store returned `historyId`.
- [ ] **New mail** — Pub/Sub push at `/api/gmail/push` ingests changed messages, extracts an action per message, and persists. Same path in dev, exposed via a tunnel (see README).
  - [x] **DB schema** — add `email` + `extraction` tables (+ migration).
  - [ ] **Gemini client** — extraction client + `info` / `task` / `event` / `notification` action types in `packages/core`.
  - [ ] **Gmail ingestion lib** — `users.history.list` since stored `historyId` → `users.messages.get` per new message → parse the message body.
  - [ ] **Push handler** — `/api/gmail/push`: validate Pub/Sub auth → orchestrate ingestion + extraction → write email + extraction → advance stored `historyId`.
- [ ] **User views inbox** — `/app` Server Component reads emails + extractions from Postgres for signed-in user → renders triaged list.
- [ ] **Watch renewal** — daily Vercel cron at `/api/cron/renew-watches` re-issues `users.watch` per active user, updates expiry in DB. Gmail watches expire after ~7 days.

## Testing

Stand up the test harness now that the first real flow (sign-up) has landed.

- [x] **Framework** — add Jest via next/jest (jsdom + Testing Library, root `test` script).
- [x] **CI** — run `pnpm test` in CI and the lefthook pre-commit hook.
- [x] **Unit tests: `ensureGmailWatch`** — cover the skip / success / retry / give-up branches.
