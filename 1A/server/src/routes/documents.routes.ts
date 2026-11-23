import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import express from "express";
import multer from "multer";
import { AppError } from "../middleware/error-handler.middleware";
import { documentUploadController } from "../controllers/document-upload.controller";
import { createSummaryController } from "../controllers/summary.controller";
import type { SummarizationProvider } from "../services/summarization/openai.provider";

export function createDocumentsRouter(configuredProvider?: SummarizationProvider): express.Router {
  const provider = configuredProvider;
  const getProvider = (): SummarizationProvider => {
    if (!provider) {
      throw new AppError(
        502,
        "AI_UNAVAILABLE",
        "The summary service is not configured for this application.",
      );
    }
    return provider;
  };

  const upload = multer({
    storage: multer.diskStorage({
      destination: tmpdir(),
      filename: (_req, _file, callback) => callback(null, `${randomUUID()}.upload`),
    }),
    limits: { fileSize: 20_000_000, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (file.mimetype.toLowerCase() !== "application/pdf") {
        callback(
          new AppError(415, "UNSUPPORTED_FILE_TYPE", "Choose a valid PDF file to continue."),
        );
        return;
      }
      callback(null, true);
    },
  });

  const router = express.Router();
  const summaryController = createSummaryController(getProvider);

  router.post("/upload", upload.single("file"), documentUploadController);
  router.post("/:id/summarize", summaryController.start);
  router.get("/:id/summary", summaryController.getStatus);

  return router;
}
