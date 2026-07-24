# Path contract (kit tools vs descriptor)

This document records the behavior of the Conductor Bun tools in [`tools-off/_opencode_engine.ts`](../tools-off/_opencode_engine.ts) (loaded by `tools-off/opencode_*.ts`). The installer places them under **`$OPENCODE_HOME/tools-off/`** so they are not mixed into **`tools/`**, where some hosts auto-register every module as an exposed tool. It matters for **global vs project-local durable state**: only fields that the engine reads from `descriptor.json` can move into the repo; the descriptor file location has a separate contract.

## What the engine honors from `descriptor.json`

After loading the descriptor, **`opencode_bootstrap_branch`** and **`opencode_refresh_context`** resolve:

- `branchHandoff.contextDirTemplate` — expanded with `{projectKey}` and `{branchName}`; `~/` is expanded to the user home directory.
- `branchHandoff.templatesDir` — same expansion rules.
- `branchHandoff.helpers` — schema v3 helper registry for branch-local helper files, including filenames, template filenames, roles, and plain-language descriptions.
- `branchHandoff.helperManifestFilename` — branch-local helper manifest filename, defaulting to `HELPERS.json`.
- `projectAgentsPath` — project-root `AGENTS.md` used first for refresh `reread_files` and project-rule staleness checks.
- `projectRootPath` — workspace membership, project-root `AGENTS.md` fallback, and source-relative path calculations.
- `opencodeProjectRootPath` — for leaf `KNOWLEDGE.md` paths and legacy project-root `AGENTS.md` fallback.
- Each area’s `areaAgentsPath` — same `~/` expansion.
- `baselineBranchForMaterialChanges` — fallback integration branch if `origin/HEAD` is not configured.

