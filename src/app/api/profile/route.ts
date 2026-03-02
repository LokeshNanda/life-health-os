/**
 * GET /api/profile - Fetch current user's profile
 * PATCH /api/profile - Update profile (displayName, firstName, lastName, preferredGreeting)
 */

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getProfile, setProfile } from "@/lib/data";
import type { UserProfile } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    const profile = await getProfile(userId);
    return NextResponse.json(profile ?? null);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Profile GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const updates: Partial<Pick<UserProfile, "displayName" | "firstName" | "lastName" | "preferredGreeting">> = {};
    if (typeof body.displayName === "string") updates.displayName = body.displayName;
    if (typeof body.firstName === "string") updates.firstName = body.firstName;
    if (typeof body.lastName === "string") updates.lastName = body.lastName;
    if (typeof body.preferredGreeting === "string") updates.preferredGreeting = body.preferredGreeting;
    const profile = await setProfile(userId, updates);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Profile PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
