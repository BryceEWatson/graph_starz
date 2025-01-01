import { NextResponse } from 'next/server'

export async function middleware(request) {
    // Create a response object that we'll modify
    let response = NextResponse.next()

    // Enforce HTTPS - redirect HTTP to HTTPS
    if (process.env.NODE_ENV === 'production' && !request.nextUrl.protocol.includes('https')) {
        return NextResponse.redirect(
            `https://${request.nextUrl.host}${request.nextUrl.pathname}${request.nextUrl.search}`,
            301
        )
    }

    // Add security headers
    const headers = response.headers
    
    // HSTS - Force HTTPS for 1 year
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    // Other security headers
    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
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
