import HeroSection from "@/components/homePage/HeroSection";
import Features from "@/components/homePage/Features";
import RoiCalculator from "@/components/homePage/RoiCalculator";
import Pricing from "@/components/homePage/Pricing";
import Testimonials from "@/components/homePage/Testimonials";
import CTA from "@/components/homePage/CTA";

export default function Home() {
  return (
        <>
            <HeroSection/>
            <Features />
            <RoiCalculator/>
            <Pricing />
            <Testimonials />
            <CTA/>
        </>
  );
}
