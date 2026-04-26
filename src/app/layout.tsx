import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AniAuz",
  description: "Stream the latest and greatest anime online for free. Trending, popular, and seasonal anime all in one place.",
  keywords: "anime, streaming, watch anime, free anime, AniAuz",
  openGraph: {
    title: "AniAuz",
    description: "Stream the latest anime for free",
    type: "website",
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#06060f] text-gray-100 antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
