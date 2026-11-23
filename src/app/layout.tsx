import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TopAnnouncementBanner } from "@/components/announcement-banner";
import { Header } from "@/components/header";
import { PageTransition } from "@/components/page-transition";
import { Providers } from "@/components/providers";
import "./globals.css";
import { VisitorTracker } from "@/components/analytics/visitor-tracker";
import { GlobalAudioPlayer } from "@/components/global-audio-player";
import { LayoutInitializers } from "@/components/layout-initializers";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radheshyam Das Spiritual Discourses",
  description: "Spiritual lectures, commentaries, and wisdom by Radheshyam Das",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icon-512x512.png" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geistSans.variable, "h-full")}
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <head>
        {process.env["NEXT_PUBLIC_SUPABASE_URL"] && (
          <link
            rel="preconnect"
            href={process.env["NEXT_PUBLIC_SUPABASE_URL"]}
            crossOrigin="anonymous"
          />
        )}
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <VisitorTracker />
          <TopAnnouncementBanner />
          <Header />
          <PageTransition>{children}</PageTransition>
          <GlobalAudioPlayer />
          <LayoutInitializers />
        </Providers>
      </body>
    </html>
  );
}
