"use client";

import React, { useState, useEffect } from "react";
import {hasEnvVars} from "@/lib/utils";
import {EnvVarWarning} from "@/components/env-var-warning";
import {AuthButton} from "@/components/auth-button";
import Link from "next/link";
import Image from "next/image";
import {usePathname} from "next/navigation";
import DashboardHeader from "@/components/layout/DashboardHeader";
import { createClient } from "@/lib/supabase/client";

const AppHeader = () => {
    const [menuActive, setMenuActive] = useState(false);
    // Hide "Start Free Trial" for logged-in users who already bought a plan
    // (profiles.company_id is set). Guests + plan-less users still see it.
    const [hasPlan, setHasPlan] = useState(false);
    const [claims, setClaims] = useState(100);
    const [value, setValue] = useState(5000);
    const [team, setTeam] = useState(5);
    const [roi, setROI] = useState({
        timeSaved: 0,
        additionalRevenue: 0,
        laborSavings: 0,
        monthlyROI: 0,
    });

    const pathname = usePathname();

    // Determine whether the logged-in user already has a plan (company_id).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || cancelled) return;
                const { data: profile } = await supabase
                    .from('profiles').select('company_id').eq('id', user.id).single();
                if (!cancelled) setHasPlan(!!profile?.company_id);
            } catch { /* ignore — default keeps the button visible */ }
        })();
        return () => { cancelled = true; };
    }, []);


    // Toggle menu
    const toggleMenu = () => {
        setMenuActive(!menuActive);
        document.body.style.overflow = !menuActive ? "hidden" : "";
    };

    // ROI Calculation
    useEffect(() => {
        const timeSaved = claims * 2.5;
        const additionalRevenue = claims * value * 0.34 * 0.08;
        const laborSavings = team * 20 * 8 * 20; // $20/hour, 8 hours/week, 4 weeks
        const monthlyROI = Math.round(
            ((additionalRevenue + laborSavings - 350) / 350) * 100
        );

        setROI({
            timeSaved: Math.round(timeSaved),
            additionalRevenue: Math.round(additionalRevenue),
            laborSavings: Math.round(laborSavings / 12),
            monthlyROI,
        });
    }, [claims, value, team]);

    // Smooth scrolling
    /*useEffect(() => {
        const handleSmoothScroll = (e) => {
            e.preventDefault();
            const target = document.querySelector(e.target.getAttribute("href"));
            if (target) target.scrollIntoView({ behavior: "smooth" });
        };

        const links = document.querySelectorAll(".nav-link, .mobile-nav-link");
        links.forEach((link) => link.addEventListener("click", handleSmoothScroll));

        return () => {
            links.forEach((link) =>
                link.removeEventListener("click", handleSmoothScroll)
            );
        };
    }, []);*/

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && menuActive) toggleMenu();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [menuActive]);

    // Skip the marketing-site header on app + public-portal routes — those
    // pages render their own chrome. /portal/* is the homeowner-facing
    // token portal which must look standalone (white-labelled to the
    // contractor, not co-branded with ClaimKing).
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/portal")){
        return null
    }

    return (
        <div>
            {/* SVG Gradient */}
            <svg width="0" height="0">
                <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#FDB813" }} />
                        <stop offset="100%" style={{ stopColor: "#d4a000" }} />
                    </linearGradient>
                </defs>
            </svg>

            {/* Navigation */}
            <nav className="navbar">
                <div className="nav-container">
                    <Link href="/">
                        <div className="logo flex items-center">
                            <Image src="/claimking_logo.png" alt="ClaimKing" width={50} height={50} priority style={{ height: 50, width: 'auto' }} />
                            <span className="text-black uppercase">ClaimKing</span>
                        </div>
                    </Link>


                    <div className="nav-links">
                        <a href="#features" className="nav-link">
                            Features
                        </a>
                        <a href="#pricing" className="nav-link">
                            Pricing
                        </a>
                        <a href="#roi" className="nav-link">
                            ROI Calculator
                        </a>
                        <a href="#testimonials" className="nav-link">
                            Testimonials
                        </a>
                        <a href="#contact" className="nav-link">
                            Contact
                        </a>
                    </div>

                    <div className="nav-cta">
                        {/*<button className="btn btn-secondary">Sign In</button>*/}
                        {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
                        {!hasPlan && <Link href='/plans' className="btn btn-primary">Start Free Trial</Link>}
                        <button
                            className={`hamburger ${menuActive ? "active" : ""}`}
                            onClick={toggleMenu}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${menuActive ? "active" : ""}`}
                onClick={toggleMenu}
            ></div>

            {/* Mobile Menu */}
            <div className={`mobile-menu ${menuActive ? "active" : ""}`}>
                <div className="mobile-menu-content">
                    <div className="mobile-menu-header">
                        <div className="mobile-menu-logo">
                            <Image src="/claimking_logo.png" alt="ClaimKing.AI" width={32} height={32} style={{ height: 32, width: 'auto' }} />
                            <span className="mobile-menu-logo-text">ClaimKing.AI</span>
                        </div>
                        <div className="mobile-menu-tagline">
                            AI-Powered Claims Management
                        </div>
                    </div>

                    <div className="mobile-nav-links">
                        {[
                            { href: "#features", icon: "🚀", text: "Features" },
                            { href: "#pricing", icon: "💎", text: "Pricing" },
                            { href: "#roi", icon: "📊", text: "ROI Calculator" },
                            { href: "#testimonials", icon: "⭐", text: "Testimonials" },
                            { href: "#contact", icon: "📞", text: "Contact" },
                        ].map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="mobile-nav-link"
                                onClick={toggleMenu}
                            >
                                <span className="mobile-nav-icon">{item.icon}</span>
                                {item.text}
                            </a>
                        ))}
                    </div>

                    <div className="mobile-cta">

                        {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
                        {!hasPlan && (
                            <Link href='/plans' className="btn btn-secondary" onClick={toggleMenu}>
                                Start Free Trial
                            </Link>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className="mobile-contact">
                        <div className="mobile-contact-title">Contact Info</div>
                        <div className="mobile-contact-item">
                            <a href="tel:1-888-CLAIMKING">📞 1-888-CLAIMKING</a>
                        </div>
                        <div className="mobile-contact-item">
                            <a href="mailto:support@claimking.ai">📧 support@claimking.ai</a>
                        </div>
                        <div className="mobile-contact-item">📍 Available Nationwide</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppHeader;

