import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { analyzeImage } from '../../../../lib/image/imageAnalyzer';
import { saveImageData } from '../../../../lib/neo4j/imageRepository';

// Force Node.js runtime
export const runtime = 'nodejs';

// Define auth options inline to avoid circular dependencies
const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account && profile) {
                token.id = profile.sub || profile.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
            }
            return session;
        }
    }
};

export async function POST(request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        console.log('Session:', JSON.stringify(session, null, 2));
        
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('User ID:', session.user.sub || session.user.id);
        console.log('Full user object:', JSON.stringify(session.user, null, 2));

        // Get the file from the request
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // First, convert to WebP and get base64 for analysis
        const processFormData = new FormData();
        processFormData.append('file', file);
        processFormData.append('skipGCS', 'true'); // Skip GCS upload initially
        
        const processResponse = await fetch(new URL('/api/images/process', request.url), {
            method: 'POST',
            body: processFormData,
        });

        if (!processResponse.ok) {
            throw new Error(`Failed to process image: ${processResponse.statusText}`);
        }

        const processedData = await processResponse.json();

        // Get the full-size image for analysis
        const fullSizeImage = processedData.images.find(img => img.size === 'full');
        if (!fullSizeImage) {
            throw new Error('Failed to get full-size processed image');
        }

        // Analyze the image with Anthropic
        console.log('Analyzing image with Anthropic...');
        const analysis = await analyzeImage(fullSizeImage.data, 'image/webp');
        console.log('Analysis complete:', analysis);

        // Now upload to GCS with the AI-generated title
        console.log('Uploading to GCS with AI title...');
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('title', analysis.title);
        
        const uploadResponse = await fetch(new URL('/api/images/process', request.url), {
            method: 'POST',
            body: uploadFormData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
        }

        const uploadedData = await uploadResponse.json();
        console.log('Upload complete:', uploadedData);

        // Save everything to Neo4j
        const savedImage = await saveImageData(
            {
                ...uploadedData,
                images: uploadedData.images.map(img => ({
                    ...img,
                    data: undefined // Don't store base64 data in Neo4j
                }))
            },
            analysis,
            session.user.sub || session.user.id
        );

        return NextResponse.json({
            id: savedImage.id,
            isNew: savedImage.isNew,
            title: analysis.title
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image', details: error.message },
            { status: 500 }
        );
    }
}
