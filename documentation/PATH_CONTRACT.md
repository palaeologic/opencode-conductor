# Path contract (kit tools vs descriptor)

This document records **Phase 0** behavior for Conductor Bun tools in [`tools/_opencode_engine.ts`](../tools/_opencode_engine.ts). It matters for **global vs project-local durable state**: only fields that the engine reads from `descriptor.json` can move into the repo; the descriptor file location has a separate contract.

## What the engine honors from `descriptor.json`

After loading the descriptor, **`opencode_bootstrap_branch`** and **`opencode_refresh_context`** resolve:

- `branchHandoff.contextDirTemplate` — expanded with `{projectKey}` and `{branchName}`; `~/` is expanded to the user home directory.
- `branchHandoff.templatesDir` — same expansion rules.
- `branchHandoff` filenames (`mrFilenames`, `logFilename`, `phasesFilename`, template names).
- `opencodeProjectRootPath` — for **rules** `AGENTS.md`, optional project-wide **`KNOWLEDGE.md`**, leaf **`KNOWLEDGE.md`**, area routing documents, staleness checks, and `reread_files`.
- Each area’s **`areaAgentsPath`** (default) — path to that area’s **primary** durable document (typically `.../<area>/AGENTS.md`): stack, conventions, routing, and often **`## Verification scripts`**. Same `~/` expansion.
- Each area’s **`areaKnowledgePath`** (optional) — explicit **second** area-level file when a team wants durable facts split out from **`areaAgentsPath`** (for example a dedicated `.../<area>/KNOWLEDGE.md`). If set, **`opencode_refresh_context`** reads it **before** the `areaAgentsPath` / sibling-`KNOWLEDGE.md` fallback chain.
- **Refresh resolution when `areaKnowledgePath` is absent:** **`opencode_refresh_context`** prefers **`<dirname(areaAgentsPath)>/KNOWLEDGE.md`** when that **sibling** file exists (optional extra area knowledge beside `AGENTS.md`); otherwise uses **`areaAgentsPath`**.

So **branch handoff files** (`MERGE_REQUEST.md`, `LOG.md`, …) and **durable knowledge** can live under **the git repo** (or any absolute path) as long as those JSON fields point there.

### Rules vs package knowledge (filename split)

- **`<opencodeProjectRootPath>/AGENTS.md`** — **session / kit rules** for the OpenCode project (Cursor-style operating instructions). Not the same document as package knowledge.
- **`<opencodeProjectRootPath>/KNOWLEDGE.md`** *(optional)* — project-wide **durable facts** separate from rules (glossary, long-lived integration notes). When present, refresh includes it in `reread_files` immediately after rules `AGENTS.md`.
- **`<...>/<area>/AGENTS.md`** *(default area anchor)* — area-level architecture, commands, conventions; the file **`/project-init`** drafts via **`areaAgentsPath`**.
- **`<...>/KNOWLEDGE.md`** at **pseudo-package / leaf** paths (and optional sibling next to area `AGENTS.md`, or via **`areaKnowledgePath`**) — **durable module knowledge** (patterns, pitfalls, verification tables). Leaf convention avoids colliding with repo-root **`AGENTS.md`** when the kit is vendored **inside** an application repository.

## Descriptor file location (current limitation)

`loadDescriptor(projectKey)` reads **only**:

`~/.config/opencode/projects/<projectKey>/descriptor.json`

There is **no** automatic discovery of `descriptor.json` inside the repo. Therefore:

- **Project-local mode** in `/project-init` still **writes** `descriptor.json` under `~/.config/opencode/projects/<projectKey>/`.
- It sets **`opencodeProjectRootPath`**, **`branchHandoff.contextDirTemplate`**, **`templatesDir`**, and **`areaAgentsPath`** to paths under `<git-root>/.opencode-conductor/` (or `.opencode/` if chosen) so durable **data** lives beside the clone while the **control-plane** descriptor stays in OpenCode config.

Changing this would require engine work (e.g. resolve descriptor from repo) and is out of scope unless product requirements demand it.

