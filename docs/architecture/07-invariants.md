---
title: Invariants
sidebar_position: 7
---

Key invariants:

- Descriptor-driven paths are source of truth.
- Root containment and symlink refusal protect writes.
- Audit-trail sections remain structured and prompt-safe.
- Knowledge preflight is deterministic and git-based.

```mermaid
flowchart TD
  I1[Descriptor-driven resolution]
  I2[Write safety guards]
  I3[Structured audit blocks]
  I4[Deterministic drift checks]
  I1 --> Reliable[Reliable operation]
  I2 --> Reliable
  I3 --> Reliable
  I4 --> Reliable
```
