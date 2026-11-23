export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string" &&
    "requestId" in error &&
    typeof error.requestId === "string"
  );
}

export async function apiRequest<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "INVALID_API_RESPONSE",
      "The server returned an invalid response. Please try again.",
      response.headers.get("X-Request-Id") ?? "unavailable",
    );
  }

  if (!response.ok) {
    if (!isApiErrorPayload(payload)) {
      throw new ApiError(
        response.status,
        "INVALID_API_ERROR",
        "The request failed, but the server returned an invalid error response.",
        response.headers.get("X-Request-Id") ?? "unavailable",
      );
    }

    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.requestId,
    );
  }

  return payload as T;
}
