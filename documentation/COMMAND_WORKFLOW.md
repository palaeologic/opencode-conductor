# OpenCode Conductor — Command Decision Matrix

Quick reference for **which command** to run and **when**. For numbered scenarios (“I want to …”), see [`documentation/WORKFLOW.md`](documentation/WORKFLOW.md). For **mermaid** branch-context maps (tool lane vs `/manual-refresh`), see [`documentation/WORKFLOW_MAPS.md`](documentation/WORKFLOW_MAPS.md). For diagrams and full docs, see [`README.md`](README.md).

## Command roster

| Command | Subtask | Typical model binding |
|---------|---------|------------------------|
| `/project-init <projectKey>` | yes | default |
| `/project-refresh <projectKey>` | yes | smaller / default |
| `/project-bootstrap <projectKey>` | yes | default |
| `/project-branch-new [<branch-name>]` | **no** | upstream: unset; fork: top-tier reasoning |
| `/project-branch-kickoff [<projectKey>]` | **no** | upstream: unset; fork: top-tier reasoning |
| `/project-branch-explore [<branch>]` | **no** | upstream: unset; fork: default |
| `/project-state` | yes | default |
| `/project-phases <projectKey>` | yes | default or stronger |
| `/project-checkpoint <projectKey>` | yes | smaller |
| `/project-close <projectKey>` | yes | smaller |
| `/project-review <projectKey>` | yes | default |
| `/project-review-sync <projectKey>` | yes | default |
| `/project-update-mr <projectKey>` | yes | default |
| `/project-cleanup-candidates <projectKey>` | yes | smaller |
| `/project-knowledge-refresh <projectKey>` | yes | stronger |
| `/project-help-docs [<output-root>]` | yes | stronger |
| `/manual-refresh <projectKey>` | yes | default |
| `/scaffold-knowledge <projectKey>` | yes | default |

Bind models in `opencode.json` `command.*.model` (and/or document IDs under `descriptor.subtaskModels`).

## When to call which

