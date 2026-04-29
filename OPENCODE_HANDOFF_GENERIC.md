# OpenCode Handoff System (Generic)

This is the reusable documentation for descriptor-driven OpenCode handoff setups.

## Key idea

Keep project-specific assumptions in `descriptor.json`, and keep tools generic.

## Components

- `descriptors/descriptor.template.json`
- `descriptors/examples/example-project.descriptor.json`
- `tools/_opencode_engine.ts`
- `tools/opencode_bootstrap_branch.ts`
- `tools/opencode_refresh_context.ts`
- `commands/project-bootstrap.md`
- `commands/project-refresh.md`
- `commands/project-phases.md`
- `templates/mr/*`

## Descriptor responsibilities

The descriptor should define:

- project root
- areas and area paths
- baseline branch
- module or package detection
- branch handoff filenames and template locations
- tracked knowledge targets
- refresh heuristics

## Branch layout

Recommended branch-local layout:

- `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/MERGE_REQUEST.md`
- `~/.config/opencode/projects/<projectKey>/branches/<branch-name>/LOG.md`
- optional `PHASES.md` in the same folder

## Generic workflow

1. Bootstrap branch context.
2. Refresh before substantial work.
3. Follow returned `reread_files`.
4. Keep branch-local details in `LOG.md`.
5. Promote durable insights to shared guides only when stable.

## Descriptor generation

The abstraction is intended to generate an exact project descriptor after repository scanning plus user confirmation.

See `descriptors/examples/example-project.descriptor.json` for a concrete instance generated from the same abstraction.