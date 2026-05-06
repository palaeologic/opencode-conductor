---

## description: Run relevant tests based on changed areas
argument: [area] [--filter ] [--watch]

# /run-tests

Run the appropriate test suite for the specified or detected area.

## Project key resolution

If `area` is omitted, detect from cwd or changed files (via `git diff --name-only`) and match against descriptor areas.

## Procedure

1. Determine area from argument, cwd, or changed files.
2. Identify the test runner for the area:
  - Look for `package.json` scripts: `test`, `test:unit`, `test:e2e`
  - Common patterns:
    - Jest: `npx jest [--testPathPattern=<pattern>]`
    - Vitest: `npx vitest run [<pattern>]`
    - Bun: `bun test [--filter <pattern>]`
    - pytest: `python -m pytest [<path> -k <pattern>]`
    - Go: `go test ./... [-run <pattern>]`
  - If a `Makefile` has a `test` target, consider it.
3. If `--filter` provided, scope to matching test files/names.
4. If `--watch` provided, add the watch flag.
5. Execute and capture output.

## Output format

```
## Test result
- area: <area>
- command: <command executed>
- status: <pass|fail>
- total: <N>
- passed: <N>
- failed: <N>
- skipped: <N>
- failures:
  - <test name> — <reason>
  - ...
- duration: <time>
```

## Constraints

- Do NOT modify code to fix failing tests — report only
- If no test files match the filter, report "no tests found" and suggest broadening
- Respect the area's package manager and test framework

