---
title: Lifecycles
sidebar_position: 4
---

The kit supports tracked and lite lifecycles with explicit transitions.

```mermaid
stateDiagram-v2
  [*] --> Init
  Init --> Refresh
  Refresh --> Bootstrapped: tracked + missing context
  Refresh --> Working: lite or context ready
  Bootstrapped --> Working
  Working --> Checkpoint
  Checkpoint --> Working
  Working --> Review
  Review --> Close
  Close --> [*]
```
