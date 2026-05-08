---
title: Failure Modes
sidebar_position: 10
---

Typical failure modes and how the kit responds:

- Dirty tree before branch mutation -> refuse and ask for explicit stash/commit.
- Missing branch context -> bootstrap recommendation.
- Missing AGENTS files -> scaffold during knowledge-aware review preflight.
- Knowledge drift vs base -> deterministic finding and rebase guidance.

```mermaid
flowchart TD
  A[Command start] --> B{Dirty tree?}
  B -->|yes| R1[Refuse mutation + remediation]
  B -->|no| C{Context missing?}
  C -->|yes| R2[Bootstrap flow]
  C -->|no| D{Knowledge drift?}
  D -->|yes| R3[Emit F-xx drift finding]
  D -->|no| E[Normal execution]
```
