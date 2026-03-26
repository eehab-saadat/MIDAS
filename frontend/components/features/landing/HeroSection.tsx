"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-base-100 via-base-200 to-base-300 snap-start">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="animate-float absolute left-[10%] top-[15%] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="animate-float-delayed absolute right-[12%] top-[30%] h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />
        <div className="animate-float absolute bottom-[20%] left-[25%] h-56 w-56 rounded-full bg-accent/5 blur-3xl" />
        <div className="animate-float-delayed absolute bottom-[10%] right-[20%] h-72 w-72 rounded-full bg-primary/4 blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Logo with glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-8"
        >
          <div className="animate-glow-pulse absolute inset-0 -m-8 rounded-full bg-primary/10 blur-2xl" />
          <Image
            src="/logo-full.png"
            alt="MIDAS"
            width={420}
            height={140}
            className="relative h-auto w-64 drop-shadow-lg sm:w-80 md:w-[420px]"
            priority
            unoptimized
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="mb-4 max-w-2xl text-lg font-semibold tracking-wide text-base-content/80 sm:text-xl md:text-2xl"
        >
          Multiple Input Diagnostic Aid System
        </motion.h1>

        {/* Sub-copy */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          className="mb-10 max-w-xl text-sm leading-relaxed text-base-content/60 sm:text-base"
        >
          AI-assisted, clinician-centered decision support that integrates
          multimodal patient data into a unified, longitudinal view — reducing
          cognitive load and diagnostic error.
        </motion.p>

        {/* Decorative divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          className="mb-12 h-px w-32 origin-center bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-medium uppercase tracking-widest text-base-content/40">
          Scroll
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="animate-bounce-gentle h-5 w-5 text-base-content/40"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </motion.div>
    </section>
  );
}
