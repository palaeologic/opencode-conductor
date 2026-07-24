---
description: Add a GraphQL mutation by following the host repository's schema, resolver, client, and verification conventions
subtask: true
---

Add the GraphQL mutation described by `$ARGUMENTS`.

## Procedure

1. Read project and area guidance, then locate the schema source, resolver/handler layer, generated types, client operations, and one similar mutation.
2. If `$ARGUMENTS` does not identify the behavior, input, authorization expectations, and affected client surface, ask for the missing decisions.
3. Present a short implementation outline covering:
   - schema field and input/output types;
   - resolver or handler and service boundary;
   - authorization, validation, and error behavior;
   - client operation and cache invalidation when applicable;
   - generated artifacts and tests.
4. Confirm before adding a public schema field or migration.
5. Implement the smallest complete vertical slice using existing naming and registration patterns.
6. Add focused tests for success, invalid input, and unauthorized access when applicable.
7. Run documented schema validation, generation, type, and test commands.

## Output

```markdown
## GraphQL mutation result
- operation: <name>
- schema_paths: [<paths>|none]
- implementation_paths: [<paths>|none]
- client_paths: [<paths>|none]
- generated_paths: [<paths>|none]
- verification:
  - <command>: <passed|failed|not-run>
- follow_ups: [<items>|none]
```

Do not print credentials, authorization headers, environment contents, or sensitive example payloads.
