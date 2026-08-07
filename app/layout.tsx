import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const APP_DESCRIPTION =
  "Co-op is the marketplace that connects small businesses with local freelance creatives — photographers, designers, videographers, and more — for paid work. Swipe to discover, match, and book directly. No platform fees, ever.";

export const metadata: Metadata = {
  title: "Co-op — local creatives × small businesses",
  description: APP_DESCRIPTION,
  openGraph: {
    title: "Co-op — local creatives × small businesses",
    description: APP_DESCRIPTION,
    siteName: "Co-op",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Co-op — local creatives × small businesses",
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 pb-24 md:pb-10">{children}</main>
      </body>
    </html>
  );
}
