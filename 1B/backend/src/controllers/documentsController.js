import path from 'node:path';
import { ApiError } from '../errors.js';
import documentStore from '../services/documentStore.js';
import { extractPdf, hasPdfSignature, PdfProcessingError } from '../services/pdfService.js';
import processingQueue from '../services/processingQueue.js';

function safeDisplayName(originalName) {
  const basename = path.win32.basename(originalName.replaceAll('/', '\\'));
  const cleaned = [...basename]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .slice(0, 255);
  return cleaned || 'document.pdf';
}

function toFailure(error) {
  if (error instanceof PdfProcessingError) {
    return { code: error.code, message: error.message, details: [] };
  }
  return {
    code: 'PDF_PROCESSING_FAILED',
    message: 'The PDF could not be processed. Try selecting it again.',
    details: [],
  };
}

export function uploadDocument(request, response, next) {
  try {
    const file = request.file;
    if (!file) {
      throw new ApiError(400, 'FILE_REQUIRED', 'Select one PDF file to upload.', [
        { field: 'file', message: 'A PDF file is required.' },
      ]);
    }
    if (!hasPdfSignature(file.buffer)) {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The selected file is not a PDF.');
    }

    const document = documentStore.create({
      displayName: safeDisplayName(file.originalname),
      byteLength: file.size,
    });
    const accepted = processingQueue.enqueue(async () => {
      try {
        const parsed = await extractPdf(file.buffer);
        documentStore.markReady(document.documentId, parsed);
      } catch (error) {
        documentStore.markFailed(document.documentId, toFailure(error));
      }
    });

    if (!accepted) {
      documentStore.delete(document.documentId);
      throw new ApiError(
        503,
        'PROCESSING_CAPACITY_REACHED',
        'PDF processing is busy. Try again shortly.',
      );
    }

    response.status(202).json(document);
  } catch (error) {
    next(error);
  }
}

export function getDocumentStatus(request, response, next) {
  try {
    const document = documentStore.getStatus(request.params.documentId);
    if (!document) {
      throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'The document was not found or has expired.');
    }
    response.status(200).json(document);
  } catch (error) {
    next(error);
  }
}

export function deleteDocument(request, response, next) {
  try {
    if (!documentStore.delete(request.params.documentId)) {
      throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'The document was not found or has expired.');
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}
