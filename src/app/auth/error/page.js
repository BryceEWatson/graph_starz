'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const getErrorMessage = (error) => {
        switch (error) {
            case 'AccessDenied':
                return 'You do not have permission to sign in. Only Gmail accounts are currently supported.';
            case 'Verification':
                return 'The sign in link is no longer valid. Please try signing in again.';
            case 'Configuration':
                return 'There is a problem with the server configuration. Please contact support.';
            case 'OAuthSignin':
                return 'Error in the OAuth sign in process. Please try again.';
            case 'DatabaseError':
                return 'Failed to create or update your user profile. Please try again later.';
            case 'EmailVerification':
                return 'Your email address is not verified. Please verify your email and try again.';
            default:
                return 'An unexpected error occurred during authentication. Please try again later.';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-text dark:text-dark-text">
                        Authentication Error
                    </h2>
                    <p className="mt-2 text-center text-sm text-text-secondary dark:text-dark-text-secondary">
                        {getErrorMessage(error)}
                    </p>
                </div>
                <div className="mt-8 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                        Return to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function AuthError() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Loading...</h2>
                </div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}
