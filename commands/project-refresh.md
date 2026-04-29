---
description: Generic context refresh via descriptor-driven tool
subtask: true
---

Refresh context for project key `$ARGUMENTS`:
- read project/area rules via descriptor
- load branch handoff context
- inspect git history since checkpoint
- summarize what changed and what to re-read

Workflow:
1. Call the OpenCode tool `opencode_refresh_context` with:
   - `projectKey: $ARGUMENTS`
   - `refreshMode: fast`
   - `maxCommits: 10`
   - `writeLog: false`
2. Parse the tool response (JSON string).
3. If `applicable` is false, stop and report:
   - `reason`
   - `recommended_next_step` (if present)
4. Use these fields to drive re-reads:
   - `reread_files`
   - `changed_areas`
5. Return a concise summary using JSON fields:
   - `branch`
   - `checkpoint_commit -> head_commit`
   - `changed_areas`
   - `reread_files`
   - `mr_update_recommended`
   - `log_append_recommended`

Output format:
Return a concise markdown section:

## Project refresh result
- projectKey: <$ARGUMENTS>
- branch: <branch>
- checkpoint: <checkpoint_commit> -> <head_commit>
- changed_areas: [ ... ] (from `changed_areas` if present)
- reread_files: [ ... ] (from `reread_files`)
- mr_update_recommended: <true|false>
- log_append_recommended: <true|false>

Constraints:
- Do not mix context across branches.
- Do not update shared `AGENTS.md` automatically from this command; log findings first.

