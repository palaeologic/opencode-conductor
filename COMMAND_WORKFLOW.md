# OpenCode Handoff — Command Decision Matrix

Quick reference for **which command** to run and **when**. For workflow diagrams and full docs, see [`README.md`](README.md).

## Command roster

| Command | Subtask | Typical model binding |
|---------|---------|------------------------|
| `/project-init <projectKey>` | yes | default |
| `/project-refresh <projectKey>` | yes | smaller / default |
| `/project-bootstrap <projectKey>` | yes | default |
| `/project-phases <projectKey>` | yes | default or stronger |
| `/project-checkpoint <projectKey>` | yes | smaller |
| `/project-close <projectKey>` | yes | smaller |
| `/project-review <projectKey>` | yes | default |
| `/project-cleanup-candidates <projectKey>` | yes | smaller |
| `/project-knowledge-refresh <projectKey>` | yes | stronger |
| `/manual-refresh <projectKey>` | yes | default |

Bind models in `opencode.json` `command.*.model` (and/or document IDs under `descriptor.subtaskModels`).

## When to call which

| Situation | Command | Notes |
|-----------|---------|--------|
| First time using kit on a project | `init` | Scans repo, drafts descriptor, user approves; only needed once per project |
| Session start | `refresh` | Auto-suggests `init` if no descriptor found |
| First visit to branch (tracked) | `bootstrap` then `refresh` | Creates MR/LOG (+ optional PHASES) |
| Branch switch | `refresh` | Avoid carry-over |
| After rebase / squash | `refresh` | Re-anchor checkpoint; append HISTORY note in `LOG.md` |
| Large branch | `phases` | Milestones in `PHASES.md` |
| Pausing mid-task (tracked) | `checkpoint` | Structured `LOG.md` entry |
| Ending session (tracked) | `close` | Summary + next step |
| Before code review | `review` | Generates checklist, diff summary, or both (user picks) |
| Stale branch folders | `cleanup-candidates` | Read-only table; user confirms deletes |
| Promoting durable knowledge | `knowledge-refresh` | Proposal-first; user approves each file |
| Tools unavailable | `manual-refresh` | Bootstraps if needed, then delta |

## Refresh outcomes

**Success** returns at minimum: `branch`, `handoff_mode`, checkpoint range, `changed_areas`, `reread_files`, `log_append_recommended`, `mr_update_recommended`, `needs_checkpoint`, `context_staleness`, optional `agents_stale_vs_branch`.

**Failure** returns: `reason` + `recommended_next_step`.

| Failure reason | Meaning | Next step |
|----------------|---------|-----------|
| `missing_branch_context` | No branch folder (tracked mode) | `/project-bootstrap` |
| `workspace_not_in_project` | CWD outside project root | `cd` into project |
| `detached_head` | No branch ref | Checkout a branch |
| `descriptor_not_found` | No `descriptor.json` | `/project-init` |

## Manual fallback

When tool-calling is unavailable:

1. `/manual-refresh <projectKey>`
2. Seeds templates if files missing (tracked)
3. Reads layers: project `AGENTS.md` → active area agents → MR files → `LOG.md` tail → optional `PHASES.md`
4. Git delta from checkpoint or recent window (lite)
5. Returns same fields as tool refresh where possible

Fallback sentence (if parsing fails):

`Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.`
