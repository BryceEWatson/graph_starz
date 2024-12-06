import { NextResponse } from 'next/server';
import { initializeApplication } from '../../../lib/init/index.js';
import { shouldInitialize, setInitialized } from '../../../lib/init/state.js';
import debug from 'debug';

const log = debug('app:init:api');

// Force Node.js runtime
export const runtime = 'nodejs';

// Prevent response caching
export const dynamic = 'force-dynamic';

export async function GET() {
    log('Initialization API called');
    console.log('Environment check:', {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd()
    });
    
    const shouldInit = await shouldInitialize();
    if (!shouldInit) {
        log('Initialization not needed');
        return NextResponse.json({ status: 'Initialization not needed' });
    }

    try {
        log('Starting initialization...');
        await initializeApplication();
        await setInitialized(true);  // Handle async setInitialized
        log('Initialization successful');
        return NextResponse.json({ status: 'Initialization successful' });
    } catch (error) {
        log('Failed to initialize application: %O', error);
        console.error('Failed to initialize application:', error);
        return NextResponse.json(
            { error: 'Failed to initialize application', details: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}
