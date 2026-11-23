import express from "express";
import request from "supertest";
import { getOrCreateSession } from "../../src/services/session/session.service";
import { sessionMiddleware } from "../../src/middleware/session.middleware";

const mockGetOrCreateSession = jest.mocked(getOrCreateSession);

jest.mock("../../src/services/session/session.service", () => ({
  getOrCreateSession: jest.fn(),
}));

describe("sessionMiddleware", () => {
  beforeEach(() => {
    mockGetOrCreateSession.mockResolvedValue({
      sessionId: "opaque-session-id",
    } as Awaited<ReturnType<typeof getOrCreateSession>>);
  });

  it("creates an HttpOnly same-site cookie and scopes the request", async () => {
    const app = express();
    app.use(sessionMiddleware({ sessionTtlMs: 60_000, secureCookie: false }));
    app.get("/scope", (req, res) => res.json({ sessionId: req.sessionId }));

    const response = await request(app).get("/scope");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sessionId: "opaque-session-id" });
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(mockGetOrCreateSession).toHaveBeenCalledWith(undefined, 60_000);
  });

  it("passes the existing cookie to the session resolver", async () => {
    const app = express();
    app.use(sessionMiddleware({ sessionTtlMs: 60_000, secureCookie: true }));
    app.get("/scope", (req, res) => res.json({ sessionId: req.sessionId }));

    const response = await request(app)
      .get("/scope")
      .set("Cookie", "pdf_summarizer_session=existing-session-id");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sessionId: "opaque-session-id" });
    expect(response.headers["set-cookie"][0]).toContain("Secure");
    expect(mockGetOrCreateSession).toHaveBeenCalledWith("existing-session-id", 60_000);
  });
});
