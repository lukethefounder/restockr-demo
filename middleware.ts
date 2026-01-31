// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware protects /buyer, /distributor, /founder routes
// based on the restockr_role cookie set during login.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect specific routes
  const needsAuth =
    pathname.startsWith('/buyer') ||
    pathname.startsWith('/distributor') ||
    pathname.startsWith('/founder');

  if (!needsAuth) {
    return NextResponse.next();
  }

  const userId = req.cookies.get('restockr_user_id')?.value;
  const role = req.cookies.get('restockr_role')?.value as
    | 'buyer'
    | 'distributor'
    | 'founder'
    | undefined;

  // If no session, send to home
  if (!userId || !role) {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  // Role-based routing
  if (pathname.startsWith('/buyer') && role !== 'buyer') {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/distributor') && role !== 'distributor') {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/founder') && role !== 'founder') {
    const url = new URL('/', req.url);
    return NextResponse.redirect(url);
  }

  // Otherwise allow
  return NextResponse.next();
}

// Only run middleware on these routes
export const config = {
  matcher: ['/buyer/:path*', '/distributor/:path*', '/founder/:path*'],
};
