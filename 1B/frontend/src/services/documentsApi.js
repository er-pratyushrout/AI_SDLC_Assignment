import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export class ApiClientError extends Error {
  constructor({ code, message, details = [] }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
  }
}

export function normalizeApiError(error) {
  if (error instanceof ApiClientError || axios.isCancel(error)) return error;

  const responseError = error?.response?.data?.error;
  if (
    responseError &&
    typeof responseError.code === 'string' &&
    typeof responseError.message === 'string'
  ) {
    return new ApiClientError({
      code: responseError.code,
      message: responseError.message,
      details: Array.isArray(responseError.details) ? responseError.details : [],
    });
  }

  return new ApiClientError({
    code: 'API_UNAVAILABLE',
    message: 'The server could not be reached. Check your connection and try again.',
  });
}

async function requestJson(operation) {
  try {
    const response = await operation();
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function uploadDocument(file, { signal } = {}) {
  const body = new FormData();
  body.append('file', file);
  return requestJson(() => api.post('/documents', body, { signal }));
}

export function getDocumentStatus(documentId, { signal } = {}) {
  return requestJson(() => api.get(`/documents/${encodeURIComponent(documentId)}`, { signal }));
}

export async function deleteDocument(documentId, { signal } = {}) {
  try {
    const response = await api.delete(`/documents/${encodeURIComponent(documentId)}`, { signal });
    return response.status;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
