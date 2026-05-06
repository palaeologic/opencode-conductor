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
   - Look for dedicated tools: `organize-imports-cli`, `import-sort`, project-specific scripts
   - Common patterns:
     - ESLint with `eslint-plugin-import` sort rules: `npx eslint --fix --rule 'import/order: error'`
     - Biome: `npx biome check --fix --formatter-enabled=false`
     - Python (isort): `isort <target>`
     - Go: `goimports -w <target>`
   - If the project has a custom workspace script, prefer that.

3. The tool enforces:
   - Import grouping: externals → aliases → relatives
   - Alphabetical sorting within groups
   - Removal of unused imports
   - Merging of duplicate imports from same module
   - `import type` separation where applicable

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
