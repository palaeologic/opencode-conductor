# Roadmap

The current release establishes a neutral baseline: schema v3 helper registry, v1/v2 compatibility, deterministic review filtering, review lifecycle state, shared-branch diagnostics, standardized `tools-off/`, broad command/skill coverage, artifact runtime manifests, a safe installer, and a dry-run migration utility.

## Near term

- Add a versioned JSON Schema for descriptors and helper manifests.
- Split engine behavior into smaller tested modules without changing wrapper contracts.
- Expand behavioral tests beyond Git happy paths, especially malformed templates and filesystem permission failures.
- Add an installer manifest so stale-file cleanup is data-driven and reviewable.
- Add a generated command/skill reference from the configuration registry.
- Validate documentation links and prompt-footprint drift in CI.
- Add opt-in runtime telemetry that reports input, cache, reasoning, tool, retry, and output costs without collecting prompt content.
- Add platform-aware runtime installation guidance beyond the currently automated environments.

## Medium term

- Support explicitly configured repository-local descriptor discovery while preserving the global control-plane default.
- Add manifest version migrations independent of descriptor migrations.
- Provide a read-only diagnostic command that explains every derived path and decision.
- Add optional machine-readable refresh output schemas.
- Improve review glob semantics with a published compatibility test corpus.
- Add pluggable change-request adapters behind a neutral interface.
- Provide artifact-skill capability detection so missing engines are reported before work starts.

## Long term

- Versioned extension points for helper roles and refresh enrichers.
- Policy packs that remain opt-in and separate from the neutral core.
- Signed installer manifests and reproducible runtime lockfiles.
- Cross-platform packaging with rollback to the previous installed version.
- Integration tests across multiple OpenCode releases and operating systems.

## Design guardrails

- Keep refresh read-only.
- Keep network-aware reconciliation explicit.
- Preserve old descriptors until a separately announced major compatibility change.
- Never silently recreate or delete branch helpers.
- Keep model, provider, organization, project, and framework choices outside the core.
- Prefer behavioral contract tests over source-marker assertions.
- Keep migration dry-run-first and reversible.
