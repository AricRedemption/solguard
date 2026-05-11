"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function UseCases() {
  const [activeTab, setActiveTab] = useState("defi");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const useCasesData = [
    {
      id: "defi",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: t.useCases.defi,
      description: t.useCases.defiDesc,
      features: t.useCases.defiFeatures,
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "nft",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: t.useCases.nft,
      description: t.useCases.nftDesc,
      features: t.useCases.nftFeatures,
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "infrastructure",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
      title: t.useCases.infrastructure,
      description: t.useCases.infraDesc,
      features: t.useCases.infraFeatures,
      color: "from-orange-500 to-red-500",
    },
    {
      id: "gaming",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: t.useCases.gaming,
      description: t.useCases.gamingDesc,
      features: t.useCases.gamingFeatures,
      color: "from-green-500 to-emerald-500",
    },
  ];

  const activeUseCase = useCasesData.find((uc) => uc.id === activeTab)!;

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      <div className="absolute inset-0 bg-dark-900" />

      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-solana-purple/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t.useCases.title}
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {t.useCases.subtitle}
          </p>
        </div>

        <div
          className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {useCasesData.map((useCase) => (
            <button
              key={useCase.id}
              onClick={() => setActiveTab(useCase.id)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                activeTab === useCase.id
                  ? "bg-gradient-to-r from-solana-purple to-solana-blue text-white shadow-[0_0_20px_rgba(153,69,255,0.3)]"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {useCase.title}
            </button>
          ))}
        </div>

        <div
          className={`grid md:grid-cols-2 gap-8 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${activeUseCase.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

            <div className="relative">
              <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${activeUseCase.color} mb-6`}>
                <div className="text-white">
                  {activeUseCase.icon}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-4">
                {activeUseCase.title}
              </h3>

              <p className="text-white/60 mb-6 leading-relaxed">
                {activeUseCase.description}
              </p>

              <ul className="space-y-3">
                {activeUseCase.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-white/80">
                    <svg className="w-5 h-5 text-solana-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-solana-green/20 text-solana-green text-xs font-medium">
              {t.useCases.liveDemo}
            </div>

            <div className="font-mono text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/40">
                  <span className="text-solana-green">$</span>
                  <span>sguard scan ./programs/defi_protocol</span>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-solana-green">✓</span>
                    <div>
                      <span className="text-white">Analyzing program...</span>
                      <span className="text-white/40 animate-pulse">_</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-solana-green">✓</span>
                    <div>
                      <span className="text-white">Running 104 security patterns</span>
                      <div className="ml-8 mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-white/60">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span>SOL-001: Authority check missing</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>SOL-002: Owner validation</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>SOL-003: Reentrancy risk detected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-solana-green">✓</span>
                    <span className="text-white">AI-powered deep analysis</span>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 rounded-lg bg-critical/20 border border-critical/30">
                    <span className="text-critical text-sm font-medium">2 Critical</span>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-high/20 border border-high/30">
                    <span className="text-high text-sm font-medium">1 High</span>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-solana-green/20 border border-solana-green/30">
                    <span className="text-solana-green text-sm font-medium">3 Low</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
