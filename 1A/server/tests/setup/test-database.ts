import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDatabase, disconnectDatabase } from "../../src/config/database";

let mongoServer: MongoMemoryServer | undefined;

export async function startTestDatabase(): Promise<void> {
  if (mongoServer) {
    throw new Error("The isolated test database is already running.");
  }

  mongoServer = await MongoMemoryServer.create({
    binary: { version: "7.0.14" },
  });
  try {
    await connectDatabase(mongoServer.getUri("pdf_summarizer_test"));
  } catch (error) {
    await mongoServer.stop();
    mongoServer = undefined;
    throw error;
  }
}

export async function clearTestDatabase(): Promise<void> {
  const database = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !database) {
    throw new Error("The isolated test database is not connected.");
  }
  await database.dropDatabase();
}

export async function stopTestDatabase(): Promise<void> {
  await disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
}
