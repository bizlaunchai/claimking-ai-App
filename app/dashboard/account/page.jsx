"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    User,
    Building2,
    Phone,
    MapPin,
    Mail,
    Sparkles,
    Loader2,
    CheckCircle,
    AlertCircle,
    ImageIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

const FileUploader = dynamic(() => import("@/utiles/FileUploader"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchS3Image(key, token) {
    try {
        const res = await fetch(`${API_URL}/s3/file?key=${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch {
        return null;
    }
}

export default function AccountPage() {
    const [userId, setUserId] = useState(null);
    const [token, setToken] = useState(null);

    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [address, setAddress] = useState("");

    // S3 keys saved in DB
    const [avatarKey, setAvatarKey] = useState(null);
    const [logoKey, setLogoKey] = useState(null);

    // Blob URLs for rendering
    const [avatarBlobUrl, setAvatarBlobUrl] = useState(null);
    const [logoBlobUrl, setLogoBlobUrl] = useState(null);

    // FileUploader state (new uploads only)
    const [avatarFiles, setAvatarFiles] = useState([]);
    const [logoFiles, setLogoFiles] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    // Load profile on mount
    useEffect(() => {
        (async () => {
            const supabase = createClient();
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            const { data, error: authError } = await supabase.auth.getClaims();
            if (authError || !data?.claims) return;

            const id = data.claims.sub;
            setUserId(id);
            setToken(accessToken);

            const res = await fetch(`${API_URL}/profile/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return;

            const profile = await res.json();
            setEmail(profile.email || "");
            setFullName(profile.full_name || "");
            setPhone(profile.phone || "");
            setBusinessName(profile.business_name || "");
            setAddress(profile.address || "");

            if (profile.avatar_url) {
                setAvatarKey(profile.avatar_url);
                const url = await fetchS3Image(profile.avatar_url, accessToken);
                setAvatarBlobUrl(url);
            }
            if (profile.business_logo) {
                setLogoKey(profile.business_logo);
                const url = await fetchS3Image(profile.business_logo, accessToken);
                setLogoBlobUrl(url);
            }

            setIsLoading(false);
        })();
    }, []);

    // When a new avatar is uploaded, extract key and refresh preview
    useEffect(() => {
        if (avatarFiles.length === 0) return;
        const newKey = avatarFiles[avatarFiles.length - 1]?.serverResponse?.payload?.key;
        if (!newKey || newKey === avatarKey) return;
        setAvatarKey(newKey);
        fetchS3Image(newKey, token).then((url) => { if (url) setAvatarBlobUrl(url); });
    }, [avatarFiles]);

    // When a new logo is uploaded, extract key and refresh preview
    useEffect(() => {
        if (logoFiles.length === 0) return;
        const newKey = logoFiles[logoFiles.length - 1]?.serverResponse?.payload?.key;
        if (!newKey || newKey === logoKey) return;
        setLogoKey(newKey);
        fetchS3Image(newKey, token).then((url) => { if (url) setLogoBlobUrl(url); });
    }, [logoFiles]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        debugger

        console.log({fullName, phone, businessName, address, avatarKey, logoKey})

        try {
            // Only include fields that have values — skip nulls/empties so the
            // backend validator (whitelist + @IsOptional) gets a clean payload.
            const payload = {};
            if (fullName !== undefined && fullName !== null) payload.full_name = fullName;
            if (phone !== undefined && phone !== null) payload.phone = phone;
            if (businessName !== undefined && businessName !== null) payload.business_name = businessName;
            if (address !== undefined && address !== null) payload.address = address;
            if (avatarKey) payload.avatar_url = avatarKey;
            if (logoKey) payload.business_logo = logoKey;

            const res = await fetch(`${API_URL}/profile/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to update profile");
            }

            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(null), 4000);
        } catch (err) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-md">
                    <User className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Account Settings</h1>
                    <p className="text-sm text-gray-500">Manage your personal and business profile</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Personal Info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <User className="w-4 h-4 text-yellow-600" /> Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 transition-all text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <Mail className="w-4 h-4 text-yellow-600" /> Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                readOnly
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 ml-1">Email cannot be changed here</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <Phone className="w-4 h-4 text-yellow-600" /> Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 transition-all text-gray-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Profile Picture */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Profile Picture</h2>
                    <div className="flex items-start gap-6">
                        {/* Current image preview */}
                        <div className="w-24 h-24 rounded-2xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {avatarBlobUrl ? (
                                <img src={avatarBlobUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                            )}
                        </div>
                        <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 p-4 hover:border-yellow-400 transition-colors min-h-[96px] flex items-center justify-center">
                            <FileUploader
                                label="Upload new profile picture"
                                files={avatarFiles}
                                setFiles={setAvatarFiles}
                                allowedExtensions={[".jpg", ".png", ".jpeg", ".webp"]}
                                maxFiles={1}
                                maxSizeMB={2}
                                uploadFolderName="avatars"
                            />
                        </div>
                    </div>
                </div>

                {/* Business Info */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-5">Business Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <Building2 className="w-4 h-4 text-yellow-600" /> Business Name
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="ClaimKing Solutions"
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 transition-all text-gray-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                                <MapPin className="w-4 h-4 text-yellow-600" /> Business Address
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="123 AI Way, Tech City"
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 transition-all text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Business Logo */}
                    <div className="mt-5 space-y-2">
                        <label className="text-sm font-semibold flex items-center gap-2 text-gray-700">
                            <Sparkles className="w-4 h-4 text-yellow-600" /> Business Logo
                        </label>
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 rounded-2xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                                {logoBlobUrl ? (
                                    <img src={logoBlobUrl} alt="Business logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-gray-300" />
                                )}
                            </div>
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 p-4 hover:border-yellow-400 transition-colors min-h-[96px] flex items-center justify-center">
                                <FileUploader
                                    label="Upload new business logo"
                                    files={logoFiles}
                                    setFiles={setLogoFiles}
                                    allowedExtensions={[".jpg", ".png", ".jpeg", ".webp"]}
                                    maxFiles={1}
                                    maxSizeMB={1}
                                    uploadFolderName="business_logo"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 text-sm font-medium">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        {success}
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-12 px-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
