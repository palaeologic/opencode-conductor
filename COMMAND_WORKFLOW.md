# OpenCode Handoff Command Workflow

When to run which command in a descriptor-driven setup.

## Commands

| Command | Subtask | Typical model binding |
|---------|---------|------------------------|
| `/project-refresh <projectKey>` | yes | smaller / default |
| `/project-bootstrap <projectKey>` | yes | default |
| `/project-phases <projectKey>` | yes | default or stronger |
| `/project-checkpoint <projectKey>` | yes | smaller |
| `/project-close <projectKey>` | yes | smaller |
| `/project-cleanup-candidates <projectKey>` | yes | smaller |
| `/project-knowledge-refresh <projectKey>` | yes | stronger |
| `/manual-refresh <projectKey>` | yes | default |

Bind models in `opencode.json` `command.*.model` (and/or document IDs under `descriptor.subtaskModels`).

## When to call which

| Situation | Command | Notes |
|-----------|---------|--------|
| Session start | `refresh` | Use `handoffMode: lite` in tool args only when descriptor or user requests lite |
| First visit to branch (tracked) | `bootstrap` then `refresh` | Creates MR/LOG (+ optional PHASES) |
| Branch switch | `refresh` | Avoid carry-over |
| After rebase / squash | `refresh` | Re-anchor checkpoint; append HISTORY note in `LOG.md` |
| Large branch | `phases` | Milestones in `PHASES.md` |
| Pausing mid-task (tracked) | `checkpoint` | Structured `LOG.md` entry |
| Ending session (tracked) | `close` | Summary + next step; skip if zero meaningful work unless user insists |
| Stale branch folders | `cleanup-candidates` | Read-only table; user confirms deletes |
| Promoting durable knowledge | `knowledge-refresh` | Proposal-first; user approves each file |
| Tools unavailable | `manual-refresh` | Bootstraps if needed, then delta |

## Refresh outcomes (tool)

On success, expect at least: `branch`, `handoff_mode`, checkpoint range, `changed_areas`, `reread_files`, `log_append_recommended`, `mr_update_recommended`, `needs_checkpoint`, `context_staleness`, optional `agents_stale_vs_branch`.

On failure: `reason` (e.g. `missing_branch_context`, `workspace_not_in_project`, `detached_head`) and `recommended_next_step` when provided.

## Typical tracked flow

1. `refresh`
2. If `missing_branch_context` → `bootstrap` → `refresh`
3. Implement; append `LOG.md` when `log_append_recommended` or after substantial work
4. `checkpoint` before context switch; `close` when stopping
5. `cleanup-candidates` occasionally

## Lite flow

1. Set `handoffModeDefault: lite` (or pass `handoffMode: lite` to refresh tool)
2. `refresh` only — no bootstrap required
3. Optional: later run `bootstrap` + switch descriptor to `tracked` if the branch becomes serious

## Manual fallback

1. `/manual-refresh <projectKey>`
2. Seed templates if files missing (tracked)
3. Read layers: project `AGENTS.md` → area agents → MR files that exist → `LOG.md` tail → optional `PHASES.md`
4. Git delta from checkpoint or recent window (lite)
5. Return same fields as tool refresh where possible

Quick sentence if command parsing fails:

`Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.`
