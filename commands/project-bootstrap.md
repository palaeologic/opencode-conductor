---
description: Generic branch bootstrap via descriptor-driven tool
subtask: true
---

Workflow:
1. Ask the user exactly this yes/no question before bootstrapping:
   - `Do you want phased delivery for this branch?`
   - Allowed answers: `yes` or `no`
   - If unclear, ask again until answer is clearly `yes` or `no`
2. Call `opencode_bootstrap_branch` with:
   - `projectKey: $ARGUMENTS`
   - `includePhases: true` when answer is `yes`
   - `includePhases: false` when answer is `no`
3. Parse the tool response (JSON string) and verify:
   - `applicable === true` (otherwise stop and report `reason`)
4. If applicable, read:
   - `mr_context_path`
   - `log_context_path`
   - `phases_context_path` (if present)
5. Return a short summary:
   - branch name
   - what was created/seeded (from `created`)
   - file paths for MR/LOG/optional PHASES
   - whether phased delivery is enabled

Constraints:
- Do not overwrite existing branch context files (tool enforces this).

