# Command Workflow

Quick decision matrix for the shipped slash commands. [`WORKFLOW.md`](WORKFLOW.md) contains longer scenarios.

## Project and context

| Situation | Command | Contract |
| --- | --- | --- |
| Register a project | `/project-init <key>` | Proposes descriptor, state mode, areas, and templates before writing |
| Inspect current state | `/project-state [<key>]` | Read-only Git, descriptor, context, review, and stash summary |
| Start or resume a session | `/project-refresh <key>` | Read-only engine refresh |
| Run without custom tools | `/manual-refresh <key>` | Manual implementation of the same handoff concepts |
| Reconcile with the remote | `/project-pull-refresh <key>` | Confirms fetch/pull, refuses dirty or diverged state, then refreshes |
| First tracked visit to branch | `/project-bootstrap <key>` | Creates selected helper files and manifest |
| Change branch helper selection | `/project-helper <key>` | Create, relink, mark removed, or skip with explicit decisions |

Refresh never performs network operations and never silently creates helpers. Missing or malformed branch context is reported with a next step.

## Branch lifecycle

| Situation | Command |
| --- | --- |
| Create a feature branch from the integration base | `/project-branch-new [<branch>]` |
| Plan a larger branch | `/project-branch-kickoff [<key>]` |
| Build a manual exploration guide | `/project-branch-explore [<branch>]` |
| Create or refine milestones | `/project-phases <key>` |
| Record progress | `/project-checkpoint <key>` |
| End a session with a durable next step | `/project-close <key>` |
| Report stale branch-context candidates | `/project-cleanup-candidates <key>` |

Git-mutating commands use `git-safety`, refuse unsafe preconditions, and ask at each meaningful state change.

## Review and change-request narrative

| Situation | Command |
| --- | --- |
| Generate or continue a review | `/project-review <key>` |
| Preserve-sync review after new commits or narrative edits | `/project-review-sync <key>` |
| Update change-request narrative from facts and branch context | `/project-update-mr <key>` |

Review uses `reviewIgnoredPathGlobs` to partition changed paths before generating findings. Ignored paths remain visible in scope. New findings use separate implementation, review, and metadata/knowledge namespaces; identifiers already present in an existing review remain stable.

## Knowledge and documentation

| Situation | Command |
| --- | --- |
| Discover or preview leaf knowledge | `/scaffold-knowledge <key> [list|dry-run|discovery]` |
| Propose durable updates from current work | `/project-knowledge-refresh <key>` |
| Generate end-user documentation from source | `/project-help-docs [<output-root>]` |

Project rules live at the project root, area orientation lives in area `AGENTS.md`, and leaf facts live in source-tree-mirrored `KNOWLEDGE.md`.

## Focused engineering helpers

| Need | Command |
| --- | --- |
| Type checking | `/check-types [area]` |
| Tests | `/run-tests [area]` |
| Lint and safe fixes | `/lint-fix [area]` |
| Import cleanup | `/organize-imports` |
| Browser end-to-end tests | `/run-playwright-tests [scope]` |
| Graph query mutation scaffold | `/add-gql-mutation` |
| Data-table column change | `/add-table-column` |
| Component extraction | `/extract-component` |
| Replace manual flex containers with existing wrappers | `/migrate-to-flex-wrapper` |

The last four are generic guided implementation recipes. They discover local conventions before editing and do not assume a particular framework layout.

## Common options

| Option | Effect |
| --- | --- |
| `no-preflight` | Skip knowledge/drift preflight where supported |
| `no-source-guard` | Permit knowledge scaffolding before the source path exists |
| `no-mermaid` | Skip optional diagram prompts |
| `no-stash-check` | Skip the managed-stash reminder |

Options compose. Commands must validate positional arguments before using them and must never interpolate arguments into shell-injection blocks.

## Tool availability

The engine sources live in `tools-off/` and are activated explicitly. `/project-refresh` and `/project-bootstrap` can use the wrappers; `/manual-refresh` provides refresh parity when they are unavailable, and `/project-bootstrap` contains an exact write-capable manual fallback. Helper creation, repair, and phase-plan creation delegate to that same safe bootstrap contract. The remaining commands operate through documented file and Git procedures.

## Outcomes

A successful refresh reports:

- descriptor and contract versions;
- branch, area, checkpoint, and changed-path partitions;
- reread order and context staleness;
- supported, tracked, existing, missing, untracked, unsupported, available, and removed helpers;
- manifest/path errors without overwriting invalid state;
- review lifecycle and open-finding state;
- local upstream divergence and remote-ref staleness.

Common failures include `descriptor_not_found`, `workspace_not_in_project`, `detached_head`, `missing_branch_context`, `invalid_path`, and `manifest_error`. Each failure should include a practical next step.
