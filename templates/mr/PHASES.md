# Phases

Use this file when a branch is large and needs staged delivery.

## Current phase
- Active phase: `1.0`
- Status: `planned`

## Phase index
- `1.0` Foundation
- `2.0` Implementation
- `3.0` Verification and cleanup

## Phase details

### 1.0
Title: Foundation

Goal:
- Define the minimal structure needed to implement safely.

In scope:
- [ ] Confirm architecture boundaries and dependencies
- [ ] Align contracts or interfaces required for implementation

Out of scope:
- Broad refactors not required by this branch

Exit criteria:
- [ ] Foundation decisions documented
- [ ] Safe implementation path identified

### 2.0
Title: Implementation

Goal:
- Deliver the main implementation incrementally.

In scope:
- [ ] Implement agreed scope from `MERGE_REQUEST.md`
- [ ] Keep changes aligned with current phase constraints

Out of scope:
- Future enhancements not required for current acceptance criteria

Exit criteria:
- [ ] Core behavior implemented
- [ ] Required tests or checks added

### 3.0
Title: Verification and cleanup

Goal:
- Validate quality and finalize for review.

In scope:
- [ ] Run and document verification commands
- [ ] Address critical lint/type/test issues
- [ ] Final pass on docs or handoff notes

Out of scope:
- New feature scope

Exit criteria:
- [ ] Verification complete
- [ ] Branch ready for review

