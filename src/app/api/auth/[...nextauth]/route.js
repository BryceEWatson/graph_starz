import NextAuth from 'next-auth';
import { authOptions } from './options';

// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
    authOptions.debug = true;
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };