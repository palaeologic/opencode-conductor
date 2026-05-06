---
description: Run linter with auto-fix and report remaining issues
argument: [area] [--path <file-or-dir>]
---

# /lint-fix

Run the project's linter with auto-fix enabled and report remaining issues.

## Project key resolution

If `area` is omitted, detect from cwd and match against descriptor areas.

## Procedure

1. Determine area from argument or cwd.

2. Identify the lint command for the area:
   - Look for `package.json` scripts: `lint`, `lint:fix`
   - Common patterns:
     - ESLint: `npx eslint --fix <target>`
     - Biome: `npx biome check --fix <target>`
     - Ruff (Python): `ruff check --fix <target>`
     - golangci-lint: `golangci-lint run --fix`
   - If a `Makefile` has a `lint` or `lint-fix` target, prefer that.

3. If `--path` provided, scope to that file or directory.
4. Execute the lint-fix command.
5. Parse remaining (unfixable) issues.

## Output format

```
## Lint result
- area: <area>
- command: <command executed>
- status: <clean|issues_remaining>
- auto_fixed: <N> issues
- remaining: <N> issues
- issues:
  - <file>:<line>:<col> — <rule> — <message>
  - ...
- next_steps:
  - <suggestion for most common remaining issue>
```

## Constraints

- ONLY run linting — do not make manual code changes
- Report unfixable issues clearly with rule names
- If lint config is missing or broken, report the config error
- Respect ignore files (`.eslintignore`, `.prettierignore`, etc.)
