# Research: AI PDF Summarizer

**Date**: 2026-11-23

## Decisions

### 1. Runtime and project shape

- **Decision**: Use Node.js 26 LTS, TypeScript, and an npm workspace containing `client/` and
  `server/`.
- **Rationale**: Node.js 26 is listed as LTS for this plan date. TypeScript supports explicit
  request/response and domain types across the layers; the two-package workspace preserves
  clear client/server boundaries.
- **Alternatives considered**: Node.js 24 LTS (also supported) and plain JavaScript. Node 24
  remains a supported fallback; TypeScript is preferred for maintainability and consistent
  contract types.
- **Sources**: [Node.js release status](https://nodejs.org/en/about/previous-releases),
  [Vite guide](https://vite.dev/guide/).

### 2. REST API and upload processing

- **Decision**: Use Express 5 routes and middleware with a central error mapper. Enforce the
  20 MB request limit while receiving the upload, validate PDF content and parse it before
  returning `201`, and remove the temporary source file on both success and failure.
- **Rationale**: An early size limit prevents oversized files reaching the parser; inspecting
  the file content and parsing it avoids trusting a filename or client-supplied MIME type.
  Express 5 supports the requested Node baseline and keeps HTTP concerns in middleware and
  routes.
- **Alternatives considered**: Trusting only the `.pdf` extension or accepting a request before
  validating it was rejected because either can produce false success or unnecessary resource
  use.
- **Sources**: [Express 5 API](https://expressjs.com/en/5x/api.html),
  [pdf-parse README](https://raw.githubusercontent.com/mehmet-kozan/pdf-parse/main/README.md).

### 3. PDF text storage and MongoDB document limits

- **Decision**: Use `pdf-parse` v2 to extract text; store text in MongoDB GridFS and metadata
  in Mongoose documents. Do not retain the uploaded PDF binary after extraction.
- **Rationale**: `pdf-parse` supports Node.js and provides text and document information.
  GridFS stores data in chunks and supports files larger than MongoDB's 16 MiB BSON document
  limit, which matters because a 20 MB PDF may yield a large text representation.
- **Alternatives considered**: A `String` field in the Document model was rejected because
  extracted text can exceed the BSON document limit. Retaining the source PDF was rejected
  because the approved spec requires document information and regeneration, not a PDF viewer.
- **Sources**: [pdf-parse README](https://raw.githubusercontent.com/mehmet-kozan/pdf-parse/main/README.md),
  [MongoDB GridFS](https://www.mongodb.com/docs/manual/core/gridfs/).

### 4. Session retention and cleanup

- **Decision**: Scope every session, document, summary, and extracted-text GridFS file to an
  opaque anonymous browser-session ID. `POST /api/session/end` deletes the session's content
  synchronously; an expiry cleanup worker handles sessions whose client disappears before that
  request succeeds. TTL indexes may assist with stale metadata but are not the primary
  deletion/cascade mechanism.
- **Rationale**: This supports session-only access without accounts or cloud storage. MongoDB
  TTL is asynchronous: the monitor runs periodically and deletion can take longer under load.
  TTL also does not cascade to GridFS chunks, so explicit deletion is necessary.
- **Alternatives considered**: Relying only on TTL was rejected because it cannot provide
  immediate erasure or GridFS cleanup. Durable cross-session records were rejected by the
  approved specification.
- **Operational caveat**: A browser or machine can terminate without delivering a close
  request. The worker provides eventual cleanup, but MongoDB cannot promise exact physical
  erasure at the instant a tab closes. The application must make prior-session records
  immediately inaccessible, test the cleanup path, and obtain privacy approval for this
  residual cleanup window before release.
- **Sources**: [MongoDB TTL indexes and deletion timing](https://www.mongodb.com/docs/manual/core/index-ttl/),
  [MongoDB GridFS](https://www.mongodb.com/docs/manual/core/gridfs/).

### 5. AI summarization provider

- **Decision**: Use the OpenAI Node SDK and Responses API for the initial provider, behind a
  `SummarizationProvider` service interface. Keep the key and model configuration on the
  server; do not add a second provider implementation in the initial release.
- **Rationale**: The official API provides a direct text-generation interface and official
  Node SDK. A narrow interface limits provider coupling and gives the application one place
  to enforce timeouts, validate output, and map errors.
- **Alternatives considered**: Hugging Face Inference Providers offer an OpenAI-compatible API
  and a broad model/provider catalog; they remain a viable future implementation if cost,
  model quality, or data terms warrant the switch.
- **Privacy gate**: OpenAI API data controls documentation says abuse-monitoring logs may
  contain customer content and may be retained for up to 30 days by default. Review provider
  data terms and eligibility for modified abuse monitoring/zero data retention before release.
  The application must not claim that provider-side retention ends with the browser session.
- **Sources**: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text),
  [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data),
  [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/en/index).

### 6. Summary lifecycle and progress

- **Decision**: Upload/extraction completes synchronously with a `201` or actionable error.
  Summary generation creates a processing attempt and returns `202`; the client polls the
  document summary endpoint until completion or failure.
- **Rationale**: The UI can communicate distinct upload, extraction, and generation states.
  A new attempt does not replace the previous successful summary until the new output passes
  validation.
- **Alternatives considered**: A persistent message broker/worker service was rejected for
  this initial scope. In-process async work and MongoDB state avoid a separate system; stuck
  `processing` records are marked failed during startup recovery.
- **Sources**: [Express 5 API](https://expressjs.com/en/5x/api.html),
  [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/).

### 7. Testing tools

- **Decision**: Use Vitest + React Testing Library for the Vite client; Jest + Supertest for
  backend tests; Playwright for end-to-end browser checks and viewport coverage.
- **Rationale**: Vitest reads Vite configuration and supports browser-like component tests.
  React Testing Library encourages tests based on accessible user interactions. Jest and
  Supertest satisfy the requested Node test stack and exercise the Express app without
  requiring a listening network port. Playwright covers cross-browser user flows.
- **Alternatives considered**: One runner for both packages was rejected because the requested
  backend stack is Jest and the Vite integration is simplest with Vitest.
- **Sources**: [Vitest guide](https://vitest.dev/guide/),
  [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/),
  [Jest](https://jestjs.io/docs/getting-started),
  [Supertest](https://github.com/forwardemail/supertest),
  [Playwright](https://playwright.dev/docs/intro).

### 8. Browser support

- **Decision**: Support the latest two major versions of Chrome, Edge, Firefox, and Safari,
  with responsive behavior down to 320 px.
- **Rationale**: This is a measurable initial interpretation of “desktop and mobile browsers”
  and avoids extending support to legacy browsers beyond Vite's modern-browser baseline.
- **Alternatives considered**: An exhaustive browser/version matrix was deferred until
  product analytics or a user-specific support requirement exists.
- **Sources**: [Vite browser support](https://vite.dev/guide/#browser-support),
  [Playwright browser coverage](https://playwright.dev/docs/intro).
