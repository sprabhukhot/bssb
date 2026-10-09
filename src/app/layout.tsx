import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhartiya Sanskritik Sangh, Brno | Community events",
  description:
    "Community events for Bhartiya Sanskritik Sangh, Brno — music, dance, language, and festivals. Preserving and celebrating culture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
