import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
 
  // Allow requests for static files and api routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname.startsWith('/static/')) {
    return NextResponse.next()
  }

  // If the path is /login or /signup, let the request through
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next()
  }
 
  // For all other paths, if there's no token, redirect to login
  const hasToken = request.cookies.has('firebase-auth-token');
  if (!hasToken) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
 
  return NextResponse.next()
}
 
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
