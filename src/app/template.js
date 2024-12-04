'use client';

import { SessionProvider } from 'next-auth/react';
import Navbar from '../components/Navbar';
import ThemeProvider from '../components/ThemeProvider';

export default function Template({ children }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <div className="flex-grow">
                        {children}
                    </div>
                </div>
            </ThemeProvider>
        </SessionProvider>
    );
}
