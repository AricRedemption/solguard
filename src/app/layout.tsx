import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolGuard | Evidence-First Solana Pre-Audit Assistant",
  description:
    "Evidence-first pre-audit assistant for Solana programs. It helps gather context, evidence, and findings for manual security review.",
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
    title: "SolGuard | Evidence-First Solana Pre-Audit Assistant",
    description:
      "Evidence-first pre-audit assistant for Solana programs. It helps gather context, evidence, and findings for manual security review.",
    type: "website",
    locale: "en_US",
    siteName: "SolGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolGuard | Evidence-First Solana Pre-Audit Assistant",
    description:
      "Evidence-first pre-audit assistant for Solana programs.",
    creator: "@solguard",
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%239945FF' rx='20' width='100' height='100'/><path fill='%2314F195' d='M50 20L70 35V55L50 70L30 55V35L50 20Z'/></svg>",
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
