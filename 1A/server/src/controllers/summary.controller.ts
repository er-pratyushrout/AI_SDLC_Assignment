import type { RequestHandler } from "express";
import { AppError } from "../middleware/error-handler.middleware";
import {
  getSummaryStatus,
  startSummaryGeneration,
} from "../services/summarization/summary.service";
import type { SummarizationProvider, SummaryMode } from "../services/summarization/openai.provider";

function isSummaryMode(value: unknown): value is SummaryMode {
  return value === "brief" || value === "standard" || value === "detailed";
}

export function createSummaryController(getProvider: () => SummarizationProvider): {
  start: RequestHandler;
  getStatus: RequestHandler;
} {
  return {
    start: async (req, res, next) => {
      const body: unknown = req.body;
      const documentId = req.params.id;
      if (typeof documentId !== "string") {
        next(new AppError(400, "INVALID_DOCUMENT_ID", "The document ID is invalid."));
        return;
      }
      if (
        typeof body !== "object" ||
        body === null ||
        !("summaryType" in body) ||
        !isSummaryMode(body.summaryType)
      ) {
        next(new AppError(400, "INVALID_SUMMARY_TYPE", "Choose Brief, Standard, or Detailed."));
        return;
      }

      try {
        const status = await startSummaryGeneration(
          documentId,
          req.sessionId,
          body.summaryType,
          getProvider(),
          req.requestId,
        );
        res.status(202).json(status);
      } catch (error) {
        next(error);
      }
    },
    getStatus: async (req, res, next) => {
      const documentId = req.params.id;
      if (typeof documentId !== "string") {
        next(new AppError(400, "INVALID_DOCUMENT_ID", "The document ID is invalid."));
        return;
      }
      try {
        res.status(200).json(await getSummaryStatus(documentId, req.sessionId));
      } catch (error) {
        next(error);
      }
    },
  };
}
