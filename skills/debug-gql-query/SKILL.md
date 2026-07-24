---
name: debug-gql-query
description: Diagnose GraphQL query, mutation, schema, transport, generated-type, client-cache, and resolver failures without assuming a specific stack
---

# Debug a GraphQL operation

## Workflow

1. Capture the exact symptom: operation name, endpoint, status, GraphQL errors, unexpected data shape, and whether the failure is client-only or reproducible outside the UI.
2. Locate the operation, fragments, generated types, schema source, client configuration, and resolver or handler. Read project rules before executing requests.
3. Reduce the operation to the smallest failing selection and variables while preserving the failure.
4. Validate each boundary:
   - operation parses and names are unique;
   - variables match schema nullability and input types;
   - fragments apply to compatible types;
   - authentication and headers reach the intended endpoint;
   - the response contains the expected `data` and `errors` shape;
   - generated types match the current schema;
   - client normalization, cache keys, and invalidation are correct;
   - resolver validation, authorization, loading, and serialization behave as intended.
5. Compare the failing operation with a nearby working operation that uses the same client or resolver layer.
6. Run the narrowest documented schema, code-generation, type, resolver, and client tests.
7. State the root cause separately from secondary symptoms and propose the smallest durable fix.

## Useful evidence

- Sanitized request document and variables.
- HTTP status and GraphQL `errors` entries.
- Schema definition for the affected fields and inputs.
- Generated-type diff.
- Resolver logs with secrets and personal data removed.
- Cache key and invalidation behavior.

## Constraints

- Never print tokens, cookies, authorization headers, or sensitive variables.
- Do not weaken schema validation or authorization to make a request pass.
- Do not assume HTTP 200 means success; GraphQL errors may still be present.
- Do not regenerate the entire client or schema unless the repository documents that workflow.
- Prefer a reproducible test over repeated manual requests.
