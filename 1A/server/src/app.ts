import express from "express";
import { AppError, errorHandler } from "./middleware/error-handler.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { sessionMiddleware } from "./middleware/session.middleware";
import { isDatabaseReady } from "./config/database";
import { createDocumentsRouter } from "./routes/documents.routes";
import type { SummarizationProvider } from "./services/summarization/openai.provider";

export interface AppOptions {
  sessionTtlMs?: number;
  secureCookie?: boolean;
  summarizationProvider?: SummarizationProvider;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "16kb" }));
  app.use((_req, _res, next) => {
    if (!isDatabaseReady()) {
      next(new AppError(503, "DATABASE_UNAVAILABLE", "The service is temporarily unavailable."));
      return;
    }
    next();
  });
  app.use(
    sessionMiddleware({
      sessionTtlMs: options.sessionTtlMs ?? 24 * 60 * 60 * 1000,
      secureCookie: options.secureCookie ?? process.env.NODE_ENV === "production",
    }),
  );
  app.use("/api/documents", createDocumentsRouter(options.summarizationProvider));
  app.use(errorHandler);

  return app;
}
