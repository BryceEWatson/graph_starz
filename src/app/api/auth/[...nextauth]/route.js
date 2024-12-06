import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { initialize, getDriver } from '../../../../lib/neo4j/api-client';
import debug from 'debug';

const log = debug('auth:nextauth');

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

const handler = NextAuth({
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
        async signIn({ account, profile }) {
            if (!account?.provider || !profile?.email) {
                log('Missing account provider or profile email');
                return false;
            }

            if (account.provider === "google") {
                if (!profile.email_verified) {
                    log('Email not verified:', profile.email);
                    throw new Error('EmailVerification');
                }
                
                if (!profile.email.endsWith("@gmail.com")) {
                    log('Non-Gmail account attempted:', profile.email);
                    throw new Error('AccessDenied');
                }

                try {
                    // Initialize Neo4j
                    await initialize();
                    const driver = getDriver();
                    
                    if (!driver) {
                        log('Failed to get Neo4j driver during sign in');
                        throw new Error('DatabaseError');
                    }
                    
                    const session = driver.session();
                    try {
                        // Ensure user node index exists
                        await session.run('CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)');
                        
                        // Create or update user node
                        const result = await session.run(
                            `
                            MERGE (u:User {email: $email})
                            ON CREATE SET 
                                u.id = $id,
                                u.createdAt = datetime(),
                                u.name = $name,
                                u.picture = $picture
                            ON MATCH SET
                                u.lastLogin = datetime(),
                                u.name = $name,
                                u.picture = $picture
                            RETURN u
                            `,
                            {
                                email: profile.email,
                                id: profile.sub || profile.email,
                                name: profile.name || null,
                                picture: profile.picture || null
                            }
                        );
                        
                        const userNode = result.records[0]?.get('u')?.properties;
                        if (!userNode) {
                            throw new Error('Failed to create/update user node');
                        }
                        
                        return true;
                    } finally {
                        await session.close();
                    }
                } catch (error) {
                    log('Error in sign in process:', error);
                    // Rethrow specific errors
                    if (error.message === 'EmailVerification' || error.message === 'AccessDenied') {
                        throw error;
                    }
                    throw new Error('DatabaseError');
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
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.accessToken = token.accessToken;
                session.user.id = token.id;
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
});

export { handler as GET, handler as POST };
