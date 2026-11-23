# Harness Demo Style Guide

## Language and structure

- Write application and test code in TypeScript with explicit types where they clarify
  boundaries.
- Follow Express router and middleware conventions; keep HTTP handling in the router and
  delegate PDF validation and extraction to the PDF service.
- Keep each file focused on one responsibility.

## Input validation and errors

- Treat every uploaded file property and byte as untrusted.
- Enforce the 20,000,000-byte limit and validate both the declared media type and PDF content.
- Use the `openapi.yaml` upload statuses: `201` for an accepted PDF, `413` when it exceeds
  the size limit, `415` for an invalid upload, and `422` for a PDF that cannot be read or
  contains no extractable text.
- Route failures through the shared error handler; do not return parser details or document
  contents in error responses.

## Asynchronous code and secrets

- Use `async`/`await` for asynchronous work and allow Express error middleware to handle
  rejected route promises.
- Never hard-code, log, or return API keys or other secrets. Read secrets from server-side
  configuration only when a feature requires them.

## Tests

- Use Jest and Supertest for isolated HTTP-level tests.
- Cover the exact size boundary and the OpenAPI status codes for valid, invalid, oversized,
  and empty/unreadable PDFs.
- Assert status codes with Jest `expect(...).toBe(...)` assertions.
