import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/upload",
  "/chat",
  "/timeline",
  "/dashboard",
  "/summarize",
]);

export default clerkMiddleware(async (auth, req) => {
  // E2E tests: bypass auth when E2E_BYPASS_AUTH=true
  if (process.env.E2E_BYPASS_AUTH === "true") {
    return;
  }
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
