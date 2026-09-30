import { randomUUID } from "node:crypto";

import type { LoginMethod, UserRole } from "@prisma/client";

import {
  createSessionRecord,
  findSessionById,
  revokeSession,
} from "@/server/repositories/session.repository";

import { SESSION_TTL_MS } from "./cookie";
import { signSessionJwt, verifySessionJwt } from "./jwt";
import { hashSessionToken } from "./otp-crypto";

export async function createSession(params: {
  userId: string;
  role: UserRole;
  method: LoginMethod;
  userAgent: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const token = await signSessionJwt(
    { sessionId, userId: params.userId, role: params.role },
    expiresAt,
  );
  await createSessionRecord({
    id: sessionId,
    userId: params.userId,
    tokenHash: hashSessionToken(token),
    method: params.method,
    expiresAt,
    userAgent: params.userAgent?.slice(0, 255) ?? null,
  });
  return { token, expiresAt };
}

/**
 * امضای JWT + رکورد Session را بررسی می‌کند (ابطال، انقضا، تطابق hash).
 * نشست معتبر نباشد ⇒ `null`.
 */
export interface ResolvedSession {
  sessionId: string;
  userId: string;
  method: LoginMethod;
  createdAt: Date;
}

export async function resolveSession(
  token: string,
): Promise<ResolvedSession | null> {
  const claims = await verifySessionJwt(token);
  if (!claims) return null;

  const session = await findSessionById(claims.sessionId);
  if (
    !session ||
    session.userId !== claims.userId ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    session.tokenHash !== hashSessionToken(token)
  ) {
    return null;
  }
  return {
    sessionId: session.id,
    userId: session.userId,
    method: session.method,
    createdAt: session.createdAt,
  };
}

export async function endSession(token: string): Promise<void> {
  const claims = await verifySessionJwt(token);
  if (claims) await revokeSession(claims.sessionId, new Date());
}
