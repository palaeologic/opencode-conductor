# Presentations

Teammate-facing slide decks for **OpenCode Conductor** (agnostic kit).

## Deck in this folder

| File | Audience |
|------|----------|
| [`opencode-conductor-overview.pptx`](opencode-conductor-overview.pptx) | Engineers adopting the generic kit |

Maintain the `.pptx` in PowerPoint / Keynote / Google Slides (export) and commit updates here. There is **no** generator script in this repository.

## Slide outline (`opencode-conductor-overview.pptx`)

1. **Title** — OpenCode Conductor; descriptor-driven continuity (no hooks).
2. **Problem / constraints** — No lifecycle hooks; file + command continuity; risks and solution pillars.
3. **Architecture (disk)** — `descriptor.json`; shared `AGENTS.md` vs `branches/<branch>/`; `_templates/mr/`.
4. **Tracked vs lite** — Branch files vs git-window lite; `handoffModeDefault`.
5. **Command map** — Lifecycle, `scaffold-knowledge`, verification commands, `manual-refresh` fallback.
6. **`/project-refresh` vs `/manual-refresh`** — Tool path vs fallback; read-only + structured output.
7. **Rules + contract** — `HANDOFF_GENERIC` + overlay; MUST highlights including subtask handoff.
8. **Skills** — On-demand `skills/<name>/SKILL.md`; zero cost until invoked.
9. **Token cost analysis** — Short summary; full tables in repo [`README.md`](../../README.md) (section *Token cost analysis*).
10. **Where to read more** — `README.md`, `HANDOFF_GENERIC.md`, `COMMAND_WORKFLOW.md`, `TEST_PLAN.md`.

## Pointers

- Canonical documentation: [`README.md`](../../README.md)
- Behavioral contract: [`../../rules/HANDOFF_GENERIC.md`](../../rules/HANDOFF_GENERIC.md)

For a project-specific snapshot deck, see your project's own conductor repository under `docs/presentations/`.
