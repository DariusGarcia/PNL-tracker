import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily P&L Tracker",
  description: "Track your daily stock profits and losses.",
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
