"use client";

import { useState, useRef, useEffect } from "react";
import RotatingText from "./RotatingText";
import { useTranslation } from "@/lib/i18n";

const features = [
  { icon: "⚡", textKey: "scanSpeed" },
  { icon: "🔍", textKey: "patterns" },
  { icon: "🛡️", textKey: "coverage" },
];

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  const initialized = useRef(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMounted(true);
    }
  }, []);

  const getFeatureText = (key: string) => {
    switch (key) {
      case "scanSpeed":
        return t.hero.scanSpeed;
      case "patterns":
        return t.hero.patterns;
      case "coverage":
        return t.hero.coverage;
      default:
        return key;
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-800 via-dark-900 to-dark-900" />

      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-solana-purple/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-solana-green/10 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
        <div
          className={`transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-solana-purple/10 border border-solana-purple/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-solana-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-solana-green" />
            </span>
            <span className="text-sm font-medium text-white/80">
              {t.hero.badge}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <span className="text-white">{t.hero.title} </span>
            <br />
            <span className="bg-gradient-to-r from-solana-purple via-solana-green to-solana-purple bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>
          </h1>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-xl md:text-2xl text-white/60">{t.hero.with}</span>
            <RotatingText />
          </div>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            {t.hero.description
              .replace("{agents}", "9 specialized AI agents")
              .replace("{patterns}", "104 vulnerability patterns")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href="/dashboard"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-solana-purple to-solana-blue text-white font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_40px_rgba(153,69,255,0.4)] hover:scale-105"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {t.hero.startFreeAudit}
              <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <a
              href="/docs/commercial-license.md"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/20 text-white/80 font-medium text-lg hover:bg-white/5 hover:border-white/30 transition-all"
            >
              {t.hero.viewCommercialLicense}
            </a>

            <a
              href="https://github.com/alt-research/SolidityGuard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/20 text-white/80 font-medium text-lg hover:bg-white/5 hover:border-white/30 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {t.hero.viewOnGithub}
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.textKey}
                icon={feature.icon}
                text={getFeatureText(feature.textKey)}
                delay={index * 200}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-900 to-transparent" />
    </section>
  );
}

function FeatureCard({
  icon,
  text,
  delay,
}: {
  icon: string;
  text: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay + 500);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`group relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/10 hover:border-solana-purple/30 hover:shadow-[0_0_30px_rgba(153,69,255,0.1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <p className="text-white/80 font-medium">{text}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-solana-purple/0 via-solana-purple/5 to-solana-green/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