## Locked layout: project-local roots

When the user chooses **project-local** state, generated paths use a single root directory next to the repo (default name **`.opencode-conductor/`**, optional **`.opencode/`**):

| Field | Pattern |
| ----- | ------- |
| `opencodeProjectRootPath` | `<gitRoot>/<dir>` |
| `branchHandoff.contextDirTemplate` | `<gitRoot>/<dir>/branches/{branchName}` |
| `branchHandoff.templatesDir` | `<gitRoot>/<dir>/_templates/mr` |
| `areas.*.areaAgentsPath` (default from `/project-init`) | `<gitRoot>/<dir>/<area>/AGENTS.md` — primary area document |
| `areas.*.areaKnowledgePath` (optional) | `<gitRoot>/<dir>/<area>/KNOWLEDGE.md` or other explicit path — only when a team wants a **separate** area-level knowledge file; not emitted by init |
| Refresh (no `areaKnowledgePath`) | Prefers sibling **`<dirname(areaAgentsPath)>/KNOWLEDGE.md`** if it exists, else **`areaAgentsPath`** |

`<gitRoot>` is written in the same style as `projectRootPath` (prefer `~/...` when the repo is under the user’s home directory; otherwise use an absolute path). **`{projectKey}`** appears only where the template already uses it today; the branch folder pattern uses **`branches/{branchName}`** directly under `<dir>` (no extra `projects/{projectKey}` segment under repo-local, to avoid redundant nesting).

## Commands that scan descriptors

Slash commands that say “scan `~/.config/opencode/projects/*/descriptor.json`” remain correct: that is where **descriptor files** live. Branch folders are always resolved from the loaded descriptor as above.

## Knowledge audience

**Leaf `KNOWLEDGE.md`**, optional **project `KNOWLEDGE.md`**, optional **area `KNOWLEDGE.md`** (when used), and **area `AGENTS.md`** are **dual-audience**: agents load them during refresh and review preflight; humans use them for onboarding. Use short, factual prose, concrete paths, framework names, and verification steps. **Root `AGENTS.md`** under `opencodeProjectRootPath` is **rules-first** — do not use it as a substitute for durable knowledge files.

## Descriptor pairs (why the same basename appears twice)

`branchHandoff` often lists the same basename twice on purpose: **`mrFilenames`** names the file in the **branch context directory**; **`mrTemplateFilename`** names the file under **`templatesDir`** (often both `MERGE_REQUEST.md`). The same pattern applies to log and phases. **`refreshToolHeuristics.changedFilesAreaPrefixes`** may repeat the same roots as **`areas.*.pathPrefix`** — one drives git diff bucketing, the other names areas; keep them aligned when adding areas.

## Refresh handoff block (tool + manual parity)

**`/project-refresh`** (Bun tool) and **`/manual-refresh`** (no tools) both target the same **`## Handoff refresh result`** shape so Bedrock / tool-off sessions behave like the engine path:

- **`missing_branch_context`** — boolean. In **tracked** mode, **`true`** when the primary `MERGE_REQUEST.md` and `LOG.md` cannot be read after optional template seeding — user should **`/project-bootstrap`** then refresh again (see `commands/project-refresh.md`, `commands/manual-refresh.md`).
- **`opencode_refresh_context`** JSON may include **`branch_context_readable`** — per-file readability flags for MR / LOG / PHASES when the engine inspects disk.
- Command markdown may surface the same diagnostics as **`branch_context_status`** sub-bullets for agents that only see the prose block; normalize field names per the command templates above.

## Source-tree-mirror convention for leaf knowledge

`descriptorSchemaVersion: 2` adopts a convention path for **leaf-level** package knowledge (a leaf is a package, module, or other meaningful sub-tree). The **canonical** filename is:

```
<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md
```

Legacy installs may still use **`AGENTS.md`** at the same path; the refresh engine reads **`KNOWLEDGE.md` first** when both could apply (see engine resolution).

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
3. The convention path is `<opencodeProjectRootPath>/<rel>/KNOWLEDGE.md` (legacy: `AGENTS.md` at the same `<rel>`).

