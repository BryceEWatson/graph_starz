'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';

export default function Navbar() {
    const { data: session, status } = useSession();
    const { theme, toggleTheme } = useTheme();
    const loading = status === 'loading';

    return (
        <header className="w-full bg-background dark:bg-dark-background shadow-md">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-text dark:text-dark-text">Graph Starz</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-background-paper dark:bg-dark-background-paper text-text dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? '🌞' : '🌙'}
                        </button>
                        {loading ? (
                            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        ) : !session ? (
                            <button
                                onClick={() => signIn('google')}
                                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Sign In
                            </button>
                        ) : (
                            <div className="flex items-center space-x-4">
                                {session.user?.image ? (
                                    <div className="relative h-8 w-8">
                                        <Image
                                            src={session.user.image}
                                            alt={session.user.name || 'User avatar'}
                                            fill
                                            className="rounded-full object-cover"
                                            sizes="32px"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {(session.user?.name || session.user?.email || '?').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <button
                                    onClick={() => signOut()}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
