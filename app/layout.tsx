import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Altaris Capital — Premium Investment Platform',
  description: 'Institutional-grade investment platform. Grow your wealth with AI-powered strategies.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Altaris',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png',  sizes: '32x32' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Altaris" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ background: 'var(--bg-primary)' }}>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme','dark');` }} />
        <ThemeProvider>
          <div className="root-shell">
            {children}
          </div>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
              try {
                const reg = await navigator.serviceWorker.register('/sw.js')
                // If there's a waiting worker, ask it to skip waiting immediately
                if (reg.waiting) {
                  try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }) } catch (e) {}
                }
                reg.addEventListener('updatefound', () => {
                  const installing = reg.installing
                  if (!installing) return
                  installing.addEventListener('statechange', () => {
                    if (installing.state === 'installed') {
                      if (navigator.serviceWorker.controller) {
                        try { installing.postMessage({ type: 'SKIP_WAITING' }) } catch (e) {}
                      }
                    }
                  })
                })
              } catch (err) {}
            });
            // When the active service worker changes, reload to activate the new code
            if (navigator.serviceWorker) {
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                try { window.location.reload() } catch (e) {}
              })
            }
          }
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            window.__pwaPrompt = e;
          });
        `}} />
      </body>
    </html>
  )
}
