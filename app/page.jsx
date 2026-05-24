import { redirect } from "next/navigation";
import HeroSection from "@/components/homePage/HeroSection";
import Features from "@/components/homePage/Features";
import RoiCalculator from "@/components/homePage/RoiCalculator";
import Pricing from "@/components/homePage/Pricing";
import Testimonials from "@/components/homePage/Testimonials";
import CTA from "@/components/homePage/CTA";
import FreeTrial from "@/components/homePage/FreeTrial";

export default async function Home({ searchParams }) {
  // Supabase sometimes lands the PKCE confirmation code on the Site URL root
  // (e.g. when redirect_to falls back to Site URL). Forward it to the callback
  // handler so the code gets exchanged for a session instead of being dropped.
  const params = await searchParams;
  if (params?.code) {
    const next = typeof params.next === "string" ? params.next : "/dashboard";
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(next)}`);
  }

  return (
        <>
            <HeroSection/>
            <Features />
            <RoiCalculator/>
            <Pricing />
            <FreeTrial/>
            <Testimonials />
            <CTA/>
        </>
  );
}
