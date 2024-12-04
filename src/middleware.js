import { NextResponse } from 'next/server';

export async function middleware(request) {
    // Skip middleware for static files, api routes, and client-side routes
    if (request.nextUrl.pathname.startsWith('/_next') || 
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Add any future middleware logic here
    return NextResponse.next();
}
