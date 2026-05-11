---
description: Draft or refresh durable package/area knowledge from branch context
subtask: true
---

Loads skill: `discover-knowledge` (when available) for the Senior Architect lens and the promotion rubric.

## Project key resolution

If `$ARGUMENTS` is provided, use the first token as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

**Propose** updates to shared knowledge files (not branch diaries).

## Knowledge-drift preflight (silent default)

Run before any work in the Workflow section. Goal: detect when the current branch's **`KNOWLEDGE.md`** / legacy **`AGENTS.md`** files have drifted relative to the integration base, so the user can rebase or pull up specific files before proposing edits.

1. **Resolve the integration base** in this order: `git symbolic-ref refs/remotes/origin/HEAD` → `main` → `master`. Strip the `refs/remotes/origin/` prefix.
2. **Fetch** the base read-only: `git fetch origin <base>`. Skip if you already fetched this base earlier in the current conversation.
3. **Compute the package-knowledge drift set**:
   - `MERGE_POINT = git merge-base HEAD origin/<base>`
   - From `origin/<base>` and from `$MERGE_POINT`, list tracked files whose names end with **`KNOWLEDGE.md`** or **`AGENTS.md`** (union paths). A portable approach: `git ls-tree -r --name-only origin/<base>` (and the same for `$MERGE_POINT`) then filter with `grep -E '(KNOWLEDGE|AGENTS)\\.md$'` or equivalent.
   - For every file in either set, compare `git rev-parse origin/<base>:<path>` to `git rev-parse $MERGE_POINT:<path>`; differing or one-sided entries form the **drift set**.
4. **Skip the preflight entirely** when storage mode is project-local (per [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) § Knowledge across branches). The drift preflight only meaningfully applies to committed-in-repo storage.
5. **Emit a single `F-xx` finding** (severity `Medium`) of the form:

   ```
   Knowledge drift vs base: <count> file(s) changed in origin/<base> since merge-base.
   - <path/to/KNOWLEDGE.md or AGENTS.md>
   - ...
   Suggested action: rebase onto origin/<base>, or `git checkout origin/<base> -- <path>` for a single-file pull-up; then re-run /project-knowledge-refresh.
   ```

   The finding is **silent on no drift** — no banner, no prompt.
6. **Default behavior is silent**: do not interrupt the user with prompts. Surface the finding inline in the proposal output as a leading section. Pass `no-preflight` (in `$ARGUMENTS`, e.g. `/project-knowledge-refresh <projectKey> no-preflight`) to skip this step entirely.

The drift preflight does not write or modify files; it only reads and reports. If the drift set is non-empty, the proposal output **must surface it before** any individual knowledge edit suggestions so the user can decide whether to rebase first.

## Workflow

1. Run `opencode_refresh_context` with `projectKey: <resolved projectKey>`. Capture `changed_areas`, `changed_files_preview`, and `reread_files`.
2. Resolve **knowledge files to consider for promotion** by combining:
   - Each path from `reread_files` that points to **`KNOWLEDGE.md`** or legacy **`AGENTS.md`**.
   - Each entry of `trackedKnowledgeTargets.sharedPackageKnowledge` (overrides) whose package maps to a `changed_areas` entry.
   - **Convention-path** leaf **`KNOWLEDGE.md`** files derived from `pseudoPackageDetection` rules: for every detected leaf in a `changed_areas` area, the convention path is `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md` (see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md), Stem derivation contract). Include each existing convention-path file alongside any matching override. **Leaf proposal:** also propose a **new** leaf **`KNOWLEDGE.md`** when the subtree shows strong signals (provider layer, own GQL module, high churn) even if not a separate pseudo-package — see `discover-knowledge` skill.
3. Apply normalization to `pseudoPackageDetection`: legacy object form -> single-element array; reject rules missing `area`; skip rules without `{packageName}` for leaf discovery.
4. Summarize **durable findings** that belong in shared **`KNOWLEDGE.md`** / leaf knowledge (not one-off branch noise). Apply the **Knowledge promotion rubric** below.
5. For each changed area-level **`KNOWLEDGE.md`**, inspect script-manifest changes in that area (`package.json`, `pyproject.toml`, `requirements.txt`, `poetry.lock`, `Pipfile`, `Makefile`, `Justfile`). If script/target changes are detected, include a proposal to refresh the area's `## Verification scripts` table — **copy commands from MR / CI / README**; do not invent alternate labels.
6. Output a **proposal only**: file path, suggested new text or diff summary, rationale, risk.
7. Apply edits to shared knowledge files **only if** the user explicitly approves each file in the same session.
8. Before each approved write, run the pre-write secret scan policy from [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md) § Security rules (AKIA, JWT shape, PEM markers, token-like strings near secret labels). Refuse writes on match and surface a redacted locator.

## Knowledge promotion rubric

Promote to shared **`KNOWLEDGE.md`** when ALL are true:

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

- Project-wide **rules** -> project **`AGENTS.md`** (operating instructions only).
- Area-specific pattern -> area **`KNOWLEDGE.md`**.
- Leaf-specific contract / invariant -> leaf **`KNOWLEDGE.md`** (convention path or override).

## Constraints

- Default: branch `LOG.md` absorbs exploration; promotion is opt-in.
- Prefer the model configured under `descriptor.subtaskModels.knowledge` when registering this command in `opencode.json` (see README).
- Do not auto-create knowledge files here — that is `/scaffold-knowledge`'s job. This command **proposes** edits to **existing** files (or proposes creating one if a leaf is detected and no file exists at the convention path; the user explicitly approves before any write).
