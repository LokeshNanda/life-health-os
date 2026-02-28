/**
 * Auth placeholder per SECURITY_AND_PRIVACY.md
 * Authentication required for all APIs.
 * Replace with real auth (e.g. NextAuth, Clerk) in production.
 */

export function getUserId(request: Request): string {
  // Placeholder: use header or cookie. In production, validate JWT/session.
  const authHeader = request.headers.get("x-user-id");
  if (authHeader) return authHeader;

  // Dev fallback - remove in production
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) {
    return process.env.DEV_USER_ID;
  }

  throw new Error("Unauthorized: missing user identification");
}
