"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ProductProcessSection() {
  const [process, setProcess] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProcess() {
      try {
        const res = await fetch("/api/product-process");
        if (res.ok) {
          const data = await res.json();
          if (data && data.steps && data.steps.length > 0) {
            setProcess(data);
          }
        }
      } catch (err) {
        console.error("Error loading process section:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProcess();
  }, []);

  if (loading || !process) return null;

  return (
    <section className="py-8 md:py-12 bg-white border-t border-black/5">
      <div className="container mx-auto px-2 sm:px-4 md:px-8">
        <div className="space-y-8 md:space-y-10">

          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center bg-black text-white px-3 py-1 rounded-full mx-auto"
            >
              <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase">
                {process.subtitle || "The Craftsmanship Behind U Vape"}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-[16px] md:text-[22px] font-medium heading-font uppercase tracking-wider text-black leading-tight"
            >
              {process.title}
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-12 h-[1.5px] bg-black/20 mx-auto"
            />
          </div>

          {/* Alternating Steps Timeline */}
          <div className="relative">

            {/* Vertical timeline line for desktop */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/5 -translate-x-1/2 hidden lg:block" />

            <div className="space-y-10 md:space-y-14 lg:space-y-16">
              {process.steps.map((step, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <div
                    key={step.id || idx}
                    className={`flex flex-col lg:flex-row items-center gap-6 md:gap-12 relative ${isEven ? "" : "lg:flex-row-reverse"
                      }`}
                  >

                    {/* Timeline Node */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-7 h-7 rounded-full border border-black/10 bg-white items-center justify-center font-mono text-[9px] font-bold hidden lg:flex">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>

                    {/* Step Image */}
                    <div className="w-full lg:w-1/2">
                      <motion.div
                        initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[3/2] overflow-hidden bg-black/5 rounded-xl group shadow-sm"
                      >
                        <img
                          src={step.image}
                          alt={step.heading}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60" />
                      </motion.div>
                    </div>

                    {/* Step Content */}
                    <div className={`w-full lg:w-1/2 space-y-3 ${isEven ? "lg:pl-6" : "lg:pr-6"}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-black border border-black/20 px-2.5 py-0.5 rounded-full lg:hidden">
                            Step {idx + 1}
                          </span>
                          {step.subheading && (
                            <span className="inline-flex items-center bg-black text-white px-2.5 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]">
                              {step.subheading}
                            </span>
                          )}
                        </div>

                        <h3 className="text-[12px] md:text-[18px] font-medium heading-font uppercase tracking-wider text-black leading-tight">
                          {step.heading}
                        </h3>

                        <p className="text-black/65 text-sm leading-relaxed font-normal tracking-wide">
                          {step.description}
                        </p>
                      </motion.div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
