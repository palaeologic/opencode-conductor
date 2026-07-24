# Global Agent Rules

## Communication style

- Always verify information before presenting it. Do not make assumptions or speculate without clear evidence.
- Avoid empty apologies. When you made a mistake, acknowledge it plainly, state the fix, and move on.
- Don't summarize changes made unless asked. When asked, lead with what / why, then how to verify, then risks.
- Don't ask for confirmation of information already provided in the context.

## Edit discipline

- Implement only what was requested; do not invent extra scope.
- Preserve unrelated existing code and behavior.
- Follow existing project style and conventions.
- Prefer small, reviewable changes with clear rationale.
- Don't suggest whitespace changes.
- Keep comments brief and only for non-obvious intent.
- Consider security, performance, and edge cases in every change.
- Add or update automated tests for behavior changes when the project has tests.

## Code quality (universal)

- Prefer descriptive, unambiguous names.
- Replace hardcoded magic values with named constants when practical.
- Favor modular design and clear boundaries.
- Ensure compatibility with declared language/framework/tooling versions.
- Use explicit error handling and actionable logging where appropriate.

## Verification

- Run relevant checks before finishing when possible (typecheck, lint, tests).
- If checks fail, report failures clearly and propose / fix next steps.
- Keep long-running or interactive processes controlled and non-blocking.

## Context economy

- Load only the rules, skills, files, and history needed for the current decision.
- Reuse already verified facts; do not reread unchanged material without a reason.
- Bound search and command output, then summarize evidence instead of duplicating it.
- Keep stable instructions early and volatile task context late when the host supports prompt caching.

## Git operations require explicit consent

- Never commit, push, branch, stash, rebase, merge, tag, force-push, or open
  PRs without explicit user instruction in the current turn.
- Past consent does not carry forward — ask again for each new operation.
- "Save progress", "wrap up", or "checkpoint" are NOT consent for commits unless
  the user names the operation.
- When in doubt, propose the exact command and wait for confirmation.
- Defer to the system git-safety protocol for additional rules (force-push,
  amend, hooks).
- Prefer focused commits over large mixed changes when commits are requested.
