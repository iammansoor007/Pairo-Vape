"use client";

import Image from "next/image";

export default function PromiseSection({
  label = "OUR PROMISE",
  title = "UNCOMPROMISING QUALITY, 100% AUTHENTIC VAPES",
  description = "We believe every vaper deserves pure flavor, leak-proof hardware, and lab-tested safety. Every product in our catalog is verified authentic.",
  image = "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80",
  items = [
    { title: "Flavor First", desc: "Formulated for deep, rich taste profiles from first puff to last." },
    { title: "Lab Tested", desc: "Rigorous quality and compliance testing for all e-liquids and disposable hardware." }
  ],
  stats = [
    { label: "ESTABLISHED", value: "2024" },
    { label: "PARTNERS", value: "12+" }
  ]
}) {

  return (
    <section className="py-12 md:py-16">
      <div className="mx-4 md:mx-8">
        <div className="bg-black rounded-[40px] md:rounded-[60px] overflow-hidden relative min-h-[500px] md:min-h-[700px] flex items-center shadow-2xl">
          <div className="absolute inset-0">
            <Image src={image} alt={title} fill className="object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          </div>
          <div className="relative z-10 w-full p-8 md:p-20">
            <div className="max-w-2xl space-y-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-[1.5px] w-8 bg-white/30" />
                  <span className="text-white/90 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase">{label}</span>
                </div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold heading-font text-white uppercase leading-[1.05] tracking-tight max-w-[15ch] md:max-w-none">
                  {title}
                </h2>
              </div>
              <p className="text-white/90 text-lg md:text-xl max-w-xl leading-relaxed font-sans">
                {description}
              </p>
              <div className="grid sm:grid-cols-2 gap-12 pt-12 border-t border-white/20">
                {items.map((item, i) => (
                  <div key={i} className="space-y-4">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">{item.title}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:flex gap-16 pt-8">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className="text-3xl md:text-4xl font-bold heading-font text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
