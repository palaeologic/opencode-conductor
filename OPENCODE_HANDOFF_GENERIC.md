# OpenCode Handoff System (Generic)

Reusable documentation for **descriptor-driven** OpenCode handoffs with **tracked** and **lite** modes.

## Key ideas

- Project facts live in **`descriptor.json`**; tools stay generic.
- OpenCode has **no hooks** — use **commands** for lifecycle (`checkpoint`, `close`) instead of idle/session automation.
- **Subtasks** isolate heavy reads; combine with **`opencode.json` `command.*.model`** for cost-aware routing.

## Components

- [`descriptors/descriptor.template.json`](descriptors/descriptor.template.json) — schema baseline (`handoffModeDefault`, `subtaskModels`, `branchHandoff.mrFilenames`, …)
- [`descriptors/examples/example-project.descriptor.json`](descriptors/examples/example-project.descriptor.json)
- [`tools/_opencode_engine.ts`](tools/_opencode_engine.ts) — bootstrap + refresh engine
- [`tools/opencode_bootstrap_branch.ts`](tools/opencode_bootstrap_branch.ts), [`tools/opencode_refresh_context.ts`](tools/opencode_refresh_context.ts)
- Commands under [`commands/`](commands/) — refresh, bootstrap, phases, checkpoint, close, cleanup, knowledge, manual
- [`templates/mr/*`](templates/mr/) — `MERGE_REQUEST.md`, `LOG.md`, optional `PHASES.md`, optional **`MR.md`**
- [`rules/HANDOFF_GENERIC.md`](rules/HANDOFF_GENERIC.md) — short MUST/SHOULD rule baseline
- [`docs/presentations/handoff-kit-v2.pptx`](docs/presentations/handoff-kit-v2.pptx) — teammate deck (edit + commit)

## Descriptor responsibilities

- `projectRootPath`, `opencodeProjectRootPath`, `baselineBranchForMaterialChanges`
- `handoffModeDefault`: `tracked` | `lite`
- `areas` and optional `trackedKnowledgeTargets`
- `branchHandoff`: templates, filenames, optional **`mrFilenames`** (ordered; first existing MR wins for primary read), `checkpointField`
- `refreshToolHeuristics` for `mr_update_recommended`
- `subtaskModels`: optional map of role → `provider/model` string for documentation / pairing with `opencode.json`

## Branch layout

```
~/.config/opencode/projects/<projectKey>/
  AGENTS.md
  <area>/AGENTS.md
  _templates/mr/
  branches/<branch-name>/
    MERGE_REQUEST.md
    MR.md            (optional)
    LOG.md
    PHASES.md        (optional)
```

## Workflows

1. **tracked**: bootstrap once per branch → refresh often → checkpoint/close → optional knowledge promotion with approval.
2. **lite**: refresh without persistent branch files → upgrade to tracked later if needed.

## Manual fallback

When tool-calling is unstable, `/manual-refresh` is first-class: same information goals, no tool dependency.

## Descriptor generation

The abstraction is intended to be generated from repository scanning plus user confirmation. See the example descriptor for a filled-in instance.
