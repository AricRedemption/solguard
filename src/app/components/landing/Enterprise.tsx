"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function Enterprise() {
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

  const features = [
    {
      title: t.enterprise.dashboard,
      description: t.enterprise.dashboardDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: t.enterprise.cicd,
      description: t.enterprise.cicdDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      title: t.enterprise.support,
      description: t.enterprise.supportDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: t.enterprise.customRules,
      description: t.enterprise.customRulesDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: t.enterprise.team,
      description: t.enterprise.teamDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: t.enterprise.api,
      description: t.enterprise.apiDesc,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-24 overflow-hidden"
    >
      <div className="absolute inset-0 bg-dark-900" />

      <div className="absolute inset-0">
        <div className="absolute bottom-1/2 left-1/4 w-[600px] h-[600px] bg-solana-blue/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t.enterprise.title}
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {t.enterprise.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-solana-purple/30 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex p-3 rounded-xl bg-solana-purple/10 mb-4 group-hover:bg-solana-purple/20 transition-colors">
                <div className="text-solana-purple">
                  {feature.icon}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                {feature.title}
              </h3>

              <p className="text-sm text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`mt-16 p-8 rounded-3xl bg-gradient-to-br from-solana-purple/20 via-dark-800 to-solana-blue/20 border border-solana-purple/20 backdrop-blur-sm transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t.enterprise.customSolution}
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                {t.enterprise.customSolutionDesc}
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="mailto:security@solguard.io"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-solana-purple text-white font-medium hover:bg-solana-purple/90 transition-colors"
                >
                  {t.enterprise.contactSales}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
                >
                  {t.enterprise.tryNow}
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <div className="font-medium text-white">{t.enterprise.socCompliant}</div>
                  <div className="text-sm text-white/60">{t.enterprise.enterpriseGrade}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-solana-green to-cyan-400 flex items-center justify-center text-white font-bold">
                  24
                </div>
                <div>
                  <div className="font-medium text-white">{t.enterprise.support247}</div>
                  <div className="text-sm text-white/60">{t.enterprise.alwaysAvailable}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-medium text-white">{t.enterprise.slaGuaranteed}</div>
                  <div className="text-sm text-white/60">{t.enterprise.uptime}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
