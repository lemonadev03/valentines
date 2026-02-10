import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "For Gaile",
  description: "Will you be my valentine?",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "For Gaile",
    description: "Will you be my valentine?",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Gaile",
    description: "Will you be my valentine?",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="antialiased" style={{ fontFamily: "'Supreme', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
