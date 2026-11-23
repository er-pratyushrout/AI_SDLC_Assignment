import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { logError } from "../services/logging/logger";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

function mapError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new AppError(413, "FILE_TOO_LARGE", "The PDF exceeds the 20 MB file size limit.");
    }
    return new AppError(400, "INVALID_UPLOAD", "The upload request is invalid.");
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError(400, "INVALID_REQUEST", "The request contains invalid data.");
  }

  if (
    error instanceof Error &&
    ["MongoNetworkError", "MongoServerSelectionError", "MongoNotConnectedError"].includes(
      error.name,
    )
  ) {
    return new AppError(503, "DATABASE_UNAVAILABLE", "The service is temporarily unavailable.");
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    return new AppError(400, "INVALID_REQUEST", "The request body is not valid JSON.");
  }

  return new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again.");
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  void _next;
  const appError = mapError(error);
  logError({
    requestId: req.requestId ?? "unavailable",
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorCode: appError.code,
    statusCode: appError.statusCode,
  });

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      requestId: req.requestId ?? "unavailable",
    },
  });
};
