import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "clipper-auth";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function createToken(): string {
  const timestamp = Date.now();
  return Buffer.from(`authenticated:${timestamp}`).toString("base64");
}

export function verifyPassword(password: string): boolean {
  const correctPassword = process.env.DASHBOARD_PASSWORD;
  if (!correctPassword) {
    console.error("DASHBOARD_PASSWORD not set in environment");
    return false;
  }
  return password === correctPassword;
}

export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = createToken();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME);

  if (!token?.value) return false;

  try {
    const decoded = Buffer.from(token.value, "base64").toString();
    return decoded.startsWith("authenticated:");
  } catch {
    return false;
  }
}

// For middleware (sync check from request)
export function isAuthenticatedFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME);

  if (!token?.value) return false;

  try {
    const decoded = Buffer.from(token.value, "base64").toString();
    return decoded.startsWith("authenticated:");
  } catch {
    return false;
  }
}
