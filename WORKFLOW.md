# OpenCode Conductor — workflow scenarios

**Canonical ordered procedures** for this kit. For **which slash command when**, see [`COMMAND_WORKFLOW.md`](COMMAND_WORKFLOW.md). For **install, descriptor fields, cost, rules list**, see [`README.md`](README.md).

Replace **`<projectKey>`** with your descriptor key. The descriptor file is always loaded from **`~/.config/opencode/projects/<projectKey>/descriptor.json`** by kit tools; branch folders and `AGENTS.md` paths are **whatever `branchHandoff` and `areas` say** (often the same global tree, or a **project-local** tree — see [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md)).

## Table of contents

1. [How to use this doc](#1-how-to-use-this-doc)
2. [Initiating a project (first time)](#2-initiating-a-project-first-time)
3. [Working with a large / long-lived branch (tracked)](#3-working-with-a-large--long-lived-branch-tracked)
4. [Working with small branches (lite mode)](#4-working-with-small-branches-lite-mode)
5. [Starting on a branch (first visit)](#5-starting-on-a-branch-first-visit)
6. [Continuing in a new session](#6-continuing-in-a-new-session)
7. [Verification without full handoff](#7-verification-without-full-handoff)
8. [Knowledge and housekeeping](#8-knowledge-and-housekeeping)
9. [Reviewing](#9-reviewing)
10. [Using skills](#10-using-skills)

---

## 1. How to use this doc

### State vs commands (control plane)

- **Artifacts (durable state)** live under the folder from **`branchHandoff.contextDirTemplate`** (see `descriptor.json`) and shared knowledge under **`opencodeProjectRootPath`** / **`areas.*.areaAgentsPath`**. Default global example: `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/` with `MERGE_REQUEST.md`, `LOG.md`, optional `REVIEW.md`, optional `PHASES.md`, optional `MR.md`, plus `AGENTS.md` trees. Treat these as the **operational** record from Conductor; your org may still keep a canonical human MR narrative elsewhere.
- **Slash commands** are **operations** on that state: refresh context, append checkpoints, regenerate review artifacts, update MR machine blocks, etc. They do not replace reading the files when you need nuance.

### Handoff modes

- **`tracked`** (default in many descriptors): full branch folder, MR + LOG (+ optional PHASES). Heavier, best for long MRs and team handoff.
- **`lite`**: smaller branch footprint; `/manual-refresh` still gives git delta + minimal reread. Good for spikes and small fixes.

See `handoffModeDefault` in [`README.md`](README.md) (Descriptor responsibilities).

### Review glossary (cross-links)

- **`/project-review` artifact types** — use plain names: **Checklist review**, **Diff-first review**, **Checklist + diff (full)**. Details: [`commands/project-review.md`](commands/project-review.md).
- **`OpenCode:` headings** in `MERGE_REQUEST.md` — machine-updated blocks; details: [`commands/project-update-mr.md`](commands/project-update-mr.md).

---

## 2. Initiating a project (first time)

1. **`/project-init <projectKey>`** — scans the repo, drafts `descriptor.json`, you approve before it is written under `~/.config/opencode/projects/<projectKey>/` (always). Init also asks **global vs project-local** durable paths and optional `.gitignore` for repo-local dirs; see [`README.md`](README.md) and [`docs/PATH_CONTRACT.md`](docs/PATH_CONTRACT.md).
2. **`/scaffold-knowledge <projectKey>`** — once (or again when areas/stack change): shared `AGENTS.md` orientation, not per-branch.
3. **`/manual-refresh <projectKey>`** or **`/project-refresh <projectKey>`** — confirm project resolves; for **tracked**, expect branch context paths from refresh output.
4. **First visit to a Git branch (tracked):** if refresh reports missing branch context, **`/project-bootstrap <projectKey>`** (optionally seed `PHASES.md` and optionally paste MR/issue/testing context so narrative sections auto-fill). If you skip the paste at bootstrap, you can re-ingest later with **`/project-update-mr <projectKey>`** scope D or **`/project-review-sync <projectKey>`** scope D.
5. **Implement** in the repo; use **`/project-checkpoint`** when you pause.

### With phased delivery

After bootstrap (or once the branch is real), run **`/project-phases <projectKey>`** when milestones help: creates or refines `PHASES.md` for multi-step work.

### Without phased delivery

Skip **`/project-phases`**; use `MERGE_REQUEST.md` + `LOG.md` only.

```mermaid
flowchart TD
  startNode[New_repo_or_new_OpenCode_project]
  initCmd["/project-init"]
  approve[Review_and_approve_descriptor]
  scaffoldCmd["/scaffold-knowledge"]
  refreshCmd["/manual-refresh_or_project-refresh"]
  modeTracked{tracked_and_first_branch?}
  bootstrapCmd["/project-bootstrap"]
  wantPhases{use_PHASES?}
  phasesCmd["/project-phases"]
  workNode[Implement_features]

  startNode --> initCmd --> approve --> scaffoldCmd --> refreshCmd --> modeTracked
  modeTracked -->|yes_missing_context| bootstrapCmd --> wantPhases
  modeTracked -->|no_or_lite| wantPhases
  wantPhases -->|yes| phasesCmd --> workNode
  wantPhases -->|no| workNode
```

---

## 3. Working with a large / long-lived branch (tracked)

Typical loop:

1. Start day or resume: **`/manual-refresh`** or **`/project-refresh`**.
2. If refresh says **`missing_branch_context`**: **`/project-bootstrap`**, then refresh again.
3. Implement; append **`LOG.md`** when refresh recommends or after substantial work.
4. Before breaks: **`/project-checkpoint`** with short bullets + optional user prompt (same message).
5. When MR facts drift: **`/project-update-mr`** (refreshes canonical `## OpenCode:` blocks; supports in-place merge, append, regenerate, and paste-ingest via option D). You can also use **`/project-review-sync`** scope D when you are syncing review artifacts at the same time — see [§9.10](#910-feed-in-semi-structured-mr-text-paste-ingest).
6. When shared knowledge is stale vs branch: **`/project-knowledge-refresh`** (proposal-first; you approve edits).
7. End of day: **`/project-close`** summary.

```mermaid
flowchart TD
  sessionStart[Session_start]
  refreshNode["/manual-refresh_or_project-refresh"]
  missingCtx{missing_branch_context?}
  bootNode["/project-bootstrap"]
  workBlock[Implement_and_edit_repo]
  logRec{log_append_recommended?}
  appendLog[Append_LOG_md]
  pauseQ{Pausing_or_switching?}
  checkpointCmd["/project-checkpoint"]
  mrRec{mr_update_recommended?}
  mrCmd["/project-update-mr"]
  agentsStale{agents_stale_vs_branch?}
  knCmd["/project-knowledge-refresh"]
  closeCmd["/project-close"]

  sessionStart --> refreshNode --> missingCtx
  missingCtx -->|yes| bootNode --> refreshNode
  missingCtx -->|no| workBlock
  workBlock --> logRec
  logRec -->|yes| appendLog --> pauseQ
  logRec -->|no| pauseQ
  pauseQ -->|pause| checkpointCmd --> workBlock
  pauseQ -->|switch_branch| refreshNode
  pauseQ -->|end_day| closeCmd
  workBlock --> mrRec
  mrRec -->|yes| mrCmd --> workBlock
  mrRec -->|no| agentsStale
  agentsStale -->|yes| knCmd --> workBlock
  agentsStale -->|no| workBlock
```

---

## 4. Working with small branches (lite mode)

1. Descriptor uses **`handoffModeDefault`: `lite`** (or override per refresh when supported).
2. Use **`/manual-refresh`** as the main entry; branch templates may be absent.
3. When the branch becomes “real” (MR workflow, reviewers, long life), **switch to tracked**: run **`/project-bootstrap`** then normal tracked flow (section 3).

```mermaid
flowchart TD
  liteDesc[lite_handoff_mode]
  manual["/manual-refresh"]
  workLite[Work_with_git_delta_only]
  grow{Branch_became_team_tracked?}
  bootstrap["/project-bootstrap"]
  trackedFlow[Follow_section_3]

  liteDesc --> manual --> workLite --> grow
  grow -->|yes| bootstrap --> trackedFlow
  grow -->|no| workLite
```

---

## 5. Starting on a branch (first visit)

**Tracked**

1. **`/manual-refresh`** or **`/project-refresh`**.
2. If output indicates **missing branch folder** → **`/project-bootstrap`**, then refresh again.
3. Open `MERGE_REQUEST.md` and align title/goal if needed (human narrative); leave `## OpenCode:` blocks for commands.

**Already bootstrapped**

- Refresh only; edit branch files as usual.

---

## 6. Continuing in a new session

1. Open **`branches/<branch>/LOG.md`** — read last checkpoint and open questions.
2. **`/manual-refresh <projectKey>`** (or **`/project-refresh`**).
3. Tell the agent explicitly: branch name, last checkpoint summary, and what to do next (or load **`session-lifecycle`** skill — section 10).
4. If the branch uses **`PHASES.md`**, skim current phase before coding.

---

## 7. Verification without full handoff

Use when you only need quality signal:

- **`/check-types [area]`** — types.
- **`/run-tests [area]`** — tests.
- **`/lint-fix [area]`** — lint with fix.
- **`/organize-imports`** — import hygiene.

Still run **`/manual-refresh`** first if you **switched branches**, **rebased**, or context is **stale** (see [`README.md`](README.md) “When to do a full refresh”).

---

## 8. Knowledge and housekeeping

| Goal | Command |
|------|---------|
| Re-orient AGENTS after areas/packages change | **`/scaffold-knowledge`** (idempotent merge) |
| Propose durable AGENTS updates from branch learning | **`/project-knowledge-refresh`** |
| List stale `branches/*` folders | **`/project-cleanup-candidates`** (read-only) |
| End session with summary | **`/project-close`** |

---

## 9. Reviewing

### 9.1 Start a branch review

1. **`/manual-refresh <projectKey>`** (or **`/project-refresh`**).
2. **`/project-review <projectKey>`** — prefer **Checklist + diff (full)** for non-trivial branches.
3. Edit **`F-xx` triage** under `## Review findings / questions` in `REVIEW.md`.
4. Optionally **`/project-checkpoint`** with a one-line note.

### 9.2 Continue reviewing (same session)

1. Re-read `REVIEW.md`.
2. Update triage for `F-xx`.
3. Keep triage entries in checkbox form (`- [ ]` for `open`, `- [x]` otherwise); review-sync/update flows restore markers if a manual edit dropped them.
4. Optionally **`/project-checkpoint`** before switching tasks.

### 9.3 Continue reviewing (new session / new agent)

1. **`/manual-refresh <projectKey>`**.
2. Point the agent at **open `F-xx` ids** and the tail of `LOG.md`.
3. Optionally **`/project-review`** with **findings preserve** if the branch moved.

### 9.4 Re-review after the author pushed commits

1. **`/manual-refresh <projectKey>`**.
2. **`/project-review`** — **findings preserve**.
3. Optionally **`/project-review-sync`** for checklist/MR alignment without full regenerate.
4. **`/project-update-mr`** — refresh **`## OpenCode:`** blocks only.
5. Optionally **`/project-checkpoint`**.

### 9.5 Hand off to another reviewer

1. Ensure `REVIEW.md` lists open `F-xx` and triage.
2. **`/project-checkpoint`** — 3–6 bullets for the next person.
3. Point them to **§9.3**.

### 9.6 Sync MR from review facts only

1. **`/project-update-mr`** — mode **A** typical.
2. Confirm only **`## OpenCode:`** (and optional legacy ops headings) changed.
3. If canonical MR lives elsewhere, link from **`REVIEW.md`** (`## Additional reviewer context`) or **`LOG.md`**.

### 9.7 Light MR↔REVIEW alignment

Use **`/project-review-sync`** when MR checklist text or commits changed and you want **`REVIEW.md`** aligned **without** full **`/project-review`**. Use **`/project-review`** when you need a full risk/narrative refresh.

### 9.8 Optional automated verification (after review)

Ask whether to run **`/check-types`**, **`/run-tests`**, **`/lint-fix`**, or a **bundled script** documented in your project’s `AGENTS.md` / handoff overlay (not named here in the generic kit).

### 9.9 Resume from checkpoint

1. Read last checkpoint in **`LOG.md`**.
2. **`/manual-refresh <projectKey>`**.
3. Continue from **`F-xx`** / checklist state in **`REVIEW.md`**.

### 9.10 Feed in semi-structured MR text (paste-ingest)

When you have a GitLab/Jira/issue-tracker description and want it normalized into the protected narrative sections of `MERGE_REQUEST.md` (`## External links`, `## Stakeholders`, `## Goal`, `## In scope`, `## Acceptance criteria`, `## Verification target`, `## Feedback requested`), use either **`/project-update-mr`** scope **D** (direct MR update intent) or **`/project-review-sync`** scope **D** (when also syncing review artifacts). Both leave `## OpenCode:` machine blocks untouched.

```
/project-update-mr <projectKey>
# then choose D, paste the issue text
```

```
/project-review-sync <projectKey>
# then choose D, paste the issue text
```

Pick **D** when narrative sections are still placeholder text or when you want to refresh them from an external description. For first-time MR seeding the same paste prompt is offered by `/project-bootstrap`; if you skipped it there, run either command above based on intent.

### 9.11 Where do paste-ingest, refresh, and bootstrap live?

| Need | Command |
| --- | --- |
| Seed MR narrative for the first time | **`/project-bootstrap`** (paste prompt) |
| Update MR narrative directly from pasted issue text | **`/project-update-mr`** (option **D**) |
| Update MR narrative while syncing review artifacts | **`/project-review-sync`** (option **D**) |
| Refresh canonical `## OpenCode:` MR blocks | **`/project-update-mr`** (options **A/B/C**) |

```mermaid
flowchart TD
  rr[New_commits_on_branch]
  refreshR["/manual-refresh"]
  reviewR["/project-review_preserve_findings"]
  syncQ{Need_light_checklist_sync?}
  syncR["/project-review-sync"]
  mrR["/project-update-mr_OpenCode_blocks"]
  cpR["/project-checkpoint_optional"]

  rr --> refreshR --> reviewR --> syncQ
  syncQ -->|yes| syncR --> mrR
  syncQ -->|no| mrR
  mrR --> cpR
```

---

## 10. Using skills

Skills live under [`skills/`](skills/) as `skills/<name>/SKILL.md`. OpenCode loads them **on demand** (via the `skill` tool): **zero tokens** until loaded. **Authoritative behavior** is always in each **`SKILL.md`**; this section is a **routing guide** plus **example prompts** you can paste or paraphrase.

You can also say explicitly: *“Load the `<skill-name>` skill and follow it.”*

### Summary table

| Skill | Load when… |
|-------|------------|
| `session-lifecycle` | Starting/ending a session, checkpoint discipline |
| `review-branch` | Pre-merge review, `REVIEW.md`, MR sync |
| `onboard-area` | Unfamiliar module, “how does X work?” |
| `verify-changes` | “Does everything still work?” after edits |
| `systematic-debugging` | Bug unknown, test fails mysteriously |
| `refactor-safely` | Rename/move/structure without behavior change |
| `write-tests` | New tests, wrong test type, weak assertions |

---

### `session-lifecycle`

**When:** New session on an existing branch; unsure when to checkpoint/close; tracked `LOG.md` hygiene.

**Typical commands:** `/manual-refresh` or `/project-refresh` → work → `/project-checkpoint` → `/project-close`.

**Example prompts:**

- “We’re starting the day on branch `feature/foo` with project key `myapp` — walk me through refresh, what to read in `LOG.md`, and when to run `/project-checkpoint`.”
- “I’m pausing for lunch; what should I append to `LOG.md` and should I checkpoint?”
- “End of day: run session close discipline for `myapp` and suggest `/project-close` bullets.”
- “Refresh said `missing_branch_context` — what do I run next in order?”
- “Load the `session-lifecycle` skill and audit whether I skipped any handoff steps this session.”

---

### `review-branch`

**When:** Review before merge; generate `REVIEW.md`; optional verify; optional MR `OpenCode:` sync.

**Typical commands:** `/manual-refresh` → `/project-review` → optional `/check-types` / `/run-tests` / `/lint-fix` → optional `/project-update-mr` or `/project-review-sync`.

**Example prompts:**

- “Review branch `feature/foo` for project `myapp` before merge; use Checklist + diff and then suggest verification.”
- “Generate `REVIEW.md` with findings preserve — I already started triage.”
- “I’m the second reviewer; open `F-03` is still blocking — what should I re-check in the diff?”
- “After review, update only the OpenCode sections of `MERGE_REQUEST.md` — walk me through `/project-update-mr` choices.”
- “Load `review-branch` and stay read-only for code; only handoff files may change.”

---

### `onboard-area`

**When:** Unfamiliar area; need conventions before editing; refresh flagged unknown area.

**Typical commands:** Read `AGENTS.md` hierarchy; optional `/manual-refresh` for `reread_files`; then explore repo.

**Example prompts:**

- “I’ve never touched `packages/table` — load `onboard-area` and summarize how routing and GQL feed this package.”
- “How does authentication flow work in this repo? Use AGENTS hierarchy first.”
- “We’re about to add a column to the reports grid — what should I read first?”
- “Explain the handoff kit’s own `commands/` layout as if I’m new to OpenCode Conductor.”
- “Map the `api` area’s test layout before I run anything destructive.”

---

### `verify-changes`

**When:** After edits; before commit; “sanity check” without full review artifact.

**Typical commands:** `/check-types` → `/run-tests` → `/lint-fix` (subset per skill).

**Example prompts:**

- “I changed three files under `frontend/` — run the verify-changes style flow and report.”
- “Before I push, verify types and tests for the touched area only.”
- “Lint-fix then re-run types; stop if types fail.”
- “Compare failures to `main` if you can and separate pre-existing vs new.”
- “Load `verify-changes` after this refactor and give me a single pass/fail summary.”

---

### `systematic-debugging`

**When:** Bug unclear; flaky test; regression without obvious cause.

**Typical commands:** Repro steps, logging, bisect-style narrowing (per skill); may invoke `/run-tests` targeted.

**Example prompts:**

- “This E2E fails only on CI — use systematic debugging to list hypotheses and the smallest repro.”
- “Test X started failing after the last merge — isolate whether it’s data, timing, or code.”
- “I’ve been stuck 20 minutes on this stack trace — drive a structured debug session.”
- “Binary search which commit introduced the failure between `good` and `bad`.”
- “Load `systematic-debugging` for this Jest timeout.”

---

### `refactor-safely`

**When:** Rename/extract/move; improve structure without behavior change; post-spike cleanup.

**Typical commands:** Small steps + `/check-types` / `/run-tests` between steps (per skill).

**Example prompts:**

- “Extract this 200-line component into two files without behavior change — use refactor-safely.”
- “Rename this public hook across the repo safely.”
- “Prepare the module for a feature by cleaning structure only.”
- “We need to move these tests to a new folder — minimize blast radius.”
- “Load `refactor-safely` for this Box-to-layout migration plan.”

---

### `write-tests`

**When:** New code lacks tests; wrong test level; assertions too shallow.

**Typical commands:** Plan tests, then `/run-tests` after writing.

**Example prompts:**

- “Add regression tests for the bug we just fixed in `userService`.”
- “Should this be unit or integration coverage? Decide and scaffold tests.”
- “These tests mock too much — rewrite to assert observable behavior.”
- “Generate a minimal test matrix for this form validator edge cases.”
- “Load `write-tests` for the new API route.”

---

## Optional follow-up (local install)

If your **`~/.config/opencode/opencode.json`** predates the kit template, merge missing **`command`** entries (e.g. **`project-review-sync`**, **`project-update-mr`**) from your fork’s `opencode.json.template` without overwriting provider settings. Remove deprecated **`reviewHints`** from per-project **`descriptor.json`** if still present (URLs belong in `MERGE_REQUEST.md` / `README` per [`commands/project-review.md`](commands/project-review.md)).
