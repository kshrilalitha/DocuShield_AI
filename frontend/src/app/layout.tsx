import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuShield AI - Underwriting Document Fraud Detection Platform",
  description: "Detect document tampering, AI-generated forgery, metadata anomalies, and loan underwriting fraud in real time for banks.",
  keywords: "fintech, cybersecurity, AI underwriting, loan fraud, error level analysis, Canara bank",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-primary text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
