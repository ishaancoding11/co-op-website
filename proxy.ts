import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

const VIEWED_COOKIE = "coop_viewed_creative";

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createClient(request);

  // Guests get one free creative-profile view; a second distinct profile
  // hits the sign-in gate. Signed-in users (any role) are unaffected.
  const match = request.nextUrl.pathname.match(/^\/creatives\/([^/]+)\/?$/);
  if (match) {
    const { data: { user } } = await supabase.auth.getUser();
    const response = getResponse();
    if (!user) {
      const currentId = match[1];
      const viewedId = request.cookies.get(VIEWED_COOKIE)?.value;
      if (!viewedId) {
        response.cookies.set(VIEWED_COOKIE, currentId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
      } else if (viewedId !== currentId) {
        const gateUrl = new URL("/login", request.url);
        gateUrl.searchParams.set("role", "business");
        gateUrl.searchParams.set("next", request.nextUrl.pathname);
        gateUrl.searchParams.set("gate", "creative-limit");
        return NextResponse.redirect(gateUrl);
      }
    }
    return response;
  }

  return getResponse();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
