import express from "express";
import request from "supertest";
import { createApp } from "../../src/app";
import { startTestDatabase, clearTestDatabase, stopTestDatabase } from "../setup/test-database";
import { createTextPdf } from "../helpers/pdf-fixture";

describe("PDF summary API contract", () => {
  let app: express.Express;
  const summarize = jest.fn().mockResolvedValue({
    keyPoints: ["A key point."],
    findings: ["A finding."],
    conclusions: ["A conclusion."],
  });

  beforeAll(async () => {
    await startTestDatabase();
    app = createApp({
      sessionTtlMs: 60_000,
      secureCookie: false,
      summarizationProvider: { summarize },
    });
  }, 120_000);

  afterEach(async () => {
    await clearTestDatabase();
    summarize.mockClear();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  it("returns a contract-shaped 400 when the upload file is missing", async () => {
    const response = await request(app).post("/api/documents/upload");

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "FILE_REQUIRED",
      message: "Choose a PDF file to upload.",
      requestId: response.headers["x-request-id"],
    });
  });

  it("returns HTTP 415 for unsupported upload media", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("not a PDF"), {
        filename: "document.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(response.body.error.requestId).toBe(response.headers["x-request-id"]);
  });

  it("returns HTTP 415 for PDF media containing a non-PDF signature", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("not a PDF"), {
        filename: "invalid.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("returns HTTP 422 for a valid PDF with no extractable text", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", createTextPdf(""), {
        filename: "empty.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("PDF_NO_TEXT");
  });

  it("returns HTTP 413 when an upload exceeds 20 MB", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.alloc(20_000_001), {
        filename: "large.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects invalid summary modes with HTTP 400", async () => {
    const response = await request(app)
      .post("/api/documents/507f1f77bcf86cd799439011/summarize")
      .send({ summaryType: "extended" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_SUMMARY_TYPE");
  });

  it("returns HTTP 404 when a summary is requested for an unknown document", async () => {
    const response = await request(app)
      .post("/api/documents/507f1f77bcf86cd799439011/summarize")
      .send({ summaryType: "brief" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  it("returns HTTP 502 when summary generation has no configured provider", async () => {
    const unconfiguredApp = createApp({
      sessionTtlMs: 60_000,
      secureCookie: false,
    });
    const upload = await request(unconfiguredApp)
      .post("/api/documents/upload")
      .attach("file", createTextPdf("A readable source document."), {
        filename: "report.pdf",
        contentType: "application/pdf",
      });
    const sessionCookie = (upload.headers["set-cookie"] as string[])[0].split(";")[0];

    const response = await request(unconfiguredApp)
      .post(`/api/documents/${upload.body.id}/summarize`)
      .set("Cookie", sessionCookie)
      .send({ summaryType: "brief" });

    expect(upload.status).toBe(201);
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("AI_UNAVAILABLE");
  });

  it("uploads a readable PDF, starts generation with HTTP 202, and returns its summary", async () => {
    const upload = await request(app)
      .post("/api/documents/upload")
      .attach("file", createTextPdf("A readable source document."), {
        filename: "report.pdf",
        contentType: "application/pdf",
      });

    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({
      fileName: "report.pdf",
      fileSizeBytes: expect.any(Number),
      pageCount: 1,
      processingStatus: "ready",
      generationStatus: "idle",
    });

    const sessionCookie = (upload.headers["set-cookie"] as string[])[0].split(";")[0];
    const started = await request(app)
      .post(`/api/documents/${upload.body.id}/summarize`)
      .set("Cookie", sessionCookie)
      .send({ summaryType: "brief" });

    expect(started.status).toBe(202);
    expect(started.body.documentId).toBe(upload.body.id);
    expect(started.body.requestedSummaryType).toBe("brief");

    let status = await request(app)
      .get(`/api/documents/${upload.body.id}/summary`)
      .set("Cookie", sessionCookie);
    for (let attempt = 0; attempt < 20 && status.body.generationStatus !== "completed"; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      status = await request(app)
        .get(`/api/documents/${upload.body.id}/summary`)
        .set("Cookie", sessionCookie);
    }

    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({
      generationStatus: "completed",
      currentSummary: {
        summaryType: "brief",
        content: {
          keyPoints: ["A key point."],
          findings: ["A finding."],
          conclusions: ["A conclusion."],
        },
      },
    });
    expect(summarize).toHaveBeenCalledWith(
      expect.stringContaining("A readable source document."),
      "brief",
    );

    const previousSummary = status.body.currentSummary;
    summarize.mockRejectedValueOnce(new Error("private provider response"));
    const regeneration = await request(app)
      .post(`/api/documents/${upload.body.id}/summarize`)
      .set("Cookie", sessionCookie)
      .send({ summaryType: "detailed" });
    expect(regeneration.status).toBe(202);

    let failedStatus = await request(app)
      .get(`/api/documents/${upload.body.id}/summary`)
      .set("Cookie", sessionCookie);
    for (
      let attempt = 0;
      attempt < 20 && failedStatus.body.generationStatus !== "failed";
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      failedStatus = await request(app)
        .get(`/api/documents/${upload.body.id}/summary`)
        .set("Cookie", sessionCookie);
    }

    expect(failedStatus.body.generationStatus).toBe("failed");
    expect(failedStatus.body.lastErrorCode).toBe("AI_UNAVAILABLE");
    expect(failedStatus.body.currentSummary).toEqual(previousSummary);
  });

  it("returns session-scoped 404 for an unknown summary", async () => {
    const response = await request(app).get("/api/documents/507f1f77bcf86cd799439011/summary");

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "DOCUMENT_NOT_FOUND",
      message: "The requested document was not found.",
      requestId: response.headers["x-request-id"],
    });
  });
});
