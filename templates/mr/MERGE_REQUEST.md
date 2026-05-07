# Merge Request Context

## Branch
`<branch-name>`

## Title
Short working title here.

## Goal
What this branch is trying to accomplish in 1-3 sentences.

## In scope
- Main work item 1
- Main work item 2
- Main work item 3

## Out of scope
- Explicit non-goal 1
- Explicit non-goal 2

## Constraints
- Important architectural or product constraint
- Areas that must not regress
- Dependencies or assumptions

## Acceptance criteria
- [ ] Outcome 1
- [ ] Outcome 2
- [ ] Outcome 3

## Relevant areas
- `front-end/...`
- `api/...`
- `cli/...`

## Verification target
List the minimum checks expected before this branch is considered ready.

Include **`Base URL (manual):`** \<origin\> here when reviewers need a dev server (so `/project-review` can copy it into `REVIEW.md` → `## How to verify`). You may add **scenario-style** UI verification (title, `Navigate to: /your/route`, numbered steps, expected outcomes, one regression bullet for an adjacent flow). That text feeds cleanly into `/project-review` checklist and `## How to verify` sections.

## Notes
Stable branch-level context only. Do not use this file as a running diary.

---

## OpenCode: review status

_Agent-maintained only. `/project-update-mr` refreshes this block from git + branch context. Do not put durable author intent here._

- Branch / checkpoint range: (filled by command)
- Files / areas touched: (summary)
- Suggested next steps: (optional)

## OpenCode: open findings (from REVIEW.md)

_Agent-maintained when `REVIEW.md` exists. Summarizes open `F-xx` items and review status for MR readers. `/project-update-mr` updates this from `REVIEW.md`; it does not replace narrative sections above._

- (none yet — run `/project-review` then `/project-update-mr`)
