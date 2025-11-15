import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Automated YouTube Video Studio",
  description:
    "Generate, render, and publish YouTube videos through an automated pipeline built with Next.js and FFmpeg."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen antialiased bg-slate-950 text-slate-100">
        <div className="relative isolate flex flex-col min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#0f172a,_transparent_60%)]" />
          <main className="flex-1 w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
