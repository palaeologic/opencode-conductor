---
description: Run type checking for the appropriate project area
argument: [area]
---

# /check-types

Run the project's type checker and report errors in a structured format.

## Project key resolution

If `area` is omitted, detect from the current working directory by matching against `descriptor.json` area paths.

## Procedure

1. Determine area from argument or cwd.

2. Identify the type-check command for the area:
   - Prefer matching commands from the area's `AGENTS.md` `## Verification scripts` table.
   - Otherwise inspect project manifests, task files, CI, and contributor documentation for the canonical type-check command.
   - Treat familiar type-checker names only as discovery hints, not authorization to invent a command.
   - If multiple commands plausibly match, present them and ask; if none is project-backed, report that rather than guessing.

3. Execute the command in the area's root directory.

4. Parse output and report.

## Output format

```
## Type check result
- area: <area>
- command: <command executed>
- status: <pass|fail>
- error_count: <N>
- errors:
  - <file>:<line> — <error message>
  - ...
- suggestion: <fix hint if obvious pattern detected>
```

## Constraints

- Execute only the type check command — do not auto-fix
- Report all errors; do not truncate unless > 50 (then summarize)
- If the command fails to start (missing deps), report the setup issue instead
