---
name: refactor-safely
description: Step-by-step safe refactoring with verification at each step to ensure no regressions
---

## What I do

Guide refactoring that preserves behavior while improving code structure. Each step is small, verifiable, and reversible.

## When to use me

- Code works but is hard to understand, extend, or maintain
- You need to rename, extract, move, or restructure code
- Preparing code for a new feature (make the change easy, then make the easy change)
- Cleaning up after a spike or prototype

## Workflow

### 1. Establish a safety net

Before any refactoring:
- Ensure tests pass: run `/check-types` and `/run-tests`
- If test coverage is thin for the area, write characterization tests first
- Commit current state — you need a clean rollback point

### 2. Plan the refactoring

Identify the target end-state and decompose into atomic steps:

| Refactoring type | Atomic steps |
|-----------------|--------------|
| Extract function | Copy code → create function → replace original → verify → clean imports |
| Rename | Find all usages → rename → verify nothing broke |
| Move file | Create new location → update imports → move code → verify → delete old |
| Extract component | Identify props → create component → replace usage → verify render |
| Inline | Copy implementation to call site → remove original → verify |
| Change signature | Add new param with default → migrate callers one by one → remove default |

### 3. Execute one step at a time

For each atomic step:
1. Make the change
2. Run `/check-types` — types should pass
3. Run `/run-tests` — tests should pass
4. If either fails: fix immediately or revert the step

Never batch multiple refactoring steps without verification between them.

### 4. Handle cascading changes

When a refactoring affects many files:
- Start from the leaf (most specific) and work toward the root (most general)
- For renames: use the IDE/tool rename capability when available
- For moves: update the barrel/index exports first, then fix import paths
- Commit after each file group passes verification

### 5. Final verification

After all steps:
- Run full type check and test suite
- Run `/lint-fix` to catch any formatting drift
- Review the diff holistically — does the end state match your plan?
- If something looks wrong, you can revert to any intermediate commit

## Rules

- Never change behavior and structure in the same commit
- Never refactor code you don't have tests for (write tests first)
- Prefer many small PRs over one large refactoring PR
- If a refactoring grows beyond plan, stop, commit progress, and reassess
