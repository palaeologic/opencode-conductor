# Aligning `~/.config/opencode` with handoff kit v2

This document helps you review a typical local `~/.config/opencode` layout against **kit v2** and identify upgrade opportunities. It contains **no secrets**; never commit API keys or tokens from `opencode.json`.

## What a typical pre-v2 setup looks like

- **Rules**: `rules/CORE.md`, `rules/FRONTEND.md`, `rules/HANDOFF.md` — single monolithic handoff rule.
- **Commands**: only `project-refresh`, `project-bootstrap`, `project-phases`, `manual-refresh`.
- **Top-level docs**: `COMMAND_WORKFLOW.md`, `OPENCODE_HANDOFF_GENERIC.md`, `OPENCODE_HANDOFF_<PROJECT>.md` — redundant runbooks (delete these).
- **Skills folder**: `projects/<projectKey>/skills/` — procedural guides now superseded by commands (delete).
- **Descriptor** (`projects/<projectKey>/descriptor.json`): uses single `mrFilename` string, missing `handoffModeDefault` and `subtaskModels`.
- **Tools**: some installs keep tools under `tools-off/` when disabling tool-calling — kit documents `tools/` as the active path when stable.

## Suggested alignment (priority order)

1. **Replace all commands**: copy the full `commands/` folder from the kit into `~/.config/opencode/commands/` (overwrites v1 versions, adds 5 new ones).
2. **Layer rules**: copy [`rules/HANDOFF_GENERIC.md`](../rules/HANDOFF_GENERIC.md) into `~/.config/opencode/rules/`. Trim your existing `HANDOFF.md` to a thin project overlay (tool names, package detection, org conventions only).
3. **Delete stale files**: remove top-level docs (`COMMAND_WORKFLOW.md`, `OPENCODE_HANDOFF_*.md`) and any `skills/` folders under `projects/`.
4. **Descriptor upgrades**:
   - Add `"handoffModeDefault": "tracked"` explicitly.
   - Switch `"mrFilename"` to `"mrFilenames": ["MERGE_REQUEST.md"]` (or add `"MR.md"` if you want the goals file; copy template into `_templates/mr/`).
   - Add `"subtaskModels": {}` (fill in later with `provider/model` IDs).
5. **`opencode.json` command registration**: add entries for the new slash commands and set `model` per role (see kit [`README.md`](../README.md) example).
6. **Lite mode**: set `handoffModeDefault` to `lite` only on descriptors for repos where you explicitly want git-window refresh without branch folders.

## Apply changes?

Edits under `~/.config/opencode/` are **local and often sensitive**. Apply the above only after review; prefer copying from this repo with `diff` rather than blind overwrite.
