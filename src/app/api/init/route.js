import { NextResponse } from 'next/server';
import debug from 'debug';
import { initializeApplication } from '@/lib/init/index.js';
import { getInitializationState, setInitializationState, markInitializationFailed, canAttemptInitialization } from '@/lib/init/initCache.js';

const log = debug('app:init:api');

// Force Node.js runtime
export const runtime = 'nodejs';

// Prevent response caching
export const dynamic = 'force-dynamic';

async function handleInitialization(isGet = false) {
    log(`Initialization API called (${isGet ? 'GET' : 'POST'})`);

    try {
        // Check environment
        const env = {
            hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
            nodeEnv: process.env.NODE_ENV,
            cwd: process.cwd()
        };
        log('Environment check:', env);

        // Get current state
        const state = getInitializationState();

        // For GET requests, if already initialized, just return the state
        if (isGet && state.initialized && state.result) {
            return NextResponse.json({
                ...state,
                status: 'success',
                message: 'Already initialized'
            });
        }

        // If initialization was attempted too recently, return current state
        if (!canAttemptInitialization()) {
            log('Initialization attempted too soon, waiting...');
            return NextResponse.json({
                ...state,
                status: state.inProgress ? 'in_progress' : (state.initialized ? 'success' : 'error'),
                message: state.inProgress ? 'Initialization in progress' : (state.initialized ? 'Already initialized' : 'Initialization failed')
            });
        }

        // Check if initialization is already in progress
        if (state.inProgress) {
            return NextResponse.json({
                ...state,
                status: 'in_progress',
                message: 'Initialization already in progress'
            });
        }

        try {
            // Mark initialization as in progress BEFORE starting
            setInitializationState({ 
                inProgress: true,
                initialized: false,
                result: null,
                error: null
            });

            log('Starting initialization...');
            const result = await initializeApplication();

            // Store successful result
            setInitializationState({
                initialized: true,
                inProgress: false,
                result
            });

            return NextResponse.json({
                ...getInitializationState(),
                status: 'success',
                message: 'Initialization complete'
            });
        } catch (error) {
            log('Initialization failed:', error);
            
            // Get the root cause of the error
            const errorMessage = error.cause ? 
                `${error.message} (Caused by: ${error.cause.message || error.cause})` : 
                error.message;
            
            markInitializationFailed(errorMessage);
            
            return NextResponse.json({
                ...getInitializationState(),
                status: 'error',
                message: 'Initialization failed',
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }, { status: 500 });
        }
    } catch (error) {
        // Handle unexpected errors in the route itself
        log('Unexpected error in initialization route:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Internal server error in initialization route',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}

export async function GET() {
    return handleInitialization(true);
}

export async function POST() {
    return handleInitialization(false);
}
