---
name: review-branch
description: Orchestrate a full branch review workflow combining context refresh, review artifact generation, type checking, and test execution
---

## What I do

Guide a systematic branch review by sequencing handoff kit commands and verification steps in the correct order, with decision points between each stage.

## When to use me

- You are reviewing a branch before merge
- You want a comprehensive quality check on current changes
- You need to generate a review artifact (checklist or diff summary) for a colleague
- After completing a feature, before opening a merge request

## Workflow

### 1. Gather context

Run `/manual-refresh` (or `/project-refresh` if tools are available) to understand:
- What branch you're on and what changed
- Which areas are affected
- Current state of branch context files

### 2. Generate review artifact

Run `/project-review` and choose the artifact type:
- **Checklist** — actionable items to verify before merge
- **Diff summary** — structured breakdown of changes by area
- **Both** — comprehensive review package

### 3. Verify type safety

Run `/check-types` for each affected area. If errors exist:
- Report them clearly
- Ask the user whether to fix now or continue reviewing

### 4. Run tests

Run `/run-tests` scoped to affected areas. If failures exist:
- Report which tests failed and why
- Distinguish pre-existing failures from newly introduced ones (compare with base branch if possible)

### 5. Lint check

Run `/lint-fix` to catch style issues. Report any unfixable problems.

### 6. Summary

Present a final review summary:
- Areas reviewed
- Type check status
- Test status
- Lint status
- Outstanding concerns or recommendations

## Decision points

- If type check fails badly (>10 errors), pause and ask user before continuing to tests
- If tests reveal pre-existing failures unrelated to the branch, note them separately
- If the branch has no test coverage for new code, flag it as a recommendation
