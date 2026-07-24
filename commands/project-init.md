---
description: Initialize a generic project descriptor via repo scan and guided confirmation
subtask: false
---

Initialize handoff kit for project key `$ARGUMENTS`.

This command scans the current repository, drafts a `descriptor.json`, presents it for user approval, and writes the project structure.

**Progressive disclosure:** keep init prompts short. For tradeoffs (gitignore, secrets, clone behavior), point to README → **Where does handoff state live?** and [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md).

Workflow:

1. Resolve `$ARGUMENTS` as the `projectKey`. Resolve the config root from `OPENCODE_HOME`, defaulting to `~/.config/opencode`.
   - If `<config-root>/projects/<projectKey>/descriptor.json` already exists, preserve it and stop. Use the migration utility for v1/v2 or make an explicit reviewed edit for v3.
   - Refuse a descriptor path that is a symbolic link or non-regular file.
2. Confirm cwd is inside a git repo: run `git rev-parse --show-toplevel` to get **git root** (`projectRootPath` candidate).
3. **Scan phase** (auto-detect from the repo):
   - **Project root**: git toplevel path (store as `projectRootPath`; prefer `~/…` when under the user’s home directory, otherwise absolute).
   - **Areas**: list top-level directories; filter out `.git`, `node_modules`, `dist`, `build`, `.cache`, `vendor`, `target`. Present remaining dirs as candidate areas.
   - **Packages**: look for monorepo signals:
     - `workspaces` field in root `package.json`
     - `packages/` or `libs/` directories
     - `@org/` style imports in source files
   - **Baseline branch**: resolve `origin/HEAD`; if unavailable, try `main` and then `master`.
   - **Refresh heuristics**: detect which config files exist (package.json, tsconfig.json, eslint.config.*, pyproject.toml, go.mod, Cargo.toml) and use them as `highSignalChangedSubstrings`.
4. **State location** (after scan, before draft): ask where **durable Conductor data** (branch folders, templates, leaf `KNOWLEDGE.md` mirrors) should live:
   - **Global (default):** under `<config-root>/projects/<projectKey>/` — good for solo work and no repo noise.
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
   - `projectAgentsPath`: `<projectRootPath>/AGENTS.md` unless the user explicitly chooses a different manually-owned rules file
   - **If global:** `opencodeProjectRootPath`: `<config-root>/projects/$ARGUMENTS`
   - **If project-local** (locked path scheme — see [`documentation/PATH_CONTRACT.md`](../documentation/PATH_CONTRACT.md)):
     - Let `<dir>` be `.opencode-conductor` or `.opencode` as chosen. Let `<R>` = same path style as `projectRootPath` + `/<dir>` (no trailing slash).
     - `opencodeProjectRootPath`: `<R>`
     - `branchHandoff.contextDirTemplate`: `<R>/branches/{branchName}`
     - `branchHandoff.templatesDir`: `<R>/_templates/mr`
     - `areas.*.areaAgentsPath`: `<projectRootPath>/<areaName>/AGENTS.md` by default (same area names as scan); if the user explicitly wants project-local rules, use `<R>/<areaName>/AGENTS.md` but do not create it here.
     - Rewrite any other path fields that pointed at `<config-root>/projects/...` in the template to use `<R>` instead.
   - `baselineBranchForMaterialChanges`: detected baseline branch
   - `handoffModeDefault`: `"tracked"`
   - `subtaskModels`: empty object `{}` (user fills later) or omit
   - `branchHandoff`: schema v3 helper registry (`helpers`, `helperManifestFilename`, `checkpointField`, `templatesDir`) — only path-bearing fields change per layout above
   - `branchSyncStaleAfterMinutes`: `60` unless the user chooses a different local-ref freshness advisory threshold
   - `refreshToolHeuristics`: from detected config files
7. **Present phase**: show the full draft JSON. Ask: “Does this look correct? Reply with edits or approve to write.”
8. **Write phase** (only after explicit user approval):
   - **Always** write `descriptor.json` to **`<config-root>/projects/<projectKey>/descriptor.json`** (required by kit tools — see PATH_CONTRACT). Use a unique mode-`0600` temporary file in the destination directory, exclusive creation, and atomic no-replace installation; clean up the temporary file on failure. If the destination appears during the write, preserve it and stop.
   - **If global:** create `<config-root>/projects/<projectKey>/` tree and `_templates/mr/`; do **not** create project-root or area `AGENTS.md`.
   - **If project-local:** create `<git-root>/<dir>/` (the `opencodeProjectRootPath` tree) and `_templates/mr/` with defaults; do **not** create root/area `AGENTS.md`, and do **not** duplicate branch `branches/` until bootstrap. Leaf `KNOWLEDGE.md` directories are created on demand by `/scaffold-knowledge`.
   - Copy default templates referenced by `branchHandoff.helpers` (for example `MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, `MR.md`) into `_templates/mr/`.
   - If user chose **gitignore A**, append the ignore line idempotently.
   - Report all paths created.

Output:
Return a summary of created paths and suggest next steps:
- “Run `/scaffold-knowledge $ARGUMENTS` to populate leaf `KNOWLEDGE.md` files for detected packages/modules. Seed project or subtree `AGENTS.md` explicitly with the installer when useful, then edit it manually.”
- “Run `/manual-refresh $ARGUMENTS` to start your first session. Use `/project-refresh` only when the Bun tools are explicitly enabled and working.”

Constraints:
- Never write files without user approval of the draft.
- Never overwrite an existing descriptor or helper template from initialization.
- Do not include secrets or tokens in the descriptor.
- Keep area detection conservative; prefer fewer areas over noisy false positives.
