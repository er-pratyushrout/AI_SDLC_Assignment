import { randomBytes } from "node:crypto";
import { BrowserSession, type BrowserSessionDocument } from "../../models/browser-session.model";

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function getOrCreateSession(
  sessionId: string | undefined,
  sessionTtlMs: number,
  now: Date = new Date(),
): Promise<BrowserSessionDocument> {
  if (sessionId && SESSION_ID_PATTERN.test(sessionId)) {
    const activeSession = await BrowserSession.findOne({
      sessionId,
      state: "active",
      expiresAt: { $gt: now },
    });

    if (activeSession) {
      activeSession.lastActivityAt = now;
      activeSession.expiresAt = new Date(now.getTime() + sessionTtlMs);
      await activeSession.save();
      return activeSession;
    }
  }

  const nextSessionId = randomBytes(32).toString("base64url");
  return BrowserSession.create({
    sessionId: nextSessionId,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + sessionTtlMs),
    endedAt: null,
    state: "active",
  });
}
