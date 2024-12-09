import { NextResponse } from 'next/server';
import { initialize, getDriver } from '../../../lib/neo4j/api-client';
import debug from 'debug';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';

const log = debug('users:api');

// Force dynamic route to prevent caching
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        // Get the authenticated session
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            log('No valid session found');
            return NextResponse.json(
                { error: 'Unauthorized: No valid session found' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        let body;
        try {
            body = await request.json();
        } catch (error) {
            log('Invalid request body:', error);
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Initialize Neo4j
        log('Initializing Neo4j...');
        await initialize();
        const driver = getDriver();
        
        if (!driver) {
            throw new Error('Failed to get Neo4j driver');
        }
        
        const dbSession = driver.session();
        try {
            // Ensure index exists
            await dbSession.run('CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)');
            
            // Create or update user node
            const result = await dbSession.run(
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
                    u.picture = $picture,
                    u.updatedAt = datetime()
                RETURN u
                `,
                {
                    email: session.user.email,
                    id: session.user.id || session.user.email,
                    name: body.name || session.user.name || null,
                    picture: body.picture || session.user.picture || null
                }
            );
            
            const userNode = result.records[0]?.get('u')?.properties;
            
            if (!userNode) {
                throw new Error('Failed to create/update user node');
            }
            
            return NextResponse.json({ user: userNode });
        } finally {
            await dbSession.close();
        }
    } catch (error) {
        log('Error in user management:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        // Get the authenticated session
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            log('No valid session found');
            return NextResponse.json(
                { error: 'Unauthorized: No valid session found' },
                { status: 401 }
            );
        }

        // Initialize Neo4j
        log('Initializing Neo4j...');
        await initialize();
        const driver = getDriver();
        
        if (!driver) {
            throw new Error('Failed to get Neo4j driver');
        }
        
        const dbSession = driver.session();
        try {
            // Get user node with connected data
            const result = await dbSession.run(
                `
                MATCH (u:User {email: $email})
                OPTIONAL MATCH (u)-[:UPLOADED]->(i:Image)
                WITH u, count(i) as imageCount
                RETURN u {
                    .*, // All user properties
                    imageCount: imageCount,
                    lastActive: u.lastLogin
                } as user
                `,
                { email: session.user.email }
            );
            
            const userNode = result.records[0]?.get('user');
            
            if (!userNode) {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({ user: userNode });
        } finally {
            await dbSession.close();
        }
    } catch (error) {
        log('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
