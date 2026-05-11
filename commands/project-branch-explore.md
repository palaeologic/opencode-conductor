---
description: Switch to a target branch and generate EXPLORE_GUIDE.md with setup, what changed, how to try, and caveats
subtask: false
---

Loads skills (when available):

- `git-safety` for preflight + stash conventions
- `branch-explore` for guide synthesis lens

Use this command when the user wants a manual exploration guide for a branch, without browser automation.

## Arguments

`$ARGUMENTS` supports:

- positional `$1` — target branch (required unless prompted)
- `no-preflight` — skip drift sub-check in state summary
- `no-stash-check` — skip stash reminder banner from `git-safety`

Unknown tokens should trigger a clarification prompt.

## Workflow

1. Resolve target branch:
   - if `$1` exists, use it
   - else prompt for branch name/ref
2. Load `git-safety` and run preflight.
   - default: refuse on dirty tree
   - if the user explicitly asks to stash, use kit-stash convention and ask before stashing
3. Confirm and switch branch:
   - preview `git fetch origin --prune`
   - preview `git checkout <target>`
   - execute each only after explicit confirm
4. Gather exploration context:
   - `merge-base(origin/HEAD, HEAD)..HEAD` commits
   - `git diff --name-only` for dependency/setup hints
   - branch context files (`MERGE_REQUEST.md`, `LOG.md`) when present
   - area **`KNOWLEDGE.md`** files (legacy area `AGENTS.md`) for run-local notes
5. Load `branch-explore` skill and draft `EXPLORE_GUIDE.md` with sections:
   - `## Setup`
   - `## What's new`
   - `## How to try it`
   - `## Caveats`
6. Write guide to active branch context folder:
   - `<contextDirTemplate>/EXPLORE_GUIDE.md`
7. Ask whether to return to the original branch.
   - recommendation: yes when exploration is complete
   - if a kit-stash was created in step 2 and user returns, prompt to pop/drop

## Output format

```
## Branch explore result
- target_branch: <branch>
- previous_branch: <branch>
- explore_guide_path: <path>
- switched_back: <yes|no>
- stash_created: <yes|no>
- next_step: <manual exploration action>
```

## Constraints

- No browser automation or screenshot actions.
- Do not auto-run setup commands; only suggest them.
- Never write outside the branch context folder for this command.
