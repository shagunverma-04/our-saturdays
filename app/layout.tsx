import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { AppUIProvider } from "@/components/ui/AppUI";
import { AppGate } from "@/components/auth/AppGate";
import { BottomNav } from "@/components/navigation/BottomNav";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--f-body", display: "swap" });

export const metadata: Metadata = {
  title: "our saturdays",
  description: "Things we want to do together.",
  applicationName: "our saturdays",
  appleWebApp: { capable: true, title: "our saturdays", statusBarStyle: "default" },
  icons: { icon: "/pwa/192", apple: "/pwa/180" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false }, // it's a private world
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="font-sans antialiased">
        <AppUIProvider>
          <AppGate>
            <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(9.5rem+env(safe-area-inset-bottom))] sm:px-8">{children}</div>
            <BottomNav />
          </AppGate>
        </AppUIProvider>
      </body>
    </html>
  );
}
