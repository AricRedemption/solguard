"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-dark-900/90 backdrop-blur-xl border border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                className="drop-shadow-[0_0_8px_rgba(153,69,255,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(153,69,255,0.7)] transition-all"
              >
                <path
                  d="M18 3L32 12V24L18 33L4 24V12L18 3Z"
                  fill="url(#shield-gradient)"
                  stroke="#14F195"
                  strokeWidth="1.5"
                />
                <path
                  d="M18 10L14 14V18L18 22L22 18V14L18 10Z"
                  fill="#14F195"
                  opacity="0.9"
                />
                <defs>
                  <linearGradient
                    id="shield-gradient"
                    x1="18"
                    y1="3"
                    x2="18"
                    y2="33"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#9945FF" />
                    <stop offset="1" stopColor="#7B2FBE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 bg-solana-purple/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-solana-purple">Sol</span>
                <span className="text-white">Guard</span>
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#features">{t.nav.features}</NavLink>
            <NavLink href="#security">{t.nav.security}</NavLink>
            <NavLink href="#pricing">{t.nav.pricing}</NavLink>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:flex" />
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-solana-green hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              {t.nav.startAuditing}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-white/70 hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/5 pt-4">
            <div className="flex flex-col gap-4">
              <LanguageSwitcher className="w-full justify-center" />
              <MobileNavLink href="#features" onClick={() => setMobileOpen(false)}>
                {t.nav.features}
              </MobileNavLink>
              <MobileNavLink href="#security" onClick={() => setMobileOpen(false)}>
                {t.nav.security}
              </MobileNavLink>
              <MobileNavLink href="#pricing" onClick={() => setMobileOpen(false)}>
                {t.nav.pricing}
              </MobileNavLink>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-white/60 hover:text-white transition-colors relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-solana-purple to-solana-green group-hover:w-full transition-all duration-300" />
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-base font-medium text-white/70 hover:text-white transition-colors py-2"
    >
      {children}
    </Link>
  );
}
