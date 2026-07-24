---
package: <packageName>
area: <areaName>
source_path: <sourceRelPath>
aliases: <aliasesJsonArray>
documentation_depth: template
last_reviewed_commit: unknown
update_policy: stable-knowledge-only
---

# Package: <packageName>

## Purpose
<!-- What this package owns and why it exists. -->

## Use When
<!-- When an agent or human should consult this package knowledge. -->

## Avoid When
<!-- When work belongs elsewhere or a higher-level area rule is the better source. -->

## Public Surface / Entry Points
<!-- Fill after focused exploration. Cite stable files, exports, APIs, commands, or routes. -->

## Internal Layout
<!-- Fill only with stable layout facts worth remembering; avoid directory inventories. -->

## Core Patterns
<!-- Fill after focused exploration. Prefer concise imperatives and concrete paths. -->

## Invariants
- Package consumers should prefer stable public entrypoints over deep implementation imports.

## Boundaries
- Within-package imports: prefer relative paths.
- Cross-package imports: prefer aliases when the area defines them.

## Verification
- Start with the relevant area `AGENTS.md` `## Verification scripts` rows.
- If no area row applies, use project defaults and record the gap during refresh/review rather than inventing a command.

## Known Pitfalls
<!-- Fill as pitfalls are discovered. -->

## Keep Updated
Update when stable patterns, entrypoints, invariants, or boundaries change.
Do not update for branch-specific progress or temporary debugging.
