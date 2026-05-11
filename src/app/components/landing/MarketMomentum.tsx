"use client";

import { useEffect, useState, useRef } from "react";

const stats = [
  { value: "10K+", label: "Programs Audited" },
  { value: "104", label: "Vulnerability Patterns" },
  { value: "$2.5B+", label: "TVL Protected" },
  { value: "7.4s", label: "Avg Scan Time" },
];

const logos = [
  { name: "Marinade", color: "text-blue-400" },
  { name: "Jupiter", color: "text-purple-400" },
  { name: "Raydium", color: "text-cyan-400" },
  { name: "Solend", color: "text-orange-400" },
  { name: "Phantom", color: "text-purple-500" },
  { name: "Backpack", color: "text-blue-500" },
];

export default function MarketMomentum() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section
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
            Trusted by the Solana Ecosystem
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Join leading DeFi protocols and infrastructure teams using SolGuard
            to secure their programs
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              {...stat}
              delay={index * 100}
              isVisible={isVisible}
            />
          ))}
        </div>

        <div
          className={`transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-center text-sm font-medium text-white/40 uppercase tracking-wider mb-8">
            Trusted by teams building on Solana
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {logos.map((logo) => (
              <div
                key={logo.name}
                className={`text-2xl font-bold ${logo.color} opacity-50 hover:opacity-80 transition-opacity`}
              >
                {logo.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-solana-purple/30 to-transparent" />
    </section>
  );
}

function StatCard({
  value,
  label,
  delay,
  isVisible,
}: {
  value: string;
  label: string;
  delay: number;
  isVisible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
    const hasB = value.includes("B");
    const hasK = value.includes("K");

    let target: number;
    if (hasB) target = numericValue * 1000000000;
    else if (hasK) target = numericValue * 1000;
    else target = numericValue;

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(interval);
        } else {
          setCount(current);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, value, delay]);

  const displayValue = () => {
    const hasPlus = value.includes("+");
    const hasB = value.includes("B");
    const hasK = value.includes("K");

    if (hasB) return `$${(count / 1000000000).toFixed(1)}B`;
    if (hasK) return `${Math.round(count / 1000)}K`;
    return `${Math.round(count)}${hasPlus ? "+" : ""}`;
  };

  return (
    <div
      className={`text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:border-solana-purple/30 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent mb-2">
        {displayValue()}
      </div>
      <div className="text-sm font-medium text-white/60">{label}</div>
    </div>
  );
}
