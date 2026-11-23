import OpenAI from "openai";
import { AppError } from "../../middleware/error-handler.middleware";

export type SummaryMode = "brief" | "standard" | "detailed";

export interface SummaryContent {
  keyPoints: string[];
  findings: string[];
  conclusions: string[];
}

export interface ProviderRequest {
  model: string;
  systemPrompt: string;
  documentText: string;
}

export type ResponseCreator = (request: ProviderRequest, signal: AbortSignal) => Promise<string>;

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  createResponse?: ResponseCreator;
}

export interface SummarizationProvider {
  summarize(documentText: string, summaryType: SummaryMode): Promise<SummaryContent>;
}

const modeGuidance: Record<SummaryMode, string> = {
  brief: "brief: use a compact summary with only the most important points",
  standard: "standard: balance concise coverage with useful supporting detail",
  detailed: "detailed: provide thorough coverage of the source's important information",
};

function createResponseCreator(apiKey: string): ResponseCreator {
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  return async (request, signal) => {
    const response = await client.responses.create(
      {
        model: request.model,
        instructions: request.systemPrompt,
        input: request.documentText,
        text: { format: { type: "json_object" } },
        store: false,
      },
      { signal },
    );
    return response.output_text;
  };
}

function parseSummaryContent(raw: string): SummaryContent {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new AppError(
      502,
      "AI_INVALID_RESPONSE",
      "The summary service returned an invalid result.",
    );
  }

  const isRecord = (input: unknown): input is Record<string, unknown> =>
    typeof input === "object" && input !== null && !Array.isArray(input);
  if (!isRecord(value)) {
    throw new AppError(
      502,
      "AI_INVALID_RESPONSE",
      "The summary service returned an invalid result.",
    );
  }

  const candidate = value;
  const fields = ["keyPoints", "findings", "conclusions"] as const;
  const isStringArray = (section: unknown): section is string[] =>
    Array.isArray(section) &&
    section.every((entry) => typeof entry === "string" && entry.trim().length > 0);
  for (const field of fields) {
    const section = candidate[field];
    if (!isStringArray(section)) {
      throw new AppError(
        502,
        "AI_INVALID_RESPONSE",
        "The summary service returned an invalid result.",
      );
    }
  }

  const keyPoints = candidate.keyPoints;
  const findings = candidate.findings;
  const conclusions = candidate.conclusions;
  if (!isStringArray(keyPoints) || !isStringArray(findings) || !isStringArray(conclusions)) {
    throw new AppError(
      502,
      "AI_INVALID_RESPONSE",
      "The summary service returned an invalid result.",
    );
  }
  const content = { keyPoints, findings, conclusions };
  if (!fields.some((field) => content[field].length > 0)) {
    throw new AppError(502, "AI_INVALID_RESPONSE", "The summary service returned an empty result.");
  }
  return content;
}

export function createOpenAIProvider(options: OpenAIProviderOptions): SummarizationProvider {
  const createResponse = options.createResponse ?? createResponseCreator(options.apiKey);
  const timeoutMs = options.timeoutMs ?? 30_000;

  return {
    async summarize(documentText, summaryType) {
      const request: ProviderRequest = {
        model: options.model,
        systemPrompt: [
          "Summarize the source document accurately and without adding unsupported facts.",
          `Produce a ${modeGuidance[summaryType]} summary.`,
          "Return a JSON object with string-array fields keyPoints, findings, and conclusions.",
          "Use empty arrays only when that section is not supported by the source.",
        ].join(" "),
        documentText,
      };

      let raw: string;
      try {
        raw = await createResponse(request, AbortSignal.timeout(timeoutMs));
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "TimeoutError" || error.name === "AbortError")
        ) {
          throw new AppError(502, "AI_TIMEOUT", "Summary generation timed out. Please try again.");
        }
        throw new AppError(
          502,
          "AI_UNAVAILABLE",
          "The summary service is temporarily unavailable. Please try again.",
        );
      }

      return parseSummaryContent(raw);
    },
  };
}
