# Project Manual Refresh Fallback Skill (Generic)

Use this skill when command/tool-calling is unavailable and you still need reliable handoff continuity.

## Goal

Recreate refresh behavior manually for `<projectKey>` from descriptor + branch context + git history.

## Procedure

1. Resolve `<projectKey>`, current branch, and repository root.
2. Resolve branch folder:
   - `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/`
3. Ensure branch files exist (seed from templates when missing):
   - `MERGE_REQUEST.md`
   - `LOG.md`
   - optional `PHASES.md`
4. Read context in order:
   - project `AGENTS.md`
   - relevant area `AGENTS.md`
   - relevant package `AGENTS.md` when applicable
   - branch `MERGE_REQUEST.md`
   - branch `PHASES.md` (if present)
   - latest branch `LOG.md`
5. Determine checkpoint:
   - latest `reviewed_through` from `LOG.md`
   - fallback to recent commit window if absent
6. Inspect git delta from checkpoint to HEAD and produce:
   - changed files
   - changed areas
   - `reread_files`
   - update recommendations
7. Return concise structured summary and append branch `LOG.md` after substantial work.

## Constraints

- Never mix context across branches.
- Do not auto-update shared package/area guides from branch-local refresh output.
