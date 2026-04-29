# OpenCode Handoff Command Workflow

This file explains when to invoke each command in a descriptor-driven setup.

## Available commands

- Generic:
  - `/project-refresh <projectKey>`
  - `/project-bootstrap <projectKey>`
  - `/project-phases <projectKey>`
  - `/manual-refresh <projectKey>` (no tool-calling)

## When to call which command

- **Session start**
  - Call: `refresh`
  - Goal: synchronize branch context before coding
- **First visit to a branch**
  - Call: `bootstrap`
  - Goal: create branch-local context files under `branches/<branch-name>/`
- **Branch switch**
  - Call: `refresh`
  - Goal: avoid context carry-over from previous branch
- **After rebase/squash/history rewrite**
  - Call: `refresh`
  - Goal: re-anchor checkpoint and recommendations
- **When branch scope gets large**
  - Call: `phases`
  - Goal: create/refine phased plan with clear milestones
- **Before handing off to a new agent**
  - Call: `refresh`, then append branch `LOG.md`
  - Goal: preserve continuity with minimal context load

## Command outcomes

- **refresh** returns:
  - checkpoint/head range
  - changed areas
  - `reread_files`
  - recommendations for MR/log updates
- **bootstrap** returns:
  - created/seeded context files
  - branch-local context paths
  - optional phases creation status
- **phases** returns:
  - active phase
  - next suggested phase task
  - whether phases file was newly created

## Typical flow

1. `refresh`
2. if branch context missing -> `bootstrap`
3. implement
4. `refresh` before next major chunk
5. if needed -> `phases`
6. append branch `LOG.md`

## Manual fallback flow

If command/tool-calling is unavailable:

1. run `/manual-refresh <projectKey>` first
2. create/seed branch files from templates when missing
3. read project/area/package/branch context files
4. perform manual refresh from git delta
5. append branch `LOG.md` with decisions and checkpoints

Fallback quick sentence (if command parsing fails):

`Tool-calling is disabled. Run manual handoff refresh for project key <projectKey> using branch context files and git delta, then return branch, checkpoint->head, changed_areas, reread_files, and recommendations.`