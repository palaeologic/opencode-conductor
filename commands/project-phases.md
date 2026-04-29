---
description: Create or refine PHASES.md for large branches
subtask: true
---

Workflow:
1. Call `opencode_bootstrap_branch` with:
   - `projectKey: $ARGUMENTS`
   - `includePhases: true`
2. Parse the JSON result.
3. If `applicable` is false, stop and report `reason`.
4. Open/read these branch files:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path`
5. Ask user preferred mode:
   - **AI draft**: draft full phase plan
   - **User-led**: user provides phase text and agent structures it
   - **Hybrid**: user provides notes and agent proposes/iterates
6. If user provides notes/docs, use them as primary source.
7. If `PHASES.md` is newly created:
   - draft initial plan aligned to `MERGE_REQUEST.md` and provided notes
   - use phase+iteration notation when helpful (`1.0`, `1.1`, `1.2`)
   - set a clear active phase
8. If `PHASES.md` already existed:
   - refine only if user asked for updates
9. Return:
   - whether `PHASES.md` was newly created (`created.phasesFile`)
   - active phase
   - suggested next phase task

