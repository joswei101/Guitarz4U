import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/env";
import { BUSINESS } from "@/lib/constants";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { AnalyticsTracker } from "@/components/layout/AnalyticsTracker";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { getSettings } from "@/lib/settings";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Guitarz4U — Second-hand guitars in Johannesburg | Buy, sell & repair",
    template: "%s | Guitarz4U",
  },
  description:
    "Guitarz4U buys and sells quality second-hand guitars in Johannesburg, South Africa — electric, bass, acoustic and classical — and offers personal guitar repairs and setups. Second-hand equipment, first-hand service.",
  applicationName: BUSINESS.name,
  keywords: [
    "second-hand guitars Johannesburg",
    "used guitars South Africa",
    "sell my guitar Johannesburg",
    "guitar repairs Johannesburg",
    "guitar setup Johannesburg",
    "pre-owned guitars",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    siteName: BUSINESS.name,
    url: SITE_URL,
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <html lang="en-ZA" className={`${fraunces.variable} ${workSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only-focusable fixed left-2 top-2 z-[100] rounded bg-ivory px-4 py-2 font-semibold text-walnut"
        >
          Skip to main content
        </a>
        <CartProvider>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <FloatingWhatsApp phone={settings.whatsapp_number} />
        </CartProvider>
        <AnalyticsTracker />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
