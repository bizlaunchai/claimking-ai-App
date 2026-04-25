"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    MapPin,
    Phone,
    Sparkles,
    Building2,
    X,
    Briefcase,
    Loader2
} from "lucide-react";
import FileUploader from "@/utiles/FileUploader.jsx";


export default function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(true);
    const [businessName, setBusinessName] = useState("");
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [logoFiles, setLogoFiles] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    const handleOnboarding = async (e) => {
        e.preventDefault();
        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user session found.");

            const logoUrl = logoFiles.length > 0 ? logoFiles[0].url : null;

            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    business_name: businessName,
                    address: address,
                    phone: phone,
                    business_logo: logoUrl,
                })
                .eq("id", user.id);

            if (updateError) throw updateError;

            setIsOpen(false);
           window.location.href = "/dashboard";
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = async () => {
        setIsOpen(false);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop: ঝাপসা ব্যাকগ্রাউন্ড */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-[900px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">

                {/* Top Border Accent */}
                <div className="h-2 w-full bg-gradient-to-r from-yellow-400 via-yellow-600 to-yellow-400" />

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute right-5 top-5 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10 text-gray-500 hover:text-black"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 md:p-12">
                    <div className="space-y-10">

                        {/* Header */}
                        <div className="text-center space-y-3">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white">
                                    C
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900">Setup Your Profile</h2>
                                <p className="text-gray-500 text-sm sm:text-base mt-1">
                                    Finalize your business details for <span className="font-bold text-yellow-600 italic">ClaimKing.AI</span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleOnboarding} className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 border border-gray-100 p-6 md:p-8 rounded-[2.5rem] bg-gray-50/50 relative overflow-hidden">

                                {/* Background Decoration */}
                                <Briefcase className="absolute -right-10 -bottom-10 w-48 h-48 text-gray-200/30 -rotate-12 pointer-events-none" />

                                {/* Left Column: Inputs */}
                                <div className="space-y-6 relative z-1">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold flex items-center gap-2 text-gray-700 ml-1">
                                            <Building2 className="w-4 h-4 text-yellow-600" /> Business Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="ClaimKing Solutions"
                                            required
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-gray-900"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold flex items-center gap-2 text-gray-700 ml-1">
                                            <Phone className="w-4 h-4 text-yellow-600" /> Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="+1 (555) 000-0000"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-gray-900"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold flex items-center gap-2 text-gray-700 ml-1">
                                            <MapPin className="w-4 h-4 text-yellow-600" /> Business Address
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="123 AI Way, Tech City"
                                            required
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-gray-900"
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Logo Upload */}
                                <div className="space-y-2 relative z-1 flex flex-col">
                                    <label className="text-sm font-bold flex items-center gap-2 text-gray-700 ml-1">
                                        <Sparkles className="w-4 h-4 text-yellow-600" /> Business Logo
                                    </label>
                                    <div className="flex-1 min-h-[200px] border-2 border-dashed border-gray-200 rounded-[1.5rem] bg-white flex items-center justify-center p-4 hover:border-yellow-400 transition-colors group">
                                        <FileUploader
                                            label={'Upload Logo'}
                                            files={logoFiles}
                                            setFiles={setLogoFiles}
                                            allowedExtensions={['.jpg', '.png', '.jpeg', '.webp']}
                                            maxFiles={1}
                                            maxSizeMB={1} // Adjusted max size for logo
                                            uploadFolderName={'business_logo'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 animate-pulse">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="group relative w-full md:max-w-[400px] h-14 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-lg rounded-2xl shadow-xl shadow-yellow-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete your profile"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer Section */}
                {/*<div className="bg-gray-50 border-t border-gray-100 p-5 text-center">*/}
                {/*    <p className="text-[11px] text-gray-400 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">*/}
                {/*        <Sparkles className="w-4 h-4 text-yellow-500" /> Securely Encrypted & Saved*/}
                {/*    </p>*/}
                {/*</div>*/}
            </div>
        </div>
    );
}