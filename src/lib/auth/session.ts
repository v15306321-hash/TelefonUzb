/**
 * Stateless admin session token (JWT, HS256) — Edge-compatible, used by middleware
 * and server code. The secret lives only in the server environment (AUTH_SECRET).
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tuzb_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionPayload = { sub: string; username: string; ver: number };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ username: payload.username, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer("telefonuzb-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "telefonuzb-admin", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.username !== "string" || typeof payload.ver !== "number") return null;
    return { sub: payload.sub, username: payload.username, ver: payload.ver };
  } catch {
    return null;
  }
}

/* ---- second step of login (2FA): short-lived proof that the password was correct ---- */

export const PREAUTH_COOKIE = "tuzb_2fa";
export const PREAUTH_TTL_SECONDS = 5 * 60;

export async function signPreauth(userId: string, ver: number) {
  return new SignJWT({ ver, step: "totp" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setIssuer("telefonuzb-admin-2fa")
    .setExpirationTime(`${PREAUTH_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyPreauth(token: string | undefined | null): Promise<{ sub: string; ver: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: "telefonuzb-admin-2fa", algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number" || payload.step !== "totp") return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}
