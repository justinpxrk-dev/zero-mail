# Overview

`zero` triages a user's Gmail inbox using an LLM. Users sign in with Google, Gmail pushes mailbox-change notifications to the app, the app extracts a structured action (info / task / event) per message via Gemini, and surfaces them in a Next.js UI.

## Components

| Component                    | Role                                                         | Hosted on        |
| ---------------------------- | ------------------------------------------------------------ | ---------------- |
| **Browser (Next.js client)** | React UI: inbox list, triage view, settings                  | Served by Vercel |
| **Next.js server**           | API routes, auth callbacks, Pub/Sub push handler, daily cron | Vercel           |
| **Postgres**                 | Users, OAuth tokens, emails, extractions, action records     | Neon             |
| **GCP Pub/Sub**              | Topic Gmail publishes mailbox-change events to               | GCP (free tier)  |
| **Gmail API**                | Read mail, watch subscriptions, history sync                 | Google           |
| **Gemini API**               | LLM extraction (single thin client in `packages/core`)       | Google           |

## Data flow

```mermaid
flowchart LR
  User((User)) -->|Sign in| Web
  Web[Next.js on Vercel] -->|OAuth code exchange| Gmail[Gmail API]
  Web -->|users.watch<br/>subscribe to mailbox| Gmail
  Gmail -->|mailbox change| PubSub[GCP Pub/Sub]
  PubSub -->|HTTP push| Web
  Web -->|messages.get| Gmail
  Gmail -->|message body| Web
  Web -->|extract: message body| Gemini[Gemini API]
  Gemini -->|structured action JSON<br/>info / task / event| Web
  Web <-->|sessions, tokens,<br/>emails, extractions| DB[(Neon Postgres)]
  Cron[Vercel daily cron] -->|renew users.watch| Web
```

## See also

- [Scenarios](./scenarios.md) — sequence diagrams for sign-in, mail ingestion, and watch renewal
- [Tech stack](./tech-stack.md) — concrete tech choices and hosting
- [Decisions](./decisions/) — architecture decision records (ADRs), managed with log4brains
