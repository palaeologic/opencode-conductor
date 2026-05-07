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
