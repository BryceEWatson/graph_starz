'use client'

import Navbar from './Navbar'

export default function ClientLayout({ children }) {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>
      <main className="h-screen">{children}</main>
    </>
  )
}
