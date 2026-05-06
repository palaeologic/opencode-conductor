---
description: Generate a review artifact for the current branch
subtask: true
---

Generate a review artifact for project key `$ARGUMENTS`.

## Procedure

1. Run refresh internally (call `opencode_refresh_context` or manual refresh steps) to gather: branch, changed_areas, changed_files, risks from `LOG.md`, MR acceptance criteria from `MERGE_REQUEST.md`.
2. Ask the user which artifact type to generate:
   - **A) Review checklist** — areas to review, tests to run, risks to verify, acceptance criteria status
   - **B) Diff summary** — changes grouped by area with inline reviewer questions and notes
   - **C) Both** — combined into a single file
3. Generate the chosen artifact based on actual branch state (not generic templates).
4. Write it to the branch context folder as `REVIEW.md`:
   `~/.config/opencode/projects/$ARGUMENTS/branches/<branch-name>/REVIEW.md`
5. Suggest verification commands the user may want to run (do NOT execute them).

## Output format (MUST use exactly)

```
## Review artifact generated
- project_key: $ARGUMENTS
- branch: <branch-name>
- artifact_type: <checklist|diff_summary|both>
- path: <full path to REVIEW.md>
- suggested_verifications:
  - <command 1 — e.g. bun run lint>
  - <command 2 — e.g. python manage.py test --tag=gql>
  - ...
```

After the structured block, display the generated `REVIEW.md` content inline for immediate readability.

## Review checklist format (type A)

When generating a checklist, include:

- [ ] Areas touched (list each with key files)
- [ ] Tests to run (specific commands per area)
- [ ] Risks to verify (from LOG.md and git delta analysis)
- [ ] Acceptance criteria (from MERGE_REQUEST.md — tick those already met)
- [ ] Snapshot/schema sync (if applicable)
- [ ] Cross-area concerns (e.g. GQL types matching backend mutations)

## Diff summary format (type B)

When generating a diff summary, group by area:

```markdown
### <area-name> (N files changed)

| File | Change type | Reviewer question |
|------|-------------|-------------------|
| path/to/file | added/modified/deleted | What should the reviewer check? |

Key concern: <area-specific risk or note>
```

## Constraints

- **Read-only**: NEVER run tests, make code changes, or execute verification commands.
- **Branch-local**: `REVIEW.md` lives in the branch context folder only.
- **Non-destructive**: if `REVIEW.md` already exists, ask user whether to overwrite or append.
- **Deterministic**: base content on actual git diff and branch files, not assumptions.

## Manual fallback

When tools are unavailable:
1. Resolve branch and branch context folder manually.
2. Read `MERGE_REQUEST.md`, `LOG.md`, and run `git diff --stat` against baseline.
3. Ask user for artifact type choice.
4. Generate and write `REVIEW.md` to the branch folder.
