---
title: verify-changes
sidebar_position: 13
---

# verify-changes

Lightweight skill for running verification helpers against the current diff.

## What it does

- Detects the affected area from the diff.
- Recommends `/check-types`, `/run-tests`, `/lint-fix`, `/organize-imports` based on file changes.
- Cross-references area `## Verification scripts` table for richer suggestions.

## Recommended permission

`allow` — non-mutating.
