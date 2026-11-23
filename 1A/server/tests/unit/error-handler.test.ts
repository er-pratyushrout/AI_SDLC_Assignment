import express, { type ErrorRequestHandler } from "express";
import request from "supertest";
import { errorHandler } from "../../src/middleware/error-handler.middleware";
import { requestIdMiddleware } from "../../src/middleware/request-id.middleware";
import { logError } from "../../src/services/logging/logger";
import { AppError } from "../../src/middleware/error-handler.middleware";

jest.mock("../../src/services/logging/logger", () => ({
  logError: jest.fn(),
}));

function createErrorApp(error: Error): express.Express {
  const app = express();
  app.use(requestIdMiddleware);
  app.get("/fail", (_req, _res, next) => next(error));
  app.use(errorHandler as ErrorRequestHandler);
  return app;
}

describe("errorHandler", () => {
  it("returns typed safe errors with a correlated request ID", async () => {
    const response = await request(
      createErrorApp(new AppError(422, "PDF_UNREADABLE", "This PDF cannot be read.")),
    ).get("/fail");

    expect(response.status).toBe(422);
    expect(response.headers["x-request-id"]).toBe(response.body.error.requestId);
    expect(response.body).toEqual({
      error: {
        code: "PDF_UNREADABLE",
        message: "This PDF cannot be read.",
        requestId: response.headers["x-request-id"],
      },
    });
  });

  it("sanitizes unexpected failures and logs no error message", async () => {
    const privateText = "private extracted PDF text";
    const response = await request(createErrorApp(new Error(privateText))).get("/fail");

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again.",
      requestId: response.headers["x-request-id"],
    });
    expect(JSON.stringify(response.body)).not.toContain(privateText);
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: response.headers["x-request-id"] }),
    );
    expect(JSON.stringify(jest.mocked(logError).mock.calls)).not.toContain(privateText);
  });
});
