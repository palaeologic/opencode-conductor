---
title: Workflow Maps
sidebar_position: 2
---

# Workflow Maps

The normative diagrams live in [`documentation/WORKFLOW_MAPS.md`](../../documentation/WORKFLOW_MAPS.md). They cover:

- tool and manual session entry;
- schema v3 helper reconciliation;
- explicit shared-branch synchronization;
- review lifecycle after `HEAD` moves.

The important boundary is consistent across every flow: refresh reads and reports; separate commands own confirmed mutations.
