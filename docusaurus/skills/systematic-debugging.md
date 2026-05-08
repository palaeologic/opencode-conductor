---
title: systematic-debugging
sidebar_position: 12
---

# systematic-debugging

Procedural debugging methodology: reproduce, isolate, hypothesize, verify.

## Diagram

```mermaid
flowchart LR
  Repro[Reproduce] --> Isolate[Isolate]
  Isolate --> Hypothesize[Hypothesize]
  Hypothesize --> Verify[Verify]
  Verify --> Iterate[Iterate or stop]
```

## Recommended permission

`allow` — non-mutating; the skill recommends bisects, binary searches, and minimal repros.
