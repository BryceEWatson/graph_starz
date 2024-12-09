console.log('=== LAYOUT FILE LOADED ===');

import './globals.css';
import { Inter } from 'next/font/google';
import Providers from '../components/Providers';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Graph Starz',
  description: 'A graph-based image analysis application',
};

export default function RootLayout({ children }) {
  console.log('RootLayout rendering...');

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
