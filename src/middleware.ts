import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't require sign-in
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (process.env.E2E_BYPASS_AUTH === "true") return;

  if (!isPublicRoute(req)) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    await auth.protect({ unauthenticatedUrl: signInUrl.href });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
