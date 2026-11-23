import cookieParser from "cookie-parser";
import type { RequestHandler } from "express";
import { getOrCreateSession } from "../services/session/session.service";

const SESSION_COOKIE_NAME = "pdf_summarizer_session";
const parseCookies = cookieParser();

export interface SessionMiddlewareOptions {
  sessionTtlMs: number;
  secureCookie: boolean;
}

export function sessionMiddleware(options: SessionMiddlewareOptions): RequestHandler {
  return (req, res, next) => {
    parseCookies(req, res, (parseError?: unknown) => {
      if (parseError) {
        next(parseError);
        return;
      }

      const cookieValue: unknown = req.cookies?.[SESSION_COOKIE_NAME];
      const sessionId = typeof cookieValue === "string" ? cookieValue : undefined;
      void getOrCreateSession(sessionId, options.sessionTtlMs)
        .then((session) => {
          req.sessionId = session.sessionId;
          req.sessionExpiresAt = session.expiresAt;
          res.cookie(SESSION_COOKIE_NAME, session.sessionId, {
            httpOnly: true,
            sameSite: "lax",
            secure: options.secureCookie,
            path: "/",
          });
          next();
        })
        .catch(next);
    });
  };
}
