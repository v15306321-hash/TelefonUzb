import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

/** Full session check: signature + expiry (JWT) and user existence + token version (DB). */
export async function getAdmin() {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await prisma.adminUser.findUnique({
    where: { id: payload.sub },
    select: { id: true, username: true, tokenVersion: true, lastLoginAt: true },
  });
  if (!user || user.tokenVersion !== payload.ver) return null;
  return user;
}

/** Use in admin pages & server actions. Redirects to login when not authorised. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Use in API route handlers: returns null instead of redirecting. Also checks Origin (CSRF). */
export async function adminFromRequest(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    try {
      if (new URL(origin).host !== host) return null;
    } catch {
      return null;
    }
  }
  return getAdmin();
}

export async function startSession(user: { id: string; username: string; tokenVersion: number }) {
  const token = await signSession({ sub: user.id, username: user.username, ver: user.tokenVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
