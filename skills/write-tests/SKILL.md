---
name: write-tests
description: Guide test writing from identifying what to test through choosing the test type to writing effective assertions
---

## What I do

Help write meaningful tests by guiding the decision process: what to test, what type of test, how to structure assertions, and what to mock.

## When to use me

- Adding tests for new or existing code
- Unsure whether to write a unit test, integration test, or E2E test
- Tests exist but don't catch real bugs (testing implementation instead of behavior)
- Need to add regression tests after fixing a bug

## Workflow

### 1. Identify what to test

Ask these questions about the code:
- What are the **inputs** and **outputs**?
- What are the **edge cases** (empty, null, boundary values, errors)?
- What are the **side effects** (API calls, state changes, DOM updates)?
- What **invariants** should always hold?

Prioritize testing:
1. Business logic (calculations, transformations, decisions)
2. Integration points (API calls, database queries)
3. User interactions (form submission, navigation)
4. Error paths (network failures, invalid input)

### 2. Choose the test type

| Type | Use when | Speed | Confidence |
|------|----------|-------|------------|
| Unit test | Pure functions, hooks, utilities | Fast | Narrow |
| Component test | UI rendering, interactions | Medium | Medium |
| Integration test | Multiple modules together, API calls | Slow | High |
| E2E test | Full user flows, critical paths | Slowest | Highest |

**Default to unit tests** unless the value is specifically in the integration between parts.

### 3. Structure the test

Use Arrange-Act-Assert (AAA) pattern:

```
describe('<unit under test>', () => {
  it('<scenario> <expected result>', () => {
    // Arrange — set up inputs and dependencies
    // Act — call the function / trigger the interaction
    // Assert — verify the output / side effect
  });
});
```

Naming: `<unit> <scenario> <expected result>`
- "formatDate given invalid input returns fallback string"
- "useAuth when token expires redirects to login"
- "createOrder with insufficient stock throws InsufficientStockError"

### 4. Decide what to mock

**Mock at boundaries:**
- Network requests (API calls)
- File system operations
- External services (payment, email)
- Time/dates (use fake timers)

**Do NOT mock:**
- The unit under test itself
- Internal helper functions (test them through the public API)
- Data transformations (let them run for real)

### 5. Write assertions

- One logical assertion per test (multiple `expect` calls for one concept is fine)
- Assert on **behavior**, not **implementation**:
  - Good: "returns the sorted list"
  - Bad: "calls Array.prototype.sort"
- Use the most specific matcher available (`toEqual` over `toBeTruthy`)
- For async: always `await` or return the promise

### 6. Handle edge cases

Always test:
- Empty/null/undefined inputs
- Boundary values (0, -1, MAX_INT, empty string)
- Error conditions (network failure, invalid data)
- Concurrent operations (if applicable)

## Anti-patterns

- Testing implementation details (brittle, breaks on refactor)
- Tests that always pass regardless of code changes (no real assertions)
- Shared mutable state between tests (ordering dependencies)
- Over-mocking (testing that mocks work, not that code works)
- Snapshot tests for everything (low signal, high noise)
