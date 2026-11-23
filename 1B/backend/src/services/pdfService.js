import { PDFParse } from 'pdf-parse';

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 200;

export class PdfProcessingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PdfProcessingError';
    this.code = code;
  }
}

export function hasPdfSignature(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
}

export async function extractPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
    throw new PdfProcessingError('PDF_INVALID_SIZE', 'The PDF is empty or exceeds 20 MB.');
  }
  if (!hasPdfSignature(buffer)) {
    throw new PdfProcessingError('PDF_SIGNATURE_INVALID', 'The selected file is not a PDF.');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    const pageCount = Number(info.total);

    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new PdfProcessingError('PDF_INVALID', 'The PDF does not contain readable pages.');
    }
    if (pageCount > MAX_PDF_PAGES) {
      throw new PdfProcessingError('PDF_PAGE_LIMIT', 'The PDF exceeds the 200-page limit.');
    }

    const result = await parser.getText({ pageJoiner: '' });
    const extractedText = result.text.split('\u0000').join('').trim();
    if (!extractedText) {
      throw new PdfProcessingError(
        'PDF_NO_TEXT',
        'No selectable text was found. Scanned PDFs are not supported.',
      );
    }

    return { pageCount, extractedText };
  } catch (error) {
    if (error instanceof PdfProcessingError) throw error;
    if (error?.name === 'PasswordException') {
      throw new PdfProcessingError(
        'PDF_PASSWORD_PROTECTED',
        'This PDF is password-protected. Remove its protection and upload it again.',
      );
    }
    throw new PdfProcessingError(
      'PDF_PROCESSING_FAILED',
      'The PDF could not be read. Check that it is not damaged or password-protected.',
    );
  } finally {
    await parser.destroy();
  }
}
