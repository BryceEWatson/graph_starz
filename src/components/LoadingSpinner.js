'use client';

import { useTheme } from '@/components/ThemeProvider';

export default function LoadingSpinner({ message }) {
    const { isDark } = useTheme();

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDark ? 'border-gray-200' : 'border-gray-900'}`} />
                <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {message || 'Loading...'}
                </p>
            </div>
        </div>
    );
}
