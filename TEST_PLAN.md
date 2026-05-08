# OpenCode Conductor — Test Plan

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
3. If prompted, accept the auto-detected leaves (or skip).

### Expected result

- `~/.config/opencode/projects/testkit/AGENTS.md` has project routing/context hierarchy guidance.
- Selected areas have `~/.config/opencode/projects/testkit/<area>/AGENTS.md`.
- For descriptors with `descriptorSchemaVersion: 2`: detected leaves get a sparse `AGENTS.md` at the **convention path** `<opencodeRoot>/<rel>/AGENTS.md` (where `<rel>` mirrors the leaf's path under `projectRootPath`). For legacy descriptors the legacy override path is honored.
- Existing operational content (if any) is merged/preserved rather than replaced.

**Pass**: shared knowledge files are scaffolded once; rerun is only needed for new areas/packages or major stack changes.

### 3a) `/scaffold-knowledge <projectKey> list`

1. Run `/scaffold-knowledge testkit list`.

**Expected**: a markdown table grouped by area showing tracked leaves and their resolved path / status. **No writes.**

### 3b) `/scaffold-knowledge <projectKey> dry-run`

1. Add a new directory under an `area` that matches a `pseudoPackageDetection` rule.
2. Run `/scaffold-knowledge testkit dry-run`.

**Expected**: the new leaf is listed as untracked with the convention-path target. **No writes.**

### 3c) Discovery re-run idempotency

1. Run `/scaffold-knowledge testkit` again with no new directories.

**Expected**: command reports "no new leaves to track" and exits without writes.

### 3d) Safety guardrails

1. Add a directory whose name violates the package-name regex (e.g. starts with `-` or contains `..`).
2. Add a symlink at the would-be convention path.
3. Run `/scaffold-knowledge testkit dry-run`.

**Expected**: the bad name surfaces as `invalid_package_name`; the symlink target surfaces as `symlink_refused`. Other valid leaves are unaffected.

---

## 4) Tracked mode — core workflow

### Step A — first refresh on new branch

1. Open a repo for `<projectKey>` (e.g. `myapp`).
2. Checkout a new test branch: `git checkout -b test/conductor-smoke`.
3. Run `/project-refresh <projectKey>`.

**Expected**: reports `missing_branch_context` with `recommended_next_step: bootstrap`.

### Step B — bootstrap

1. Run `/project-bootstrap <projectKey>`.
2. When prompted for phases, answer `no`.

**Expected**: branch files created at `~/.config/opencode/projects/<projectKey>/branches/test-conductor-smoke/`:
- `MERGE_REQUEST.md`
- `LOG.md`

### Step C — refresh after bootstrap

1. Run `/project-refresh <projectKey>` again.

**Expected** (verify each field):
- `applicable: true`
- `handoff_mode: "tracked"`
- `branch: "test/conductor-smoke"`
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
- No cross-contamination with `test/conductor-smoke` files.

**Pass**: full tracked lifecycle works end-to-end.

---

## 5) Lifecycle commands (tracked)

> Test checkpoint, close, and cleanup on the test branch.

### Step A — checkpoint

1. Switch back to `test/conductor-smoke`.
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
- A `## Preflight summary` subsection appears at the top of `REVIEW.md` with `created` / `existing` / `stale` / `skipped` lists (when preflight ran; absent only when `no-preflight` was passed).

**Pass**: review file generated, suggestions listed, nothing executed.

### 12a) Knowledge preflight — auto-scaffold

#### Setup

On a branch, modify a file under an existing area that matches a `pseudoPackageDetection` rule but where the leaf has **no** `AGENTS.md` yet.

#### Steps

1. Run `/project-review <projectKey>`.

#### Expected result

- The missing leaf gets a sparse `AGENTS.md` at its convention path.
- One audit line is appended to the branch `LOG.md` of the form `preflight: scaffolded <area>/<leaf> at <path> (commit: <sha>)`.
- `## Preflight summary` lists the leaf under `created`.
- The new file is included in the agent's read context for the rest of the review.

**Pass**: scaffold + audit + summary all present; existing files untouched.

### 12b) Knowledge preflight — stale flag

#### Setup

On a branch, ensure a leaf has **multiple** changed files since merge-base with `baselineBranchForMaterialChanges` and its `AGENTS.md` has **no** commits in that range.

#### Steps

1. Run `/project-review <projectKey>`.

#### Expected result

- `## Preflight summary` lists the leaf under `stale`.
- An `F-xx` "Knowledge stale for `<area>/<leaf>`" finding appears with severity `Medium` and suggested action `/project-knowledge-refresh <projectKey>`.

**Pass**: stale leaf surfaced as a triageable finding without auto-modifying knowledge.

### 12c) Knowledge preflight — opt-out

#### Steps

1. Run `/project-review <projectKey> no-preflight`.

#### Expected result

- No `## Preflight summary` block.
- No auto-scaffold writes.
- No stale findings produced by preflight.

**Pass**: opt-out is honored.

---

### 12d) Verification-scripts synthesis in `/project-review`

#### Setup

Ensure at least one changed area-level `AGENTS.md` contains:

```markdown
## Verification scripts
| Trigger | Command | When |
| --- | --- | --- |
| `src/**` | `bun run typecheck` | baseline |
| `**/*.story.tsx` (added or modified) | `bun scripts/collect-stories.ts` | story updates |
```

#### Steps

1. Change files matching both triggers.
2. Run `/project-review <projectKey>`.

#### Expected result

- `suggested_verifications` includes both matched commands in first-seen order.
- Commands are deduped when multiple rows map to the same command.
- No command is executed automatically.

#### Missing-block behavior

1. Run `/project-review <projectKey>` on a changed area without `## Verification scripts`.

**Expected**: one `F-xx` note appears: missing verification scripts block for that area; generic fallback suggestions (`/check-types`, `/run-tests`, `/lint-fix`) are still provided.

**Pass**: review suggestions are deterministic from tables, and missing blocks are surfaced as notes.

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

## 13a) Knowledge-drift preflight

Validate the silent drift gate added to `/project-knowledge-refresh` and `/project-review`.

### Setup

- Storage mode: **committed-in-repo** (the gate is skipped in project-local mode by design).
- Have at least one area-level `AGENTS.md` committed to the integration base (`origin/<base>`).

### 13a.i) Branch synced with base

1. From a freshly-rebased branch, run `/project-knowledge-refresh <projectKey>`.

**Expected**: silent on drift; no `F-xx` "Knowledge drift vs base" finding; the rest of the proposal flow runs normally.

### 13a.ii) Branch behind base on AGENTS.md

1. On the integration base, edit and push a change to an `AGENTS.md`. Do **not** rebase the test branch.
2. Run `/project-review <projectKey>` on the test branch.

**Expected**: `## Preflight summary` includes `drift_vs_base: [<path>]`. An `F-xx` "Knowledge drift vs base: 1 file(s)" appears with severity Medium and Suggested action `Rebase onto origin/<base>...`.

### 13a.iii) Drift fetch cache TTL

1. Within 5 minutes of step 13a.ii, run `/project-review <projectKey>` again.

**Expected**: the drift detection runs but the read-only `git fetch` is skipped (cached). At minute 6, the next invocation re-fetches.

### 13a.iv) `no-preflight` opt-out

1. Run `/project-review <projectKey> no-preflight` on the same branch.

**Expected**: no `## Preflight summary`, no drift finding, no auto-scaffold.

**Pass**: drift surfacing is silent on green, surfaces correctly on stale, honors the cache TTL, and the opt-out flag is respected.

---

## 13b) Source-path existence guard in `/scaffold-knowledge`

### Setup

Use a descriptor with `descriptorSchemaVersion: 2` and at least one `pseudoPackageDetection` rule. Storage mode: **project-local** (the guard matters most when knowledge is shared across branches).

### Steps

1. From a branch where `<area>/<pkg>/` directory does **not** exist on disk (e.g. you switched to an older branch), run `/scaffold-knowledge <projectKey> dry-run`.

**Expected**: the leaf does **not** appear under "would create"; instead it appears (or is logged) as `skipped` with `source_missing` reason. No `AGENTS.md` is written.

### Opt-out

1. Run `/scaffold-knowledge <projectKey> dry-run no-source-guard`.

**Expected**: the leaf re-appears under "would create".

**Pass**: ghost knowledge is prevented by default; the opt-out works.

---

## 13c) Mermaid prompts (review / phases / update-mr)

### 13c.i) `/project-review` structural diff

1. On a branch with multi-area diff (≥3 areas) or schema/route changes, run `/project-review <projectKey>`.

**Expected**: the mermaid prompt appears with default ON; choose Yes; `REVIEW.md` includes a `## Architecture` section with one diagram; an HTML comment `<!-- mermaid: included on user opt-in -->` precedes the section.

### 13c.ii) `/project-review` typo-only diff

1. On a branch with a single typo fix in one file, run `/project-review <projectKey>`.

**Expected**: the mermaid prompt appears with default OFF; selecting default skips the diagram and records `<!-- mermaid: skipped -->`.

### 13c.iii) `no-mermaid` opt-out

1. Run `/project-review <projectKey> no-mermaid`.

**Expected**: no mermaid prompt; no `## Architecture` section; no comment.

### 13c.iv) `/project-phases` default ON for >3 phases

1. Run `/project-phases <projectKey>` and draft 4+ phases.

**Expected**: mermaid prompt with default ON; `PHASES.md` includes a `## Phase dependencies` section with one diagram and the comment marker.

### 13c.v) `/project-update-mr` opt-in for migration MRs

1. On a branch touching `migrations/` or `*.graphql`, run `/project-update-mr <projectKey>`.

**Expected**: the mermaid prompt appears (opt-in); the diagram lands in narrative `## Architecture`, never inside `## OpenCode:` blocks.

**Pass**: all mermaid behavior matches the kit-wide policy in `docs/PATH_CONTRACT.md` § Mermaid policy.

---

## 13d) `git-safety` skill smoke test

> The skill ships in F1; commands wire in C1. Validate the load + permission contract directly via prompt-mode skill loading.

### Steps

1. Confirm `~/.config/opencode/opencode.json` has the recommended permission policy from [`opencode.json.example`](opencode.json.example).
2. In an OpenCode session say: "Load the `git-safety` skill and run the safety preflight banner."

### Expected

- First invocation prompts with `permission.skill: ask` for `git-safety`.
- Subsequent invocations in the same session are allowed without prompting.
- The banner contains: working tree (clean / dirty), HEAD state (attached / detached, current branch), resolved base, count of kit-managed stashes on this branch.
- If the working tree is dirty, the banner ends with `STATUS: refused` and an actionable remediation hint; no git operation is attempted.

### Stash reminder hook

1. With a clean tree, run `git stash push -m "opencode-kit:test:<branch>:2026-05-08T000000Z"`.
2. Re-load `git-safety` (or run a kickoff command in C1).

**Expected**: the reminder banner appears with the stash entry and a `git stash pop` / drop suggestion. After `git stash drop`, re-loading the skill emits a cross-check warning if a `LOG.md` `### Stash` entry references the now-missing stash.

**Pass**: skill loads under the recommended policy, refuses on dirty, and the stash discipline is reliable.

---

## 13e) Frontmatter conventions in existing commands

### Steps

1. Open `commands/project-review.md` and `commands/project-knowledge-refresh.md`.

**Expected**: each has `subtask: true` per the kit-wide convention table in `docs/PATH_CONTRACT.md` § Frontmatter conventions; long advisory output stays out of the primary context window when run as a subtask.

**Pass**: review / refresh / scaffold commands all set `subtask: true`; output remains in subtask context.

---

## 13f) `$ARGUMENTS` shell-injection check (security rule)

### Steps

1. Run a kit-wide grep for any `!`...`` shell-injection block referencing `$ARGUMENTS` or `$1`–`$9`:

   ```
   grep -rEn '!\`[^`]*\$(ARGUMENTS|[1-9])[^`]*\`' commands/ skills/
   ```

**Expected**: zero matches.

**Pass**: the kit-contract rule from `docs/PATH_CONTRACT.md` § Security rules is upheld kit-wide.

---

## 14) `/project-branch-new` — create a new big-project branch

> Test creating a brand-new branch from the latest integration base, with safety preflight and per-step git confirmations.

### Setup

- Local clone with a clean working tree on a non-base branch (or on the base itself).
- Remote `origin` configured.

### Steps

1. Run `/project-branch-new feature/widget-bulk-action`.
2. Observe: command loads `skills/branch-kickoff` (which loads `skills/git-safety`).
3. Observe: read-only state anchors print (`git status`, `HEAD`, base ref, commits ahead).
4. Observe: per-step confirmations for `git fetch origin --prune`, `git checkout <base>`, `git pull --ff-only origin <base>`, `git checkout -b feature/widget-bulk-action`.
5. Observe: model prompt with the kit's "default vs. top-tier reasoning" guidance; choose default.
6. Confirm chain into `/project-branch-kickoff`.
7. Observe: `LOG.md` appends a `## OpenCode: branch-new` block; `MERGE_REQUEST.md` mirrors a tiny `## OpenCode: branch-new` block (no PII, no raw user prompt).

### Dirty-tree refusal

1. Make an unstaged change.
2. Run `/project-branch-new`.
3. **Expected**: `git-safety` refuses and lists options (commit, kit-stash, abort). No git mutations occur.

**Pass**: command refuses on dirty tree; on clean tree, executes confirmed steps; audit blocks present and well-formed; `no-mermaid` (if passed) is honored downstream.

---

## 14a) `/project-branch-kickoff` — scaffold on a fresh / empty branch

> Test scaffolding a big project on an existing fresh / empty branch.

### Setup

- A fresh feature branch with zero or near-zero commits ahead of base.
- Clean working tree.

### Steps

1. Run `/project-branch-kickoff` (positional projectKey optional, auto-detected from descriptor).
2. Observe: `skills/branch-kickoff` runs `git-safety`, branch-readiness gate (refuses on `main`/`master`; confirms on > N commits ahead), and drift gate.
3. Observe: drift gate emits `F-xx` finding when AGENTS.md drift between base and tip is detected; silent on 0 drift.
4. Observe: big-project criteria check; if borderline, asks user.
5. Observe: orchestrates either `/project-bootstrap` (if no project state) or `/project-knowledge-refresh` (if state exists).
6. Observe: `skills/plan-phases` drafts `PHASES.md`; user iterates; mermaid prompt fires when phases > 3.
7. Observe: `/scaffold-knowledge dry-run` runs first, then `/scaffold-knowledge discovery` after confirmation.
8. Observe: structured audit blocks appended to `LOG.md` and MR.

### Opt-out flags

1. Re-run with `no-preflight no-stash-check no-source-guard no-mermaid`.
2. **Expected**: each opt-out is honored individually; all four can compose.

**Pass**: kickoff runs end-to-end; each gate is enforced; flags are honored; audit blocks well-formed; no engine changes required.

---

## 14b) `/project-branch-explore` — advisory branch walkthrough

> Test branch switching + `EXPLORE_GUIDE.md` generation without browser automation.

### Steps

1. Run `/project-branch-explore feature/widget-bulk-action`.
2. Observe: `git-safety` preflight runs first.
3. Observe: per-step confirms for `fetch` and `checkout`.
4. Observe: command writes `EXPLORE_GUIDE.md` in branch context folder with sections:
   - `## Setup`
   - `## What's new`
   - `## How to try it`
   - `## Caveats`
5. Confirm no browser automation or setup command execution occurred.

### Dirty-tree refusal

1. Make an unstaged local change.
2. Run `/project-branch-explore`.
3. **Expected**: command refuses (unless user explicitly chooses stash flow).

**Pass**: guide is generated deterministically, branch switch is confirmed, no side-effect automation runs.

---

## 14c) `/project-state` — read-only status report

### Steps

1. Run `/project-state`.
2. Verify report sections include working tree, head/base divergence, drift summary, kit stashes, recent kickoff audit.
3. Run `/project-state verbose`.
4. Run `/project-state no-preflight`.

### Expected

- No files are written.
- `verbose` expands details only.
- `no-preflight` skips drift sub-check while preserving other sections.

**Pass**: command is read-only and consistently reports state.

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
- [ ] Verification-scripts synthesis: table-driven suggestions are deduped and ordered; missing block emits `F-xx` note with generic fallback
- [ ] Drift preflight: silent on synced; F-xx finding on stale; cache TTL holds; `no-preflight` honored
- [ ] Source-path guard: ghost-knowledge prevented; `no-source-guard` opt-out works
- [ ] Mermaid prompts: review structural ON / typo OFF / phases >3 ON / MR migration prompt; `no-mermaid` honored; HTML comment markers recorded
- [ ] `git-safety`: prompts with `permission.skill: ask`; refuses on dirty; stash reminder + cross-check banner correct
- [ ] Frontmatter conventions: `subtask: true` set on long-output commands per the table in `docs/PATH_CONTRACT.md`
- [ ] Security rule: zero `!\`...\$ARGUMENTS...\`` matches kit-wide
- [ ] `/project-branch-new`: refuses on dirty; per-step confirms; model prompt; audit blocks present
- [ ] `/project-branch-kickoff`: drift gate behavior correct; bootstrap-vs-refresh decision correct; phases mermaid prompt fires when > 3; scaffold dry-run before discovery; opt-out flags honored
- [ ] `/project-branch-explore`: guide generated with four sections; no browser automation; branch switch confirms; dirty-tree refusal works
- [ ] `/project-state`: read-only report contains expected sections; `verbose` and `no-preflight` flags honored
- [ ] Rule layering: both generic + overlay loaded correctly
