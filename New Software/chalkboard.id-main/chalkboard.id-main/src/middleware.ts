import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';

// Removed next-intl configuration to disable /en routing

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // Locale logic nuked
    // Remove locale from pathname for auth checks
    const pathWithoutLocale = pathname;

    // If user is authenticated and trying to access landing page, redirect to dashboard
    if (token && pathWithoutLocale === "/") {
      return NextResponse.redirect(new URL(`/dashboard`, req.url));
    }

    // If user is not authenticated and trying to access protected routes, redirect to signin
    if (!token && pathWithoutLocale.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL(`/auth/signin`, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Get the locale from the pathname
        const pathWithoutLocale = pathname;

        // Allow access to public routes
        if (pathWithoutLocale.startsWith("/auth") || pathname === "/api/auth") {
          return true;
        }

        // Allow access to API routes (they handle their own auth)
        if (pathname.startsWith("/api")) {
          return true;
        }

        // For root path, allow both authenticated and unauthenticated
        if (pathWithoutLocale === "/") {
          return true;
        }

        // For dashboard routes, require authentication
        if (pathWithoutLocale.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  // Simpler matcher that is more compatible with Netlify Edge Functions
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)']
}; 