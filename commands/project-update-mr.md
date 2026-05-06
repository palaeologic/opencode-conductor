---
description: Update MERGE_REQUEST.md using git facts and branch context
subtask: true
---

Update the current branch `MERGE_REQUEST.md` for project key `$ARGUMENTS`.

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:
1. Get cwd via `pwd` or workspace root.
2. Scan `~/.config/opencode/projects/*/descriptor.json` files.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Goal

Keep `MERGE_REQUEST.md` current by merging:
- objective git facts (diff scope, changed areas, verification state)
- branch context (`LOG.md`, optional `REVIEW.md`, optional `PHASES.md`, optional `MR.md`)
- existing hand-curated MR narrative

without overwriting human-authored intent sections.

## Procedure

1. Resolve branch and descriptor.
2. Run refresh context (tool path or manual fallback) to get:
   - branch, checkpoint/head, changed areas/files, recommendations.
3. Read branch files from `branches/<branch-name>/`:
   - `MERGE_REQUEST.md` (required target)
   - `LOG.md` (latest entries)
   - `REVIEW.md` if present
   - `PHASES.md` if present
   - `MR.md` if present
4. Compute a concise git summary since checkpoint/merge-base:
   - changed files count and primary areas
   - notable adds/deletes/renames
5. Ask user whether to:
   - **A) Update in place (safe merge)**
   - **B) Append an update section only**
   - **C) Regenerate full MR draft (preserve protected sections)**
6. Update `MERGE_REQUEST.md` according to user choice:
   - Preserve protected sections if present:
     - `## Context`
     - `## Goals`
     - `## Deliverables`
     - `## Open questions`
   - Refresh operational sections:
     - `## Scope status`
     - `## Files/areas touched`
     - `## Verification status`
     - `## Risks and reviewer focus`
     - `## Next steps`
7. Write updated file and report path.

## Output format (MUST use exactly)

```markdown
## MR update result
- project_key: <projectKey>
- branch: <branch-name>
- mode: <in_place|append_only|regenerate_with_preserve>
- path: <full path to MERGE_REQUEST.md>
- sections_updated:
  - <section 1>
  - <section 2>
  - ...
```

After the structured block, show the updated MR content inline.

## Constraints

- Do not execute tests or code changes.
- Prefer merging over destructive rewrite.
- If `MERGE_REQUEST.md` is missing, create from template first, then update.
- Keep updates deterministic and grounded in branch files + git facts.
