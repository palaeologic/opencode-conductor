---
description: Read-only kit state summary (working tree, HEAD/base, divergence, drift, kit stashes, recent kickoff audit)
agent: plan
subtask: true
---

Loads skill (when available): `git-safety` for consistent preflight banner and kit-stash conventions.

Read-only command to answer "what does the kit think about my current branch state?" without mutating git or branch artifacts.

## Arguments

`$ARGUMENTS` supports:

- `verbose` — include expanded file lists and full stash entries.
- `no-preflight` — skip knowledge-drift sub-check.

Unknown tokens must be surfaced and ignored unless the user confirms.

## Read-only anchors

Use fixed shell injections:

```
!`git status --porcelain`
!`git symbolic-ref --quiet HEAD || echo DETACHED`
!`git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`
!`git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo 0 0`
!`git stash list`
```

Never interpolate `$ARGUMENTS` into shell-injection blocks.

## Workflow

1. Load `skills/git-safety` and emit its banner.
2. Derive current branch, base, and ahead/behind counts.
3. If `no-preflight` is not present, run the same read-only drift check used by `/project-review`:
   - resolve base via `origin/HEAD` -> `main` -> `master`
   - compute `AGENTS.md` drift set between `merge-base(HEAD, origin/<base>)` and `origin/<base>`
   - do not write findings; summarize as state.
4. List kit-managed stashes (`opencode-kit:` prefix) for current branch, with age hints.
5. Read the latest 5 kickoff-related entries from branch `LOG.md` when available (`Kickoff` / `Stash` headers).
6. Emit a sectioned markdown report only. Do not write files.

## Output format

```
## Project state
### Working tree
- status: <clean|dirty>
- unstaged_untracked_count: <N>

### HEAD and base
- head: <attached branch | DETACHED>
- base: <base branch or unresolved>
- divergence: ahead <N>, behind <N>

### Knowledge drift
- preflight: <on|skipped(no-preflight)>
- drift_files: <0|N>
- files: [<path>, ...]   # omitted when zero unless verbose

### Kit stashes
- count: <N>
- entries:
  - <stash@{N}: opencode-kit:...>

### Recent kickoff audit (last 5)
- <timestamp + command summary>
```

## Constraints

- Strictly read-only: no `git checkout`, no `git stash`, no writes to `LOG.md` or `MERGE_REQUEST.md`.
- Keep default output concise; expand only in `verbose` mode.
