import type { Metadata, Viewport } from "next";
import { Public_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nutria Systems",
    template: "%s | Nutria Systems",
  },
  description:
    "PWA mobile-first para ventas, caja diaria y reportes de una heladería con Supabase.",
  applicationName: "Nutria Systems",
  manifest: "/manifest.webmanifest",
  category: "business",
  keywords: [
    "nutria systems",
    "heladería",
    "ventas",
    "caja diaria",
    "supabase",
    "pwa",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nutria Systems",
  },
  icons: {
    icon: [{ url: "/logoo.png", type: "image/png" }],
    apple: [{ url: "/logoo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#fff6eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${headingFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
