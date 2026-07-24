import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Co-op — local creatives × small businesses",
  description: "Newport Beach & Corona del Mar's marketplace connecting small businesses with nearby freelance creatives. No fees, ever.",
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
