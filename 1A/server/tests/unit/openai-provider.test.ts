import {
  createOpenAIProvider,
  type SummaryContent,
  type SummaryMode,
} from "../../src/services/summarization/openai.provider";

const summaryContent: SummaryContent = {
  keyPoints: ["A key point."],
  findings: ["An important finding."],
  conclusions: ["A conclusion."],
};

const successfulResponse = JSON.stringify(summaryContent);

describe("OpenAI summarization provider", () => {
  it.each<SummaryMode>(["brief", "standard", "detailed"])(
    "uses the %s mode prompt and validates structured output",
    async (summaryType) => {
      const createResponse = jest.fn().mockResolvedValue(successfulResponse);
      const provider = createOpenAIProvider({
        apiKey: "test-key-not-a-secret",
        model: "test-model",
        createResponse,
      });

      await expect(provider.summarize("Source text.", summaryType)).resolves.toEqual(
        summaryContent,
      );
      expect(createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "test-model",
          systemPrompt: expect.stringContaining(summaryType),
          documentText: "Source text.",
        }),
        expect.any(AbortSignal),
      );
    },
  );

  it("rejects malformed or incomplete provider output", async () => {
    const provider = createOpenAIProvider({
      apiKey: "test-key",
      model: "test-model",
      createResponse: jest.fn().mockResolvedValue('{"keyPoints":["Only one section"]}'),
    });

    await expect(provider.summarize("Source text.", "standard")).rejects.toMatchObject({
      statusCode: 502,
      code: "AI_INVALID_RESPONSE",
    });
  });

  it("translates provider timeouts without exposing raw errors", async () => {
    const provider = createOpenAIProvider({
      apiKey: "test-key",
      model: "test-model",
      createResponse: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("private request detail"), { name: "TimeoutError" }),
        ),
    });

    await expect(provider.summarize("Source text.", "brief")).rejects.toMatchObject({
      statusCode: 502,
      code: "AI_TIMEOUT",
    });
  });

  it("sanitizes provider failures", async () => {
    const provider = createOpenAIProvider({
      apiKey: "test-key",
      model: "test-model",
      createResponse: jest.fn().mockRejectedValue(new Error("secret provider response")),
    });
    let caught: unknown;

    try {
      await provider.summarize("Source text.", "detailed");
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ statusCode: 502, code: "AI_UNAVAILABLE" });
    expect(caught).not.toHaveProperty("message", "secret provider response");
  });
});
