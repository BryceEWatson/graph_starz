import { NextResponse } from 'next/server';
import { requestWhitelistAccess, isEmailWhitelisted } from '@/lib/neo4j/userRepository';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/options';
import debug from 'debug';

const log = debug('auth:whitelist');

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        log('Session data:', {
            user: session?.user,
            providerId: session?.providerId
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { email } = await request.json();
        if (!email || email !== session.user.email) {
            return NextResponse.json(
                { error: 'Invalid email' },
                { status: 400 }
            );
        }

        // Check if already whitelisted
        const isWhitelisted = await isEmailWhitelisted(email);
        if (isWhitelisted) {
            return NextResponse.json({ isWhitelisted: true });
        }

        // Get user ID from session
        const userId = session?.providerId || session?.user?.id;
        if (!userId) {
            log('No user ID found in session');
            return NextResponse.json(
                { error: 'Missing user ID' },
                { status: 400 }
            );
        }

        // Submit whitelist request and create user if needed
        const result = await requestWhitelistAccess({
            id: userId,
            email: session.user.email,
            name: session.user.name,
            image: session.user.image
        });
        
        return NextResponse.json({
            isWhitelisted: result.isWhitelisted,
            user: result.user
        });

    } catch (error) {
        log('Error in whitelist request:', error);
        console.error('Whitelist request error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process whitelist request' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email || email !== session.user.email) {
            return NextResponse.json(
                { error: 'Invalid email' },
                { status: 400 }
            );
        }

        // For non-existent users, return isWhitelisted: null
        // This helps differentiate between pending (false) and not requested (null)
        const isWhitelisted = await isEmailWhitelisted(email);
        return NextResponse.json({ 
            isWhitelisted: isWhitelisted === false ? false : isWhitelisted || null 
        });

    } catch (error) {
        log('Error checking whitelist status:', error);
        return NextResponse.json(
            { error: 'Failed to check whitelist status' },
            { status: 500 }
        );
    }
}
