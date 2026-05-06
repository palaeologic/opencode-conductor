# Generic handoff rule (descriptor-driven)

Use with `~/.config/opencode/projects/<projectKey>/descriptor.json`. OpenCode has **no lifecycle hooks**; continuity is **file + command** driven.

## MUST

1. **Resolve project** from the active workspace: load the descriptor for the matching `projectKey` (see kit README for layout).
2. **Resolve branch** with git; branch-local context lives only under  
   `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/`.
3. **Never mix** `MERGE_REQUEST` / `MR` / `LOG` / `PHASES` across branches.
4. **Modes**
   - **tracked** (default): persistent `MERGE_REQUEST.md` (and optional `MR.md` per `mrFilenames`), append-only `LOG.md`, checkpoints.
   - **lite**: no required branch files; refresh uses a **recent-commit git window** and minimal `reread_files` (project + area agents when present). Use for short or low-risk sessions.
5. **Session start**: run `/project-refresh <projectKey>` (or `/manual-refresh <projectKey>` if tools are unavailable). If `missing_branch_context` and mode is **tracked**, run `/project-bootstrap <projectKey>` then refresh again.
6. **Before substantial work**: refresh again after branch switch, rebase, squash, or history rewrite.
7. **Follow tool output**: obey `reread_files`, `changed_areas`, and boolean nudges (`log_append_recommended`, `mr_update_recommended`, `needs_checkpoint`).
8. **If `agents_stale_vs_branch` is true**: re-read project `AGENTS.md` carefully; shared conventions may have moved on `main` (or `baselineBranchForMaterialChanges`).
9. **Logging (tracked only)**: append `LOG.md` after substantial work, verification, or refresh when `log_append_recommended` is true. Keep `LOG.md` append-only.
10. **Promotion**: keep discoveries in branch `LOG.md` first; update shared package/area `AGENTS.md` only when durable and user-approved.
11. **Refresh is read-only**: `/project-refresh` and `/manual-refresh` MUST only gather and report context. NEVER execute actions (run tests, make code changes, run commands) based on what you read during refresh. Wait for the user to tell you what to do next.
12. **Structured output**: when executing `/project-refresh` or `/manual-refresh`, output the `## Handoff refresh result` structured block FIRST (as defined in the command template), then optionally add narrative. Never skip or reorganize the structured block.
13. **Subtask handoff to main agent**: when a lifecycle command runs as a subtask (for example `/project-init`, `/project-bootstrap`, `/project-review`, `/project-checkpoint`, `/project-close`, `/project-phases`, `/project-knowledge-refresh`, `/scaffold-knowledge`), the main agent MUST restate the subtask's recommended next commands in plain text before waiting for user input.

## SHOULD

- Run `/project-review <projectKey>` after refresh when the branch has reviewable changes — generates a checklist, diff summary, or both (user chooses).
- Run `/project-checkpoint <projectKey>` before pausing on a long task; `/project-close <projectKey>` when wrapping a session (tracked).
- Run `/project-cleanup-candidates <projectKey>` periodically to review stale branch folders.
- Run `/project-knowledge-refresh <projectKey>` when you have stable, merge-worthy knowledge to promote (proposal-first).
- If the user says **done / bye / pause / ttyl**, attempt `/project-close` behavior inline when in **tracked** mode (best effort; not a substitute for hooks).

## Models (optional)

- Prefer `descriptor.subtaskModels` for role defaults (`refresh`, `bootstrap`, `checkpoint`, `close`, `knowledge`).
- Register per-command `model` in `opencode.json` if markdown frontmatter does not support `model` in your OpenCode build (see README example).
- Do not ask for a model on every subtask; ask only when starting a heavy knowledge pass or when no default is configured.

## Merge closure (tracked)

When a branch is merged to the baseline, ask the user: **archive** (keep folder) vs **promote-and-delete** (promote durable notes, then remove folder). Never delete without explicit confirmation.
