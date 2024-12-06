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

// Mark as async server component
export default async function RootLayout({ children }) {
  console.log('RootLayout rendering...');

  // Initialize the application only in development
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Calling initialization API...');
      const response = await fetch('http://localhost:3000/api/init');
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Initialization failed:', error);
        // Don't throw, let the app continue loading
      }
    } catch (error) {
      console.error('Failed to call initialization API:', error);
    }
  }

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
