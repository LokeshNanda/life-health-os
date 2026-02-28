/**
 * Auth per SECURITY_AND_PRIVACY.md
 * Uses Clerk auth(). Falls back to x-user-id / DEV_USER_ID in dev/test for E2E.
 */

import { auth } from "@clerk/nextjs/server";

export async function getUserId(request: Request): Promise<string> {
  const { userId } = await auth();

  if (userId) return userId;

  // Dev/test fallback: x-user-id header or DEV_USER_ID (for E2E with E2E_BYPASS_AUTH)
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    const authHeader = request.headers.get("x-user-id");
    if (authHeader) return authHeader;
    if (process.env.DEV_USER_ID) return process.env.DEV_USER_ID;
  }

  throw new Error("Unauthorized: sign in required");
}
