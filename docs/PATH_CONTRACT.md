# Path contract (kit tools vs descriptor)

This document records **Phase 0** behavior for Conductor Bun tools in [`tools/_opencode_engine.ts`](../tools/_opencode_engine.ts). It matters for **global vs project-local durable state**: only fields that the engine reads from `descriptor.json` can move into the repo; the descriptor file location has a separate contract.

## What the engine honors from `descriptor.json`

After loading the descriptor, **`opencode_bootstrap_branch`** and **`opencode_refresh_context`** resolve:

- `branchHandoff.contextDirTemplate` — expanded with `{projectKey}` and `{branchName}`; `~/` is expanded to the user home directory.
- `branchHandoff.templatesDir` — same expansion rules.
- `branchHandoff` filenames (`mrFilenames`, `logFilename`, `phasesFilename`, template names).
- `opencodeProjectRootPath` — for `AGENTS.md` paths, staleness checks, and `reread_files`.
- Each area’s `areaAgentsPath` — same `~/` expansion.

So **branch handoff files** (`MERGE_REQUEST.md`, `LOG.md`, …) and **shared `AGENTS.md` trees** can live under **the git repo** (or any absolute path) as long as those JSON fields point there.

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
| `areas.*.areaAgentsPath` | `<gitRoot>/<dir>/<area>/AGENTS.md` |

`<gitRoot>` is written in the same style as `projectRootPath` (prefer `~/...` when the repo is under the user’s home directory; otherwise use an absolute path). **`{projectKey}`** appears only where the template already uses it today; the branch folder pattern uses **`branches/{branchName}`** directly under `<dir>` (no extra `projects/{projectKey}` segment under repo-local, to avoid redundant nesting).

## Commands that scan descriptors

Slash commands that say “scan `~/.config/opencode/projects/*/descriptor.json`” remain correct: that is where **descriptor files** live. Branch folders are always resolved from the loaded descriptor as above.

## Knowledge audience

`AGENTS.md` files are **dual-audience by design**. The agent loads them deterministically during refresh and review preflight; humans read them as onboarding and reference material. Authors should therefore write for both consumers: short, factual prose with concrete file paths, framework names, and verification steps. The agent uses headings as cues; humans read the file top-to-bottom.

## Source-tree-mirror convention for leaf knowledge

`descriptorSchemaVersion: 2` adopts a convention path for **leaf-level** `AGENTS.md` files (a leaf is a package, module, or other meaningful sub-tree). The canonical location is:

```
<opencodeProjectRootPath>/<rel>/AGENTS.md
```

where `<rel>` is the leaf's path **relative to `projectRootPath`**, derived from a `pseudoPackageDetection` rule's `pathPattern` up to and including the first `{packageName}` segment.

Worked examples (vendor-neutral):

- Rule `pathPattern: "frontend/src/{packageName}/**/*"` -> `<opencodeRoot>/frontend/src/<pkg>/AGENTS.md`.
- Rule `pathPattern: "backend/{packageName}/**/*"` (prefix kind) -> `<opencodeRoot>/backend/<pkg>/AGENTS.md`.
- Rule `pathPattern: "packages/{packageName}"` -> `<opencodeRoot>/packages/<pkg>/AGENTS.md`.

Project-local layout uses the same rule rooted at `<git-root>/<dir>/...` instead of `~/.config/opencode/projects/<key>/...`.

`trackedKnowledgeTargets.sharedPackageKnowledge` is now **optional**:

- If a leaf's knowledge lives at the convention path -> no descriptor entry needed.
- If a leaf needs a non-default path (legacy, generated, shared between leaves) -> keep an explicit entry as an override.

### Stem derivation contract

Given a `pseudoPackageDetection` rule with `pathPattern = P` and a detected `packageName = N`:

1. Let `S` be the longest prefix of `P` that ends with `{packageName}`. If `P` does not contain `{packageName}`, the rule is **area-level documentation only** and contributes no leaves.
2. Substitute `N` for `{packageName}` in `S`. Call this `<rel>`.
3. The convention path is `<opencodeProjectRootPath>/<rel>/AGENTS.md`.

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
- **Symlink refusal:** before write, `lstat` the target; if `AGENTS.md` exists as a symlink, abort with `symlink_refused`.
- **Non-destructive writes:** if `AGENTS.md` already exists, do not overwrite. Discovery treats it as already-tracked; preflight records it as `existing`.
- **No remote IO:** scaffolding is purely local; no network calls.

### Backward compatibility

Legacy v1 descriptors keep `pseudoPackageDetection` as a single object; commands MUST normalize it to a single-rule array on read. v1 is deprecated and slated for removal in the next major release; see [`UPGRADING.md`](UPGRADING.md).
