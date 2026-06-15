'use client';
// app/layout.js

import './globals.css';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="ZenX CRM — AI-native marketing platform for D2C fashion brands" />
        <title>ZenX CRM</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Prevent theme flash on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('zenx-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {/* Desktop sidebar — fixed 224px */}
            <Sidebar />

            {/* Main content area */}
            <main
              style={{
                marginLeft: '224px',
                minHeight: '100vh',
                padding: '0',
                background: 'var(--bg)',
                transition: 'background 0.25s ease',
              }}
              className="main-content"
            >
              {children}
            </main>

            {/* Global toast container */}
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
