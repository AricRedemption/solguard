"use client";

import {
  Header,
  Hero,
  MarketMomentum,
  UseCases,
  MemoryArchitecture,
  Enterprise,
  FinalCTA,
  Footer,
} from "./components/landing";

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-900">
      <Header />
      <Hero />
      <MarketMomentum />
      <UseCases />
      <MemoryArchitecture />
      <Enterprise />
      <FinalCTA />
      <Footer />
    </main>
  );
}
