<!--
Sync Impact Report:
- Version change: 1.0.0 -> 1.0.1
- Modified principles: I. Modular Full-Stack Architecture; II. REST and Frontend State
  Standards; III. Accessible and Responsive Experience; IV. Validation, Security,
  and Testing; V. Simplicity and Maintainability
- Modified sections: Replaced task-manager terminology with interactive AI agent
  application scope
- Added sections: None
- Removed sections: None
- Follow-up TODOs: None
-->

# Interactive AI Agent Application Constitution

## Core Principles

### I. Modular Full-Stack Architecture

The application MUST use React for the frontend and Node.js with Express for the backend.
Frontend and backend code MUST be organized into cohesive modules with clear boundaries.
UI components, application state, API routing, controllers, services, data access,
configuration, and AI integration adapters MUST have separate responsibilities.
Cross-layer dependencies MUST remain explicit and replaceable. This separation keeps
behavior testable and changes isolated.

### II. REST and Frontend State Standards

Backend APIs MUST follow REST conventions, use appropriate HTTP methods and status codes,
and return consistent, documented error shapes. Resource routes MUST represent resources
rather than actions. Frontend implementations MUST use reusable components and maintainable
state management. Shared state MUST be scoped to the smallest appropriate boundary and
server state MUST be kept separate from presentation state where practical.

### III. Accessible and Responsive Experience

Every user-facing workflow MUST meet WCAG 2.1 Level AA requirements and support keyboard,
screen-reader, and focus management. Reusable components MUST provide visible labels,
accessible names, sufficient contrast, and non-color-only status communication. Layouts
MUST work at 320 px, 768 px, and 1440 px viewport widths without loss of task functionality
or horizontal page overflow. Responsive behavior MUST be verified in the supported viewports.

### IV. Validation, Security, and Testing

All external input MUST be validated at API boundaries and revalidated when it crosses a
trust boundary. Errors MUST be handled consistently, logged without sensitive data, and
returned to clients without internal implementation details or stack traces. Secrets MUST
NEVER be committed to or exposed by source code; environment variables or approved secret
stores MUST be used. Critical application logic, including agent request validation,
conversation state transitions, tool execution boundaries, and generated-response handling,
MUST have automated tests covering success and failure paths. Integration tests MUST verify
REST contracts and critical frontend-backend workflows.

### V. Simplicity and Maintainability

Implementations MUST prefer the simplest solution that satisfies the requirement. New
abstraction, framework, dependency, or infrastructure MUST be justified by a concrete
need. Code MUST be readable, consistently formatted, and organized around intentional
names and small functions. Unused code, speculative configuration, and duplicated business
rules MUST NOT be introduced. Reuse MUST be favored when it improves clarity and maintainability.

## Technology and Quality Standards

- Frontend: React; backend: Node.js and Express; neither stack may be replaced without
  a documented constitution amendment.
- API requests and responses MUST use JSON unless an explicitly documented file or binary
  workflow requires otherwise. Error responses MUST include a machine-readable code, a
  human-readable message, and relevant field validation details without sensitive data.
- Automated unit and integration tests MUST pass on every supported CI run, with no skipped
  critical tests.
- Critical backend logic MUST maintain at least 90% line coverage and 80% branch coverage.
  Agent request, conversation state, and mutation routes MUST have integration coverage for
  success and each documented validation or authorization failure.
- Frontend critical workflows MUST have automated tests for initiating a conversation,
  rendering and retrying responses, preserving conversation state, submitting invalid input,
  and presenting errors.
- Automated linting and formatting checks MUST pass before merge. The test suite MUST complete
  in no more than 10 minutes in normal CI.
- Automated accessibility checks MUST report zero serious or critical violations on critical
  agent workflows. Keyboard operation and the 320 px, 768 px, and 1440 px layouts MUST be
  manually reviewed for every release.
- API p95 time-to-first-response MUST remain below 500 ms for non-streaming agent operations
  and 300 ms for local API operations under the project's normal-load test profile.
  Streaming responses MUST begin within 1 second at p95. The normal-load profile and results
  MUST be documented beside the relevant performance test.
- Dependency checks MUST report no known critical vulnerabilities in production dependencies.
  High-severity findings MUST be resolved or have a documented, time-bounded exception.
- Source control scans MUST detect no committed secrets. Logging and application responses
  MUST contain no passwords, tokens, session identifiers, or personal data beyond the minimum
  required for application operations.

## Development and Review Workflow

- Feature work MUST begin with testable acceptance criteria, affected REST contracts, and
  responsive/accessibility expectations.
- Changes MUST include focused tests for each behavior they introduce or materially change.
  Bug fixes MUST add a regression test that fails before the fix and passes afterward.
- Pull requests MUST pass linting, formatting, unit tests, integration tests, and security
  dependency checks before merge.
- Reviewers MUST verify modular boundaries, REST semantics, validation, error handling,
  accessibility, responsive behavior, secret handling, and test coverage.
- A measure that cannot be met MUST be reported as an explicit exception in the change
  description with owner, rationale, mitigation, and due date. Exceptions expire after 90 days
  unless formally renewed under the amendment process.

## Governance

This constitution supersedes informal practices and project conventions. Amendments require
a documented proposal describing the motivation, affected principles or standards, migration
impact, and version rationale. Material changes to principles or the removal of a mandatory
requirement require approval by project maintainers and a migration plan. All pull requests
and reviews MUST verify compliance with this constitution. Deviations MUST be recorded and
approved rather than silently accepted.

Constitution versions follow semantic versioning: MAJOR for incompatible removals or
governance redefinitions, MINOR for new principles or materially expanded requirements, and
PATCH for clarifications or non-semantic refinements. Compliance reviews MUST occur before
release and when substantive architecture or security requirements change.

**Version**: 1.0.1 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
