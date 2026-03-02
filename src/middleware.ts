import { clerkMiddleware } from "@clerk/nextjs/server";

// Force sign-in for all routes except Clerk auth pages (pathname-based to avoid matcher quirks)
function isPublicPath(pathname: string): boolean {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

export default clerkMiddleware(async (auth, req) => {
  if (process.env.E2E_BYPASS_AUTH === "true") return;

  const pathname = req.nextUrl.pathname;
  if (!isPublicPath(pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
