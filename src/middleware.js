import { NextResponse } from 'next/server'

export async function middleware(request) {
    // Skip middleware for static files and api routes
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/static')
    ) {
        return NextResponse.next()
    }

    // Continue to the next middleware
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
