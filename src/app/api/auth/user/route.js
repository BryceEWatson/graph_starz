import { NextResponse } from 'next/server';
import { createUser, findUserById } from '../../../../lib/neo4j/userRepository';

export async function POST(request) {
    // Only allow test mode in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Test mode not available in production' }, { status: 403 });
    }

    const isTestMode = request.headers.get('X-Test-Mode') === 'true';
    if (!isTestMode) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    try {
        const userData = await request.json();
        
        // Check if user already exists
        const existingUser = await findUserById(userData.id);
        if (existingUser) {
            return NextResponse.json(existingUser);
        }

        // Create new test user
        const newUser = await createUser({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            image: userData.image,
            isTestUser: true
        });

        return NextResponse.json(newUser);
    } catch (error) {
        console.error('Error creating test user:', error);
        return NextResponse.json(
            { error: 'Failed to create test user' },
            { status: 500 }
        );
    }
}
