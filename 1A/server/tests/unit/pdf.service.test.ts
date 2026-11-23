import { AppError } from "../../src/middleware/error-handler.middleware";
import {
  MAX_PDF_SIZE_BYTES,
  validateAndExtractPdf,
  type PdfParser,
} from "../../src/services/pdf/pdf.service";
import { createTextPdf } from "../helpers/pdf-fixture";

const pdfHeader = Buffer.from("%PDF-1.7\n");

function createParser(
  text = "Extracted document text.",
  pageCount = 2,
  error?: Error,
): { parser: PdfParser; factory: jest.Mock<PdfParser, [Buffer]> } {
  const parser: PdfParser = {
    getInfo: jest.fn().mockResolvedValue({ total: pageCount }),
    getText: error ? jest.fn().mockRejectedValue(error) : jest.fn().mockResolvedValue({ text }),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  return { parser, factory: jest.fn(() => parser) };
}

describe("validateAndExtractPdf", () => {
  it("extracts real PDF text and maps the page count", async () => {
    const buffer = createTextPdf("Extracted by pdf-parse.");

    await expect(
      validateAndExtractPdf({
        buffer,
        originalName: "readable.pdf",
        mimetype: "application/pdf",
        size: buffer.length,
      }),
    ).resolves.toMatchObject({
      text: expect.stringContaining("Extracted by pdf-parse."),
      pageCount: 1,
    });
  });

  it("rejects a valid PDF with no extracted page text", async () => {
    const buffer = createTextPdf("");

    await expect(
      validateAndExtractPdf({
        buffer,
        originalName: "empty.pdf",
        mimetype: "application/pdf",
        size: buffer.length,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: "PDF_NO_TEXT" });
  });

  it("accepts a PDF exactly at the inclusive 20 MB limit", async () => {
    const { factory } = createParser("At the limit.");
    const buffer = Buffer.alloc(MAX_PDF_SIZE_BYTES);
    pdfHeader.copy(buffer);

    const result = await validateAndExtractPdf(
      { buffer, originalName: "limit.pdf", mimetype: "application/pdf", size: buffer.length },
      factory,
    );

    expect(result).toEqual({ text: "At the limit.", pageCount: 2 });
  });

  it("rejects a PDF one byte over the limit before parsing", async () => {
    const { factory } = createParser();

    await expect(
      validateAndExtractPdf(
        {
          buffer: pdfHeader,
          originalName: "large.pdf",
          mimetype: "application/pdf",
          size: MAX_PDF_SIZE_BYTES + 1,
        },
        factory,
      ),
    ).rejects.toMatchObject({ statusCode: 413, code: "FILE_TOO_LARGE" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("rejects non-PDF media types and content with HTTP 415", async () => {
    const { factory } = createParser();

    await expect(
      validateAndExtractPdf(
        { buffer: pdfHeader, originalName: "document.pdf", mimetype: "text/plain", size: 9 },
        factory,
      ),
    ).rejects.toMatchObject({ statusCode: 415, code: "UNSUPPORTED_FILE_TYPE" });
    await expect(
      validateAndExtractPdf(
        {
          buffer: Buffer.from("not a PDF"),
          originalName: "document.pdf",
          mimetype: "application/pdf",
          size: 9,
        },
        factory,
      ),
    ).rejects.toMatchObject({ statusCode: 415, code: "UNSUPPORTED_FILE_TYPE" });
  });

  it("rejects password-protected, corrupt, and text-free PDFs with HTTP 422", async () => {
    const encrypted = createParser(
      "",
      1,
      Object.assign(new Error("password required"), {
        name: "PasswordException",
      }),
    );
    await expect(
      validateAndExtractPdf(
        { buffer: pdfHeader, originalName: "locked.pdf", mimetype: "application/pdf", size: 9 },
        encrypted.factory,
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: "PDF_PROTECTED" });
    expect(encrypted.parser.destroy).toHaveBeenCalled();

    const corrupt = createParser("", 0, new Error("private parser detail"));
    await expect(
      validateAndExtractPdf(
        { buffer: pdfHeader, originalName: "corrupt.pdf", mimetype: "application/pdf", size: 9 },
        corrupt.factory,
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: "PDF_UNREADABLE" });

    const textFree = createParser(" \n\t ");
    await expect(
      validateAndExtractPdf(
        { buffer: pdfHeader, originalName: "scanned.pdf", mimetype: "application/pdf", size: 9 },
        textFree.factory,
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: "PDF_NO_TEXT" });
  });

  it("uses safe application errors for parser failures", async () => {
    const { factory } = createParser("", 0, new Error("secret document contents"));
    let caught: unknown;

    try {
      await validateAndExtractPdf(
        { buffer: pdfHeader, originalName: "corrupt.pdf", mimetype: "application/pdf", size: 9 },
        factory,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(caught).not.toHaveProperty("message", "secret document contents");
  });
});