So **branch helper files** (`MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, `REVIEW.md`, …), leaf `KNOWLEDGE.md` mirrors, and manually owned `AGENTS.md` rule files can live under **the git repo** (or any absolute path) as long as those JSON fields point there. The refresh engine resolves project-root rules in this order: `projectAgentsPath` → `<projectRootPath>/AGENTS.md` → `<opencodeProjectRootPath>/AGENTS.md`.

## Branch helper registry and manifest

`descriptorSchemaVersion: 3` treats branch helper files as optional, independent documents. The descriptor declares what the project supports under `branchHandoff.helpers`; each branch records what it actually uses in `HELPERS.json`.

Helper state is reconciled from three sources:

- Descriptor support: the helper id exists under `branchHandoff.helpers`.
- Branch tracking: the helper id exists in `HELPERS.json` and is not marked `removed`.
- Filesystem reality: the helper file exists under the branch context folder.

Refresh reports:

- `supported_helpers` — helper ids declared in the descriptor.
- `tracked_helpers` — helpers this branch intends to use.
- `existing_helpers` — helper files found now.
- `missing_helpers` — tracked helpers whose files are gone.
- `untracked_helpers` — supported helper files found but not tracked yet.
- `unsupported_helpers` — manifest entries or common helper files that the descriptor no longer supports.
- `available_helpers` — supported helpers the branch has not opted into.
- `helper_drift` — moved, missing, untracked, or unsupported helper states that need a user decision.
- `removed_helpers` — helpers deliberately marked removed in the manifest.
- `manifest_error` — malformed or unreadable manifest state; commands must preserve the file and ask the user to repair it.
- `invalid_path` — a descriptor or manifest path failed containment or filename validation.

Refresh must not silently recreate helper files. Use `/project-helper <projectKey>` to create, relink, mark removed, or skip helper files with plain-language prompts.

Bootstrap preflights the complete selected helper set before writing. It refuses symbolic links, non-regular files, root escapes, missing declared templates, and invalid existing manifests. Missing helpers use exclusive creation with mode `0600`; the manifest uses a unique mode-`0600` temporary file and atomic replacement. If a later write fails, bootstrap removes only helper files created by that attempt. The manual fallback in `/project-bootstrap` follows the same contract.

Schema v1 and v2 descriptors remain supported through an internal compatibility adapter. Their fixed `mrFilenames`, `logFilename`, `phasesFilename`, and `reviewFilename` fields are exposed to the rest of the engine as helper definitions. Existing branches without a helper manifest implicitly track helper files that already exist; upgrading does not require an immediate manifest rewrite.

## Descriptor file location (current limitation)

`loadDescriptor(projectKey)` reads **only**:

`$OPENCODE_HOME/projects/<projectKey>/descriptor.json`

`OPENCODE_HOME` defaults to `~/.config/opencode` when unset.

There is **no** automatic discovery of `descriptor.json` inside the repo. Therefore:

- **Project-local mode** in `/project-init` still **writes** `descriptor.json` under `$OPENCODE_HOME/projects/<projectKey>/`.
- It sets **`opencodeProjectRootPath`**, **`branchHandoff.contextDirTemplate`**, **`templatesDir`**, and **`areaAgentsPath`** to paths under `<git-root>/.opencode-conductor/` (or `.opencode/` if chosen) so durable **data** lives beside the clone while the **control-plane** descriptor stays in OpenCode config.

Changing this would require engine work (e.g. resolve descriptor from repo) and is out of scope unless product requirements demand it.

## Locked layout: project-local roots

When the user chooses **project-local** state, generated paths use a single root directory next to the repo (default name **`.opencode-conductor/`**, optional **`.opencode/`**):

| Field | Pattern |
| ----- | ------- |
| `opencodeProjectRootPath` | `<gitRoot>/<dir>` |
| `branchHandoff.contextDirTemplate` | `<gitRoot>/<dir>/branches/{branchName}` |
| `branchHandoff.templatesDir` | `<gitRoot>/<dir>/_templates/mr` |
| `areas.*.areaAgentsPath` | `<projectRootPath>/<area>/AGENTS.md` by default; `<gitRoot>/<dir>/<area>/AGENTS.md` only when explicitly selected |

`<gitRoot>` is written in the same style as `projectRootPath` (prefer `~/...` when the repo is under the user’s home directory; otherwise use an absolute path). **`{projectKey}`** appears only where the template already uses it today; the branch folder pattern uses **`branches/{branchName}`** directly under `<dir>` (no extra `projects/{projectKey}` segment under repo-local, to avoid redundant nesting).

## Commands that scan descriptors

Slash commands scan `$OPENCODE_HOME/projects/*/descriptor.json`: that is where **descriptor files** live. Branch folders are always resolved from the loaded descriptor as above.

## Knowledge audience

`AGENTS.md` rule files and leaf `KNOWLEDGE.md` files are **dual-audience by design**. The agent loads them deterministically during refresh and review preflight; humans read them as onboarding and reference material. Authors should therefore write for both consumers: short, factual prose with concrete file paths, framework names, and verification steps. The agent uses headings as cues; humans read the file top-to-bottom.

## Source-tree-mirror convention for leaf knowledge

Descriptor schema v2 and later adopt a convention path for **leaf-level** `KNOWLEDGE.md` files (a leaf is a package, module, or other meaningful sub-tree). The canonical location is:

```
<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md
```

Legacy installs may use `AGENTS.md` at the same path; the refresh engine prefers `KNOWLEDGE.md` when both exist.

where `<rel>` is the leaf's path **relative to `projectRootPath`**, derived from a `pseudoPackageDetection` rule's `pathPattern` up to and including the first `{packageName}` segment.

Worked examples (vendor-neutral):

- Rule `pathPattern: "frontend/src/{packageName}/**/*"` -> `<opencodeRoot>/frontend/src/<pkg>/KNOWLEDGE.md`.
- Rule `pathPattern: "backend/{packageName}/**/*"` (prefix kind) -> `<opencodeRoot>/backend/<pkg>/KNOWLEDGE.md`.
- Rule `pathPattern: "packages/{packageName}"` -> `<opencodeRoot>/packages/<pkg>/KNOWLEDGE.md`.

Project-local layout uses the same rule rooted at `<git-root>/<dir>/...` instead of `~/.config/opencode/projects/<key>/...`.

`trackedKnowledgeTargets.sharedPackageKnowledge` is now **optional**:

- If a leaf's knowledge lives at the convention path -> no descriptor entry needed.
- If a leaf needs a non-default path (legacy, generated, shared between leaves) -> keep an explicit entry as an override.

### Stem derivation contract

Given a `pseudoPackageDetection` rule with `pathPattern = P` and a detected `packageName = N`:

1. Let `S` be the longest prefix of `P` that ends with `{packageName}`. If `P` does not contain `{packageName}`, the rule is **area-level documentation only** and contributes no leaves.
2. Substitute `N` for `{packageName}` in `S`. Call this `<rel>`.
3. The convention path is `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md`.

`pathPattern` semantics:

- The prefix up to and including the first `{packageName}` is the **knowledge stem** used by commands.
- `**` matches any depth, `*` matches a single segment — both are descriptive only.
- The kit does **not** enforce depth or extension constraints from the pattern.

### Disambiguation

- Every rule MUST declare `area`. Reject the descriptor on missing `area` (no silent inference).
- When multiple rules match a file, **longest matching stem wins**; ties broken by descriptor array order.
- Same `packageName` in different `area`s is allowed and produces distinct convention paths.

### Knowledge-write safety guardrails

- **Package name normalization:** match `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; reject anything else with `invalid_package_name`. Case-sensitive on disk; do not lowercase.
- **Root containment:** every resolved write target MUST be a strict sub-path of `opencodeProjectRootPath` (global) or `<git-root>/<dir>` (project-local). Otherwise abort with `path_outside_root`.
- **Leaf-only knowledge writes:** discovery/preflight auto-writes MUST target leaf `KNOWLEDGE.md` files only. Refuse project-root or top-layer targets such as `<opencodeProjectRootPath>/KNOWLEDGE.md`, `<opencodeProjectRootPath>/<area>/KNOWLEDGE.md`, and any `AGENTS.md` target with `top_layer_refused` or `legacy_agents_override` as appropriate.
- **Symlink refusal:** before write, `lstat` the target; if `KNOWLEDGE.md` (or legacy `AGENTS.md`) exists as a symlink, abort with `symlink_refused`.
- **Non-destructive writes:** if `KNOWLEDGE.md` already exists, do not overwrite. Discovery treats it as already-tracked; preflight records it as `existing`.
- **No remote IO:** scaffolding is purely local; no network calls.

### Backward compatibility

Schema v1 descriptors may keep `pseudoPackageDetection` as a single object; commands MUST normalize it to a single-rule array on read. See [`UPGRADING.md`](UPGRADING.md) for the optional schema v3 migration.

### Leaf template contract

The canonical scaffold body for new leaf files lives at [`templates/knowledge/LEAF_KNOWLEDGE.md`](../templates/knowledge/LEAF_KNOWLEDGE.md). Commands render it with these placeholders:

- `<packageName>` — detected leaf/package name.
- `<areaName>` — descriptor area key.
- `<sourceRelPath>` — source-tree relative path mirrored by the knowledge file.
- `<aliasesJsonArray>` — JSON/YAML-compatible array of aliases from the matching rule, or `[]`.

The template is intentionally sparse and dual-audience. It gives agents deterministic headings (`Purpose`, `Use When`, `Public Surface / Entry Points`, `Invariants`, `Verification`, `Known Pitfalls`) while giving humans a five-minute package orientation. Rich content should come from focused code reading or `/project-knowledge-refresh`, not from bulk discovery guesses.

## Structured-knowledge-table schema

Area-level `AGENTS.md` files may contain structured tables that pair a diff trigger with a command. Future skills (e.g. verification-script synthesis, run-locally suggestions) consume these tables deterministically. The schema is shared so every consuming skill agrees on the format.

### Block format

```markdown
## <Block Name>

| Trigger | Command | When |
| --- | --- | --- |
| `path/glob/**` | `command to run` | rationale (optional, informational) |
| `**/*.suffix.tsx` (added or modified) | `another command` | rationale |
```

### Columns

- **`Trigger`** *(required)* — glob matched against `git diff --name-only`. Supports a single qualifier `(added or modified)` to mean "match only when the change introduces or modifies the file".
- **`Command`** *(required)* — literal shell string. No variable interpolation. No `$ARGUMENTS`. Must be auditable as written.
- **`When`** *(optional)* — short rationale shown to humans. Informational only; consuming skills do not branch on it.

### Semantics

- Multiple rows for the same command are allowed (different triggers); consumers dedupe before emitting.
- Block names that consume this schema in this release: `## Verification scripts`. Future block names following this schema (for example `## Run locally`) must be added to the consuming skill's documentation.
- The schema is content; the engine never parses it. Skills parse it on demand and cache nothing.

### Authoring rules

- Place these blocks in **area-level** `AGENTS.md` (e.g. `<projectRootPath>/<area>/AGENTS.md` when committed in-repo, or `<opencodeProjectRootPath>/<area>/AGENTS.md` when project-local), not project- or leaf-level. Triggers are area-scoped by convention.
- Keep rows focused: one row per (trigger × command) pair; do not bundle commands.
- Never reference user inputs, branch names, or any non-static data in the `Command` cell.

## Review filtering

Descriptors may define an optional command-consumed field:

```json
"reviewIgnoredPathGlobs": ["**/generated/**", "**/*.snap"]
```

The engine and `/project-review` apply these git-style globs to changed files before generating findings or diff-summary rows. Ignored files are not reviewed for findings, but the generated `REVIEW.md` must list their count and paths under `## Scope` as `ignored_by_review_filter` so reviewers can see what was excluded. Refresh output includes `reviewable_changed_files_count`, `ignored_changed_files_count`, and bounded previews for both partitions.

## Review lifecycle metadata

`REVIEW.md` is the source of truth for branch review state. `/manual-refresh`, `/project-refresh`, `/project-review`, and `/project-review-sync` should inspect the branch-local `REVIEW.md` before deciding whether to create, continue, or preserve-update a review.

Generated review artifacts should begin with:

```markdown
<!-- OpenCode: review metadata
reviewed_window: <base-or-checkpoint>..<head>
reviewed_head: <head-sha>
branch: <branch-name>
artifact_type: <lean_findings|diff_first|full_checklist_diff>
findings_merge_mode: <new|preserve|replace>
generated_at: <iso-8601>
review_focus: <none|short summary>
-->
```

Refresh commands report `review_present`, `review_path`, `review_state`, `reviewed_head`, `head_has_moved_since_review`, and `open_review_findings`. Valid `review_state` values are:

| State | Meaning |
| --- | --- |
| `new_review` | No branch-local `REVIEW.md` exists. |
| `existing_current` | Metadata `reviewed_head` matches current `HEAD`. |
| `existing_head_moved` | Metadata `reviewed_head` differs from current `HEAD`. |
| `existing_unknown_head` | `REVIEW.md` exists but metadata is absent or incomplete. |

`LOG.md` may receive compact review audit entries, but those entries are orientation only; they must not override the artifact state in `REVIEW.md`.

Open findings use `F###`, `R###`, and `M###` namespaces for implementation, review, and metadata/knowledge findings. Existing `F-xx` identifiers remain valid and must be preserved during refresh or review synchronization. New findings use the current namespaces without renumbering legacy rows.

## Shared-branch sync status

Refresh commands are read-only dashboards. `/manual-refresh` and `/project-refresh` MUST NOT run `git fetch`, `git pull`, or write handoff artifacts. They may inspect local refs and report shared-branch status with these fields:

| Field | Meaning |
| --- | --- |
| `upstream_ref` | Current branch upstream, or `none` / `unknown`. |
| `upstream_head` | Local SHA for `upstream_ref`, or `none` / `unknown`. |
| `branch_sync_state` | `up_to_date`, `behind`, `ahead`, `diverged`, `no_upstream`, or `unknown`, computed from local refs. |
| `commits_ahead_upstream` / `commits_behind_upstream` | Counts from `HEAD...@{upstream}` when available. |
| `last_fetch_age_minutes` | Age of `FETCH_HEAD` when available. |
| `remote_ref_may_be_stale` | `true` when local remote refs are probably stale; `unknown` when fetch age is unavailable. |
| `branch_sync_stale_after_minutes` | Effective staleness threshold from the descriptor, default `60`. |
| `unlogged_commit_source_hint` | `none`, `upstream_reachable`, `local_unpushed`, `mixed`, or `unknown` for checkpoint..HEAD commits. |
| `reconciliation_recommended` | `log`, `phases`, `review`, `merge_request`, or `none`. |

Use `/project-pull-refresh <projectKey>` for the explicit network-aware flow. It asks before `git fetch --prune` and `git pull --ff-only`, refuses dirty or diverged states, then runs the refresh procedure.

## Branch context storage modes

Exactly one branch context root is active per descriptor. Commands read only the descriptor-resolved `branchHandoff.contextDirTemplate`.

| Mode | Context path | Sharing behavior |
| --- | --- | --- |
| `private` | `$OPENCODE_HOME/projects/<key>/branches/<branch>/` | Per-user default; no automatic coworker sharing. |
| `shared-git` | `<projectRootPath>/.opencode-conductor/branches/<branch>/` | Repo-local artifacts can be committed with the feature branch. |
| `shared-local` | Same repo-local path, usually gitignored | Sync out-of-band; less reliable than committed state. |
| `custom` | Any other descriptor path | Team-owned convention. |

Refresh reports `active_branch_context` and checks the inactive private/shared-git root for `MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, or `REVIEW.md`. If found, it reports `alternate_branch_context_detected` but MUST NOT merge the two roots automatically. Import/copy between roots is a deliberate human action.

For 2-3 coworkers on one shared branch:

- `LOG.md` is append-only; preserve all timestamped entries during conflict resolution.
- `PHASES.md` is the current plan/status board; keep one branch captain for status changes unless explicitly agreed.
- `REVIEW.md` is reviewer-owned while review is active; use preserve/sync flows after pulls.
- `MERGE_REQUEST.md` should be updated through `/project-update-mr`; keep `## OpenCode:` blocks machine-owned.

## Frontmatter conventions

Command frontmatter carries the portable command contract. The shipped registry in `opencode.json.template` supplies matching runtime metadata:

| Command type | `subtask` | Routing |
| --- | --- | --- |
| Git-mutating branch lifecycle and guided initialization | `false` | active session |
| Review, advisory, refresh, generated-document, helper, and verification flows | `true` | active session |

Notes:

- `subtask: true` keeps long advisory and structured helper output out of the primary context window.
- `subtask: false` is reserved for git-mutating branch lifecycle commands and guided initialization flows that need main-session confirmations and audit continuity.
- Shipped commands leave agent and model routing unset. Installations may configure explicit overrides locally.

## Interactive question prompts

When a host exposes a structured question UI, commands MUST pass `questions` as a native array of question objects. Do not JSON.stringify the array, wrap it in quotes, or place it inside a code fence. A JSON-encoded string fails the host schema with errors like "Expected array".

Correct shape:

```json
{
  "questions": [
    {
      "header": "Short decision label",
      "question": "The actual question text.",
      "options": [
        {
          "label": "Recommended choice (Recommended)",
          "description": "One short impact statement."
        },
        {
          "label": "Alternative choice",
          "description": "One short trade-off statement."
        }
      ]
    }
  ]
}
```

For multi-card prompts, keep the array small and ordered by dependency: seed-source decisions first, gate/continue decisions next, formatting choices next, execution-profile choices last. If schema validation fails, retry with corrected structured arguments before proceeding, or fall back to plain text and clearly state which decisions still need answers.

## Seed material for generated artifacts

Commands that generate `PHASES.md`, `MERGE_REQUEST.md`, `REVIEW.md`, or help docs MUST resolve seed material before drafting human-facing content.

Seed material includes:

- local file paths or `@file` mentions in the current user request,
- attached files or pasted documents,
- issue / MR / ticket descriptions that the user provides,
- existing branch files that the command already reads (`MERGE_REQUEST.md`, `PHASES.md`, `LOG.md`, `REVIEW.md`).

If the user mentions a local file path but does not explicitly say whether to use it, ask whether to use that file as primary seed material. Default to yes when the file exists and is within the project or configured knowledge roots. If the user clearly says to use the file, read it without an extra confirmation.

If no seed material is detected before a kickoff or first-time phase/MR draft, ask once whether the user has a seed document, issue/MR description, or planning note to provide. Continue without one only after the user declines or the command is running in an explicit non-interactive / hint-only mode.

Generated artifacts must make the seed decision auditable:

- If seed material is used, cite path(s) or stable external identifiers in the artifact or audit metadata, not full pasted content.
- If no seed material is used, say so in the command result so the user knows the draft is intentionally generic.
- Do not write a generic phase plan or MR narrative while a mentioned seed document remains unread or unconfirmed.

## Security rules

Apply uniformly to every kit command and skill.

### 1. No user-prompt text in audit logs

`LOG.md` blocks and `MERGE_REQUEST.md` `## OpenCode:` blocks contain **structured metadata only**. Allowed fields: command name, branch names, base, model, mermaid choices, confirmed steps, fallback notes. **Forbidden**: free-text user messages, command-line arguments containing user prose, or any field that could include PII.

### 2. No `$ARGUMENTS` in shell-injection blocks

OpenCode's `!`...`` shell-injection captures fixed read-only command output into the prompt. The kit allows this **only for static, fixed argument lists**:

```
!`git status --porcelain`
!`git symbolic-ref refs/remotes/origin/HEAD`
```

**Forbidden**: any `!`...`` block that includes `$ARGUMENTS`, `$1`, `$2`, …, or any string built from user input. This is a shell-injection vector and is a kit-contract violation.

### 3. Stash messages: structured fields only

Kit-managed stash messages carry only the fields defined by the `opencode-kit` stash convention (command, original branch, ISO timestamp). Never embed file lists, commit subjects, or content previews in the stash message.

### 4. No skill recursion

Commands load skills (1 level deep). Skills do not load other skills. The single documented exception is `skills/git-safety` being loaded as a foundational primitive from another skill (no further recursion). This keeps the dependency graph flat and makes audit traces predictable.

### 5. Execution-profile trust boundary

Switching execution profiles or external services mid-flow may shift the trust boundary. Commands surface that change explicitly and recommend retaining the current session profile unless the user has a specific reason to switch.

### 6. Pre-write secret scan (extended by future plans)

Any command that writes durable knowledge (`KNOWLEDGE.md`, `AGENTS.md`, `descriptor.json`, generated docs) runs a regex check before the write. Patterns to refuse:

- AWS access keys: `AKIA[0-9A-Z]{16}`
- JSON Web Tokens: `eyJ[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+`
- PEM markers: `-----BEGIN [A-Z ]+ PRIVATE KEY-----`
- Generic API tokens: `[a-zA-Z0-9_-]{40,}` adjacent to `token|secret|api[_-]?key` (case-insensitive)

On match, refuse the write and surface the path + first ~40 characters around the match (redacted) so the user can locate and resolve the leak.

### 7. Output containment

Commands that write generated artifacts (e.g. help-docs, scaffolded knowledge) MUST validate that resolved write paths are strict sub-paths of the configured output root before each write. Refuse on path-escape attempts (`..`, absolute paths outside the root, symlinks). See `Safety guardrails` in this document.

## Mermaid policy

Diagrams add signal in some artifacts and noise in others. The kit uses these defaults uniformly:

| Artifact | Default | Prompt | Notes |
| --- | --- | --- | --- |
| `PHASES.md` | ON when phases > 3 | yes | one phase-dependency diagram only; do not duplicate prose |
| `LOG.md` | OFF | never | append-only audit log; diagrams add noise |
| `MERGE_REQUEST.md` | OFF | yes (opt-in) | only on architectural / migration MRs; never inside `## OpenCode:` blocks |
| `REVIEW.md` | OFF | yes (opt-in); ON when structural change detected | place under an optional `## Architecture` section, not inside findings |
| `documentation/ARCHITECTURE.md` | ON | n/a | architecture sections use diagrams where relationships or sequences need them |

All mermaid prompts:

- show a one-line recommendation with rationale,
- preselect the recommended option,
- record the choice as a comment in the artifact (e.g. `<!-- mermaid: included on user opt-in -->`),
- honor the kit-wide `--no-mermaid` flag, which skips every mermaid prompt without changing other behavior.

`## OpenCode:` blocks in `MERGE_REQUEST.md` are agent-machine-readable. **Mermaid never appears inside them.**

## Audit trail contract

Audit behavior is command-owned, not automatic. Checkpoint and close flows append the progress-log helper when it exists. Review writes the review helper, and change-request update/sync commands own their `## OpenCode:` blocks. Kickoff records only the mutations its command contract names. Scaffold writes approved knowledge targets. Refresh is always read-only and never appends audit state.

### `LOG.md` block shape

```
### <Activity> <ISO timestamp>
- command: /<command-name>
- <field>: <value>
- <field>: <value>
```

Activity names are defined by the command that owns the write; commands must not fabricate a successful audit entry before the corresponding mutation succeeds.

### `MERGE_REQUEST.md` `## OpenCode:` block

```markdown
## OpenCode:
- command: /<command-name>
- timestamp: <ISO>
- <structured field>: <value>
```

`## OpenCode:` blocks are agent-readable. They never contain free-text narrative or mermaid; user-authored narrative lives in the surrounding sections of `MERGE_REQUEST.md`.

### Atomicity

Audit writes happen at the end of a command's flow, after the work has succeeded. A half-finished command leaves no audit entry, which is the desired behavior: the absence of an entry is itself a signal.

### Retention

`LOG.md` is append-only. Rotation at >100KB is tracked in `documentation/ROADMAP.md`; until then, users may manually trim older entries.

### Branch lineage and commit windows

Every `LOG.md` kickoff, checkpoint, or session-close entry should make the reviewed commit window explicit. This is especially important for stacked branches, where `origin/<base>..HEAD` may include a large inherited branch and only the top slice belongs to the current effort.

Recommended fields:

```
- integration_base: origin/<main|master> (<merge-base-short>)
- parent_branch: <remote/branch or none/unknown>
- branch_delta: <N> commits from integration base
- working_delta: <N> commits from parent/checkpoint to HEAD
- reviewed_window: <start-short>..<head-short>
- reviewed_through: <head-sha>
- commit_source: <local_session|pulled_upstream|mixed|unknown>
```

Semantics:

- `integration_base` is the resolved repository base (`origin/HEAD` -> `main` -> `master`) plus the merge-base with `HEAD`.
- `parent_branch` is the stacked branch or previous feature branch when known from local refs, upstream tracking, branch naming, user context, or an existing `LOG.md` entry. Use `none` for a direct base branch and `unknown` when unsure.
- `branch_delta` is the total commits from integration base to `HEAD`.
- `working_delta` is the commits from the last checkpoint, known parent branch, or explicit reviewed window start to `HEAD`.
- `reviewed_window` is the range summarized by the entry. Prefer the narrow, actionable range over the full integration-base range on stacked branches.
- `commit_source` records whether checkpointed commits are local session work, pulled/shared upstream work, mixed, or unknown.

When `branch_delta` and `working_delta` differ materially, say so in the summary. Do not imply that inherited commits are new work for the current checkpoint.

## Kit-stash convention

Defined in detail in `skills/git-safety/SKILL.md`. Summary:

- **Naming:** `opencode-kit:<command>:<original-branch>:<iso-timestamp>` (filesystem-safe ISO).
- **Detection:** prefix grep against `git stash list`.
- **Audit:** `### Stash` block in `LOG.md` on creation.
- **Reminder:** silent unless a kit-managed stash exists on the current branch.
- **Cross-check:** warn when `LOG.md` references a stash that is no longer in `git stash list`.
- **Permission default:** `git-safety: ask` in `opencode.json`.

The kit never auto-stashes. Commands that need a stash always ask.

## Knowledge across branches

Project/area `AGENTS.md` and area/leaf `KNOWLEDGE.md` files carry durable guidance. Whether knowledge moves between branches is determined by **Git tracking**, not by `conductorStateLocation` alone. A project-local root may be ignored or committed.

| Tracking mode | Typical location | Per-branch behavior | Drift preflight applies? |
| --- | --- | --- | --- |
| **Outside Git** | `$OPENCODE_HOME/projects/<key>/...` | Stable across branch switches in one clone | No |
| **Repo-local, ignored or untracked** | `<git-root>/.opencode-conductor/...` (or `.opencode/`) | Stable locally; shared only out of band | No |
| **Git-tracked** | Source-adjacent files or a committed repo-local state root | Moves with branches; visible in diffs and change requests | Yes |

### Recommendation

- Use **global or ignored repo-local** storage when knowledge should stay stable across in-flight branches and remain out of change-request diffs.
- Use **Git-tracked** storage when per-branch self-consistency and shared review are desirable.

The location is selected during `/project-init`; its project-local `.gitignore` choice controls whether repo-local state is private or tracked. Individual descriptor overrides can mix locations, so commands evaluate actual Git-tracked paths rather than assuming from the location label.

### Drift behavior (committed mode)

`/project-knowledge-refresh` and `/project-review` run a knowledge-drift preflight for Git-tracked knowledge by default:

1. Resolve the integration base via `origin/HEAD` → `main` → `master`.
2. `git fetch origin <base>` (read-only; cached for 5 minutes per session, fixed).
3. Compute the symmetric diff of `AGENTS.md` / `KNOWLEDGE.md` files between `merge-base(HEAD, origin/<base>)` and `origin/<base>`.
4. Emit an `M###` drift finding if drift exists because drift is knowledge/rules misalignment.
5. Recommend rebase, or `git checkout <base> -- <AGENTS.md path>` for a single-file pull-up.

The preflight is **silent on no drift**. The `--no-preflight` flag bypasses cleanly for CI / batch scenarios.

### Source-path guard

`/scaffold-knowledge` verifies the leaf source directory exists in the current working tree before writing a leaf-level `KNOWLEDGE.md`. Skip + log on miss; bypass with `--no-source-guard`. Prevents "ghost knowledge" — durable files about packages absent from the current branch.

## AGENTS.md / KNOWLEDGE.md conflict playbook

Knowledge bullets are typically additive, so merges are common. The kit never auto-resolves conflicts.

### Steps

1. **Take both sides.** Resolve the merge by keeping content from both branches.
2. **Dedupe by bullet.** Remove exact-duplicate bullets across the two sides.
3. **Reconcile contradictions manually.** Two competing rules require a human decision, not an automated merge.
4. **Rerun `/project-knowledge-refresh`** after manual resolution. The refresh proposes follow-up edits if any newly-merged bullets need rewording or relocation.

### Worked example

```diff
<<<<<<< HEAD
- Models use singular noun names (`User`, not `Users`).
- M2M links live in `<app>/links/` modules.
=======
- Singular model names; preserve `db_table` overrides.
- M2M links live in `<app>/links/` modules.
- Use `related_name` consistently; default to plural.
>>>>>>> origin/main
```

After "take both + dedupe" and reconciliation:

```
- Singular model names; preserve `db_table` overrides.
- M2M links live in `<app>/links/` modules.
- Use `related_name` consistently; default to plural.
```

The first bullet is reconciled into the more-specific phrasing from the right side; the second is identical and de-duplicated; the third is unique and kept.

## Positional argument support

Commands may opt into positional argument shorthand (per OpenCode `$1, $2, $ARGUMENTS`):

| Command | Positional args | Example |
| --- | --- | --- |
| `/project-branch-new` | `$1` = branch name (optional; if omitted, prompt) | `/project-branch-new feature/<short-goal>` |
| `/scaffold-knowledge` | `$1` = mode: `list \| dry-run \| discovery` | `/scaffold-knowledge dry-run` |

All positional args MUST be validated against safe patterns before use, and MUST NEVER be interpolated into `!`...`` shell-injection blocks (see [Security rules](#security-rules) § 2).

## Opt-out flags

Every gate ships with a flag for emergency bypass and CI predictability. Flags are documented in each command's help and in `documentation/COMMAND_WORKFLOW.md` but not advertised in the happy path.

| Flag | Default | Disables |
| --- | --- | --- |
| `--no-preflight` | off | All preflight checks (drift, knowledge alignment) |
| `--no-stash-check` | off | Stash reminder hook |
| `--no-source-guard` | off | `/scaffold-knowledge` source-path existence check |
| `--no-mermaid` | off | Mermaid prompts in any artifact |

Flags compose. The default is always "gate active".
