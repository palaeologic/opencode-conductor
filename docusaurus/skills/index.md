---
title: Skills
sidebar_position: 1
---

# Skills

Skills are on-demand procedural guides in `skills/<name>/SKILL.md`. They keep specialized instructions out of the default context until a task needs them.

## Engineering and lifecycle

| Skill | Purpose |
| --- | --- |
| `git-safety` | Preconditions and confirmation boundaries for Git mutation |
| `branch-kickoff` | Structured startup for larger feature branches |
| `branch-explore` | Manual exploration guide from branch evidence |
| `session-lifecycle` | Refresh, checkpoint, and close decisions |
| `discover-knowledge` | Project, area, and leaf knowledge discovery |
| `onboard-area` | Build a mental model of an unfamiliar code area |
| `plan-phases` | Draft staged deliverables and exit criteria |
| `review-branch` | Evidence-driven review orchestration |
| `verify-changes` | Select and sequence type, test, and lint checks |
| `systematic-debugging` | Reproduction, isolation, hypothesis, and root cause |
| `refactor-safely` | Incremental refactoring with verification gates |
| `write-tests` | Test-boundary and assertion selection |
| `add-feature-module` | Discover and extend a project's feature/module pattern |
| `debug-gql-query` | Trace and diagnose graph query behavior |
| `playwright-e2e` | Browser end-to-end test planning and execution |
| `help-docs-author` | Source-backed end-user documentation workflow |

## Artifact creation

| Skill | Purpose |
| --- | --- |
| `canvas-design` | Create polished visual compositions |
| `convert-to-pdf` | Convert supported source formats to PDF |
| `docx` | Create and edit Word-compatible documents |
| `pdf` | Read, create, transform, and inspect PDFs |
| `pptx` | Create and edit presentation decks |
| `xlsx` | Create, analyze, and edit workbooks |
| `slack-gif-creator` | Create compact chat-friendly animated GIFs |

Artifact skills share the optional central runtime installed with `--with-runtime-deps`.

## Choosing the right mechanism

- A rule applies whenever enabled.
- A skill loads only when relevant.
- A command is explicitly invoked by the user.

Skills should remain focused, state their mutations, and avoid recursively loading other skills. `git-safety` is the documented foundational exception for workflows that may mutate Git state.
