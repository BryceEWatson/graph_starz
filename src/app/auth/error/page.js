'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const getErrorMessage = (error) => {
        switch (error) {
            case 'AccessDenied':
                return 'You do not have permission to sign in.';
            case 'Verification':
                return 'The sign in link is no longer valid.';
            case 'Configuration':
                return 'There is a problem with the server configuration.';
            case 'OAuthSignin':
                return 'Error in the OAuth sign in process.';
            default:
                return 'An error occurred during authentication.';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Authentication Error
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {getErrorMessage(error)}
                    </p>
                </div>
                <div className="mt-8 space-y-6">
                    <div className="flex justify-center">
                        <Link
                            href="/"
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
