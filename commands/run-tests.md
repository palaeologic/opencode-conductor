---
description: Run relevant tests based on changed areas
argument: [area] [--filter <pattern>] [--watch]
---

# /run-tests

Run the appropriate test suite for the specified or detected area.

## Project key resolution

If `area` is omitted, detect from cwd or changed files (via `git diff --name-only`) and match against descriptor areas.

## Procedure

1. Determine area from argument, cwd, or changed files.
2. Identify the test runner for the area:
   - Prefer matching commands from the area's `AGENTS.md` `## Verification scripts` table.
   - Otherwise inspect project manifests, task files, CI, and contributor documentation for the canonical test command.
   - Treat familiar runner names only as discovery hints, not authorization to invent a command.
   - If multiple commands plausibly match, present them and ask; if none is project-backed, report that rather than guessing.
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
