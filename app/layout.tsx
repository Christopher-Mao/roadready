import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoadReady - Know who's road-ready. Every day.",
  description: "Compliance command center for fleet management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
