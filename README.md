# zero

LLM-powered Gmail triage. Sign in with Google and automatically organize your inbox: read summaries, create reminders, create events. Powered by Gemini.

See [Overview](./docs/architecture/overview.md) for the system overview and [Tech Stack](./docs/architecture/tech-stack.md) for the tech stack.

## Dashboard

[![CI](https://github.com/justinpxrk-dev/zero/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/justinpxrk-dev/zero/actions/workflows/ci.yml)

## Developer setup

This repo uses [mise](https://mise.jdx.dev/) to manage developer tools.

```sh
mise trust
mise install
```

Install `node` dependencies.

```sh
pnpm install
```

Copy the env example and fill it in:

```sh
cp apps/web/.env.example apps/web/.env
```

| Key                                         | What it's for                                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Postgres connection for the app and Drizzle migrations — point it at the local container: `postgres://zero:zero@localhost:5432/zero`.                                                                                       |
| `BETTER_AUTH_SECRET`                        | Signs Better Auth sessions and cookies; sign-in fails without it. Generate one with `openssl rand -base64 32`.                                                                                                              |
| `BETTER_AUTH_URL`                           | The app's base URL — `http://localhost:3000` for local dev.                                                                                                                                                                 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client behind "Sign in with Google" and Gmail access (GCP Console → APIs & Services → Credentials).                                                                                                            |
| `GMAIL_PUBSUB_TOPIC`                        | Topic Gmail publishes mailbox changes to for `users.watch`. Optional locally — left unset, watch registration is skipped with a warning and the rest of the app still runs. Format: `projects/<project-id>/topics/<topic>`. |

`DATABASE_URL` and the Better Auth keys are needed for the app to boot; the Google OAuth client is needed before sign-in works.

### Local dev stack

[process-compose](https://f1bonacc1.github.io/process-compose/) brings up the whole stack in dependency order — Postgres (via Docker), database migrations, then the Next.js dev server:

```sh
process-compose up
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Quit with `q` (or `Ctrl-C`) to stop the dev server and the Postgres container.

| Process   | Command                | Starts after       |
| --------- | ---------------------- | ------------------ |
| `db`      | `docker compose up db` | —                  |
| `migrate` | `pnpm db:migrate`      | `db` is healthy    |
| `web`     | `pnpm dev`             | `migrate` succeeds |

Or start it detached, so the stack keeps running in the background after you close the terminal:

```sh
process-compose up -D
```

Attach the TUI to the running stack with `process-compose attach` (quit the TUI with `q` — the stack keeps running), list process states without the TUI via `process-compose list`, follow a process's logs with `process-compose process logs web -f`, and stop everything with `process-compose down`.

To run a single piece by hand: `docker compose up -d db`, `pnpm db:migrate`, `pnpm db:studio` (Drizzle Studio GUI), or `pnpm dev`.

### Checks

Run the full check suite — format, lint, typecheck, build, test (the same flow as CI):

```sh
pnpm check
```

Auto-fix the fixable parts (formatting and lint):

```sh
pnpm fix
```

### Receiving Gmail push notifications locally

Gmail Pub/Sub can't push to `localhost` — expose your dev server with a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`) and point your dev Pub/Sub subscription at the tunnel URL.

## Working with Claude

This repo is set up to work well with [Claude Code](https://docs.claude.com/en/docs/claude-code):

- [`CLAUDE.md`](./CLAUDE.md) — project context loaded into every Claude session.
- [`.claude/skills/`](./.claude/skills/) — workflow skills (`commit`, `land`, `preflight`, `sync`).
- `tasks/lessons.md` — **local, gitignored.** Claude logs corrections here as you give them so the same mistake isn't repeated across sessions. Each contributor maintains their own; create it as an empty markdown file on first use.

Workflow: new lessons start here and stay local while you test whether they actually change Claude's behavior. Once a lesson has proven itself, promote it to the appropriate committed location so the whole team benefits — `CLAUDE.md` for project-wide conventions, `.claude/skills/<skill>/SKILL.md` for workflow-specific rules.
