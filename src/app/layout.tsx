import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { Analytics } from "@/components/Analytics";
import { ServiceWorker } from "@/components/ServiceWorker";
import { env } from "@/lib/env";

// Fonts are downloaded at build time and served from this site (no Google requests from visitors).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600", "700"] });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", display: "swap", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Guitarz4U — Second-hand guitars in Johannesburg",
    template: "%s | Guitarz4U",
  },
  description:
    "Buy and sell second-hand electric, bass, acoustic and classical guitars in Sandringham, Johannesburg. Honest condition reports, guitar repairs and setups. Second-hand equipment, first-hand service.",
  applicationName: "Guitarz4U",
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Guitarz4U",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Guitarz4U — second-hand guitars in Johannesburg" }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#241A16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${fraunces.variable} ${workSans.variable}`}>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
        <WhatsAppFloat />
        <Analytics />
        <ServiceWorker />
      </body>
    </html>
  );
}
