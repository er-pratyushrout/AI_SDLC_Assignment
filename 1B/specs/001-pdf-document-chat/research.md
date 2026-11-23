# Research: PDF Document Chat

## Decisions

### React-PDF and React 18 compatibility

- **Decision**: Use React-PDF `9.2.1` with React 18. Keep the matching `pdfjs-dist`
  version (`4.8.69`) aligned with the package lock and configure the worker in the same
  module that renders `<Document>` and `<Page>`.
- **Rationale**: The current React-PDF 11.x documentation requires React 19 or later.
  The v9.2.1 package metadata accepts React 18 and pins its PDF.js dependency to 4.8.69.
  Its docs warn that the worker must match that exact dependency version and that worker
  configuration should be in the rendering module.
- **Alternatives considered**: Upgrade to React 19 (rejected because the requested stack
  specifies React 18); leave React-PDF unpinned (rejected because a current major could
  silently break React compatibility or worker setup).
- **Sources**: [React-PDF v9 README](https://github.com/wojtekmaj/react-pdf/blob/v9.x/packages/react-pdf/README.md);
  [React-PDF v9.2.1 package metadata](https://raw.githubusercontent.com/wojtekmaj/react-pdf/v9.x/packages/react-pdf/package.json).

### PDF parsing

- **Decision**: Use stable `pdf-parse` `2.4.5` behind `pdfService`; construct a
  `PDFParse` instance from the uploaded buffer, read text and metadata, and destroy the
  parser in a `finally` path.
- **Rationale**: The npm registry's `latest` metadata identifies 2.4.5 as the current
  stable package and accepts Node `>=22.3.0`, matching the planned Node 22 LTS. The v2 API
  uses `PDFParse` and `getText`/`getInfo`; this differs from the older v1 callable API.
  The repository's main branch currently contains a 3.0.0 beta, so the plan avoids
  adopting prerelease behavior.
- **Alternatives considered**: `pdf-parse` v1 API (rejected as older and incompatible with
  the current v2 package interface); 3.0.0 beta (rejected in favor of the published stable
  release); client-only text extraction (rejected because the chosen stack assigns
  extraction to the backend).
- **Sources**: [pdf-parse v2 README](https://github.com/mehmet-kozan/pdf-parse/blob/v2.4.5/README.md);
  [pdf-parse v2.4.5 package metadata](https://raw.githubusercontent.com/mehmet-kozan/pdf-parse/v2.4.5/package.json);
  [npm registry metadata](https://registry.npmjs.org/pdf-parse/latest).

### Multipart upload and volatile file handling

- **Decision**: Use Multer only on the single-document upload route with memory storage
  and explicit file, file-count, field-count, and request-concurrency limits. Verify the
  PDF signature and content after upload; never use the supplied filename as a path.
- **Rationale**: Multer supports one-file multipart parsing and memory storage, but its
  documentation warns that large or frequent uploads can exhaust process memory. Limits,
  a bounded processing queue/store, and route-specific middleware keep the transient
  in-memory design within the feature's no-persistence scope.
- **Alternatives considered**: Disk storage (rejected because durable/temp file storage is
  unnecessary and outside the requested scope); global Multer middleware (rejected because
  it accepts file bodies on routes that do not need uploads).
- **Sources**: [Multer README](https://github.com/expressjs/multer#memorystorage).

### Frontend state and API communication

- **Decision**: Use one reducer-backed React Context for this single-screen session state.
  Use Axios for upload/status/delete JSON requests and native Fetch for POST endpoints
  whose successful responses are event streams.
- **Rationale**: React's documentation describes combining reducer and context to centralize
  related state and make it available across a component tree. Axios is a promise-based
  HTTP client, while Fetch's response body can be consumed incrementally for the streaming
  chat and summary responses. This avoids an additional state dependency and avoids
  buffering generated output.
- **Alternatives considered**: Zustand (valid, but not necessary for one screen and one
  session store); Axios for every request (rejected for streaming endpoints to keep
  incremental stream handling straightforward).
- **Sources**: [React reducer and context](https://react.dev/learn/scaling-up-with-reducer-and-context);
  [Axios README](https://github.com/axios/axios#readme).

### Test runners and supported Node version

- **Decision**: Keep Vitest + React Testing Library for the Vite frontend and Jest +
  Supertest for the Express backend. Target Node 22 LTS and a Vite release compatible
  with Vitest's current Node/Vite minimums.
- **Rationale**: Vitest is powered by Vite and reuses Vite configuration; its current
  guide requires Vite >=6.4 and Node >=22.12. React Testing Library is framework-agnostic
  and focuses on user-visible DOM behavior. Supertest exercises Node HTTP servers, fitting
  Express route/contract tests. Node 22 is listed as LTS in the current release schedule.
- **Alternatives considered**: Use Jest for both frontend and backend (less direct Vite
  integration); use Vitest for both projects (possible, but differs from the backend test
  stack explicitly requested).
- **Sources**: [Vitest guide](https://vitest.dev/guide/);
  [React Testing Library introduction](https://testing-library.com/docs/react-testing-library/intro/);
  [Supertest README](https://github.com/forwardemail/supertest#readme);
  [Node.js release schedule](https://nodejs.org/en/about/previous-releases).

## Open Integration Decision

The feature specification does not identify an AI provider. Keep a single backend
streaming adapter and use a fake implementation in tests; select the production provider,
model, data-processing terms, and credentials before deployment. No provider SDK or
vendor-specific frontend code is needed to define the API and application architecture.
