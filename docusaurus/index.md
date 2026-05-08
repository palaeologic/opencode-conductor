---
title: Docs Index
sidebar_position: 1
slug: /docs
---

# OpenCode Conductor — Docs Index

This is the canonical entry point for the publishable documentation site. It collates and links the major sections.

## Sections

- [Introduction](./intro.md) — what the kit is and why
- [Architecture](./architecture/01-mental-model.md) — 10 pages, system internals
- [Commands](./commands/index.md) — full slash-command catalog
- [Skills](./skills/index.md) — on-demand skill catalog
- [Knowledge system](./knowledge/index.md) — `AGENTS.md` hierarchy and structured-knowledge tables
- [Workflows](./workflows/scenarios.md) — canonical scenarios with diagrams
- [Help-docs authoring](./help-docs-authoring/index.md) — five-phase end-user docs generation
- [Descriptors](./descriptors/descriptor-json.md) — `descriptor.json` schema reference
- [Contributing](./contributing/testing-the-kit.md) — testing and extending the kit
- [FAQ](./faq/index.md) — session-distilled questions and answers

## Reading paths

- **Operator quickstart** — `intro.md` → `commands/index.md` → `workflows/scenarios.md`.
- **Architect deep-dive** — `architecture/01-mental-model.md` → … → `architecture/10-failure-modes.md`.
- **Contributor onboarding** — `contributing/testing-the-kit.md` → `contributing/extending.md` → `architecture/06-extension-points.md`.
- **Troubleshooting** — `faq/index.md` → contract pages in `documentation/`.

## Cross-links to the contract

The `documentation/` folder at the repo root holds normative, contract-style docs. This site links into them whenever invariants matter:

- `documentation/PATH_CONTRACT.md` — path and schema invariants
- `documentation/WORKFLOW.md` — operator scenarios
- `documentation/COMMAND_WORKFLOW.md` — command-picker matrix
- `documentation/TEST_PLAN.md` — full test script
- `documentation/UPGRADING.md` — upgrade procedure
- `documentation/ROADMAP.md` — release plan
- `documentation/FAQ.md` — terse FAQ mirror
- `documentation/TESTING_THE_KIT.md` — terse smoke test
- `documentation/EXTENDING.md` — terse extension contract
