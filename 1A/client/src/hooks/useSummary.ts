import { useCallback, useState } from "react";
import { ApiError } from "../services/api-client";
import { getSummaryStatus, requestSummary, type SummaryMode } from "../services/document-api";
import type { SessionAction } from "../state/session.reducer";

const POLL_INTERVAL_MS = 1000;
const GENERATION_TIMEOUT_MS = 60_000;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Summary generation failed. Please try again.";
}

export function useSummary(dispatch: React.Dispatch<SessionAction>) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (documentId: string, summaryType: SummaryMode): Promise<void> => {
      dispatch({ type: "summary-started", summaryType });
      setIsGenerating(true);
      try {
        const accepted = await requestSummary(documentId, summaryType);
        if (accepted.generationStatus === "failed") {
          throw new Error("Summary generation failed. Please try again.");
        }
        if (accepted.generationStatus === "completed" && accepted.currentSummary) {
          dispatch({ type: "summary-succeeded", summary: accepted.currentSummary });
          return;
        }

        const expiresAt = Date.now() + GENERATION_TIMEOUT_MS;
        while (Date.now() < expiresAt) {
          await wait(POLL_INTERVAL_MS);
          const status = await getSummaryStatus(documentId);
          if (status.generationStatus === "completed" && status.currentSummary) {
            dispatch({ type: "summary-succeeded", summary: status.currentSummary });
            return;
          }
          if (status.generationStatus === "failed") {
            throw new Error("Summary generation failed. Your previous summary is unchanged.");
          }
        }
        throw new Error("Summary generation is taking too long. You can try again.");
      } catch (error) {
        dispatch({ type: "summary-failed", message: errorMessage(error) });
      } finally {
        setIsGenerating(false);
      }
    },
    [dispatch],
  );

  return { generate, isGenerating };
}
