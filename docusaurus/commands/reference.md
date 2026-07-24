---
title: Command Reference Map
sidebar_position: 99
---

# Command Reference Map

| Command | Family | Mutates |
| --- | --- | --- |
| `/project-init` | project | descriptor and templates |
| `/project-state` | project | no |
| `/project-refresh` | context | no |
| `/manual-refresh` | context | no |
| `/project-pull-refresh` | context | confirmed Git reconciliation |
| `/project-bootstrap` | context | selected helper files and manifest |
| `/project-helper` | context | confirmed helper/manifest changes |
| `/project-branch-new` | branch | confirmed Git and audit state |
| `/project-branch-kickoff` | branch | confirmed multi-step setup |
| `/project-branch-explore` | branch | exploration guide |
| `/project-phases` | branch | phase plan |
| `/project-checkpoint` | lifecycle | progress log |
| `/project-close` | lifecycle | progress log |
| `/project-cleanup-candidates` | lifecycle | no |
| `/project-review` | review | review helper |
| `/project-review-sync` | review | review and change-request helpers |
| `/project-update-mr` | review | change-request helper |
| `/scaffold-knowledge` | knowledge | approved knowledge files |
| `/project-knowledge-refresh` | knowledge | approved knowledge updates |
| `/project-help-docs` | documentation | output documents |
| `/check-types` | verification | no |
| `/run-tests` | verification | no |
| `/lint-fix` | verification | source fixes |
| `/organize-imports` | verification | source fixes |
| `/run-playwright-tests` | verification | optional test artifacts |
| `/add-gql-mutation` | implementation | source and tests |
| `/add-table-column` | implementation | source and tests |
| `/extract-component` | implementation | source and tests |
| `/migrate-to-flex-wrapper` | implementation | source and tests |

See [`documentation/COMMAND_WORKFLOW.md`](../../documentation/COMMAND_WORKFLOW.md) for decision guidance and [`commands/`](../../commands/) for the executable contracts.
