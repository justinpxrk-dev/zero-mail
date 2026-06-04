# Scenarios

Dynamic views — what happens, in what order, for each key flow.

## Sign-in

One-time per user. Establishes OAuth tokens and subscribes to mailbox changes.

```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js on Vercel
  participant Gmail as Gmail API
  participant DB as Neon Postgres

  User->>Web: Click "Sign in with Google"
  Web-->>User: Redirect to Google consent
  User->>Gmail: Approve scopes
  Gmail-->>Web: Redirect with auth code
  Web->>Gmail: Exchange code for tokens
  Gmail-->>Web: access_token + refresh_token
  Web->>DB: Upsert user, account, tokens
  Web->>Gmail: users.watch (subscribe to mailbox)
  Gmail-->>Web: Watch expiry (~7 days)
  Web->>DB: Store watch metadata
```

## Mail ingestion

Per new email. Triggered by a Pub/Sub push from Gmail. Token refresh happens inline before any authenticated Gmail call.

```mermaid
sequenceDiagram
  participant Gmail as Gmail API
  participant PubSub as GCP Pub/Sub
  participant Web as Next.js on Vercel
  participant DB as Neon Postgres
  participant Gemini as Gemini API

  Gmail->>PubSub: Publish mailbox change (historyId)
  PubSub->>Web: HTTP push
  Web->>DB: Read user refresh token
  DB-->>Web: refresh_token
  Web->>Gmail: Refresh access token
  Gmail-->>Web: New access_token
  Web->>Gmail: history.list (since last historyId)
  Gmail-->>Web: Changed message IDs
  Web->>Gmail: messages.get (new messages)
  Gmail-->>Web: Message bodies
  Web->>Gemini: Extract action from message
  Gemini-->>Web: Structured action JSON (info / task / event / notification)
  Web->>DB: Store email + extraction
  Web-->>PubSub: 200 OK (ack)
```

## Daily watch renewal

Gmail's `users.watch` expires after ~7 days. A daily cron re-subscribes for every active user to prevent push interruption.

```mermaid
sequenceDiagram
  participant Cron as Vercel daily cron
  participant Web as Next.js on Vercel
  participant DB as Neon Postgres
  participant Gmail as Gmail API

  Cron->>Web: GET /api/cron/renew-watches
  Web->>DB: List users with active watches
  DB-->>Web: Users + refresh tokens
  loop For each user
    Web->>Gmail: Refresh access token
    Gmail-->>Web: New access_token
    Web->>Gmail: users.watch
    Gmail-->>Web: New watch expiry
    Web->>DB: Update watch metadata
  end
  Web-->>Cron: 200 OK
```
