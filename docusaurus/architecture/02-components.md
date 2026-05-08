---
title: Components
sidebar_position: 2
---

Core components and responsibilities:

- `descriptors/` defines schema and examples.
- `tools/_opencode_engine.ts` resolves descriptor-driven paths and refresh/bootstrap behavior.
- `commands/` orchestrates operational workflows.
- `skills/` provides on-demand lenses.
- `rules/` sets always-on guardrails.

```mermaid
flowchart TD
  E[tools/_opencode_engine.ts]
  D[descriptors/*]
  C[commands/*]
  S[skills/*]
  R[rules/*]
  O[OpenCode runtime]

  D --> E
  E --> O
  C --> O
  S --> O
  R --> O
```
