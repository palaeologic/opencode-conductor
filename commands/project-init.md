---
description: Initialize a new project descriptor via repo scan and guided confirmation
subtask: true
---

Initialize handoff kit for project key `$ARGUMENTS`.

This command scans the current repository, drafts a `descriptor.json`, presents it for user approval, and writes the project structure.

**Progressive disclosure:** keep init prompts short. For tradeoffs (gitignore, secrets, clone behavior), point to README → **Where does handoff state live?** and [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md).

Workflow:

1. Resolve `$ARGUMENTS` as the `projectKey`.
2. Confirm cwd is inside a git repo: run `git rev-parse --show-toplevel` to get **git root** (`projectRootPath` candidate).
3. **Scan phase** (auto-detect from the repo):
   - **Project root**: git toplevel path (store as `projectRootPath`; prefer `~/…` when under the user’s home directory, otherwise absolute).
   - **Areas**: list top-level directories; filter out `.git`, `node_modules`, `dist`, `build`, `.cache`, `vendor`, `target`. Present remaining dirs as candidate areas.
   - **Packages**: look for monorepo signals:
     - `workspaces` field in root `package.json`
     - `packages/` or `libs/` directories
     - `@org/` style imports in source files
   - **Baseline branch**: `git remote show origin | grep 'HEAD branch'` or fallback to `main`.
   - **Refresh heuristics**: detect which config files exist (package.json, tsconfig.json, eslint.config.*, pyproject.toml, go.mod, Cargo.toml) and use them as `highSignalChangedSubstrings`.
4. **State location** (after scan, before draft): ask where **durable Conductor data** (branch folders, templates, **per-area `AGENTS.md`** for routing/setup, **leaf `KNOWLEDGE.md`** from later `/scaffold-knowledge`, **rules `AGENTS.md`** at project root) should live:
   - **Global (default):** under `~/.config/opencode/projects/<projectKey>/` — same layout as today; good for solo work and no repo noise.
   - **Project-local:** beside the clone under **`<git-root>/.opencode-conductor/`** (recommended) **or** `<git-root>/.opencode/`** (shorter; warn in one line that `.opencode/` may collide with other tooling).

   If **project-local**, set optional documentation field `"conductorStateLocation": "project-local"` and `"localStateDirname": ".opencode-conductor"` or `".opencode"` in the draft (consumers may ignore unknown keys).

5. **`.gitignore` prompt** (only if project-local): ask what to do with the chosen directory at repo root:
   - **A — Add** `<git-root>/<dir>/` to repo-root `.gitignore` (**default**): avoids accidental commits of internal URLs / narrative; each clone starts empty for branch state unless copied.
   - **B — Do not add:** user intends to **commit** handoff state; warn once: merge conflicts, secrets, classification — link README risk section.
   - **C — Skip:** user manages `.gitignore` themselves.

   If `.gitignore` already contains a matching line for that directory, do not duplicate.

6. **Draft phase**: construct a complete `descriptor.json` from scan results + choices:
   - `projectKey`: from `$ARGUMENTS`
   - `projectRootPath`: from git toplevel (prefer `~/` when applicable)
   - **If global:** `opencodeProjectRootPath`: `~/.config/opencode/projects/$ARGUMENTS`
   - **If project-local** (locked path scheme — see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)):
     - Let `<dir>` be `.opencode-conductor` or `.opencode` as chosen. Let `<R>` = same path style as `projectRootPath` + `/<dir>` (no trailing slash).
     - `opencodeProjectRootPath`: `<R>`
     - `branchHandoff.contextDirTemplate`: `<R>/branches/{branchName}`
     - `branchHandoff.templatesDir`: `<R>/_templates/mr`
     - `areas.*.areaAgentsPath`: `<R>/<areaName>/AGENTS.md` (same area names as scan; **optional** `areaKnowledgePath` later if a team wants a separate area-level knowledge file — not emitted by default)
     - Rewrite any other path fields that pointed at `~/.config/opencode/projects/...` in the template to use `<R>` instead.
   - `baselineBranchForMaterialChanges`: detected baseline branch
   - `handoffModeDefault`: `"tracked"`
   - `subtaskModels`: empty object `{}` (user fills later) or omit
   - `branchHandoff`: standard keys (`mrFilenames`, `logFilename`, `checkpointField`, `mrBranchPlaceholder`, …) — only path-bearing fields change per layout above
   - `refreshToolHeuristics`: from detected config files
7. **Present phase**: show the full draft JSON. Ask: “Does this look correct? Reply with edits or approve to write.”
8. **Write phase** (only after explicit user approval):
   - **Always** write `descriptor.json` to **`~/.config/opencode/projects/<projectKey>/descriptor.json`** (required by kit tools — see PATH_CONTRACT).
   - **If global:** create `~/.config/opencode/projects/<projectKey>/` tree, `_templates/mr/`, empty `AGENTS.md` at project level under that root, same as historical behavior.
   - **If project-local:** create `<git-root>/<dir>/` (the `opencodeProjectRootPath` tree): `_templates/mr/` with defaults, empty root `AGENTS.md`, and per-area dirs/files as needed for scaffold later; **do not** duplicate branch `branches/` until bootstrap.
   - Copy default templates: `MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, `MR.md` into `_templates/mr/`.
   - If user chose **gitignore A**, append the ignore line idempotently.
   - Report all paths created.

Output:
Return a summary of created paths and suggest next steps:
- “Run `/scaffold-knowledge $ARGUMENTS` to populate **leaf** `KNOWLEDGE.md` files (pseudo-packages / leaves) with stack and architecture info.”
- “Run `/project-refresh $ARGUMENTS` to start your first session.”

Constraints:
- Never write files without user approval of the draft.
- Do not include secrets or tokens in the descriptor.
- Keep area detection conservative; prefer fewer areas over noisy false positives.
