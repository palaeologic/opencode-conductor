# OpenCode Handoff Kit - Manual Test Plan

This document is a manual smoke-test script for validating a descriptor-driven handoff setup.

Use it after installing the kit on a machine or after changing rules/tools/templates.

## 1) Preflight checks

Before testing behavior, confirm the setup is wired correctly.

- `~/.config/opencode/opencode.json` includes:
  - handoff rule in `instructions`
  - tool permissions for bootstrap/refresh tools
  - external directory permission for `~/.config/opencode/projects/**`
- A project descriptor exists:
  - `~/.config/opencode/projects/<projectKey>/descriptor.json`
- Branch templates exist:
  - `~/.config/opencode/projects/<projectKey>/_templates/mr/MERGE_REQUEST.md`
  - `~/.config/opencode/projects/<projectKey>/_templates/mr/LOG.md`
  - optional `PHASES.md` template
  - optional `MR.md` template when using `mrFilenames`
- Tools are available under:
  - `~/.config/opencode/tools/`

Pass criteria:
- All required files exist and permissions are configured.

## 2) TUI smoke test

### Step A - first refresh on new branch

1. Open a repo for `<projectKey>`.
2. Checkout a test branch (new or without context files).
3. Run refresh command (generic or project-specific).

Expected result:
- Refresh reports missing branch context (or equivalent signal).

### Step B - bootstrap

1. Run bootstrap command.
2. If prompted for phases, answer `yes` or `no`.

Expected result:
- Branch files are created under:
  - `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/`

Minimum expected files:
- `MERGE_REQUEST.md`
- `LOG.md`
- `PHASES.md` only when enabled

### Step C - refresh again

1. Run refresh again on the same branch.

Expected result:
- `applicable`-style success signal.
- branch and head/checkpoint info present.
- `reread_files` list present (non-empty when there are relevant changes).
- JSON includes `changed_areas`, `handoff_mode`, and nudge fields (`log_append_recommended`, `needs_checkpoint`, …) when applicable.

### Step D - branch isolation

1. Switch to a different branch.
2. Run refresh.
3. Bootstrap if needed.

Expected result:
- New branch uses its own branch-local folder.
- No cross-branch mixing of `MERGE_REQUEST.md`/`LOG.md`.

## 3) GUI/Desktop smoke test

Repeat the same flow in GUI chat:

1. Ask agent to refresh.
2. If missing context is reported, ask agent to bootstrap.
3. Verify generated files under the branch folder.
4. Start a fresh chat/agent and ask it to refresh.

Expected result:
- Fresh agent restores context from branch files without a full re-discovery pass.

## 4) Optional phase workflow test

1. On an existing branch, run phases command/tool.
2. Create or refine `PHASES.md` (AI draft, user-led, or hybrid).
3. Run refresh again.

Expected result:
- `PHASES.md` is included in handoff/re-read behavior.

## 5) History rewrite and merge closure test

### Step A - rebase or squash behavior

1. Rebase test branch onto baseline (or squash commits locally).
2. Run refresh.
3. Append a `LOG.md` note indicating history rewrite and new anchor checkpoint.

Expected result:
- Refresh still succeeds from current branch state.
- Team can continue without relying on old pre-rewrite SHAs.

### Step B - merged branch closure choice

1. Merge test branch to baseline.
2. Ask user which closure mode to apply:
   - `archive`
   - `promote-and-delete`
3. Apply chosen mode:
   - `archive`: keep branch folder untouched.
   - `promote-and-delete`: update shared durable guidance, then remove merged branch folder.

Expected result:
- Closure action matches explicit user choice.
- No merged branch folder is deleted without explicit user confirmation.

## 6) Common failure signals and fixes

- **Missing tool permission**
  - Symptom: tool call denied.
  - Fix: add tool to `permission` in `opencode.json`.

- **Missing external directory permission**
  - Symptom: cannot write under `~/.config/opencode/projects/...`.
  - Fix: allow `~/.config/opencode/projects/**` under `permission.external_directory`.

- **Descriptor not found**
  - Symptom: refresh/bootstrap returns descriptor missing error.
  - Fix: create `projects/<projectKey>/descriptor.json`.

- **Detached HEAD**
  - Symptom: branch resolution fails.
  - Fix: checkout a real branch and rerun.

- **Templates missing**
  - Symptom: bootstrap cannot seed branch files correctly.
  - Fix: restore `_templates/mr/*` files.

## 7) Reproducibility check (second machine)

1. Install kit on another machine.
2. Copy files into `~/.config/opencode`.
3. Create descriptor for the same project conventions.
4. Run sections 1-3 of this test plan.

Pass criteria:
- Equivalent behavior and file layout.
- Branch-local context appears under `branches/<branch-name>/`.

## 8) Lite mode smoke test

1. Set `handoffModeDefault` to `lite` on a throwaway descriptor copy (or pass `handoffMode: lite` to `opencode_refresh_context`).
2. Use a branch **without** `branches/<name>/` files.
3. Run refresh (tool or `/manual-refresh`).

Expected result:
- `applicable: true`, `handoff_mode: lite`, `checkpoint_source: lite_window`.
- No `missing_branch_context` failure for lite.
- `reread_files` includes project `AGENTS.md` and area agents that exist.

## 9) Optional `MR.md` and `mrFilenames`

1. Add `"mrFilenames": ["MERGE_REQUEST.md", "MR.md"]` to `branchHandoff` and install `MR.md` template into `_templates/mr/`.
2. Bootstrap a new branch.

Expected result:
- Both files created when templates exist.
- Refresh lists both paths in `mr_context_paths` when present.

## 10) Lifecycle commands (tracked)

1. After changes, run `/project-checkpoint <projectKey>` and confirm a new `LOG.md` section.
2. Run `/project-close <projectKey>` with real work done; confirm session summary appended.
3. Run `/project-cleanup-candidates <projectKey>`; confirm read-only report (no deletes).

## 11) Pass/Fail checklist

- [ ] Preflight checks pass
- [ ] TUI refresh-before-bootstrap behavior correct
- [ ] Bootstrap creates branch files in expected location
- [ ] Refresh-after-bootstrap returns expected metadata
- [ ] Branch isolation works
- [ ] GUI flow works
- [ ] Fresh agent context recovery works
- [ ] (Optional) phases workflow works
- [ ] Rebase/squash continuation works
- [ ] Merged-branch closure follows explicit user choice
- [ ] Lite refresh works without branch folder
- [ ] Optional `MR.md` path when configured
- [ ] Checkpoint / close / cleanup commands behave as documented
