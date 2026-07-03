import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import FeaturesStrip from "../components/FeaturesStrip";
import AboutSection from "../components/AboutSection";
import SystemModules from "../components/SystemModules";
import HowItWorks from "../components/HowItWorks";
import ScreeningTest from "../components/ScreeningTest";
import TeamSection from "../components/TeamSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-green-primary font-sans antialiased p-0 md:p-8 lg:p-[3.125rem] flex flex-col">
      <div className="w-full bg-cream flex-1 overflow-hidden shadow-2xl">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesStrip />
          <AboutSection />
          <SystemModules />
          <HowItWorks />
          <ScreeningTest />
          <TeamSection />
        </main>
      </div>
    </div>
  );
}
