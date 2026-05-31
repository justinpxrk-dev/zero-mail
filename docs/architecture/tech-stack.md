# Tech stack

| Area                     | Choice                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Language**             | TypeScript (run via `tsx` in dev)                                                                                |
| **Env loading**          | Node `--env-file`                                                                                                |
| **Repo**                 | pnpm monorepo — `apps/web`, `packages/core`                                                                      |
| **Testing**              | Vitest                                                                                                           |
| **Web framework**        | Next.js (App Router)                                                                                             |
| **Styling**              | Tailwind CSS                                                                                                     |
| **UI components**        | shadcn/ui (Radix primitives, components copied into repo)                                                        |
| **Icons**                | Lucide (+ Simple Icons for brand logos when needed)                                                              |
| **Auth**                 | Better Auth (Drizzle adapter, Google provider)                                                                   |
| **OAuth scopes**         | `openid email profile gmail.readonly` (progressive consent for Calendar / Tasks)                                 |
| **Mail access**          | Gmail API                                                                                                        |
| **Mail sync trigger**    | Gmail Pub/Sub push (dev via tunnel, prod direct)                                                                 |
| **LLM**                  | Gemini 2.5 Flash (free tier), behind a thin client interface in `packages/core` (swappable to self-hosted later) |
| **Database**             | Neon (hosted Postgres)                                                                                           |
| **ORM**                  | Drizzle                                                                                                          |
| **Web hosting**          | Vercel (Hobby)                                                                                                   |
| **Database hosting**     | Neon (Free)                                                                                                      |
| **Push notifications**   | GCP Pub/Sub (Free tier)                                                                                          |
| **Cron (watch renewal)** | Vercel Hobby native cron (daily)                                                                                 |
