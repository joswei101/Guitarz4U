import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fraunces';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Analytics, CookieBanner } from '@/components/CookieConsent';
import { ServiceWorker } from '@/components/ServiceWorker';
import { SITE_URL } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Guitarz4U — Second-hand guitars & repairs in Sandringham, Johannesburg',
    template: '%s | Guitarz4U',
  },
  description:
    'Buy honestly described second-hand guitars, sell or give away your guitar, and get guitar repairs in Sandringham, Johannesburg. Collection only. No online payments.',
  applicationName: 'Guitarz4U',
  openGraph: {
    type: 'website',
    siteName: 'Guitarz4U',
    locale: 'en_ZA',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630, alt: 'Guitarz4U — second-hand guitars and repairs' }],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#2B1B12',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <CookieBanner />
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
