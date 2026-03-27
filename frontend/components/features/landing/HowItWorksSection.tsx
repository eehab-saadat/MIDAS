"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Ingest",
    description:
      "Patient demographics, vitals, lab panels, radiology reports, and clinical notes are consolidated from heterogeneous sources into a unified repository.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-8 w-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Process",
    description:
      "Specialized AI agents transcribe clinical notes, extract labs reports via OCR, image processing to medical imaging — each modality handled by domain-specific processing.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-8 w-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z"
        />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Analyze",
    description:
      "Cross-modal correlations surface patterns across data types, producing prioritized differential diagnoses with explainable reasoning chains.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-8 w-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
        />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Decide",
    description:
      "Clinicians receive actionable recommendations, structured documentation, and transparent reasoning — supporting better decisions, faster.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-8 w-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
        />
      </svg>
    ),
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative bg-base-200/50 h-screen flex flex-col justify-center py-12 sm:py-16 snap-start overflow-hidden">
      {/* Heading */}
      <div className="mx-auto mb-16 max-w-2xl px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary"
        >
          How It Works
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl font-bold text-base-content sm:text-4xl"
        >
          From Data to Decision
        </motion.h2>
      </div>

      {/* Timeline */}
      <div ref={ref} className="mx-auto max-w-5xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              custom={i}
              variants={stepVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line (between steps, desktop only) */}
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute left-[calc(50%+32px)] top-8 hidden h-px w-[calc(100%-64px)] md:block">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: i * 0.2 + 0.3,
                      ease: "easeOut",
                    }}
                    className="h-full w-full origin-left bg-primary/20"
                  />
                </div>
              )}

              {/* Icon circle */}
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-base-100 text-primary shadow-md ring-1 ring-base-300">
                {step.icon}
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-content">
                  {step.number}
                </span>
              </div>

              {/* Text */}
              <h3 className="mb-2 text-lg font-semibold text-base-content">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-base-content/60">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
