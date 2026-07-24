---
name: discover-knowledge
description: Senior Architect lens for scaffolding and refreshing durable leaf KNOWLEDGE.md files and proposing rule updates; identifies taxonomy, boundaries, invariants, and ownership signals; applies a promotion rubric so durable patterns land in shared knowledge while branch noise stays in LOG.md
---

## What I do

Drive flows that create or update durable leaf `KNOWLEDGE.md` files, and proposal-first flows that may recommend human edits to project / area `AGENTS.md`, for `/scaffold-knowledge`, `/project-knowledge-refresh`, and the knowledge preflight inside `/project-review`. I keep the durable-vs-branch distinction crisp and bias toward sparse, future-proof prose written for both agents and humans.

`/scaffold-knowledge` is leaf-only: it must never create, merge, or update `AGENTS.md`, and it must refuse root/top-layer `KNOWLEDGE.md` targets. Project and area rules live in the project repo and remain human-owned; the installer can offer a sparse generic seed but lifecycle commands do not generate them.

## When to use me

- About to write or edit a leaf `KNOWLEDGE.md`, or to propose a project / area `AGENTS.md` edit for explicit human approval.
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
- **Verification order:** what does the area / leaf say about lint, typecheck, test, build sequence?
- **Stable across branches?** if the answer would change next week, it doesn't belong here.

If you can't answer the first three, read code first — do not invent.

## Knowledge promotion rubric

Promote to durable shared guidance when ALL are true:

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
- Organization-, product-, or customer-specific guidance into neutral shared files.
- Unverified assumptions or "maybe" conclusions.

Placement:

- Project-wide rule -> project `AGENTS.md`.
- Area-specific architecture or pattern -> area `KNOWLEDGE.md`.
- Leaf-specific contract / invariant -> leaf `KNOWLEDGE.md` (convention path or override; legacy leaf `AGENTS.md` only as fallback).

For `/scaffold-knowledge`, only the leaf `KNOWLEDGE.md` placement is actionable. Project- and area-level placements are proposal targets for `/project-knowledge-refresh` or manual edits to `project-rules/`, not scaffold writes.

## Section discipline

- **Sparse beats verbose.** Each section earns its keep. Empty placeholders are fine and common.
- **Human-readable headings** double as agent cues: Purpose, Use When, Avoid When, Public Surface / Entry Points, Internal Layout, Core Patterns, Invariants, Boundaries, Verification, Known Pitfalls.
- **Code citations** over narration: `base_graphql/forms.py` rather than "the forms file in the GraphQL folder."
- **Imperative voice for rules:** "Prefer relative imports within a package" — not "we tend to."

## Evidence sourcing

1. Read code first — entry points, public exports, type definitions, tests for the leaf.
2. Confirm churn signals with `git log --oneline -- <leaf-path>` (last ~20 commits) so you don't promote something that just changed.
3. Cross-check the existing `AGENTS.md` hierarchy to avoid duplicating rules already at a higher level.
4. If a fact would be in the README of the area or repo, link to that source instead of restating.

## Authoring tone

Write for two audiences at once:

- The **agent** scans headings deterministically; surface invariants as imperatives.
- The **human** reads top-to-bottom on day-1 onboarding; favor concrete examples and short paragraphs.

A good leaf `KNOWLEDGE.md` answers "if I joined the team today and was assigned a ticket here, what do I need to know in 5 minutes?"

## Source-path existence guard

Before recommending a write to a **leaf** `KNOWLEDGE.md`, verify the leaf's source directory exists in the current working tree. If the source is missing — typical when the current branch lacks a package that exists on other branches — classify the leaf as `skipped` with reason `source_missing` and do **not** propose a write. This prevents "ghost knowledge" describing packages absent from the current branch, especially when global or ignored repo-local knowledge is shared across branches.

The guard is **on by default** in `/scaffold-knowledge`. Bypass only when intentionally staging knowledge ahead of the source landing (e.g. parallel teams, planned scaffold), via the command's `no-source-guard` argument.

Area- and project-level `AGENTS.md` files are unaffected — they describe project operating rules, remain project-owned, and are not generated by knowledge discovery.

## Handoff

This skill produces inputs to:

- `/scaffold-knowledge` — sparse leaf templates from `templates/knowledge/LEAF_KNOWLEDGE.md`, filled with package identity and source path.
- `/project-knowledge-refresh` — promotion proposals (path, suggested edit, rationale, risk).
- `/project-review` preflight — report-only missing/stale/drift knowledge suggestions.

Always propose; never overwrite existing operational rules without the user's explicit approval.
