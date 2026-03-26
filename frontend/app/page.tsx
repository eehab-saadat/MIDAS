"use client";

import { useState } from "react";
import SplashScreen from "@/components/ui/SplashScreen";
import HeroSection from "@/components/features/landing/HeroSection";
import FeaturesSection from "@/components/features/landing/FeaturesSection";
import HowItWorksSection from "@/components/features/landing/HowItWorksSection";
import CTAFooter from "@/components/features/landing/CTAFooter";

export default function Home() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <main className="animate-fade-in h-screen overflow-y-auto snap-y snap-mandatory">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTAFooter />
    </main>
  );
}
