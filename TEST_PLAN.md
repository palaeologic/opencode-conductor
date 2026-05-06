# OpenCode Handoff Kit v2 — Test Plan

Manual smoke-test script for validating a descriptor-driven handoff setup.
Run after installing the kit or after changing rules/tools/templates.

---

## 1) Preflight checks

Verify the setup is wired correctly before testing behavior.

### Files to confirm

| Location | Required | Check |
|----------|----------|-------|
| `~/.config/opencode/opencode.json` | yes | `instructions` includes handoff rules; `external_directory` allows `~/.config/opencode/projects/**` |
| `~/.config/opencode/rules/HANDOFF_GENERIC.md` | yes | Base behavioral contract exists |
| `~/.config/opencode/rules/HANDOFF.md` | optional | Project overlay (if you have one) |
| `~/.config/opencode/commands/*.md` | yes | All expected command files present (including `project-*`, `manual-refresh`, verification commands, and `scaffold-knowledge`) |
| `~/.config/opencode/projects/<projectKey>/descriptor.json` | yes | Valid JSON, has `handoffModeDefault` |
| `~/.config/opencode/projects/<projectKey>/_templates/mr/` | yes | At minimum `MERGE_REQUEST.md` + `LOG.md` |
| `~/.config/opencode/tools/` (or `tools-off/`) | conditional | Tools present; may be disabled if provider is unstable |

### No stale files

| Should NOT exist | Why |
|------------------|-----|
| `~/.config/opencode/COMMAND_WORKFLOW.md` | Replaced by commands/ |
| `~/.config/opencode/OPENCODE_HANDOFF_*.md` | Replaced by rules + README |
| `~/.config/opencode/projects/<key>/skills/` | Replaced by commands/ |

**Pass**: all required files exist, no stale files remain, `opencode.json` permissions are correct.

---

## 2) `/project-init` — first-time setup (no descriptor)

> Test the guided initialization flow.

### Setup

1. Pick a repo that does NOT have a descriptor yet (or use a temporary project key like `testkit`).
2. Open that repo in OpenCode.

### Steps

1. Run `/project-refresh testkit`.
2. Observe: should report `descriptor_not_found` and suggest running `/project-init`.
3. Run `/project-init testkit`.
4. Observe: agent scans the repo (toplevel, dirs, packages, baseline branch).
5. Agent presents a draft `descriptor.json` — review it.
6. Approve (or request edits and re-approve).

### Expected result

- `~/.config/opencode/projects/testkit/` created with:
  - `descriptor.json` (matching your approval)
  - `_templates/mr/MERGE_REQUEST.md`
  - `_templates/mr/LOG.md`
  - `_templates/mr/PHASES.md`
  - `_templates/mr/MR.md`
  - `AGENTS.md` (empty or minimal)
- Agent suggests running `/scaffold-knowledge testkit` and `/project-refresh testkit` next.

**Pass**: full project structure created from scan without manual mkdir/cp.

---

## 3) `/scaffold-knowledge` — first-time knowledge population

> Validate one-time shared knowledge scaffolding after init.

### Steps

1. Run `/scaffold-knowledge testkit`.
2. Select one or more areas when prompted.
3. If prompted, add one pseudo-package (or skip).

### Expected result

- `~/.config/opencode/projects/testkit/AGENTS.md` has project routing/context hierarchy guidance.
- Selected areas have `~/.config/opencode/projects/testkit/<area>/AGENTS.md`.
- If provided, pseudo-package files exist at `~/.config/opencode/projects/testkit/<area>/packages/<pkg>/AGENTS.md`.
- Existing operational content (if any) is merged/preserved rather than replaced.

**Pass**: shared knowledge files are scaffolded once; rerun is only needed for new areas/packages or major stack changes.

---

## 4) Tracked mode — core workflow

### Step A — first refresh on new branch

1. Open a repo for `<projectKey>` (e.g. `myapp`).
2. Checkout a new test branch: `git checkout -b test/handoff-v2-smoke`.
3. Run `/project-refresh <projectKey>`.

**Expected**: reports `missing_branch_context` with `recommended_next_step: bootstrap`.

### Step B — bootstrap

1. Run `/project-bootstrap <projectKey>`.
2. When prompted for phases, answer `no`.

