---
title: Command Reference Map
sidebar_position: 99
---

# Command Reference Map

This is a flat lookup of every command shipped in the kit. Use it as a Ctrl-F target.

| Command | Family | Frontmatter agent | Subtask | Mutates |
| --- | --- | --- | --- | --- |
| `/project-init` | init | plan | true | yes (descriptor + templates) |
| `/project-refresh` | init | plan | true | no |
| `/manual-refresh` | init | plan | true | no |
| `/project-bootstrap` | init | plan | true | yes (branch artifacts) |
| `/scaffold-knowledge` | knowledge | plan | true | yes (AGENTS.md) |
| `/project-knowledge-refresh` | knowledge | plan | true | yes (AGENTS.md) |
| `/project-cleanup-candidates` | knowledge | plan | true | no |
| `/project-phases` | branch | plan | true | yes (PHASES.md) |
| `/project-checkpoint` | branch | plan | true | yes (LOG.md) |
| `/project-close` | branch | plan | true | yes (LOG.md) |
| `/project-branch-new` | branch | build | false | yes (git + audit) |
| `/project-branch-kickoff` | branch | plan | false | yes (multi) |
| `/project-branch-explore` | branch | plan | true | yes (EXPLORE_GUIDE.md) |
| `/project-state` | branch | plan | true | no |
| `/project-review` | review | plan | true | yes (REVIEW.md + MR) |
| `/project-review-sync` | review | plan | true | yes (delta updates) |
| `/project-update-mr` | review | plan | true | yes (MR machine block) |
| `/project-help-docs` | help-docs | plan | true | yes (out-of-repo by default) |
| `/check-types` | verification | build | true | no |
| `/run-tests` | verification | build | true | no |
| `/lint-fix` | verification | build | true | yes (source) |
| `/organize-imports` | verification | build | true | yes (source) |

## Cross-links

- Operator picker: `documentation/COMMAND_WORKFLOW.md`.
- Detailed scenario walkthroughs: [workflows/scenarios.md](../workflows/scenarios.md).
- Full file-level frontmatter contract: `documentation/PATH_CONTRACT.md` § Frontmatter conventions.
