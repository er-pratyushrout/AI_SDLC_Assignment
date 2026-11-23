import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTextPdf } from "../../../server/tests/helpers/pdf-fixture";
import { MAX_PDF_SIZE_BYTES } from "../../../server/src/services/pdf/pdf.service";
import { createPdfUploadRouter } from "./pdf.service";

const app = express().use(createPdfUploadRouter());

describe("PDF upload contract", () => {
  it("rejects a request without a file with HTTP 415", async () => {
    const response = await request(app).post("/api/documents/upload");
    const status = response.status;

    expect(status).toBe(415);
  });

  it("accepts a PDF at the inclusive 20 MB limit with HTTP 201", async () => {
    const pdf = createTextPdf("Readable PDF content.");
    const upload = Buffer.concat([pdf, Buffer.alloc(MAX_PDF_SIZE_BYTES - pdf.length, 0x20)]);
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", upload, { filename: "readable.pdf", contentType: "application/pdf" });
    const status = response.status;

    expect(status).toBe(201);
  });

  it("rejects an invalid file with HTTP 415", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", Buffer.from("not a PDF"), {
        filename: "invalid.txt",
        contentType: "text/plain",
      });
    const status = response.status;

    expect(status).toBe(415);
  });

  it("rejects a valid but text-free PDF with HTTP 422", async () => {
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", createTextPdf(""), {
        filename: "empty.pdf",
        contentType: "application/pdf",
      });
    const status = response.status;

    expect(status).toBe(422);
  });

  it("rejects PDFs larger than 20 MB with HTTP 413", async () => {
    const pdf = createTextPdf("Readable PDF content.");
    const upload = Buffer.concat([pdf, Buffer.alloc(MAX_PDF_SIZE_BYTES + 1 - pdf.length, 0x20)]);
    const response = await request(app)
      .post("/api/documents/upload")
      .attach("file", upload, { filename: "too-large.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(413);
  });
});
