---
name: verify-changes
description: Decision tree for verifying code changes — detects affected areas and runs type checking, tests, and linting
---

## What I do

Automatically determine which verification steps are needed based on what changed, then execute them in the right order. Acts as a smart dispatcher for `/check-types`, `/run-tests`, and `/lint-fix`.

## When to use me

- After making code changes and wanting to verify correctness
- Before committing to ensure nothing is broken
- When the user says "check if everything still works"
- After a refactoring to confirm no regressions

## Workflow

### 1. Detect affected areas

Determine what changed:
```
git diff --name-only HEAD
```

Map changed files to project areas using the descriptor's area paths. If multiple areas are affected, verify each.

### 2. Type check first

Run `/check-types` for each affected area.

**If types fail:**
- Report errors clearly
- Ask user: fix now or continue to tests?
- Type errors often indicate deeper issues — fixing them first saves time

### 3. Run tests

Run `/run-tests` for each affected area.

**Scoping strategy:**
- If <5 files changed: try to identify directly related test files
- If >5 files changed: run the full area test suite
- If a test utility or fixture changed: run all tests in that area

**If tests fail:**
- Distinguish between:
  - Tests that fail due to your changes (likely bugs)
  - Tests that were already failing (pre-existing)
- Report both categories separately

### 4. Lint

Run `/lint-fix` on changed files.

- Auto-fix what can be fixed
- Report remaining issues with rule names
- Don't count style issues as blockers unless they indicate logic errors

### 5. Report summary

```
## Verification result
- areas_checked: [<list>]
- types: <pass|fail (N errors)>
- tests: <pass|fail (N failures)>
- lint: <clean|N issues remaining>
- verdict: <ready to commit|needs fixes>
- blocking_issues:
  - <issue 1>
  - ...
```

## Decision logic

```
changes detected
  → for each area:
      types pass?
        yes → run tests
        no  → report, ask user
      tests pass?
        yes → lint
        no  → report failures
      lint clean?
        yes → area verified
        no  → report remaining issues
  → all areas verified? → "ready to commit"
```

## Tips

- Run verification after each logical unit of work, not just at the end
- If verification takes too long (>2 min), suggest scoping to changed files only
- Pre-existing failures should be noted but not block the current work
