---
title: Trade-offs
sidebar_position: 9
---

Primary trade-offs are explicit and documented:

- More structure in exchange for reproducibility.
- Small always-on rule cost in exchange for higher first-pass quality.
- Safety confirmations in exchange for slower destructive git paths.

```mermaid
quadrantChart
    title Conductor Trade-offs
    x-axis Lower safety --> Higher safety
    y-axis Lower speed --> Higher speed
    quadrant-1 Fast + Safe
    quadrant-2 Slow + Safe
    quadrant-3 Slow + Risky
    quadrant-4 Fast + Risky
    "Raw ad-hoc shell flow": [0.2, 0.8]
    "Conductor guarded workflow": [0.8, 0.55]
    "Over-manual process": [0.9, 0.2]
```
