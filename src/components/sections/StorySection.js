"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function StorySection({
  label = "THE JOURNEY",
  title = "DEFINING A NEW STANDARDS OF QUALITY",
  description = "U Vape was born from a simple observation: vapers deserve better flavors and reliable performance. We focus on authentic products, clean e-liquids, and unmatched flavor delivery.",
  image = "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80",
  features = [
    { title: "Authentic Products", desc: "We source only 100% genuine devices and e-liquids directly from certified manufacturers." },
    { title: "Peak Flavor", desc: "Every blend and device is tested to ensure rich flavor density and consistent draw." }
  ]
}) {

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section className="container mx-auto px-2 sm:px-4 md:px-8 py-12 md:py-16">
      <div className="bg-background border border-border rounded-[32px] md:rounded-[40px] shadow-sm overflow-hidden py-16 md:py-24 px-6 md:px-16">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="space-y-10"
          >
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-[1.5px] w-8 bg-foreground/30" />
                <span className="text-foreground/90 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase">{label}</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold heading-font tracking-tighter text-foreground uppercase leading-[1.05] max-w-[15ch] md:max-w-none">
                {title}
              </h2>
            </motion.div>
            <motion.p variants={itemVariants} className="text-foreground/90 text-lg md:text-xl max-w-xl leading-relaxed font-sans">
              {description}
            </motion.p>
            <motion.div variants={itemVariants} className="grid sm:grid-cols-2 gap-8 pt-6">
              {features.map((feature, i) => (
                <div key={i} className="p-8 rounded-3xl bg-secondary border border-border space-y-4 hover:bg-primary transition-all duration-500 group">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-primary group-hover:text-white transition-colors duration-500">{feature.title}</h3>
                  <p className="text-sm text-foreground group-hover:text-white/95 leading-relaxed transition-colors duration-500">{feature.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl"
          >
            <Image src={image} alt={title} fill className="object-cover" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
