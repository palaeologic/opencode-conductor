# OpenCode Handoff Kit (Reusable)

Reusable, descriptor-driven handoff kit for OpenCode projects.

## What this repo is for

Use this kit to set up consistent branch handoff context outside source repos:

- branch-level context files (`MERGE_REQUEST.md`, `LOG.md`, optional `PHASES.md`)
- reusable command templates (`/project-*`, `/manual-refresh`)
- descriptor-driven tooling/templates for multi-project reuse

## Quick Start

1. Copy kit assets into your OpenCode home:
   - `rules/*` -> `~/.config/opencode/rules/`
   - `commands/*` -> `~/.config/opencode/commands/`
   - `tools/*` -> `~/.config/opencode/tools/` (optional if tool-calling is stable)
2. Create project descriptor:
   - `~/.config/opencode/projects/<projectKey>/descriptor.json`
   - start from `descriptors/descriptor.template.json`
3. Copy branch templates:
   - `templates/mr/*` -> `~/.config/opencode/projects/<projectKey>/_templates/mr/`
4. Update `~/.config/opencode/opencode.json`:
   - include handoff rule in `instructions`
   - allow `external_directory` for `~/.config/opencode/projects/**`
   - add tool permissions only if provider/tool path is stable

## Commands (argument is required)

Always pass a project key argument:

- `/project-refresh <projectKey>`
- `/project-bootstrap <projectKey>`
- `/project-phases <projectKey>`
- `/manual-refresh <projectKey>` (no tool-calling fallback)

Examples:

- `/project-refresh aimos`
- `/manual-refresh aimos`

## Recommended Workflow

1. Start session: `/project-refresh <projectKey>`  
   (or `/manual-refresh <projectKey>` if tools are disabled)
2. If branch context is missing: `/project-bootstrap <projectKey>`
3. Implement work
4. Append branch `LOG.md` after substantial work
5. If branch gets large: `/project-phases <projectKey>`
6. On branch switch/rebase/new session: refresh again

## Manual Mode (when tools are unavailable)

Primary entry:

- `/manual-refresh <projectKey>`

If command parsing fails, use this sentence:

`Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.`

### Why manual mode merges two steps into one

In normal tool mode, commands are intentionally separated:

- `/project-bootstrap <projectKey>` creates/initializes branch context files.
- `/project-refresh <projectKey>` reads current state and returns refresh recommendations.

In manual mode, `/manual-refresh <projectKey>` combines both behaviors on purpose:

- if branch context is missing, it bootstraps first,
- then it runs refresh.

This keeps outages simple for users (one command to continue work), while preserving explicit two-step commands for stable/tool-enabled environments.

## Where to read details

- Full conceptual guide: `OPENCODE_HANDOFF_GENERIC.md`
- Command decision matrix: `COMMAND_WORKFLOW.md`
- Test playbook: `TEST_PLAN.md`
- Rule baseline: `rules/HANDOFF_GENERIC.md`
- Fallback skill: `skills/project-manual-refresh-fallback.md`

## Template Authoring

When improving `templates/mr/*`:

- keep templates generic (no project/company-specific names)
- use explicit placeholders (for example `<branch-name>`)
- keep `LOG.md` append-only and checkpoint-aware
- keep `PHASES.md` optional and phase-driven

Template change checklist:

1. Update template files.
2. Verify descriptor filenames match template filenames.
3. Run bootstrap/manual-refresh on a throwaway branch.
4. Confirm docs and examples still match behavior.

## Bedrock / Provider Caveat

If you see errors like:

- `toolConfig.tools.N.member.toolSpec.description must have length greater than or equal to 1`

switch to manual mode and keep tool permissions disabled until runtime/provider path is stable.

References:

- [AWS ToolSpecification](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_ToolSpecification.html)
- [OpenCode PR #15957](https://github.com/anomalyco/opencode/pull/15957)
- [Cline issue #7696](https://github.com/cline/cline/issues/7696)

