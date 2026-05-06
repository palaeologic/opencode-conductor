---
description: Manual fallback refresh without tool-calling
subtask: true
---

Tool-calling is disabled. Run manual handoff refresh for project key `$ARGUMENTS` using branch context files and git delta (or **lite** git-only window when `handoffModeDefault` is `lite` and branch files are absent), then return:
- branch
- checkpoint -> head
- changed_areas
- reread_files
- mr_update_recommended
- log_append_recommended
- recommendations / risks

Rules:
1. Resolve branch and repo root.
2. If branch context files are missing, seed them from templates.
3. Read context in order: project -> area -> package -> branch files.
4. Determine checkpoint from `reviewed_through` in `LOG.md` when tracked files exist; otherwise use the last N commits window (**lite**).
5. Inspect git delta from checkpoint to `HEAD`.
6. Do not mix context across branches.
7. Do not auto-update shared package `AGENTS.md`; propose promotions separately.