`pathPattern` semantics:

- The prefix up to and including the first `{packageName}` is the **knowledge stem** used by commands.
- `**` matches any depth, `*` matches a single segment — both are descriptive only.
- The kit does **not** enforce depth or extension constraints from the pattern.

### Disambiguation

- Every rule MUST declare `area`. Reject the descriptor on missing `area` (no silent inference).
- When multiple rules match a file, **longest matching stem wins**; ties broken by descriptor array order.
- Same `packageName` in different `area`s is allowed and produces distinct convention paths.

### Safety guardrails (apply to all auto-write operations)

- **Package name normalization:** match `^[A-Za-z0-9_][A-Za-z0-9_-]*$`; reject anything else with `invalid_package_name`. Case-sensitive on disk; do not lowercase.
- **Root containment:** every resolved write target MUST be a strict sub-path of `opencodeProjectRootPath` (global) or `<git-root>/<dir>` (project-local). Otherwise abort with `path_outside_root`.
- **Symlink refusal:** before write, `lstat` the target; if the knowledge file exists as a symlink, abort with `symlink_refused`.
- **Non-destructive writes:** if **`KNOWLEDGE.md`** (or legacy **`AGENTS.md`**) already exists, do not overwrite. Discovery treats it as already-tracked; preflight records it as `existing`.
- **No remote IO:** scaffolding is purely local; no network calls.

### Backward compatibility

Legacy v1 descriptors keep `pseudoPackageDetection` as a single object; commands MUST normalize it to a single-rule array on read. v1 is deprecated and slated for removal in the next major release; see [`UPGRADING.md`](UPGRADING.md).

## Structured-knowledge-table schema

Area-level **`KNOWLEDGE.md`** (or legacy **`AGENTS.md`**) may contain structured tables that pair a diff trigger with a command. Future skills (e.g. verification-script synthesis, run-locally suggestions) consume these tables deterministically. The schema is shared so every consuming skill agrees on the format. **Verification rows:** copy command strings from the repo’s canonical source (MR `## Verification target`, CI, or README) — do not invent alternate Django / npm labels.

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

- Place these blocks in the **area-level** document agents read for that area (typically **`<opencodeProjectRootPath>/<area>/AGENTS.md`** when using the default init shape), not project- or leaf-level. Triggers are area-scoped by convention. Teams using **`areaKnowledgePath`** or a sibling area **`KNOWLEDGE.md`** place the block in that file instead.
- Keep rows focused: one row per (trigger × command) pair; do not bundle commands.
- Never reference user inputs, branch names, or any non-static data in the `Command` cell.

## Frontmatter conventions

Per OpenCode docs, command frontmatter accepts `description`, `agent`, `model`, `subtask`, `template`. The kit standardizes these defaults so command authors do not improvise:

| Command type | `agent` | `subtask` | `model` |
| --- | --- | --- | --- |
| Kickoff (mutating, primary-context audit) | unset (current agent) | `false` | upstream: unset; fork: `claude-opus-4-7-thinking-xhigh` |
| Review / advisory (long output) | `plan` | `true` | upstream: unset; fork: `claude-opus-4-7-thinking-xhigh` |
| Read-only state | `plan` | `true` | unset (cheap session model is fine) |
| Bootstrap / refresh (mutating, no audit needs) | unset | `false` | unset |

Notes:

- Frontmatter defaults replace most of the runtime "prompt user for model" flow. Users only see a prompt when they explicitly want to override.
- `subtask: true` keeps long advisory output out of the primary context window.
- `agent: plan` is appropriate for plan-first commands (read-mostly, mutating only after confirmation).
- Upstream commands leave `model` unset; fork commands set the model in fork-side frontmatter at mirror time.

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

Kit-managed stash messages carry only the fields defined by the kit-stash convention (command, original branch, ISO timestamp). Never embed file lists, commit subjects, or content previews in the stash message.

### 4. No skill recursion

