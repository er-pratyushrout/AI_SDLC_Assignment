export interface ErrorLogContext {
  requestId: string;
  errorName: string;
  errorCode?: string;
  statusCode?: number;
}

export function logError(context: ErrorLogContext): void {
  console.error(
    JSON.stringify({
      level: "error",
      event: "request_failed",
      requestId: context.requestId,
      errorName: context.errorName,
      errorCode: context.errorCode,
      statusCode: context.statusCode,
    }),
  );
}
