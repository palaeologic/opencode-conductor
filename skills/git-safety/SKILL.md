---
name: git-safety
description: Standalone git safety primitive — refuse-on-dirty preflight, base-branch resolution, kit-stash naming convention, and stash-reminder hook for any command that touches git state; never auto-stashes, never runs destructive ops without per-step confirmation
---

## What I do

Provide a uniform, conservative safety gate before any kit command mutates git state. I check the working tree, resolve the integration base, surface kit-managed stashes, and refuse to proceed when the workspace is in an unsafe state. I never modify state on my own — I only inform and gate.

## When to use me

- A command is about to run `git fetch`, `git checkout`, `git pull`, `git checkout -b`, `git stash`, or any other state-changing git operation.
- A command needs to resolve the integration base branch (`origin/HEAD` → `main` → `master`).
- A command wants to surface kit-managed stashes left behind on the current branch.
- A command needs a deterministic preflight banner before its main flow.

Skip me only for commands that read git state (e.g. `git log`, `git diff`) without mutating it — those have no safety gate to enforce.

## Anti-pattern

This skill **never loads other skills**. Commands compose; skills do not. If you find yourself wanting to load another skill from inside `git-safety`, the right answer is to load both skills from the calling command instead.

## Safety preflight

Run the following checks in order. The first failure aborts with a remediation hint; do not run later checks if an earlier one fails.

### 1. Working tree must be clean

Inspect `git status --porcelain`. If output is non-empty:

- **Refuse** to proceed.
- Emit: "Working tree has uncommitted changes. Commit, stash, or discard before continuing."
- Do **not** auto-stash. Auto-stash hides intent and creates lost-work risk; the user must opt in explicitly per command.

### 2. HEAD must be attached

Inspect `git symbolic-ref --quiet HEAD`. If empty / failed (detached HEAD):

- **Refuse** to proceed.
- Emit: "HEAD is detached. Check out a named branch before continuing."

### 3. Base branch resolution

Resolve the integration base in this order:

1. `git symbolic-ref refs/remotes/origin/HEAD` — strip the `refs/remotes/origin/` prefix.
2. If unset or failed: try `main`.
3. If `main` is missing on the remote: try `master`.
4. If neither exists: **refuse** with "Cannot resolve a base branch. Configure `origin/HEAD` or ensure `main`/`master` exists."

Cache the resolved base for the session so subsequent calls do not re-fetch.

### 4. Destructive ops require per-step confirmation

Any of `git reset --hard`, `git clean -fd`, `git push --force`, `git rebase`, `git stash drop`, `git stash clear` requires an explicit one-line preview + user confirmation immediately before execution. Aggregate confirms are allowed only for read-only sequences (`status`, `fetch --dry-run`, `log`).

## Kit-stash convention

Any kit-initiated stash MUST follow these rules so it can be reliably detected without a separate registry file.

### Naming

```
opencode-kit:<command>:<original-branch>:<iso-timestamp>
```

- `<command>` is the slash command name without the leading `/` (e.g. `project-branch-explore`).
- `<original-branch>` is the branch the user was on when the stash was created.
- `<iso-timestamp>` is a UTC ISO-8601 timestamp without colons (filesystem-safe), e.g. `2026-05-08T093421Z`.

Example: `opencode-kit:project-branch-explore:feature-redact-pii:2026-05-08T093421Z`.

### Detection

```
git stash list | grep -E '^stash@\{[0-9]+\}: On [^:]+: opencode-kit:'
```

This is the source of truth. No registry file is needed; matching against the prefix is reliable as long as the convention is followed.

### Audit entry on creation

Append to the active branch's `LOG.md`:

```
### Stash <ISO timestamp>
- command: /<command-name>
- original-branch: <branch>
- target-branch: <where-we-are-going>
- stash-message: opencode-kit:<command>:<original-branch>:<iso-timestamp>
- reminder: pop or drop on return to original-branch
```

### Reminder hook

At the start of any command that loads `git-safety`, after the safety preflight passes, run the stash reminder check:

1. List kit-managed stashes via the detection grep above.
2. Filter to stashes whose `<original-branch>` equals the current branch (i.e. the user is back home and may have forgotten work).
3. If any match, emit a structured banner:

```
[git-safety] Kit-managed stash(es) on this branch:
  - <stash-message> (<age>)
  Action: `git stash pop` to restore, or `git stash drop stash@{N}` to discard.
```

4. Cross-check: read recent `### Stash` entries from `LOG.md`. For each entry whose stash-message is **not** present in `git stash list`, emit a recoverable warning:

```
[git-safety] LOG references stash <stash-message> but it is not in `git stash list`.
  It was likely dropped or popped externally. Verify your work is preserved.
```

The reminder hook is silent when no matching stashes exist.

## Frontmatter

This skill exposes:

- `name: git-safety`
- `description` tuned so the agent reaches for it whenever a command intends to mutate git state.

## Output format

When invoked from a command, emit a single banner block before the command's main flow:

```
[git-safety]
- working tree: clean | dirty
- HEAD: attached on <branch> | detached
- base: <base-branch>
- kit stashes on this branch: <count>
```

If any line is unsafe (dirty / detached / unresolved base), the banner ends with `STATUS: refused` and the command must abort.

## Anti-patterns to avoid

- **Auto-stashing on dirty.** The user owns the working tree; the kit only ever surfaces options.
- **Loading other skills from this skill.** See [Anti-pattern](#anti-pattern). Skill recursion breaks the audit graph.
- **Skipping the reminder hook.** A stash without a reminder is a lost-work footgun.
- **Interpolating user input into shell commands.** All git invocations from this skill use fixed argument lists; never construct command lines from `$ARGUMENTS`, `$1`, or any user-provided string. See `documentation/PATH_CONTRACT.md` security rules.
- **Forcing destructive ops.** `--force`, `reset --hard`, `clean -fd` are always per-step confirmed; never aggregate-confirmed.

## Related

- Baseline persona: `rules/SENIOR_ENGINEERING.md` (cautious, reversible, surface-risk).
- Loaded by: `skills/branch-kickoff/SKILL.md` and any future command that touches git state (e.g. `commands/project-branch-explore.md`, `commands/project-state.md` from later plans).
- Contract: `documentation/PATH_CONTRACT.md` § Security rules and § Kit-stash convention.
