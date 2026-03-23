"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeState, setFadeState] = useState<"visible" | "fading-out">(
    "visible",
  );

  const handleVideoEnded = () => {
    // Start fading out when the video finishes
    setFadeState("fading-out");
    setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 700); // Wait for the fade-out CSS transition to complete
  };

  if (!isVisible) return null;

  const opacityClass = fadeState === "visible" ? "opacity-100" : "opacity-0";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-base-300 transition-opacity duration-700 ease-in-out ${opacityClass}`}
    >
      <div className="flex flex-col items-center justify-center w-full max-w-sm px-6">
        {/* Replace your static image with the video. Place 'logo.mp4' in frontend/public */}
        <video
          src="/logo.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
