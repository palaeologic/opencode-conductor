---
description: Sort and clean up imports in source files
argument: [--file <path>] [--all]
---

# /organize-imports

Run the project's import organizer to sort, group, and clean up imports.

## Procedure

1. Determine scope:
   - If `--file` provided: run on that file only
   - If `--all` provided: run on all source files
   - If omitted: run on files changed in the current branch (`git diff --name-only`)

2. Identify the import organizer for the project:
   - Prefer a project-provided script, task, editor configuration, CI command, or contributor-documented tool.
   - Treat familiar organizer names only as discovery hints, not authorization to install or invoke an unconfigured tool.
   - If multiple tools plausibly apply, present them and ask; if none is project-backed, report that rather than guessing.

3. Let the selected project tool enforce its configured grouping, sorting, unused-import, duplicate-import, and type-import policies. Do not layer a separate ordering convention on top.

4. Report results.

## Output format

```
## Imports organized
- scope: <file|changed files|all>
- files_processed: <N>
- files_modified: <N>
- next_steps:
  - Run /check-types to verify no broken imports
  - Commit changes if clean
```

## Constraints

- This is a formatting/organizational change only — no semantic changes
- Respect project ignore patterns and config includes/excludes
- Do not organize imports in test fixtures or generated files
- If no organizer is installed, report setup instructions
