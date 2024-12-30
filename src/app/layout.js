import './globals.css'
import { Inter } from 'next/font/google'
import Providers from '../components/Providers'
import Navbar from '../components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Graph Starz',
  description: 'A graph-based image analysis application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="dark" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="fixed top-0 left-0 right-0 z-50">
            <Navbar />
          </div>
          <main className="h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
