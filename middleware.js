import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware() {
        // Add custom headers or modify the response if needed
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token
        },
    }
);

// Protect these routes
export const config = {
    matcher: [
        '/api/graph/:path*',
        '/api/upload/:path*'
    ]
};
