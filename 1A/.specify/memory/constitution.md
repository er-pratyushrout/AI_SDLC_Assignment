<!--
Sync Impact Report:
- Version change: unversioned template -> 1.0.0
- Modified principles: all placeholder principles replaced
- Added sections: Technology and Security Constraints; Engineering Quality Standards
- Removed sections: none
- Follow-up TODOs: none
-->
# PDF Summarizer Constitution

## Core Principles

### I. Defined Full-Stack Architecture

The frontend MUST use React and the backend MUST use Node.js with Express. Application code
MUST be organized into cohesive modules that separate presentation, API routing, application
services, domain logic, and infrastructure concerns. Cross-layer dependencies MUST point toward
the domain and MUST NOT couple UI components directly to persistence or external provider
details.

This separation keeps PDF ingestion, summarization, and presentation independently maintainable
and testable.

### II. Consistent REST API Contracts

Backend endpoints MUST follow RESTful resource conventions and use HTTP methods according to
their semantics: POST for creation, GET for retrieval, PUT or PATCH for updates, and DELETE for
removal. Responses MUST use appropriate 2xx, 4xx, and 5xx status codes and return documented,
stable JSON error shapes. API-breaking changes require a versioned contract or a migration plan
that preserves supported clients.

### III. Accessible, Reusable React Experiences

The frontend MUST use reusable, single-responsibility React components and explicit, maintainable
state management. Shared UI behavior MUST be implemented once and reused. Interfaces MUST
support keyboard operation, provide programmatically associated labels and focus states, meet
WCAG 2.1 Level AA contrast requirements, and remain usable at viewport widths from 320 px
through desktop sizes. Summary results MUST include meaningful loading, empty, and error states.

### IV. Validation, Security, and Resilience

All externally supplied data MUST be validated at the API boundary before application processing.
PDF inputs MUST be checked for allowed format and configured size/type limits before storage or
summarization. Error responses MUST omit sensitive details and internal stack traces. Secrets MUST
be supplied through environment variables or a secret manager and MUST NEVER appear in source
code, logs, fixtures, committed configuration, or client bundles.

The backend MUST handle expected and unexpected failures without leaking resources or
corrupted partial results. External summarization and storage dependencies SHOULD be isolated
behind interfaces with timeouts and retry behavior limited to transient failures.

### V. Test-Driven Quality and Operational Clarity

Critical logic MUST have automated tests, including PDF validation, API request validation,
summarization orchestration, error mapping, and state transitions. Tests MUST be deterministic,
isolated, and executable from a single project command. Production behavior MUST emit structured
logs with request correlation and MUST NOT log secret values or full document contents.

## Technology and Security Constraints

- The approved client stack is React, and the approved server stack is Node.js with Express.
- The application MUST use parameterized or type-safe data access and MUST NOT interpolate
  untrusted values into queries or commands.
- Dependencies MUST be patched regularly, and a build MUST fail for a known critical
  vulnerability without an approved and documented exception.
- File uploads MUST enforce an explicit configured maximum size and an allowed MIME/type
  policy, with limits documented in API and UI behavior.
- Secrets MUST be excluded from version control, with automated secret scanning required for
  pull requests and releases.

## Engineering Quality Standards

- Critical logic MUST maintain at least 90 percent statement and branch coverage in automated
  tests, and the overall automated suite MUST maintain at least 80 percent statement coverage.
- Every API endpoint MUST have contract coverage for success and representative validation,
  authorization, and server-error responses.
- Reusable React components with branching behavior MUST have focused unit tests. Browser
  flows for upload, summarization, and error recovery MUST have integration coverage.
- Automated checks MUST complete in a CI pipeline and pass before merge: unit tests,
  integration tests, linting, formatting validation, type checking where applicable, dependency
  vulnerability checks, and secret scanning.
- WCAG 2.1 Level AA MUST be evaluated for keyboard access, labels, focus visibility, and contrast
  before release. Automated accessibility checks are required for every primary screen.
- The solution MUST use the least complexity that satisfies the requirement. New abstractions
  require a demonstrated reuse or isolation need, and architectural exceptions MUST be documented
  in the relevant design or pull request.

## Governance

This constitution supersedes conflicting component conventions and documentation. Contributions
MUST satisfy the applicable principles and quality gates in the most recently ratified version.
Amendments require a documented proposal, recorded approval, a migration plan when
existing behavior changes, and an updated constitution version. Semantic versioning applies:
MAJOR for incompatible governance or principle removal/redefinition, MINOR for a new principle
or materially expanded requirement, and PATCH for clarification or correction.

Compliance MUST be reviewed for every pull request by confirming the implementation against
applicable principles, security constraints, tests, and quality gates. Exceptions require a
documented reason, scope, expiry date, and accountable owner. Repeated or unresolved exceptions
MUST block release.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
