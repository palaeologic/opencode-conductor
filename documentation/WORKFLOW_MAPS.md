# Branch Context Workflow Maps

## Session entry

```mermaid
flowchart TB
  S["Session starts"] --> T{"Custom wrappers active?"}
  T -->|yes| R["/project-refresh"]
  T -->|no| M["/manual-refresh"]
  R --> C["Read-only context result"]
  M --> C
  C --> H{"Branch helpers ready?"}
  H -->|no| B["/project-bootstrap or /project-helper"]
  H -->|yes| W["Continue work"]
  B --> R
```

## Helper reconciliation

```mermaid
flowchart LR
  D["Descriptor support"] --> X["Refresh reconciliation"]
  M["Branch manifest intent"] --> X
  F["Filesystem reality"] --> X
  X --> O["Helper state and drift"]
  O --> P["/project-helper decision"]
```

## Shared branch

```mermaid
flowchart TB
  R["Read-only refresh"] --> S{"Local sync state"}
  S -->|up to date or ahead| W["Continue or push separately"]
  S -->|behind| P["/project-pull-refresh"]
  S -->|diverged| E["Choose explicit Git reconciliation"]
  P --> G{"Clean and fast-forwardable?"}
  G -->|yes| U["Confirmed fetch/pull then refresh"]
  G -->|no| E
```

## Review lifecycle

```mermaid
flowchart LR
  N["No review"] --> C["/project-review creates review"]
  C --> H["reviewed_head recorded"]
  H --> Q{"HEAD moved?"}
  Q -->|no| K["Continue triage"]
  Q -->|yes| S["Preserve-sync or regenerate intentionally"]
  S --> H
```

When a diagram and command behavior differ, the command and [`PATH_CONTRACT.md`](PATH_CONTRACT.md) take precedence and the map should be corrected in the same change.
