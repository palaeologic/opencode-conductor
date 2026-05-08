# Changelog: v1 → v2

## Overview

Version 2 transforms the kit from a minimal bootstrap-and-refresh tool into a full **descriptor-driven session lifecycle system** with two operating modes, richer metadata, and explicit lifecycle commands designed for OpenCode's hook-free environment.

---

## New features

### Tracked & Lite modes

| | v1 | v2 |
|---|---|---|
| Operating modes | Single (implicit tracked) | Explicit **tracked** and **lite** with `handoffModeDefault` in descriptor |
| Lite refresh | N/A — always required branch files | Git-window delta + minimal reread; no bootstrap needed |
| Mode override | N/A | Per-call `handoffMode` argument on refresh tool |

### `/project-init` command

- Scans repository structure (git toplevel, directories, packages, baseline branch).
- Drafts a `descriptor.json` and presents it for user review.
- On approval, writes descriptor + templates + initial `AGENTS.md`.
- Refresh auto-suggests init when no descriptor is found (graceful instead of hard error).
- Suggests `/scaffold-knowledge <projectKey>` as the next step after init.

### `/scaffold-knowledge` command

- New knowledge scaffolding command for first-time project setup.
- Generates or enriches project/area/package `AGENTS.md` files with stack and architecture orientation.
- Designed as a one-time post-init step; branch switches do not require rerunning.
- Can be rerun when areas, pseudo-packages, or core stack conventions materially change.

### Lifecycle commands (no-hooks design)

| Command | Purpose |
|---------|---------|
| `/project-checkpoint` | Append structured checkpoint entry to `LOG.md` |
| `/project-close` | Append session-close summary with next steps |
| `/project-cleanup-candidates` | Report stale branch folders (read-only) |
| `/project-knowledge-refresh` | Propose updates to shared `AGENTS.md` files (user approves) |

All lifecycle commands include **manual fallback** instructions for when tool-calling is unavailable.

### Optional `MR.md`

- `branchHandoff.mrFilenames` accepts an ordered array (e.g. `["MERGE_REQUEST.md", "MR.md"]`).
- Bootstrap seeds all configured MR templates; refresh reads every existing file in order.
- Backward compatible: legacy single `mrFilename` string still works.

### Richer refresh metadata

New fields returned by `opencode_refresh_context`:

| Field | Type | Meaning |
|-------|------|---------|
| `handoff_mode` | string | `tracked` or `lite` |
| `checkpoint_source` | string | How checkpoint was determined (`log_field`, `merge_base`, `lite_window`) |
| `last_log_age_minutes` | number | Minutes since last `LOG.md` append |
| `needs_checkpoint` | boolean | Heuristic: should you checkpoint before switching? |
| `context_staleness` | string | `fresh`, `aging`, `stale` |
| `log_append_recommended` | boolean | Significant work since last log entry |
| `mr_update_recommended` | boolean | MR content diverged from branch state |
| `agents_stale_vs_branch` | boolean | Shared knowledge outdated relative to branch |
| `subtaskModels` | object | Echo of descriptor's model map for agent routing |

### Per-subtask model hints

- Descriptor `subtaskModels` maps roles (`refresh`, `bootstrap`, `checkpoint`, `close`, `knowledge`) to `provider/model` strings.
- Pairs with `opencode.json` `command.*.model` for cost-aware routing (cheap models for logging, strong models for knowledge synthesis).

---

## Engine fixes (from v1 bugs)

| Fix | Problem | Solution |
|-----|---------|----------|
| Reread scoping | `reread_files` included ALL area `AGENTS.md` files | Now includes only the **active area's** `AGENTS.md` |
| Double checkpoint | `extractCheckpoint` called twice per refresh | Cached result in local variable |
| Stale threshold | `agents_stale_vs_branch` compared mtime vs git timestamp (fragile) | Added 1-hour significant-difference threshold |
| mrFilenames | `mrFilename` (string) and `mrFilenames` (array) coexisted | Single `mrFilenames` array; legacy string handled as fallback |
| Graceful no-descriptor | `loadDescriptor` threw on missing file | Returns `{ ok: false, error }` enabling auto-prompt for init |

---

## Documentation changes

| File | Change |
|------|--------|
| `README.md` | Now single source of truth: architecture, disk layout, all Mermaid diagrams, commands, output schema |
| `README.md` | Consolidated canonical handoff documentation previously split across legacy runbooks |
| `documentation/COMMAND_WORKFLOW.md` | Trimmed to pure decision matrix (when to call which command) |
| `documentation/TEST_PLAN.md` | Added sections for lite mode, MR.md, lifecycle commands; fixed active-area wording |
| `rules/HANDOFF_GENERIC.md` | Rewritten as concise MUST/SHOULD behavioral contract |
| `README.md` | “Local OpenCode home hygiene” subsection consolidates former `docs/ALIGNMENT_OPENCODE_HOME.md` guidance |
| `commands/project-init.md` | New command definition |
| `commands/project-checkpoint.md` | New (with manual fallback) |
| `commands/project-close.md` | New (with manual fallback) |
| `commands/project-cleanup-candidates.md` | New |
| `commands/project-knowledge-refresh.md` | New |
| `commands/scaffold-knowledge.md` | New |
| `templates/mr/MR.md` | New optional template |

---

## Migration from v1

1. **Pull latest** and re-copy `commands/*` and `rules/*` into `~/.config/opencode/`.
2. **Update descriptor**: add `handoffModeDefault`, switch `mrFilename` → `mrFilenames` (array), optionally add `subtaskModels`.
3. **Update `opencode.json`**: register new commands with appropriate `model` and `subtask: true`.
4. **Remove stale files**: delete any top-level runbook/workflow docs (e.g. `documentation/COMMAND_WORKFLOW.md`, `OPENCODE_HANDOFF_*.md`) and `skills/` folder from `~/.config/opencode/` — these are now handled by commands and rules.
5. **Test**: run through `documentation/TEST_PLAN.md` sections 1–10.
6. **Optional**: run `/project-init` on a fresh project to validate the guided setup flow.
7. **Recommended**: run `/scaffold-knowledge <projectKey>` once after init to populate shared knowledge files.

---

## Breaking changes

None. All v2 additions are backward compatible:
- Missing `handoffModeDefault` defaults to `tracked` (v1 behavior).
- Missing `mrFilenames` falls back to single `mrFilename` or default `MERGE_REQUEST.md`.
- New refresh fields are additive; existing consumers ignore unknown keys.
