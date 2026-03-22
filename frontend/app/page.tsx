"use client";

import SplashScreen from "@/components/ui/SplashScreen";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleSplashFinish = () => {
    router.push("/login");
  };

  return (
    <>
      <SplashScreen onFinish={handleSplashFinish} />
    </>
  );
}
