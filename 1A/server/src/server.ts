import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { loadServerConfig } from "./config/env";
import { createOpenAIProvider } from "./services/summarization/openai.provider";

const config = loadServerConfig();

void connectDatabase(config.mongodbUri)
  .then(() => {
    createApp({
      sessionTtlMs: config.sessionTtlMs,
      secureCookie: config.nodeEnv === "production",
      summarizationProvider: createOpenAIProvider({
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
      }),
    }).listen(config.port, "127.0.0.1", () => {
      console.info(`PDF Summarizer API listening on port ${config.port}`);
    });
  })
  .catch((error: unknown) => {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`PDF Summarizer API failed to start (${errorName}).`);
    process.exitCode = 1;
  });
