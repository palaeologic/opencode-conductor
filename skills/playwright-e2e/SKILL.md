---
name: playwright-e2e
description: Create, maintain, run, and diagnose Playwright end-to-end tests with project-discovered commands and explicit state-safety controls
---

# Playwright end-to-end testing

## Source of truth

Before changing or running a suite:

1. Read the project and nearest `AGENTS.md`.
2. Locate `playwright.config.*`, package scripts, fixtures, setup projects, authentication state, and test directories.
3. Read applicable `KNOWLEDGE.md` and `## Verification scripts` tables.
4. Identify every external state layer the suite can mutate: database, files, object storage, queues, email, third-party sandboxes, and browser storage.

If the project does not document safe state preparation and restoration, stop before a mutating run and ask the user how the environment should be isolated.

## Workflow

1. Confirm the target environment is local or explicitly approved for testing.
2. Check prerequisites without displaying `.env` contents or credentials.
3. Discover the configured suite before execution:

   ```sh
   npx playwright test --list
   ```

   Prefer a repository package script when one exists.
4. Select the narrowest affected project, spec, or title filter.
5. For shared mutable state, use one worker unless project guidance says parallel execution is isolated.
6. Run setup and restoration commands as separate observable steps. Never infer that one reset command covers every state layer.
7. Determine success from the process exit code and assertions, not from a report window opening.
8. Broaden verification only when shared fixtures, authentication, routing, configuration, or suite registration changed.

## Authoring guidance

- Prefer accessible locators such as `getByRole` and `getByLabel`, then stable test IDs.
- Use web-first assertions and locator auto-waiting.
- Avoid `waitForTimeout`; document any unavoidable timing boundary.
- Give mutating tests unique synthetic records and clean them up or restore the named baseline.
- Assert durable effects after mutation, including reload or inverse transitions when relevant.
- Keep tests independent unless a deliberately serial workflow is documented.
- Never commit focused tests, authentication state, reports, traces, screenshots, or result directories.

## Failure triage

Separate environment, product, and test failures. Inspect:

- first failed assertion and call log;
- frontend/API readiness;
- console and network errors;
- active test environment;
- fixture/setup completion;
- trace, screenshot, and video paths;
- whether the failed run reached a mutating action.

Do not reset shared state or weaken assertions until the evidence identifies why the run failed.

## Handoff

Report the exact commands, target project/spec, worker count, environment, state preparation/restoration, pass/fail totals, generated diagnostic artifacts, and anything intentionally not run.
