import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolGuard | Advanced Solana Program Security Auditor",
  description:
    "The most advanced open-source security auditor for Solana programs. Powered by multi-agent AI, 104 vulnerability patterns, and lightning-fast static analysis. Detect vulnerabilities before they become headlines.",
  keywords: [
    "Solana",
    "security",
    "audit",
    "smart contract",
    "program security",
    "vulnerability detection",
    "DeFi security",
    "Solana auditor",
  ],
  authors: [{ name: "Alt Research" }],
  openGraph: {
    title: "SolGuard | Advanced Solana Program Security Auditor",
    description:
      "The most advanced open-source security auditor for Solana programs. Powered by multi-agent AI and 104 vulnerability patterns.",
    type: "website",
    locale: "en_US",
    siteName: "SolGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolGuard | Advanced Solana Program Security Auditor",
    description:
      "The most advanced open-source security auditor for Solana programs.",
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
