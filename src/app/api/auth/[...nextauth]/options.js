import GoogleProvider from 'next-auth/providers/google';
import { ensureUserExists } from '@/lib/neo4j/imageRepository';
import debug from 'debug';

const log = debug('auth:nextauth');

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google') {
                try {
                    if (!profile?.sub) {
                        log('No sub found in Google profile');
                        return false;
                    }
                    if (!profile?.email) {
                        log('No email found in Google profile');
                        return false;
                    }
                    if (!profile.email_verified) {
                        log('Email not verified:', profile.email);
                        throw new Error('EmailVerification');
                    }
                    
                    if (!profile.email.endsWith("@gmail.com")) {
                        log('Non-Gmail account attempted:', profile.email);
                        throw new Error('AccessDenied');
                    }

                    // Use the Google-provided sub as the unique ID
                    const userId = await ensureUserExists(profile.email, profile.name || '', profile.sub);
                    user.id = userId; // Set the Neo4j user ID
                    return true;
                } catch (error) {
                    log('Error ensuring user exists:', error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.accessToken = account.access_token;
                token.id = profile.sub || profile.email;
                token.email = profile.email;
                token.name = profile.name;
                token.picture = profile.picture;
                token.sub = profile.sub;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.accessToken = token.accessToken;
                session.user.id = token.sub;
                session.user.picture = token.picture;
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        }
    },
    pages: {
        signIn: '/',
        error: '/auth/error',
    },
    debug: process.env.NODE_ENV === 'development',
};
