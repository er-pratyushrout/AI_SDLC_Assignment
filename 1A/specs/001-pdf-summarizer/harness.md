Treat specs/001-pdf-summarizer/spec.md as the product source of truth.
Treat specs/001-pdf-summarizer/plan.md as the architecture source of truth.
Implement only MVP User Story 1 tasks (T018-T037) plus required setup/foundation tasks.
Do not implement User Story 2, User Story 3, or Polish tasks.
Generate code only inside the approved project structure defined in plan.md.
Frontend must use React, Vite, TypeScript, and functional components.
Backend must use Express, TypeScript, and REST APIs.
Use MongoDB with Mongoose for persistence.
Use pdf-parse for PDF text extraction.
Use OpenAI as the only summarization provider.
Do not add support for multiple AI providers.
Do not implement OCR, authentication, collaboration, notifications, or cloud storage.
Do not introduce additional frameworks unless explicitly required by the plan.
Prefer the simplest implementation that satisfies the specification.
PDF uploads larger than 20 MB must return HTTP 413.
Invalid or non-PDF uploads must return HTTP 415.
Empty, corrupted, encrypted, or text-free PDFs must return HTTP 422.
Summary generation requests must return HTTP 202.
API errors must use the standard JSON format defined in the plan.
Never expose API keys, secrets, or provider credentials to the frontend.
All user input must be validated on both client and server.
Generate tests before implementation whenever a matching test task exists.
Tests must use exact status-code assertions.
Implement only the following MVP capabilities:
Upload PDF
Validate PDF
Extract text
Generate summary
Display summary
Show progress
Show errors
Do not implement:
Document history
Session cleanup worker
Summary search
Copy summary
Export summary
Multi-document management
Each completed task must be marked in the implementation report.
Report all created and modified files.
Report remaining tasks after implementation completes.
Stop implementation after MVP tasks are completed.
Generated code is not complete until all related tests pass.