---
description: Initialize a new project descriptor via repo scan and guided confirmation
subtask: true
---

Initialize handoff kit for project key `$ARGUMENTS`.

This command scans the current repository, drafts a `descriptor.json`, presents it for user approval, and writes the project structure.

Workflow:

1. Resolve `$ARGUMENTS` as the `projectKey`.
2. Confirm cwd is inside a git repo: run `git rev-parse --show-toplevel` to get the project root.
3. **Scan phase** (auto-detect from the repo):
   - **Project root**: git toplevel path.
   - **Areas**: list top-level directories; filter out `.git`, `node_modules`, `dist`, `build`, `.cache`, `vendor`, `target`. Present remaining dirs as candidate areas.
   - **Packages**: look for monorepo signals:
     - `workspaces` field in root `package.json`
     - `packages/` or `libs/` directories
     - `@org/` style imports in source files
   - **Baseline branch**: `git remote show origin | grep 'HEAD branch'` or fallback to `main`.
   - **Refresh heuristics**: detect which config files exist (package.json, tsconfig.json, eslint.config.*, pyproject.toml, go.mod, Cargo.toml) and use them as `highSignalChangedSubstrings`.
4. **Draft phase**: construct a complete `descriptor.json` from scan results:
   - `projectKey`: from `$ARGUMENTS`
   - `projectRootPath`: from git toplevel (use `~/` form)
   - `opencodeProjectRootPath`: `~/.config/opencode/projects/$ARGUMENTS`
   - `baselineBranchForMaterialChanges`: detected baseline branch
   - `handoffModeDefault`: `"tracked"`
   - `subtaskModels`: empty object (user fills in later)
   - `areas`: map of detected area names to `{ pathPrefix, areaAgentsPath }`
   - `branchHandoff`: standard defaults (contextDirTemplate, mrFilenames, logFilename, etc.)
   - `refreshToolHeuristics`: from detected config files
5. **Present phase**: show the full draft JSON to the user, formatted and readable. Ask:
   - "Does this look correct? Reply with edits or approve to write."
   - If user requests changes, apply them to the draft and re-present.
6. **Write phase** (only after explicit user approval):
   - Create `~/.config/opencode/projects/<projectKey>/`
   - Write `descriptor.json`
   - Create `_templates/mr/` with default templates: `MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, `MR.md`
   - Create an empty `AGENTS.md` at project level
   - Report all paths created

Output:
Return a summary of created paths and suggest running `/project-refresh $ARGUMENTS` to start.

Constraints:
- Never write files without user approval of the draft.
- Do not include secrets or tokens in the descriptor.
- Keep area detection conservative; prefer fewer areas over noisy false positives.
