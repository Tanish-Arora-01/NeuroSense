import {
  BrainCircuit,
  Mic2,
  BarChart3,
  Layers,
  LayoutDashboard,
  MapPin,
} from "lucide-react";

const modules = [
  {
    icon: BrainCircuit,
    title: "Cognitive Assessment",
    desc: "Memory, attention, and problem-solving tests designed to evaluate multiple cognitive domains.",
  },
  {
    icon: Mic2,
    title: "Speech Processing",
    desc: "Records voice samples via microphone to analyze pauses, pitch, and speech patterns.",
  },
  {
    icon: BarChart3,
    title: "ML Risk Prediction",
    desc: "Classifies dementia risk using ensemble ML models and generates a 0-100% confidence score.",
  },
  {
    icon: Layers,
    title: "Stage Classification",
    desc: "Optional prediction of dementia progression stage to guide clinical follow-ups.",
  },
  {
    icon: LayoutDashboard,
    title: "Result Dashboards",
    desc: "Graphical display of scores and historical trends so patients and caregivers can track progress.",
  },
  {
    icon: MapPin,
    title: "Specialist Recommendations",
    desc: "Suggests nearby neurologists and specialists using your location data.",
  },
];

export default function SystemModules() {
  return (
    <section className="bg-white py-14 md:py-24">
      <div id="features" className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-12">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Our system{" "}
            <span className="font-serif italic text-green-primary">
              modules
            </span>
          </h2>
          <p className="mt-4 leading-relaxed text-gray-600">
            A comprehensive set of tools built to screen, classify, and guide -
            all in one seamless experience.
          </p>
        </div>

        <div className="divide-y divide-green-primary/10 sm:grid sm:grid-cols-2 sm:gap-6 sm:divide-y-0 lg:grid-cols-3">
          {modules.map((m) => (
            <div
              key={m.title}
              className="flex gap-4 py-4 transition-transform sm:flex-col sm:gap-4 sm:rounded-2xl sm:bg-green-dark sm:p-7 sm:hover:scale-[1.02]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-light sm:h-12 sm:w-12 sm:bg-white/10">
                <m.icon className="h-5 w-5 text-green-primary sm:h-6 sm:w-6 sm:text-green-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 sm:text-lg sm:text-white">
                  {m.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500 sm:mt-0 sm:text-gray-300">
                  {m.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
