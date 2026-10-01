import type { Metadata, Viewport } from "next";
import { Fredoka, Instrument_Sans, Young_Serif } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "lib/site";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-fredoka", display: "swap" });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-young-serif", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ChipKili - See It. Grab It. Go.", template: "%s | ChipKili" },
  description:
    "Appliances, equipment, electronics and home finds near Teaneck, NJ. Local pickup, delivery available for a fee. New, open box and used.",
  applicationName: "ChipKili",
  icons: { icon: "/brand/face-32.png", apple: "/brand/face-192.png" },
  openGraph: { siteName: "ChipKili", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0B4D1E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${youngSerif.variable} ${instrument.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
