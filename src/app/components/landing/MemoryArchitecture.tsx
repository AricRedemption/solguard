"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function MemoryArchitecture() {
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

  const layers = [
    {
      id: "orchestration",
      name: t.architecture.orchestration,
      description: t.architecture.orchestrationDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      color: "border-solana-purple",
      bgColor: "bg-solana-purple/10",
    },
    {
      id: "agent",
      name: t.architecture.agent,
      description: t.architecture.agentDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "border-solana-blue",
      bgColor: "bg-solana-blue/10",
    },
    {
      id: "knowledge",
      name: t.architecture.knowledge,
      description: t.architecture.knowledgeDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      color: "border-solana-green",
      bgColor: "bg-solana-green/10",
    },
    {
      id: "tools",
      name: t.architecture.tools,
      description: t.architecture.toolsDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "border-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  const tools = [
    { name: t.architecture.staticAnalysis, tools: ["Slither", "Aderyn", "Semgrep"] },
    { name: t.architecture.symbolicExecution, tools: ["Mythril", "Manticore"] },
    { name: t.architecture.fuzzing, tools: ["Echidna", "Medusa", "Foundry"] },
    { name: t.architecture.formalVerification, tools: ["Halmos", "Certora"] },
  ];

  return (
    <section
      id="security"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-800 to-dark-900" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t.architecture.title}
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {t.architecture.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`relative p-6 rounded-2xl bg-white/5 border ${layer.color} backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:shadow-lg group ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 ${layer.bgColor} opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl`} />

              <div className="relative">
                <div className={`inline-flex p-3 rounded-xl ${layer.bgColor} mb-4`}>
                  <div className="text-white">
                    {layer.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">
                  {layer.name}
                </h3>

                <p className="text-sm text-white/60">
                  {layer.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h3 className="text-xl font-bold text-white mb-6">
            {t.architecture.integratedTools}
          </h3>

          <div className="grid md:grid-cols-4 gap-6">
            {tools.map((category) => (
              <div key={category.name}>
                <h4 className="text-sm font-medium text-white/40 mb-3 uppercase tracking-wider">
                  {category.name}
                </h4>
                <div className="space-y-2">
                  {category.tools.map((tool) => (
                    <div
                      key={tool}
                      className="px-3 py-2 rounded-lg bg-white/5 text-white/80 text-sm font-mono hover:bg-white/10 transition-colors"
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`mt-12 grid md:grid-cols-3 gap-6 transition-all duration-700 delay-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-solana-purple/20 to-transparent border border-solana-purple/20">
            <div className="text-3xl font-bold text-white mb-2">104</div>
            <div className="text-sm text-white/60">{t.architecture.vulnPatterns}</div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-solana-purple to-solana-blue rounded-full" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-solana-green/20 to-transparent border border-solana-green/20">
            <div className="text-3xl font-bold text-white mb-2">7.4s</div>
            <div className="text-sm text-white/60">{t.architecture.avgScanTime}</div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-solana-green to-cyan-400 rounded-full" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20">
            <div className="text-3xl font-bold text-white mb-2">100%</div>
            <div className="text-sm text-white/60">{t.architecture.ctfCoverage}</div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-solana-purple/30 to-transparent" />
    </section>
  );
}
