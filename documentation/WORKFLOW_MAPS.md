# Branch context workflow maps

Mermaid diagrams for **tool** vs **manual** paths. When Bedrock or policy disables Bun tools, substitute **`/manual-refresh`** for **`/project-refresh`** and the same **`## Handoff refresh result`** shape ([`commands/manual-refresh.md`](../commands/manual-refresh.md)).

**Legend:** **Rules** = project `AGENTS.md` + HANDOFF docs. **Branch files** = `MERGE_REQUEST.md`, `LOG.md`, `PHASES.md`, optional `REVIEW.md`. **Repo knowledge** = per-area **`AGENTS.md`** (default anchor) + leaf **`KNOWLEDGE.md`**; optional project-wide **`KNOWLEDGE.md`**; optional **`areaKnowledgePath`** or sibling area **`KNOWLEDGE.md`** when teams split area facts from area rules.

## A — Session entry (tool lane)

```mermaid
flowchart TB
  subgraph entryPath [Entry_path]
    startNode[User_or_session_start]
    startNode --> loadRules[Read_rules_HANDOFF_session_lifecycle]
    loadRules --> cmdRefresh["Command_/project-refresh"]
  end
  cmdRefresh --> toolRef[Tool_opencode_refresh_context]
  toolRef --> branch{tracked_and_MR_and_LOG_readable}
  branch -->|false| missCtx[missing_branch_context]
  missCtx --> out1[Handoff_block_next_steps]
  out1 --> userBoot["User_/project-bootstrap_then_refresh"]
  branch -->|true| fullRef[Diff_checkpoint_areas]
  fullRef --> out2[Handoff_refresh_result]
  out2 --> userNext["Continue_phases_update_mr_review"]
```

## A — Manual lane (Bedrock / no tools)

```mermaid
flowchart TB
  startM[User_or_session_start] --> cmdMan["Command_/manual-refresh"]
  cmdMan --> agentGit[Agent_git_read_seed_templates]
  agentGit --> outM[Same_Handoff_refresh_result_shape]
```

## B — Bootstrap with optional inline phases

```mermaid
flowchart TB
  R2["After_refresh_missing_context_resolved"]
  R2 --> B["/project-bootstrap"]
  B --> toolBoot[Tool_opencode_bootstrap_branch]
  toolBoot --> pasteFlow[Paste_MR_optional]
  pasteFlow --> askInline{Draft_PHASES_inline}
  askInline -->|yes| planPh[Skill_plan_phases]
  planPh --> writePh[Write_PHASES_md]
  askInline -->|later| skipPh["Defer_/project-phases"]
  writePh --> R3["/project-refresh"]
  skipPh --> R3
```

## C — Retro minimal chain

```mermaid
flowchart LR
  c1["/project-refresh_or_manual"]
  c2["/project-bootstrap"]
  c3["/project-phases"]
  c4["/project-update-mr"]
  c1 --> c2 --> c3 --> c4
```

## D — Branch kickoff (high ceremony)

```mermaid
flowchart TB
  K["/project-branch-kickoff"]
  K --> gate[Readiness_gate]
  gate -->|retroactive_token| chain[Chain_refresh_bootstrap_phases]
  gate -->|prompt| userY{User_confirms}
  userY -->|yes| chain
  userY -->|no| abortFlow[Abort_or_manual_chain]
  chain --> outK[Audit_and_checklist]
```

## E — Partial branch context

```mermaid
flowchart TB
  disk[Branch_dir_partial_files]
  disk --> refreshCheck["/project-refresh"]
  refreshCheck --> engine{MR_and_LOG_readable}
  engine -->|no| failTracked[missing_branch_context]
  failTracked --> explain[List_branch_context_status]
  explain --> suggestBoot["/project-bootstrap"]
  engine -->|yes| normal[Normal_refresh]
```

When diagrams and commands diverge, update this file in the **same PR** as the command change.
