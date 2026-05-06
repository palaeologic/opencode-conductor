# Aligning `~/.config/opencode` with handoff kit v2

This document helps you review a typical local `~/.config/opencode` layout against **kit v2** and identify upgrade opportunities. It contains **no secrets**; never commit API keys or tokens from `opencode.json`.

## What a typical pre-v2 setup looks like

- **Rules**: `rules/CORE.md`, `rules/FRONTEND.md`, `rules/HANDOFF.md` — project-specific handoff overlay.
- **Commands**: `project-refresh`, `project-bootstrap`, `project-phases`, `manual-refresh` synced under `~/.config/opencode/commands/`.
- **Descriptor** (`projects/<projectKey>/descriptor.json`): solid `areas`, `trackedKnowledgeTargets`, `branchHandoff` with single `mrFilename` (`MERGE_REQUEST.md` only).
- **Tools**: some installs keep tools under `tools-off/` when disabling tool-calling — kit still documents `tools/` as the active path when stable.

## Suggested alignment (priority order)

1. **Copy new command templates** from this repo into `~/.config/opencode/commands/`:
   - `project-init.md`
   - `project-checkpoint.md`
   - `project-close.md`
   - `project-cleanup-candidates.md`
   - `project-knowledge-refresh.md`
2. **Merge rule baseline**: copy [`rules/HANDOFF_GENERIC.md`](../rules/HANDOFF_GENERIC.md) from the kit and keep your project `HANDOFF.md` as a **thin project overlay** (paths, org-specific tool names, package rules).
3. **Descriptor upgrades** (optional, backward compatible):
   - Add `"handoffModeDefault": "tracked"` explicitly.
   - Add `"mrFilenames": ["MERGE_REQUEST.md", "MR.md"]` if you want the optional goals file; copy [`templates/mr/MR.md`](../templates/mr/MR.md) into `projects/<projectKey>/_templates/mr/`.
   - Add `"subtaskModels": { ... }` with placeholder or real `provider/model` IDs that match your `opencode.json` providers.
4. **`opencode.json` command registration**: add entries for the new slash commands and set `model` per role (see kit [`README.md`](../README.md) example). Redact tokens when sharing configs.
5. **Naming consistency**: ensure handoff rules reference **`reread_files`** (tool JSON) everywhere — avoid stale `re_read` typos in project rules.
6. **Lite mode**: set `handoffModeDefault` to `lite` only on descriptors for repos where you explicitly want git-window refresh without branch folders.

## Apply changes?

Edits under `~/.config/opencode/` are **local and often sensitive**. Apply the above only after review; prefer copying from this repo with `diff` rather than blind overwrite.
