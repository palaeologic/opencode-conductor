---
title: session-lifecycle
sidebar_position: 11
---

# session-lifecycle

Manages session-open, checkpoint, and session-close entries in `LOG.md`.

## What it does

- Emits a session-open block on session start.
- Emits checkpoint blocks on `/project-checkpoint`.
- Emits a session-close block on `/project-close`.

## Recommended permission

`ask` — appends to durable knowledge.
