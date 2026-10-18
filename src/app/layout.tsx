import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer, WhatsAppFloat } from "@/components/layout/footer";
import { PageViewBeacon } from "@/components/layout/page-view";
import { site } from "@/lib/site";
import "./globals.css";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: { default: `${site.name} — Second-hand guitars & guitar repairs in Johannesburg`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", siteName: site.name, locale: "en_ZA", images: [{ url: "/images/og.jpg", width: 1200, height: 630, alt: "Guitarz4U — second-hand guitars and repairs" }] },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans">
        <Header />
        <main id="main" tabIndex={-1} className="outline-none">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <PageViewBeacon />
      </body>
    </html>
  );
}
