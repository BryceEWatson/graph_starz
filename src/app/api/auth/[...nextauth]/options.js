import GoogleProvider from 'next-auth/providers/google';
import { ensureUserExists } from '@/lib/neo4j/imageRepository';
import debug from 'debug';

const log = debug('auth:nextauth');

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ user, _account, profile }) {
            try {
                if (!user.email) {
                    log('No email provided by Google');
                    return false;
                }

                // Ensure user exists in our database
                await ensureUserExists(user.email, user.name, profile.sub);

                return true;
            } catch (error) {
                log('Error during sign in:', error);
                return false;
            }
        },
        async jwt({ token, account, profile }) {
            // Persist the OAuth access_token and or the user id to the token right after signin
            if (account && profile) {
                token.providerId = profile.sub;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.providerId = token.providerId;
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
        error: '/auth/error',
    },
}
