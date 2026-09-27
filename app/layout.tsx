import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Legalbotassistend",
  description: "Source-driven legal news agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
