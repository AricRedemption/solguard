import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SolGuard",
    template: "%s | SolGuard",
  },
  applicationName: "SolGuard",
  description:
    "AI-powered pre-audit assistant for Solana programs. It helps gather context, evidence, and findings for manual security review.",
  keywords: [
    "Solana",
    "security",
    "audit",
    "pre-audit",
    "smart contract",
    "program security",
    "scanner",
    "vulnerability detection",
    "DeFi security",
    "manual review",
  ],
  authors: [{ name: "Alt Research" }],
  openGraph: {
    title: "SolGuard",
    description:
      "AI-powered pre-audit assistant for Solana programs. It helps gather context, evidence, and findings for manual security review.",
    type: "website",
    locale: "en_US",
    siteName: "SolGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolGuard",
    description:
      "AI-powered pre-audit assistant for Solana programs.",
  },
  icons: {
    icon: [
      {
        url: "/solguard-logo.png",
        type: "image/png",
      },
      {
        url: "/solguard-logo.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen bg-dark-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
