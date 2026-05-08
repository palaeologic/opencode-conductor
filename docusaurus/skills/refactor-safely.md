---
title: refactor-safely
sidebar_position: 10
---

# refactor-safely

Procedural lens for performing refactors with measurable invariants.

## What it does

- Enumerates invariants (types, tests, public surface, performance).
- Runs verification before and after the refactor.
- Flags any newly-failing invariant before write.

## Recommended permission

`allow` — non-mutating.

## When to use

- Risky refactors touching public APIs.
- Cross-area renames.
