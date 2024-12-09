import { NextResponse } from 'next/server';
import { findUserById } from '../../../../lib/neo4j/userRepository';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/options';

export async function GET(request) {
    // Handle test mode requests
    if (process.env.NODE_ENV === 'development') {
        const isTestMode = request.headers.get('X-Test-Mode') === 'true';
        const testUserId = request.headers.get('X-Test-User');

        if (isTestMode && testUserId) {
            try {
                const user = await findUserById(testUserId);
                if (!user) {
                    return NextResponse.json({ error: 'Test user not found' }, { status: 404 });
                }

                return NextResponse.json({
                    user,
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
                });
            } catch (error) {
                console.error('Error verifying test session:', error);
                return NextResponse.json(
                    { error: 'Failed to verify test session' },
                    { status: 500 }
                );
            }
        }
    }

    // Handle regular session requests
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json(null);
        }

        return NextResponse.json(session);
    } catch (error) {
        console.error('Error getting session:', error);
        return NextResponse.json(null);
    }
}
