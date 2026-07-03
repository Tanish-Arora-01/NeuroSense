export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-cream pt-16 pb-14 md:pt-24 md:pb-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="order-2 lg:order-1">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-green-primary md:text-base">
              AI-Powered Cognitive Health
            </p>
            <h1 className="max-w-3xl text-[2.9rem] font-bold leading-[1.08] text-gray-900 sm:text-6xl lg:text-[4.4rem]">
              Early detection for a{" "}
              <span className="font-serif italic text-green-primary">
                better tomorrow.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-gray-600 md:text-xl">
              We bring AI-powered dementia screening to your home. Complete
              interactive tests and voice analysis from any device - no clinic
              visit required.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#assessment"
                className="inline-flex items-center gap-2 rounded-full bg-green-primary px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-green-dark"
              >
                Start Cognitive Test
                <span aria-hidden="true" className="text-base leading-none">
                  &rarr;
                </span>
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-full border-2 border-green-primary px-8 py-4 text-base font-semibold text-green-primary transition-colors hover:bg-green-primary hover:text-white"
              >
                Learn How It Works
              </a>
            </div>
          </div>

          <div className="relative order-1 flex justify-center lg:order-2">
            <div className="relative w-full max-w-[38rem]">
              <div className="absolute inset-x-[14%] top-[7%] bottom-[3%] rounded-t-full rounded-b-[2.25rem] bg-green-light" />
              <div className="absolute inset-x-[22%] bottom-[9%] h-[28%] rounded-t-full bg-green-primary/15" />
              <div className="absolute right-[14%] bottom-[4%] left-[18%] h-10 rounded-[100%] bg-green-dark/15 blur-md" />
              <img
                src="/brain.png"
                alt="Friendly brain health assistant"
                className="relative z-10 mx-auto w-[94%] max-w-[35rem] object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
