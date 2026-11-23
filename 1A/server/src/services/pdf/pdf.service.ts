import { PDFParse } from "pdf-parse";
import { AppError } from "../../middleware/error-handler.middleware";

export const MAX_PDF_SIZE_BYTES = 20_000_000;

export interface PdfUpload {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface PdfParser {
  getInfo(): Promise<{ total: number }>;
  getText(): Promise<{ text: string; pages?: Array<{ text: string }> }>;
  destroy(): Promise<void>;
}

export type PdfParserFactory = (buffer: Buffer) => PdfParser;

export interface ExtractedPdf {
  text: string;
  pageCount: number | null;
}

const defaultParserFactory: PdfParserFactory = (buffer) => new PDFParse({ data: buffer });

export async function validateAndExtractPdf(
  upload: PdfUpload,
  parserFactory: PdfParserFactory = defaultParserFactory,
): Promise<ExtractedPdf> {
  if (upload.size > MAX_PDF_SIZE_BYTES) {
    throw new AppError(413, "FILE_TOO_LARGE", "The PDF exceeds the 20 MB file size limit.");
  }

  if (
    upload.mimetype.toLowerCase() !== "application/pdf" ||
    !upload.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
  ) {
    throw new AppError(415, "UNSUPPORTED_FILE_TYPE", "Choose a valid PDF file to continue.");
  }

  let parser: PdfParser;
  try {
    parser = parserFactory(upload.buffer);
  } catch {
    throw new AppError(422, "PDF_UNREADABLE", "This PDF could not be read.");
  }

  try {
    const info = await parser.getInfo();
    const textResult = await parser.getText();
    const text = (
      textResult.pages ? textResult.pages.map((page) => page.text).join("\n\n") : textResult.text
    ).trim();
    if (!text) {
      throw new AppError(
        422,
        "PDF_NO_TEXT",
        "No readable text was found in this PDF. Scanned documents are not supported.",
      );
    }

    return {
      text,
      pageCount: Number.isInteger(info.total) && info.total > 0 ? info.total : null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof Error && error.name === "PasswordException") {
      throw new AppError(
        422,
        "PDF_PROTECTED",
        "This PDF is password-protected. Remove the password and try again.",
      );
    }

    throw new AppError(422, "PDF_UNREADABLE", "This PDF could not be read.");
  } finally {
    await parser.destroy();
  }
}
