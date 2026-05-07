---
description: Draft or refresh durable package/area knowledge from branch context
subtask: true
---

Loads skill: `discover-knowledge` (when available) for the Senior Architect lens and the promotion rubric.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Propose** updates to shared knowledge files (not branch diaries).

## Workflow

1. Run `opencode_refresh_context` with `projectKey: $ARGUMENTS`. Capture `changed_areas`, `changed_files_preview`, and `reread_files`.
2. Resolve **knowledge files to consider for promotion** by combining:
   - Each path from `reread_files`.
   - Each entry of `trackedKnowledgeTargets.sharedPackageKnowledge` (overrides) whose package maps to a `changed_areas` entry.
   - **Convention-path** leaf `AGENTS.md` files derived from `pseudoPackageDetection` rules: for every detected leaf in a `changed_areas` area, the convention path is `<opencodeProjectRootPath>/<rel>/AGENTS.md` (see [`docs/PATH_CONTRACT.md`](../docs/PATH_CONTRACT.md), Stem derivation contract). Include each existing convention-path file alongside any matching override.
3. Apply normalization to `pseudoPackageDetection`: legacy object form -> single-element array; reject rules missing `area`; skip rules without `{packageName}` for leaf discovery.
4. Summarize **durable findings** that belong in shared `AGENTS.md` / leaf knowledge (not one-off branch noise). Apply the **Knowledge promotion rubric** below.
5. Output a **proposal only**: file path, suggested new text or diff summary, rationale, risk.
6. Apply edits to shared knowledge files **only if** the user explicitly approves each file in the same session.

## Knowledge promotion rubric

Promote to shared `AGENTS.md` when ALL are true:

- The pattern is **stable across branches** and likely true after the next release.
- It encodes **architecture, conventions, invariants, or known pitfalls** (not progress).
- It is **reusable** by future agents and humans onboarding the area or leaf.
- The wording is **generic and future-proof** (not branch-tied).

Keep in branch `LOG.md` instead when:

- Findings are ticket-specific implementation details.
- They are temporary workarounds, debug notes, or "what I tried."
- They are interim decisions likely to change.

Never promote:

- Secrets, tokens, or environment-specific paths.
- Vendor- or customer-specific guidance into upstream-neutral files (forks may carry such guidance in their own files).
- Unverified or "maybe" conclusions.

Placement:

- Project-wide rule -> project `AGENTS.md`.
- Area-specific pattern -> area `AGENTS.md`.
- Leaf-specific contract / invariant -> leaf `AGENTS.md` (convention path or override).

## Constraints

- Default: branch `LOG.md` absorbs exploration; promotion is opt-in.
- Prefer the model configured under `descriptor.subtaskModels.knowledge` when registering this command in `opencode.json` (see README).
- Do not auto-create knowledge files here — that is `/scaffold-knowledge`'s job. This command **proposes** edits to **existing** files (or proposes creating one if a leaf is detected and no file exists at the convention path; the user explicitly approves before any write).
