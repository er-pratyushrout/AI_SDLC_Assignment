import multer from 'multer';
import { ApiError } from '../errors.js';

function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new ApiError(413, 'FILE_TOO_LARGE', 'The PDF exceeds the 20 MB upload limit.', [
        { field: 'file', message: 'Choose a PDF no larger than 20 MB.' },
      ]);
    }

    return new ApiError(
      400,
      'INVALID_UPLOAD_FIELDS',
      'Upload exactly one file in the file field and no additional fields.',
      [{ field: error.field ?? 'file', message: 'Unexpected upload field.' }],
    );
  }

  if (error?.type === 'entity.parse.failed') {
    return new ApiError(400, 'INVALID_JSON', 'The request body must contain valid JSON.');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'The server could not complete the request.');
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (!(error instanceof ApiError) && !(error instanceof multer.MulterError)) {
    console.error('Unhandled API error', { errorName: error?.name ?? 'Error' });
  }

  const apiError = toApiError(error);
  response.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
  });
}
