import Navbar from "../Navbar";
import HeroSection from "../HeroSection";
import FeaturesSection from "../FeaturesSection";
import HowItWorks from "../HowItWorks";
import StatsBar from "../StatsBar";
import CTASection from "../CTASection";
import Footer from "../Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