**Expected**: branch files created at `~/.config/opencode/projects/<projectKey>/branches/test-handoff-v2-smoke/`:
- `MERGE_REQUEST.md`
- `LOG.md`

### Step C — refresh after bootstrap

1. Run `/project-refresh <projectKey>` again.

**Expected** (verify each field):
- `applicable: true`
- `handoff_mode: "tracked"`
- `branch: "test/handoff-v2-smoke"`
- `checkpoint_commit` and `head_commit` present
- `checkpoint_source: "log_field"` or `"merge_base"`
- `changed_areas` array
- `reread_files` array (non-empty; includes active area `AGENTS.md`)
- `log_append_recommended`, `mr_update_recommended`, `needs_checkpoint` booleans
- `context_staleness`: `"fresh"`, `"aging"`, or `"stale"`
- `subtaskModels` echoed from descriptor

### Step D — branch isolation

1. `git checkout main` (or another branch).
2. Run `/project-refresh <projectKey>`.

**Expected**:
- Different branch context folder used.
- No cross-contamination with `test/handoff-v2-smoke` files.

**Pass**: full tracked lifecycle works end-to-end.

---

## 5) Lifecycle commands (tracked)

> Test checkpoint, close, and cleanup on the test branch.

### Step A — checkpoint

1. Switch back to `test/handoff-v2-smoke`.
2. Make a small code change (or just stage something).
3. Run `/project-checkpoint <projectKey>`.

**Expected**: `LOG.md` has a new checkpoint entry with timestamp, reviewed_through, and summary.

### Step B — close

1. Run `/project-close <projectKey>`.

**Expected**: `LOG.md` has a session-close entry with summary and "next steps" section.

### Step C — cleanup candidates

1. Run `/project-cleanup-candidates <projectKey>`.

**Expected**: read-only report listing branch folders with age. No deletions performed.

### Step D — knowledge refresh

1. Run `/project-knowledge-refresh <projectKey>`.

**Expected**: agent proposes updates to shared `AGENTS.md` files (or reports "nothing to promote"). Does NOT write without your approval.

**Pass**: all lifecycle commands work without errors; LOG.md is append-only.

---

## 6) Lite mode

### Setup

Option A: temporarily change `handoffModeDefault` to `"lite"` in descriptor.
Option B: pass `handoffMode: lite` when calling the refresh tool.

### Steps

1. Checkout a branch that has NO `branches/<name>/` folder.
2. Run `/project-refresh <projectKey>` (with lite mode active).

### Expected result

- `applicable: true`
- `handoff_mode: "lite"`
- `checkpoint_source: "lite_window"`
- No `missing_branch_context` error
- `reread_files` includes project `AGENTS.md` and the **active area's** `AGENTS.md` only
- No bootstrap required or suggested

**Pass**: lite refresh succeeds on a branch with zero handoff files.

---

## 7) Optional `MR.md` and `mrFilenames`

### Setup

1. Add `"mrFilenames": ["MERGE_REQUEST.md", "MR.md"]` to `branchHandoff` in descriptor.
2. Copy the `MR.md` template into `_templates/mr/`.

### Steps

1. Checkout a fresh branch.
2. Run `/project-bootstrap <projectKey>`.
3. Run `/project-refresh <projectKey>`.

### Expected result

- Bootstrap creates both `MERGE_REQUEST.md` and `MR.md` in the branch folder.
- Refresh includes both paths in `mr_context_paths`.

**Pass**: multiple MR files are seeded and read correctly.

---

## 8) Manual fallback (`/manual-refresh`)

> Test when tools are unavailable (your `tools-off/` scenario).

### Setup

Ensure tools are disabled (in `tools-off/` not `tools/`, or tool permissions removed from `opencode.json`).

### Steps

1. Open a repo in OpenCode.
2. Run `/manual-refresh <projectKey>`.

### Expected result

- Agent performs the refresh manually (no tool call):
  - Resolves branch and branch folder
  - Seeds templates if missing (tracked mode)
  - Reads context layers in order
  - Computes git delta
  - Returns structured summary: branch, checkpoint→head, changed_areas, reread_files, recommendations
- Result is functionally equivalent to tool-based refresh.

### Fallback sentence test

If `/manual-refresh` doesn't parse, paste this exact sentence:

```
Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.
```

**Expected**: agent follows the procedure and returns structured output.

**Pass**: manual mode produces actionable refresh output without any tool calls.

---

## 9) Phases workflow

