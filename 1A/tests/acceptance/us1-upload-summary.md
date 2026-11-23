# User Story 1 Acceptance Verification

## Runnable checks

From the repository root, run:

```powershell
npm test --workspace client
npm test --workspace server
npm run test:e2e
```

The server integration suite starts an isolated MongoDB instance, uploads a generated
text-based PDF, verifies its extracted text and page metadata, starts summary generation, and
polls the contract endpoint for the completed structured result. The browser test stubs the REST
responses so all three summary modes and invalid-upload feedback can be checked without an
OpenAI credential.

## Acceptance criteria mapping

| Criterion                                                  | Verification                                                                                                                            | Result and limitation                                                                                                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC-001: first-time users obtain a selected-mode summary    | `tests/e2e/upload-summary.spec.ts` uploads a PDF and completes Brief, Standard, and Detailed flows                                      | Automated workflow passes; this does not establish the specified 90% rate. A first-time-user study remains a release measurement.                                                   |
| SC-003: invalid uploads are rejected with no false success | `server/tests/unit/pdf.service.test.ts`, `server/tests/integration/pdf-summary.contract.test.ts`, and the invalid-file browser scenario | Checks the inclusive 20 MB boundary, over-limit `413`, unsupported/non-PDF `415`, protected/corrupt/text-free parser failures `422`, and absence of a success view after rejection. |
| NFR-004: file validation feedback appears within 2 seconds | Timed oversized-file interaction in `client/src/components/FileUpload.test.tsx`                                                         | The selection-to-feedback interaction is asserted below 2,000 ms in the component test.                                                                                             |

Summary progress, structured key points/findings/conclusions, sanitized errors, session-cookie
scoping, and the `202`/`200` generation-status contract are additionally covered by the component,
middleware, and API contract tests named above.
