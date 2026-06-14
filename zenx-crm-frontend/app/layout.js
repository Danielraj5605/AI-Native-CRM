'use client';
// app/layout.js

import './globals.css';
import Sidebar from './components/Sidebar';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="ZenX CRM — AI-native marketing platform for D2C fashion brands" />
        <title>ZenX CRM</title>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Desktop sidebar — 220px fixed */}
        <Sidebar />

        {/* Main content — offset by sidebar width on desktop */}
        <main
          style={{
            marginLeft: '220px',
            minHeight: '100vh',
            padding: '0',
          }}
          className="main-content"
        >
          {children}
        </main>

        {/* Mobile: no margin offset */}
        <style>{`
          @media (max-width: 767px) {
            .main-content {
              margin-left: 0 !important;
              padding-top: 60px;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
