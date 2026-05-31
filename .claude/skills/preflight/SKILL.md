---
name: preflight
description: Run format, lint, typecheck, build, test, and scan docs for staleness — the full pre-commit check. Use when the user wants to "preflight", "verify", or confirm the working tree is ready to commit. Automatically invoked by /commit.
---

# Preflight — pre-commit verification

Run formatting / linting / typecheck / build / test, then scan documentation for staleness so a commit goes out clean.

## Steps

Run in order. Stop on the first failure and surface the error verbatim.

1. **Format** — `pnpm format` (Prettier auto-writes).
2. **Lint** — `pnpm lint`. If it fails with auto-fixable issues, suggest `pnpm lint:fix` and ask before running it.
3. **Typecheck** — `pnpm typecheck`. Only runs `tsc` against `@zero/core`; `apps/web` is type-checked by `next build` in the next step (running `tsc` against web pre-build fails on missing gitignored `next-env.d.ts` / `.next/types/*`).
4. **Build** — `pnpm build`.
5. **Tests** — `pnpm test`.
6. **Documentation scan.** Compare `git status --short` and `git diff` against docs that could now be out of date:
   - `CLAUDE.md` — project structure, conventions
   - `docs/architecture/*.md` — overview, scenarios, tech-stack
   - `docs/ops/*.md`, `tasks/TODO.md`, `tasks/architecture/open-questions.md`
   - `README.md` — developer setup
   - `.claude/skills/**/SKILL.md` — if a workflow described there has changed

   For each candidate doc, propose specific edits (show the new wording or a diff) and **ask the user to approve before applying**. Apply only what's approved.

7. **Report**: which checks passed, any files the formatter / linter rewrote (so the user knows their working tree changed), which docs were updated.

## Rules

- Don't push past a failed step. Stop, surface, let the user decide.
- Don't silently bypass — never `--no-verify`, never skip steps to "save time."
- The doc scan is a proposal step: never edit docs without explicit approval.
- Safe to run standalone (e.g. before pushing or opening a PR), not just from `/commit`.
