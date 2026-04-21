import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isOuraConnectedForUser } from "@/lib/oura/token-store";
import { safeNextPath } from "@/lib/onboarding/safe-next-path";
import { updateSession } from "@/lib/supabase/middleware";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value);
  }
}

function isAnonymousPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/terms")) return true;
  if (pathname.startsWith("/privacy")) return true;
  return false;
}

function isOuraOAuthApiPath(pathname: string): boolean {
  return pathname === "/api/oura/authorize" || pathname === "/api/oura/callback";
}

async function ouraConnected(
  supabase: SupabaseClient | null,
  user: User,
): Promise<boolean> {
  if (!supabase) return false;
  try {
    return await isOuraConnectedForUser(supabase, user.id);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user) {
    if (!isAnonymousPublicPath(pathname) && !pathname.startsWith("/api/")) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      const redirectRes = NextResponse.redirect(login);
      copyCookies(response, redirectRes);
      return redirectRes;
    }
    if (pathname.startsWith("/api/") && !isOuraOAuthApiPath(pathname)) {
      return NextResponse.json(
        { error: "unauthenticated", hint: "Sign in to use this API." },
        { status: 401 },
      );
    }
    return response;
  }

  const connected = await ouraConnected(supabase, user);

  if (user && pathname === "/login") {
    const nextRaw = request.nextUrl.searchParams.get("next");
    const dest = safeNextPath(nextRaw);
    if (!connected) {
      const ob = new URL("/onboarding", request.url);
      ob.searchParams.set("next", dest);
      const redirectRes = NextResponse.redirect(ob);
      copyCookies(response, redirectRes);
      return redirectRes;
    }
    const redirectRes = NextResponse.redirect(new URL(dest, request.url));
    copyCookies(response, redirectRes);
    return redirectRes;
  }

  if (!connected) {
    if (pathname === "/onboarding" || isOuraOAuthApiPath(pathname)) {
      return response;
    }
    if (pathname.startsWith("/api/")) {
      const redirectRes = NextResponse.json(
        {
          error: "oura_required",
          hint: "Connect Oura under /onboarding before using this API.",
        },
        { status: 403 },
      );
      copyCookies(response, redirectRes);
      return redirectRes;
    }
    if (isAnonymousPublicPath(pathname) && pathname !== "/") {
      return response;
    }
    if (pathname === "/" && !connected) {
      const ob = new URL("/onboarding", request.url);
      ob.searchParams.set("next", "/");
      const redirectRes = NextResponse.redirect(ob);
      copyCookies(response, redirectRes);
      return redirectRes;
    }
    if (pathname !== "/") {
      const ob = new URL("/onboarding", request.url);
      ob.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      const redirectRes = NextResponse.redirect(ob);
      copyCookies(response, redirectRes);
      return redirectRes;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
