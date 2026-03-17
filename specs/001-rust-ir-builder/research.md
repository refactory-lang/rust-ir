# Phase 0 Research — Rust IR Builder

## 1. Tree-sitter-rust Grammar Mapping

- Decision: Use tree-sitter-rust grammar as the single source of truth for IR node kinds and field names.
- Rationale: Ensures grammar fidelity and future-proofing; matches constitution Principle I.
- Alternatives considered: Hand-maintained node list (rejected: drift risk), codegen from .tsg (future option).

## 2. ESM-compatible tree-sitter-rust Parser

- Decision: Use a prebuilt ESM tree-sitter-rust parser (e.g., npm package or custom build) for validation in Node.js and browser.
- Rationale: Enables fast, dependency-free validation in tests and outside JSSG; avoids Node.js built-ins.
- Alternatives considered: JSSG-only validation (rejected: no local test), WASM parser (possible, but ESM is simpler for now).

## 3. TypeScript Discriminated Union Pattern

- Decision: Use discriminated union types for IR nodes, with a `kind` field and factory functions for construction.
- Rationale: Maximizes type safety, enables exhaustive switch, matches clarified spec.
- Alternatives considered: Classes (rejected: runtime issues in JSSG), closure-based (more complex, less idiomatic).

## 4. Error Handling in Builders

- Decision: Builder functions throw descriptive errors at runtime if required fields are missing or invalid.
- Rationale: Ensures debuggability and safety in dynamic/test scenarios; complements compile-time checks.
- Alternatives considered: Silent fail (rejected), Result type (more verbose, not idiomatic for this use case).

## 5. Test Patterns

- Decision: Use Vitest for unit and integration tests, with round-trip (build → render → validate) and negative (malformed input) cases for every node kind.
- Rationale: Matches constitution Principle III (test-first), ensures reliability and coverage.
- Alternatives considered: Mocha/Jest (Vitest is fastest and ESM-native).

## 6. JSSG Runtime Compatibility

- Decision: Integration test will import the library in a JSSG transform and run a fixture to verify runtime compatibility.
- Rationale: Ensures compliance with constitution Principle V; isolates JSSG-specific issues from core logic.
- Alternatives considered: None (required by constitution).

## 7. Project Structure

- Decision: ESM library with `src/` for implementation, `tests/` for unit/integration, `specs/` for docs.
- Rationale: Standard for modern TypeScript libraries; matches plan template.
- Alternatives considered: Monorepo (overkill for current scope).

---

All research questions resolved. Ready for Phase 1: Data model and contracts.
