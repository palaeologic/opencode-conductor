---
description: Discover and run the narrowest relevant Playwright end-to-end tests with explicit environment and state safety
subtask: true
---

Use the `playwright-e2e` skill for `$ARGUMENTS`.

## Procedure

1. Read applicable `AGENTS.md`, `KNOWLEDGE.md`, Playwright configuration, fixtures, and package scripts.
2. Identify the target environment and every mutable state layer.
3. If a mutating suite lacks documented isolation/restoration, stop and ask the user for the safe workflow.
4. List tests using the repository script or `npx playwright test --list`.
5. Present the exact focused command and any preparation/restoration commands before running them.
6. Run the narrowest relevant project, spec, or title filter. Use one worker for shared state unless documented isolation supports parallelism.
7. Restore every state layer touched by the final mutating run.
8. Report exit status, pass/fail/skip totals, environment, worker count, state handling, and diagnostic artifact paths.

Never display environment-file contents, credentials, browser storage state, or authorization material.