Commands load skills (1 level deep). Skills do not load other skills. The single documented exception is `skills/git-safety` being loaded as a foundational primitive from another skill (no further recursion). This keeps the dependency graph flat and makes audit traces predictable.

### 5. Provider-switch trust boundary

Switching the model provider mid-flow shifts the trust boundary. Commands that prompt for a model surface the provider explicitly when it differs from the session and recommend staying on the session provider unless the user has a specific reason to switch.

### 6. Pre-write secret scan (extended by future plans)

Any command that writes durable knowledge (`KNOWLEDGE.md`, legacy `AGENTS.md`, `descriptor.json`, generated docs) runs a regex check before the write. Patterns to refuse:

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
| `docusaurus/architecture/*.md` | ON | n/a | architecture pages always include at least one diagram |

All mermaid prompts:

- show a one-line recommendation with rationale,
- preselect the recommended option,
- record the choice as a comment in the artifact (e.g. `<!-- mermaid: included on user opt-in -->`),
- honor the kit-wide `--no-mermaid` flag, which skips every mermaid prompt without changing other behavior.

`## OpenCode:` blocks in `MERGE_REQUEST.md` are agent-machine-readable. **Mermaid never appears inside them.**

## Audit trail contract

Mutating commands (kickoff, scaffold, refresh, review, update-mr) append structured metadata to `LOG.md` and, when the command operates in a branch context, an `## OpenCode:` block to `MERGE_REQUEST.md`.

### `LOG.md` block shape

```
### <Activity> <ISO timestamp>
- command: /<command-name>
- <field>: <value>
- <field>: <value>
```

Activities used by this release: `Kickoff`, `Stash`. Future plans add `Review`, `Refresh`, etc.

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

**`KNOWLEDGE.md`** (and legacy **`AGENTS.md`**) describe durable package knowledge (architecture, conventions, invariants). Two storage modes affect how knowledge moves between branches:

| Mode | Where files live | Per-branch behavior | Drift preflight applies? |
| --- | --- | --- | --- |
| **Project-local** | `<git-root>/.opencode-conductor/...` (or `.opencode/`) | Knowledge is stable across branches; not part of the working-tree diff | No (no per-branch drift to compute) |
| **Committed-in-repo** | `<repo>/<area>/KNOWLEDGE.md` (alongside source; legacy `AGENTS.md`) | Knowledge moves with the branch; visible in diffs and PRs | Yes |

### Recommendation

- Use **project-local** for fast-moving forks where knowledge needs to stay stable across many in-flight branches and should not pollute PR diffs.
- Use **committed-in-repo** for shared kits, vendor-neutral upstream, or any project where per-branch self-consistency of knowledge is desirable.

The choice is set during `/project-bootstrap` and recorded in the descriptor; switching modes mid-project is expensive and rare.

### Drift behavior (committed mode)

`/project-knowledge-refresh` and `/project-review` run a knowledge-drift preflight by default:

1. Resolve the integration base via `origin/HEAD` → `main` → `master`.
2. `git fetch origin <base>` (read-only; cached for 5 minutes per session, fixed).
3. Compute the symmetric diff of **`KNOWLEDGE.md` and `**/AGENTS.md`** paths between `merge-base(HEAD, origin/<base>)` and `origin/<base>` (include both patterns until legacy trees are migrated).
4. Emit `F-xx` finding "Knowledge drift vs base: <files>" if drift exists.
5. Recommend rebase, or `git checkout <base> -- <path>` for a single-file pull-up.

The preflight is **silent on no drift**. The `--no-preflight` flag bypasses cleanly for CI / batch scenarios.

### Source-path guard (project-local mode)

`/scaffold-knowledge` verifies the leaf source directory exists in the current working tree before writing a leaf-level **`KNOWLEDGE.md`**. Skip + log on miss; bypass with `--no-source-guard`. Prevents "ghost knowledge" — durable files about packages absent from the current branch.

## Package knowledge merge playbook (KNOWLEDGE.md / legacy AGENTS.md)

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
