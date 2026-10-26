import { NextResponse, type NextRequest } from "next/server";
import {
  AuthConfigError,
  getAuthConfig,
  logAuthConfigError,
} from "@/lib/auth/config";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const LOGIN_PATH = "/login";
const HOME_PATH = "/rikketeated";

function hasValidSession(request: NextRequest): boolean {
  try {
    const config = getAuthConfig();
    return (
      verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value, config) !==
      null
    );
  } catch (error) {
    // Missing configuration: treat every request as unauthenticated.
    if (error instanceof AuthConfigError) {
      logAuthConfigError(error);
      return false;
    }
    throw error;
  }
}

// First line of defence: every non-public route requires a valid signed
// session. Pages, Server Actions and the data access layer verify the session
// again on the server (requireSession), so protection never depends on this alone.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = hasValidSession(request);

  if (pathname === LOGIN_PATH) {
    if (authenticated && request.method === "GET") {
      return NextResponse.redirect(new URL(HOME_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next.js static assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
