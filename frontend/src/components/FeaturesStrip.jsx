import { BrainCircuit, AudioWaveform, ShieldCheck, Globe } from "lucide-react";

const features = [
  {
    icon: BrainCircuit,
    title: "Interactive Tests",
    desc: "Memory and attention assessment",
  },
  {
    icon: AudioWaveform,
    title: "Voice Analysis",
    desc: "Extracts speech features for ML processing",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    desc: "Anonymized patient data and encrypted storage",
  },
  {
    icon: Globe,
    title: "Accessible Anywhere",
    desc: "Affordable web‑based screening",
  },
];

export default function FeaturesStrip() {
  return (
    <section className="bg-cream py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center rounded-2xl border border-green-primary/10 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-lg sm:p-6"
            >
              <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-green-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {f.title}
              </h3>
              <p className="text-gray-500 text-xs md:text-sm mt-1 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
