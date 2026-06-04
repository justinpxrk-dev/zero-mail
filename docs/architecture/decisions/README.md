# Architecture Decision Records

Significant architecture decisions are recorded here as [ADRs](https://adr.github.io/) and managed with [Log4brains](https://github.com/thomvaill/log4brains). Each decision is a Markdown file in this folder with a date-based slug; browse them directly on GitHub or run the local knowledge-base UI.

## Working with ADRs

Create a new ADR (prompts for a title, assigns the date-based slug):

```bash
pnpm adr:new
```

Preview the searchable knowledge base locally, with hot reload on edits:

```bash
pnpm adr:preview
```

Build the static site (output in `.log4brains`, which is gitignored):

```bash
pnpm adr:build
```

An ADR is immutable once accepted — to revisit a past decision, add a new ADR and mark the old one superseded. See [`template.md`](./template.md) for the format.

## More information

- [Log4brains documentation](https://github.com/thomvaill/log4brains)
- [What is an ADR and why should you use them](https://github.com/thomvaill/log4brains/tree/develop#-what-is-an-adr-and-why-should-you-use-them)
- [Architectural Decision Records](https://adr.github.io/)
