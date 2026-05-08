---
title: Knowledge System
sidebar_position: 1
---

# Knowledge System

Knowledge in this kit is dual-audience (agents and humans) and layered. This page is the user-manual-level guide. The contract specification lives at `documentation/PATH_CONTRACT.md`.

## Three layers

```mermaid
flowchart TB
  Project[Project AGENTS.md]
  Area1[Area AGENTS.md - frontend]
  Area2[Area AGENTS.md - api]
  Leaf1[Leaf AGENTS.md - frontend cards]
  Leaf2[Leaf AGENTS.md - frontend reports]
  Leaf3[Leaf AGENTS.md - api handlers]

  Project --> Area1
  Project --> Area2
  Area1 --> Leaf1
  Area1 --> Leaf2
  Area2 --> Leaf3
```

- **Project AGENTS.md** — top-level invariants: tech stack, ownership, vendor neutrality, glossary.
- **Area AGENTS.md** — area-level architecture, conventions, structured-knowledge tables (Verification scripts, Run locally).
- **Leaf AGENTS.md** — package or feature-level details (responsibilities, dependencies, public surface, gotchas).

## Source-tree-mirror convention

The default convention is that the *path* to a leaf `AGENTS.md` mirrors the source tree:

```
opencodeProjectRootPath/<area>/<knowledge-stem>/<packageName>/AGENTS.md
```

The `<knowledge-stem>` is computed from `pseudoPackageDetection.pathPattern`: it is the prefix up to and *including* the first `{packageName}` token, with the placeholder removed.

### Worked example 1 — frontend with `src` layout

Source: `frontend/src/cards/CardList.tsx`

Rule: `area: frontend, kind: pathAndAlias, pathPattern: "frontend/src/{packageName}/**/*"`

Stem: `frontend/src/`

Knowledge: `<opencodeProjectRootPath>/frontend/cards/AGENTS.md`

### Worked example 2 — api with explicit prefix

Source: `api/sp_specimens/gql/handlers.py`

Rule: `area: api, kind: pathPrefix, pathPattern: "api/{packageName}/**/*", namePrefixes: ["sp_", "dc_"]`

Stem: `api/`

Knowledge: `<opencodeProjectRootPath>/api/sp_specimens/AGENTS.md`

### Worked example 3 — flat repo

Source: `cli/main.py`

Rule: `area: cli, kind: pathPrefix, pathPattern: "cli/{packageName}/**/*"` with `aliases: ["@cli/{packageName}"]`

Stem: `cli/`

Knowledge: `<opencodeProjectRootPath>/cli/main/AGENTS.md`

## Dual-audience contract

Every leaf `AGENTS.md` should answer:

- **For humans**: What does this package do? Who owns it? What conventions apply?
- **For agents**: What's the public surface? What invariants must I preserve? What verification commands apply?

A typical leaf has these sections:

```markdown
# <packageName>

## Purpose
## Public surface
## Internal layout
## Conventions
## Verification scripts (optional, area-level usually)
## Risks and gotchas
## See also
```

## Structured knowledge tables

Two tables drive deterministic behavior:

### `## Verification scripts`

```markdown
## Verification scripts

| Trigger | Command | When |
| --- | --- | --- |
| `frontend/**/*.ts` | `bun run typecheck` | quick local feedback |
| `frontend/**/*.test.ts` (added or modified) | `bun run test` | run focused tests |
| `frontend/eslint-plugin-*/**/*` | `bun run setup-lint` | rebuild lint plugin |
| `**/*.story.tsx` (added) | `bun scripts/collect-stories.ts` | regen story index |
```

The trigger is a glob (matched against `git diff --name-only`). The optional `(added or modified)` qualifier filters by change kind. `/project-review` matches the diff against these triggers and emits the matching commands as suggested verifications.

### `## Run locally`

(Forthcoming.) Same shape; describes commands a developer runs to exercise the area locally.

## Drift preflight

Whenever a knowledge-aware command runs, it diffs `AGENTS.md` files against the integration base branch.

```mermaid
flowchart LR
  Run[Knowledge-aware command] --> Drift[Drift preflight]
  Drift --> Diff[git diff base..HEAD AGENTS.md]
  Diff --> Stale{Stale on this branch?}
  Stale -- yes --> Find[Emit F-xx finding]
  Stale -- no --> Ok[Continue]
  Find --> Suggest[Suggest single-file pull-up]
```

Findings show up in `REVIEW.md` and as warnings during `/project-knowledge-refresh`.

## Audit trail

Every knowledge mutation:

- Appends `### Knowledge update` to `LOG.md`.
- Refreshes the machine block in `MERGE_REQUEST.md`.
- Notes whether a pre-write secret scan ran.
- Notes whether the source-path guard fired and was honored or bypassed.

## See also

- `documentation/PATH_CONTRACT.md` — full contract.
- [descriptors/descriptor-json.md](../descriptors/descriptor-json.md) — schema reference.
- [commands/knowledge-maintenance.md](../commands/knowledge-maintenance.md) — operator commands.
