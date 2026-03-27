"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTAFooter() {
  return (
    <div className="h-screen flex flex-col snap-start overflow-hidden">
      {/* CTA band */}
      <section className="relative overflow-hidden bg-neutral py-24 sm:py-32 flex-1 flex items-center">
        {/* Background accents */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="animate-float absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="animate-float-delayed absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-3xl font-bold text-neutral-content sm:text-4xl"
          >
            Ready to Transform Your Clinical Workflow?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-10 text-base leading-relaxed text-neutral-content/70"
          >
            Experience AI-assisted diagnostics that bring together every data
            point into a clear, actionable picture.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/login"
              className="btn btn-primary btn-lg shadow-lg shadow-primary/30 transition-transform duration-200 hover:scale-105"
            >
              Explore MIDAS
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral py-6 border-t border-neutral-content/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-xs text-neutral-content/50 sm:flex-row sm:justify-between">
          <span>MIDAS — Multiple Input Diagnostic Aid System</span>
          <span>
            FAST-NUCES Lahore &middot; Final Year Project
          </span>
        </div>
      </footer>
    </div>
  );
}
