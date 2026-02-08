import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valentine's",
  description: "Enter the password",
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
