import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import { BUSINESS } from "@/lib/constants";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Guitarz4U — Second-hand guitars in Johannesburg",
    template: "%s | Guitarz4U",
  },
  description:
    "Guitarz4U buys and sells pre-owned electric, bass, acoustic and classical guitars in Sandringham, Johannesburg, and offers guitar repairs and setups. Second-hand equipment, first-hand service.",
  applicationName: "Guitarz4U",
  keywords: [
    "second-hand guitars Johannesburg",
    "used guitars South Africa",
    "sell my guitar Johannesburg",
    "guitar repairs Johannesburg",
    "guitar setup Johannesburg",
    "pre-owned bass guitar",
    "used acoustic guitar Gauteng",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: "Guitarz4U",
    title: "Guitarz4U — Second-hand guitars in Johannesburg",
    description: BUSINESS.tagline + " Pre-owned guitars, guitar buying and repairs in Sandringham, Johannesburg.",
    images: [{ url: "/images/og-default.jpg", width: 1200, height: 630, alt: "Guitarz4U — second-hand guitars" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
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
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
