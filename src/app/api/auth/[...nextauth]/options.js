import GoogleProvider from 'next-auth/providers/google';
import debug from 'debug';

const log = debug('auth:nextauth');

const isDevelopment = process.env.NODE_ENV === 'development';

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    debug: isDevelopment,
    cookies: {
        sessionToken: {
            name: isDevelopment ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: !isDevelopment
            }
        }
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            try {
                if (!user.email) {
                    log('No email provided by Google');
                    return false;
                }

                log('Full Google profile data:', {
                    user,
                    account,
                    profile,
                    sub: profile?.sub
                });
                
                // Allow sign in even if user doesn't exist in Neo4j yet
                // They'll be created when they request access
                return true;

            } catch (error) {
                log('Error in signIn callback:', error);
                return false;
            }
        },

        async jwt({ token, account, profile }) {
            // Add provider-specific ID to the token
            if (account && profile) {
                token.providerId = profile.sub;
            }
            return token;
        },

        async session({ session, token }) {
            // Add provider ID to the session
            if (session.user) {
                session.user.id = token.id;
                session.providerId = token.providerId;
            }
            return session;
        },

        async redirect({ url, baseUrl }) {
            try {
                // Ensure URL is absolute
                const isAbsolute = url.startsWith('http://') || url.startsWith('https://');
                if (!isAbsolute) {
                    url = new URL(url, baseUrl).toString();
                }

                // In production, enforce HTTPS
                if (!isDevelopment && url.startsWith('http://')) {
                    url = url.replace('http://', 'https://');
                }

                // Allow redirects to same origin or specified callback URLs
                if (url.startsWith(baseUrl)) {
                    return url;
                }
                
                // Default to base URL if redirect is not allowed
                return baseUrl;
            } catch (error) {
                log('Redirect error:', error);
                return baseUrl;
            }
        },
        
        async signOut({ _url, baseUrl }) {
            return baseUrl;
        }
    },
    pages: {
        signIn: '/',
        signOut: '/',
        error: '/auth/error',
    }
};
