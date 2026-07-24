---
description: Manage branch helper files independently
subtask: true
---

Manage helper files for project key `$ARGUMENTS`. Helper files are optional branch-local documents such as Review notes (`REVIEW.md`), Progress log (`LOG.md`), Phase plan (`PHASES.md`), and Merge request context (`MERGE_REQUEST.md`).

## Project key resolution

If `$ARGUMENTS` is provided, use it as `projectKey`. Otherwise auto-detect:

1. Get cwd via `pwd` or workspace root.
2. Resolve the config root from `OPENCODE_HOME` (default `~/.config/opencode`) and scan `<config-root>/projects/*/descriptor.json`.
3. Match cwd against each descriptor's `projectRootPath`.
4. If exactly one matches, use that `projectKey`. If zero or multiple match, ask the user.

## Workflow

1. Run refresh (`opencode_refresh_context` or `/manual-refresh`) and read the helper fields:
   - `supported_helpers`
   - `tracked_helpers`
   - `existing_helpers`
   - `missing_helpers`
   - `untracked_helpers`
   - `unsupported_helpers`
   - `available_helpers`
   - `removed_helpers`
   - `helper_drift`
   - `helper_manifest_path`
   - `manifest_error`
   If `manifest_error` is not `none`, stop and show the exact manifest path and error. Preserve the file; do not create helpers or rewrite the manifest until the user repairs or moves it.
2. Present a concise helper status summary using plain labels:
   - Review notes (`REVIEW.md`): structured findings, triage, and suggested verification for branch review.
   - Progress log (`LOG.md`): checkpoints so another session or teammate can resume safely.
   - Phase plan (`PHASES.md`): staged deliverables, exit criteria, and rollback gates for large branches.
   - Merge request context (`MERGE_REQUEST.md`): local MR goal, scope, acceptance criteria, and reviewer notes.
3. Ask what to do. Print the menu exactly:

   ```text
   A) Create helper files for this branch
   B) Repair moved or missing helper files
   C) Relink a helper file to a new path
   D) Mark helper files as intentionally removed
   E) Show status only
   ```

4. For **A**, ask which helpers to create. Use this prompt style:

   ```text
   Which helper files do you want for this branch?

   - Review notes (REVIEW.md): use this when you want structured findings, triage, and suggested verification for a branch review.
   - Progress log (LOG.md): use this when work may span sessions and you want checkpoints the next agent or teammate can resume from.
   - Phase plan (PHASES.md): use this when the branch is large enough to split into stages with clear exit criteria.
   - Merge request context (MERGE_REQUEST.md): use this when you want a local draft of the MR goal, scope, acceptance criteria, and reviewer notes.

   You can create any combination now and add or remove helper files later.
   ```

   Then use `opencode_bootstrap_branch` with `helperIds` as a comma-separated list of selected helper ids, for example `review,log` or `mergeRequest,phasePlan`. If the wrapper is unavailable, run the exact **Manual bootstrap fallback** in `/project-bootstrap` with the same selected ids.
5. For **B**, explain each drift item and offer:

   ```text
   This branch was tracking <plain helper label>, but the file is missing.

   Choose what happened:
   - Recreate it from the template: best if it was deleted by accident.
   - Relink it to another file: best if you renamed or moved it.
   - Mark it removed: best if this branch no longer needs that helper.
   - Skip for now: leave the mismatch unresolved for this run.
   ```

   Apply only the selected repair. Never recreate, relink, or mark removed without explicit user choice. For **Recreate it from the template**, use the normal bootstrap wrapper or the exact **Manual bootstrap fallback** in `/project-bootstrap`; both paths preserve existing files and update the manifest atomically.
6. For **C**, ask for the new path, verify it is a safe relative path inside the branch context folder, and update `HELPERS.json` only.
7. For **D**, confirm the helper names and paths, then update `HELPERS.json` with `state: removed`. Do not delete the helper file unless the user explicitly asks for file deletion in the same response.
8. For **E**, write nothing.

Manifest edits use a mode-0600 temporary file in the manifest directory followed by atomic replacement. On failure, preserve the previous manifest and remove the temporary file.

## Output format

```markdown
## Helper file result
- project_key: <projectKey>
- branch: <branch>
- helper_manifest_path: <path>
- manifest_error: <reason|none>
- action: <create|repair|relink|mark_removed|status>
- supported_helpers: [<ids>|none]
- tracked_helpers: [<ids>|none]
- existing_helpers: [<ids>|none]
- missing_helpers: [<ids>|none]
- untracked_helpers: [<ids>|none]
- unsupported_helpers: [<ids>|none]
- removed_helpers: [<ids>|none]
- paths_written:
  - <path or none>
```

After the block, include a short plain-language summary of what changed and what the user can do next.

## Constraints

- Do not delete existing helper files by default.
- Do not edit helper file contents unless the selected action is create from template.
- Keep helper labels plain-language first and filenames second.
- Treat `KNOWLEDGE.md` as durable project/area knowledge, not a branch helper to delete here.