1. On the test branch, run `/project-phases <projectKey>`.
2. Create or refine `PHASES.md` (AI draft, user-led, or hybrid).
3. Run `/project-refresh <projectKey>`.

**Expected**:
- `PHASES.md` created in branch folder.
- `phases_context_path` populated in refresh output.

**Pass**: phases file is created and included in refresh context.

---

## 10) History rewrite and merge closure

### Step A — rebase/squash

1. Rebase or squash the test branch.
2. Run `/project-refresh <projectKey>`.

**Expected**:
- Refresh succeeds (doesn't crash on stale SHAs).
- Agent may note that checkpoint is stale.

### Step B — merge closure

1. Merge test branch to baseline (or simulate).
2. Agent should ask: **archive** or **promote-and-delete**.

**Expected**:
- `archive`: branch folder kept untouched.
- `promote-and-delete`: durable knowledge proposed for shared files, folder deleted only after explicit confirmation.
- Never auto-deletes.

**Pass**: history rewrites don't break refresh; closure respects user choice.

---

## 11) `agents_stale_vs_branch` nudge

### Setup

Modify the project or area `AGENTS.md` with a timestamp significantly older than recent branch commits (or just verify the field is present in refresh output).

### Expected

- `agents_stale_vs_branch: true` when shared knowledge is outdated relative to branch activity.
- Agent should suggest reviewing `AGENTS.md` or running `/project-knowledge-refresh`.

**Pass**: staleness detection works and produces actionable nudge.

---

## 12) Review artifact generation

### Steps

1. On a branch with changes, run `/project-review <projectKey>`.
2. Agent should ask which type: checklist (A), diff summary (B), or both (C).
3. Choose one.

### Expected result

- `REVIEW.md` written to `branches/<branch-name>/REVIEW.md`.
- Structured output block with `artifact_type`, `path`, and `suggested_verifications`.
- Suggested verifications are listed but NOT executed.
- Content is branch-specific (references actual files/areas from the diff, not generic placeholders).

**Pass**: review file generated, suggestions listed, nothing executed.

---

## 13) Rule layering validation

### Steps

1. In an OpenCode session, ask the agent: "What handoff rules are you following?"
2. Or ask: "What should you do at session start?"

### Expected

- Agent references behavior from `HANDOFF_GENERIC.md` (MUST rules: resolve project, resolve branch, refresh at session start).
- If project overlay exists, agent also mentions project-specific details (tool names, packages).
- No contradiction between generic and overlay rules.

**Pass**: both rule layers are loaded and consistent.

---

## 14) Common failure signals and fixes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Tool call denied | Missing tool permission | Add to `permission` in `opencode.json` |
| Cannot write under `projects/` | Missing external_directory | Allow `~/.config/opencode/projects/**` |
| Descriptor missing error | No `descriptor.json` | Run `/project-init` |
| Branch resolution fails | Detached HEAD | Checkout a real branch |
| Bootstrap can't seed files | Templates missing | Restore `_templates/mr/*` |
| `toolSpec.description` validation error | Provider issue | Switch to manual mode |

---

## 15) Pass/Fail checklist

- [ ] Preflight: all files present, no stale artifacts
- [ ] `/project-init` creates full project structure from scan
- [ ] `/scaffold-knowledge` populates shared AGENTS.md files as expected
- [ ] Tracked: refresh reports missing context on new branch
- [ ] Tracked: bootstrap creates branch files
- [ ] Tracked: refresh-after-bootstrap returns full metadata
- [ ] Tracked: branch isolation (no cross-contamination)
- [ ] Lifecycle: checkpoint appends to LOG.md
- [ ] Lifecycle: close appends session summary
- [ ] Lifecycle: cleanup-candidates is read-only
- [ ] Lifecycle: knowledge-refresh is proposal-only
- [ ] Lite: refresh succeeds without branch folder
- [ ] Lite: no missing_branch_context error
- [ ] MR.md: both files seeded and read when configured
- [ ] Manual fallback produces equivalent refresh output
- [ ] Phases: created and included in refresh
- [ ] History rewrite: refresh survives stale SHAs
- [ ] Merge closure: respects user choice
- [ ] agents_stale_vs_branch: nudge present when applicable
- [ ] Review artifact: generated correctly, suggestions not executed
- [ ] Rule layering: both generic + overlay loaded correctly
