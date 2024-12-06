'use client';

import { SessionProvider } from 'next-auth/react';
import dynamic from 'next/dynamic';

const ThemeProvider = dynamic(
  () => import('./ThemeProvider'),
  { ssr: false }
);

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
