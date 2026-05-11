---
name: discover-knowledge
description: Senior Architect lens for scaffolding and refreshing durable package knowledge in KNOWLEDGE.md (legacy AGENTS.md); taxonomy, boundaries, invariants; promotion rubric so durable patterns land in shared knowledge while branch noise stays in LOG.md
---

## What I do

Drive any flow that creates or updates **`KNOWLEDGE.md`** package knowledge — `/scaffold-knowledge`, `/project-knowledge-refresh`, and the knowledge preflight inside `/project-review`. **Rules** for the OpenCode project remain in **`opencodeProjectRootPath`/AGENTS.md** — do not conflate the two. I keep the durable-vs-branch distinction crisp and bias toward sparse, future-proof prose written for both agents and humans.

## When to use me

- About to write or edit a project / area / leaf **`KNOWLEDGE.md`** (or legacy leaf/area **`AGENTS.md`** until migrated).
- The user asks "what should we record about this package?" or "is this knowledge durable?"
- Running `/scaffold-knowledge` discovery / dry-run / list mode.
- Running `/project-knowledge-refresh` or the `/project-review` preflight.

## Pre-write checklist

Before producing knowledge content, answer:

- **Area / leaf identity:** which area? which leaf (package, module, src folder)? what does its name communicate?
- **Boundary owner:** who owns this leaf's public surface? what crosses the boundary in vs out?
- **Public surface:** entry points, exported types, key APIs.
- **Invariants:** facts that MUST stay true across changes (naming, ordering, transactional guarantees, schema rules).
- **Known pitfalls:** repeated mistakes future agents would make without guidance.
- **Verification order:** what does the area / leaf say about lint, typecheck, test, build sequence? **Reconcile command strings with MR / CI / README** — do not invent alternate app labels (e.g. Django app path).
- **Stable across branches?** if the answer would change next week, it doesn't belong here.

If you can't answer the first three, read code first — do not invent.

## Knowledge promotion rubric

Promote to shared **`KNOWLEDGE.md`** when ALL are true:

- Stable across branches; likely true after the next release.
- Encodes architecture, convention, invariant, or pitfall — not progress.
- Reusable by future agents and humans onboarding the area.
- Wording is generic and future-proof (not branch- or ticket-tied).

Keep in branch `LOG.md` instead when:

- Ticket-specific implementation detail.
- Temporary workaround, debug note, or "what I tried."
- Interim decision likely to change soon.

Never promote:

- Secrets, tokens, or environment-specific paths.
- Vendor-specific guidance into upstream-neutral files.
- Unverified assumptions or "maybe" conclusions.

Placement:

- Project-wide **rules** -> project **`AGENTS.md`** (operating instructions).
- Project-wide **durable facts** (optional, separate from rules) -> project **`KNOWLEDGE.md`** when the team maintains one.
- Area-specific routing, stack, conventions, verification tables -> area **`AGENTS.md`** (default **`areaAgentsPath`**); use **`areaKnowledgePath`** or a sibling area **`KNOWLEDGE.md`** only when intentionally splitting area facts from the area rules/anchor file.
- Leaf-specific contract / invariant -> leaf **`KNOWLEDGE.md`** (convention path or override), **even when** the leaf is **not** listed as its own `pseudoPackageDetection` package — propose a leaf file when **several** signals align: dedicated provider/context layer, distinct routing tab or module boundary, **high churn** under that path in the branch diff, or repeated review findings scoped to that folder. Do **not** default to “skip leaf because parent area file exists” when the subtree behaves like its own product surface.

## Section discipline

- **Sparse beats verbose.** Each section earns its keep. Empty placeholders are fine and common.
- **Human-readable headings** double as agent cues: Stack, Purpose, Use When, Avoid When, Key Entry Points, Conventions, Verification, Known Pitfalls.
- **Code citations** over narration: `<area>/<pkg>/forms.py` rather than "the forms file in the GraphQL folder."
- **Imperative voice for rules:** "Prefer relative imports within a package" — not "we tend to."

## Evidence sourcing

1. Read code first — entry points, public exports, type definitions, tests for the leaf.
2. Confirm churn with **`git diff --stat` / scope of changes** against baseline; use `git log --oneline -- <leaf-path>` only as a supplement (weak when squash-heavy).
3. Cross-check the existing **`KNOWLEDGE.md` / `AGENTS.md`** hierarchy to avoid duplicating rules already at a higher level.
4. If a fact would be in the README of the area or repo, link to that source instead of restating.

## Source-path existence guard

Before recommending a write to a **leaf** **`KNOWLEDGE.md`**, verify the leaf's source directory exists in the current working tree. If the source is missing — typical when the current branch lacks a package that exists on other branches — classify the leaf as `skipped` with reason `source_missing` and do **not** propose a write. This prevents "ghost knowledge" — durable files describing packages absent from the current branch — which is especially important in **project-local** storage mode where knowledge files are shared across branches.

The guard is **on by default** in `/scaffold-knowledge`. Bypass only when intentionally staging knowledge ahead of the source landing (e.g. parallel teams, planned scaffold), via the command's `no-source-guard` argument.

Area- and project-level files are unaffected — they describe the project itself, not a per-branch source tree.

## Authoring tone

Write for two audiences at once:

- The **agent** scans headings deterministically; surface invariants as imperatives.
- The **human** reads top-to-bottom on day-1 onboarding; favor concrete examples and short paragraphs.

A good leaf **`KNOWLEDGE.md`** answers "if I joined the team today and was assigned a ticket here, what do I need to know in 5 minutes?"

## Handoff

This skill produces inputs to:

- `/scaffold-knowledge` — sparse leaf templates filled with Stack / Purpose / Use When / Avoid When.
- `/project-knowledge-refresh` — promotion proposals (path, suggested edit, rationale, risk).
- `/project-review` preflight — auto-scaffold scope, stale flag suggestions.

Always propose; never overwrite existing operational rules without the user's explicit approval.