| Situation | Command | Notes |
|-----------|---------|--------|
| First time using kit on a project | `init` | Scans repo, drafts descriptor, user approves; only needed once per project |
| Start a brand-new branch from the latest integration base | `project-branch-new` | Loads `branch-kickoff` skill, runs `git-safety` preflight (refuses on dirty), per-step git confirms (`fetch` → `checkout <base>` → `pull --ff-only` → `checkout -b <new>`), optional chain into kickoff. Positional `$1` for branch name skips the prompt |
| Scaffold a big project on a fresh / empty feature branch | `project-branch-kickoff` | Loads `branch-kickoff`, runs drift gate, big-project criteria, then `bootstrap` or `knowledge-refresh` → `plan-phases` → `scaffold-knowledge` (dry-run then discovery). Audits to `LOG.md` + MR `OpenCode` block |
| Explore a target branch and get manual try steps | `project-branch-explore` | Loads `git-safety`, confirms branch switch, then emits `EXPLORE_GUIDE.md` (Setup / What's new / How to try it / Caveats). No browser automation, no auto-run setup |
| Inspect current kit/git state without mutations | `project-state` | Read-only report: working tree, HEAD/base divergence, knowledge drift summary, kit stashes, recent kickoff audit entries |
| First-time knowledge scaffolding | `scaffold-knowledge` | Run once after `init`; creates **leaf** **`KNOWLEDGE.md`** files and **area `AGENTS.md`** orientation (project **rules** stay in root `AGENTS.md` at `opencodeProjectRootPath`) plus starter `## Verification scripts` in those area files |
| Add new package / module to tracked knowledge | `scaffold-knowledge` | Default discovery mode auto-detects untracked leaves (no JSON edits); skips leaves whose source is missing on the current branch (`no-source-guard` to bypass) |
| Audit currently tracked leaves | `scaffold-knowledge <key> list` | Read-only table grouped by area |
| Preview a bulk scaffold | `scaffold-knowledge <key> dry-run` | No writes; shows what discovery would create |
| Session start | `refresh` | Auto-suggests `init` if no descriptor found |
| First visit to branch (tracked) | `bootstrap` then `refresh` | Creates MR/LOG (+ optional PHASES) |
| Branch switch | `refresh` | Avoid carry-over |
| After rebase / squash | `refresh` | Re-anchor checkpoint; append HISTORY note in `LOG.md` |
| Large branch | `phases` | Milestones in `PHASES.md`; mermaid prompt with default ON when phases > 3 (`no-mermaid` to skip) |
| Pausing mid-task (tracked) | `checkpoint` | Structured `LOG.md` entry |
| Ending session (tracked) | `close` | Summary + next step |
| Before code review | `review` | Generates `REVIEW.md` (checklist / diff-first / checklist + diff); findings table with `F-xx`; preserve/replace triage; **runs silent knowledge preflight** (auto-scaffolds missing leaf **`KNOWLEDGE.md`**, flags stale ones, drift-vs-base finding); derives suggested verifications from `## Verification scripts` tables by diff-trigger match; emits `F-xx` note when a changed area lacks the block; optional opt-in `## Architecture` mermaid section. Pass `no-preflight` to skip preflight; `no-mermaid` to skip diagram prompt |
| After MR edits + commits (light sync) | `review-sync` | Merges MR checklist into `REVIEW.md`, optional append-only `F-xx`, refreshes MR `OpenCode:` blocks — not a full regenerate |
| After substantial review/progress | `update-mr` | Refreshes `MERGE_REQUEST.md` `OpenCode:` blocks (+ optional legacy ops headings) while preserving narrative; opt-in mermaid prompt for architectural / migration MRs (`no-mermaid` to skip) |
| Stale branch folders | `cleanup-candidates` | Read-only table; user confirms deletes |
| Promoting durable knowledge | `knowledge-refresh` | Proposal-first; user approves each file; runs silent **knowledge-drift preflight** vs `origin/HEAD` → `main` → `master` (5-min fixed session fetch cache); proposes `## Verification scripts` refresh when script manifests changed; pass `no-preflight` to skip |
| Generate help-center docs from code | `project-help-docs` | Loads `help-docs-author`; runs Discovery → Code-reading → Plan → Generation → Audit; refuses output outside root; refuses in-repo writes unless `--allow-in-repo`; supports `--no-frontmatter`, `--no-mermaid`, `--no-vocab-grep` |
| Tools unavailable | `manual-refresh` | Same **handoff contract** as `project-refresh` without `opencode_*` tools: optional template seeding, git delta, `missing_branch_context` / `branch_context_status`, `next_steps`, staleness hints, `reread_files` matching engine order — see [`commands/manual-refresh.md`](../commands/manual-refresh.md) |

## Positional-argument shorthand

| Command | Positional args | Example |
|---------|-----------------|---------|
| `/project-branch-new` | `$1` = branch name (optional); additional tokens are flags | `/project-branch-new feature/widget-bulk-action no-mermaid` |
| `/project-branch-kickoff` | `$1` = projectKey (optional, auto-detected); additional tokens are flags | `/project-branch-kickoff myapp no-source-guard` |
| `/project-branch-explore` | `$1` = target branch (optional; prompts if omitted) | `/project-branch-explore feature/widget-bulk-action` |
| `/scaffold-knowledge` | `$1` = mode (`list` / `dry-run` / `discovery`); additional tokens are flags | `/scaffold-knowledge myapp dry-run no-source-guard` |
| `/project-review` | additional tokens are flags | `/project-review myapp no-preflight no-mermaid` |
| `/project-knowledge-refresh` | additional tokens are flags | `/project-knowledge-refresh myapp no-preflight` |
| `/project-phases` | additional tokens are flags | `/project-phases myapp no-mermaid` |
| `/project-update-mr` | additional tokens are flags | `/project-update-mr myapp no-mermaid` |
| `/project-state` | additional tokens are flags (`verbose`, `no-preflight`) | `/project-state verbose` |
| `/project-help-docs` | `$1` = output root (optional; prompts if omitted); additional tokens are flags | `/project-help-docs ~/tmp/help --scope=frontend --no-mermaid` |

## Mode routing policy (Plan vs Build)

Mode impacts quality and cost. Use this policy:

| Task shape | Recommended mode | Why |
|------|---------|---------|
| Ambiguous requirement, architecture decision, multi-path tradeoff | **Plan** | Better exploration and option comparison before edits |
| Simple implementation with clear acceptance criteria | **Build** | Faster execution with fewer turns |
| Large refactor across files with risk to invariants | **Plan** first, then **Build** | De-risk design first, then execute |
| Bugfix with unknown root cause | **Plan** first | Isolate, hypothesize, verify before writing |
| Bugfix with confirmed root cause and narrow diff | **Build** | Direct implementation is usually safest |

Suggested command alignment:

- Start in **Plan**: `/project-branch-kickoff`, `/project-phases`, `/project-review`, `/project-help-docs`.
- Stay in or switch to **Build** for concrete coding tasks after plan sign-off.
- Use `/project-state` after mode switches to confirm branch/context health.

When a command/skill detects planning is complete, it should **suggest** switching to Build, not force it.

## Combining prompts with commands and skills

You do not need to choose between plain prompts and slash commands. Best practice:

1. Use a short plain-language prompt to specify intent/constraints.
2. Run the command that owns the workflow.
3. Let skills load on demand; only add extra prompt detail if output is too generic.

Examples:

- Prompt: "Focus on performance and low-risk migration." + `/project-branch-kickoff my-app`
- Prompt: "Review from security + maintainability lens; keep false positives low." + `/project-review my-app`
- Prompt: "Generate docs for support agents and end-users; avoid internal jargon." + `/project-help-docs ~/tmp/help --scope=frontend`

This pattern keeps commands deterministic while still letting the user steer tone, depth, and lens.

## Opt-out flags (cross-command)

| Flag | Disables | Default |
|------|----------|---------|
| `no-preflight` | All preflight checks (drift, knowledge alignment) on `/project-review` and `/project-knowledge-refresh` | gate active |
| `no-source-guard` | `/scaffold-knowledge` source-path existence check | gate active |
| `no-mermaid` | Mermaid prompts in any artifact | prompt active per kit-wide policy |
| `no-stash-check` | Kit-stash reminder hook (when commands surface it; future kickoff commands ship in C1) | gate active |

Opt-outs compose. Documented in [`documentation/PATH_CONTRACT.md`](documentation/PATH_CONTRACT.md) § Opt-out flags.

## Permission policy (recommended)

The kit ships [`opencode.json.example`](opencode.json.example) at the repo root with vendor-neutral defaults: any skill that mutates git state or orchestrates kickoff prompts users with `ask`; everything else stays loose for low-friction loading. Copy / merge into your real `~/.config/opencode/opencode.json`.

## Refresh outcomes

**Success** returns at minimum: `branch`, `handoff_mode`, checkpoint range, `changed_areas`, `reread_files`, `log_append_recommended`, `mr_update_recommended`, `needs_checkpoint`, `context_staleness`, optional `agents_stale_vs_branch`.

**Failure** returns: `reason` + `recommended_next_step`.

| Failure reason | Meaning | Next step |
|----------------|---------|-----------|
| `missing_branch_context` | No branch folder (tracked mode) | `/project-bootstrap` |
| `workspace_not_in_project` | CWD outside project root | `cd` into project |
| `detached_head` | No branch ref | Checkout a branch |
| `descriptor_not_found` | No `descriptor.json` | `/project-init` |

## Tool dependency

Not all commands require the Bun tool engine. When tools are in `tools-off/` or disabled:

| Command | Needs tools? | Without tools |
|---------|-------------|---------------|
| `/manual-refresh` | No | **Replaces** `/project-refresh` + `/project-bootstrap` (seeds files if missing, then does git delta) |
| `/project-init` | No | Works as-is (scans repo, writes files) |
| `/project-checkpoint` | No | Has manual fallback (appends LOG.md directly) |
| `/project-close` | No | Has manual fallback (appends LOG.md directly) |
| `/project-review` | No | Works as-is (reads diff, generates REVIEW.md, can include user-provided additional context) |
| `/project-review-sync` | No | Works as-is (reads branch files + MR + REVIEW, merge-only updates) |
| `/project-update-mr` | No | Works as-is (reads branch files + git facts, updates MR) |
| `/project-cleanup-candidates` | No | Works as-is (lists folders) |
| `/project-phases` | No | Works as-is (creates/edits PHASES.md) |
| `/project-knowledge-refresh` | No | Works as-is (reads + proposes) |
| `/scaffold-knowledge` | No | Works as-is (creates/merges shared knowledge files) |
| `/project-branch-new` | No | Works as-is (only invokes git CLI + chained commands; safety preflight is shell-only) |
| `/project-branch-kickoff` | No | Works as-is (orchestrates other commands; safety preflight is shell-only) |
| `/project-branch-explore` | No | Works as-is (git preflight + branch switch + guide generation) |
| `/project-state` | No | Works as-is (pure read-only report) |
| `/project-help-docs` | No | Works as-is (filesystem reads/writes + audit checks only) |
| `/project-refresh` | **Yes** | Use `/manual-refresh` instead |
| `/project-bootstrap` | **Yes** | Use `/manual-refresh` instead (auto-seeds missing files) |

**Daily workflow without tools**: `/manual-refresh` for context sync, everything else as normal.

## Fallback sentence

If `/manual-refresh` doesn't parse, paste this exact sentence:

`Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.`
