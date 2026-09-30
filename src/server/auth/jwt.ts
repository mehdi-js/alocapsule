import type { UserRole } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";

import { getAuthSecret } from "@/lib/env";

/** بدون وابستگی به Node/Prisma تا در middleware (Edge) هم کار کند. */

export interface SessionClaims {
  /** شناسه‌ی رکورد Session (برای ابطال) */
  sessionId: string;
  userId: string;
  role: UserRole;
}

const ALGORITHM = "HS256";

function getKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function signSessionJwt(
  claims: SessionClaims,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setJti(claims.sessionId)
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
}

/** امضا و انقضا را بررسی می‌کند؛ توکن نامعتبر ⇒ `null` (هرگز throw نمی‌کند). */
export async function verifySessionJwt(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: [ALGORITHM],
    });
    const { jti, sub, role } = payload;
    if (!jti || !sub || (role !== "CUSTOMER" && role !== "ADMIN")) return null;
    return { sessionId: jti, userId: sub, role };
  } catch {
    return null;
  }
}
