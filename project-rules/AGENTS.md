# Project guidance

These instructions apply to this directory and all descendants unless a nearer `AGENTS.md` overrides them.

## Project map

- Purpose: replace this line with the project or subtree responsibility.
- Primary entry points: list the stable files or commands contributors should start from.
- Ownership boundaries: identify neighboring modules and public interfaces.

## Engineering expectations

- Preserve established architecture and naming unless the change explicitly requires a migration.
- Prefer the smallest complete change that satisfies the acceptance criteria.
- Keep generated files, migrations, tests, and documentation synchronized with source changes.
- Do not expose secrets, credentials, personal data, or local environment contents.
- Ask before destructive data operations, dependency upgrades, public API changes, or broad rewrites.

## Verification scripts

| Trigger | Command | When |
| --- | --- | --- |
| `<path-or-glob>` | `<documented command>` | `<condition and expected scope>` |

Replace the example row with commands copied from project manifests, CI configuration, or maintained documentation. Do not invent commands.

## Durable knowledge

Record stable architectural facts and non-obvious operational constraints here. Put temporary branch progress, findings, and phase status in the branch helper files instead.
