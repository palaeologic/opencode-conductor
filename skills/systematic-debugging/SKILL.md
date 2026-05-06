---
name: systematic-debugging
description: Isolate, reproduce, and fix bugs methodically using binary search, minimal reproduction, and root cause analysis
---

## What I do

Guide a disciplined debugging process that avoids guesswork. Uses structured techniques to narrow down the cause of a bug efficiently.

## When to use me

- A bug report comes in and the cause isn't immediately obvious
- A test is failing and you don't know why
- Something "used to work" and now doesn't
- You've been staring at a bug for more than 5 minutes without progress

## Workflow

### 1. Define the symptom precisely

Before debugging, state clearly:
- What is the expected behavior?
- What is the actual behavior?
- What are the exact steps to reproduce?
- When did it last work? (check git log if needed)

### 2. Reproduce reliably

- Find the minimal set of steps that triggers the bug
- If intermittent: identify conditions that increase likelihood
- Write the reproduction as a failing test if possible (locks in the fix later)

### 3. Narrow the scope

Use binary search to isolate:

**For "it used to work" bugs:**
- `git bisect` or manual binary search through recent commits
- Identify the exact commit that introduced the regression

**For logic bugs:**
- Add strategic logging/breakpoints at the boundary of "works" and "doesn't work"
- Halve the suspect code path each iteration
- Check: Is the input correct? Is the transformation correct? Is the output correct?

**For integration bugs:**
- Verify each layer independently: data source → API → transformation → UI
- Mock at boundaries to isolate which layer is wrong

### 4. Identify root cause

Once isolated, answer:
- WHY does this code produce the wrong result?
- Is this a typo, a logic error, a race condition, a stale reference, or a misunderstanding?
- Are there other places with the same pattern that might also be broken?

### 5. Fix and verify

- Make the minimal fix that addresses the root cause
- Run the reproduction case — it should now pass
- Run surrounding tests — nothing else should break
- Consider: does this fix handle edge cases?

### 6. Prevent recurrence

- If the bug was catchable by types, add stricter typing
- If catchable by tests, add a regression test
- If caused by unclear code, refactor for clarity
- Document the fix rationale in the commit message

## Anti-patterns to avoid

- Shotgun debugging (changing random things hoping it works)
- Fix-and-pray (making a change without understanding why it helps)
- Assuming the bug is in the most complex part (often it's a simple typo)
- Debugging in production without local reproduction first
