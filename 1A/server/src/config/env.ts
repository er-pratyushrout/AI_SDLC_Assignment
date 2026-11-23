import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface ServerConfig {
  mongodbUri: string;
  openaiApiKey: string;
  openaiModel: string;
  port: number;
  nodeEnv: string;
  sessionTtlMs: number;
}

let environmentFileLoaded = false;

function loadEnvironmentFile(): void {
  if (environmentFileLoaded) {
    return;
  }

  const environmentFile = resolve(__dirname, "../../../.env");
  if (existsSync(environmentFile)) {
    process.loadEnvFile(environmentFile);
  }
  environmentFileLoaded = true;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  if (env === process.env) {
    loadEnvironmentFile();
  }

  const missing = ["MONGODB_URI", "OPENAI_API_KEY", "OPENAI_MODEL"].filter(
    (key) => !env[key]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(`Missing required server configuration: ${missing.join(", ")}`);
  }

  const mongodbUri = env.MONGODB_URI!.trim();
  try {
    const parsedUri = new URL(mongodbUri);
    if (!["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol) || !parsedUri.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error("MONGODB_URI must be a valid MongoDB connection URI.");
  }

  const rawPort = env.PORT ?? "3000";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const rawSessionTtlHours = env.SESSION_TTL_HOURS ?? "24";
  const sessionTtlHours = Number(rawSessionTtlHours);
  if (!Number.isFinite(sessionTtlHours) || sessionTtlHours <= 0) {
    throw new Error("SESSION_TTL_HOURS must be a positive number.");
  }
  const sessionTtlMs = sessionTtlHours * 60 * 60 * 1000;
  if (!Number.isFinite(sessionTtlMs)) {
    throw new Error("SESSION_TTL_HOURS is outside the supported range.");
  }

  return {
    mongodbUri,
    openaiApiKey: env.OPENAI_API_KEY!.trim(),
    openaiModel: env.OPENAI_MODEL!.trim(),
    port,
    nodeEnv: env.NODE_ENV ?? "development",
    sessionTtlMs,
  };
}
