"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import GoogleAuth from "@/components/auth/GoogleAuth.jsx";
import OutlookAuth from "@/components/auth/OutlookAuth.jsx";
import { MapPin, Phone, Sparkles, Upload, X, ImageIcon, Eye, EyeOff, Check, AlertCircle, Building2, User, Mail, Lock, Crown, Clock, ShieldCheck, Zap } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance.js";

// Password rules, evaluated live as the user types.
const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
];

export function SignUpForm({ className, ...props }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  // ── password visibility + live validation ───────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

  const passwordChecks = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const passwordValid = passwordChecks.every((c) => c.ok);
  const passwordsMatch = repeatPassword.length > 0 && password === repeatPassword;
  const repeatMismatch = repeatPassword.length > 0 && password !== repeatPassword;

  // ── logo state ──────────────────────────────────────────────────────────────
  const [logoFile, setLogoFile] = useState(null);      // actual File object
  const [logoPreview, setLogoPreview] = useState(null); // preview URL
  const fileInputRef = useRef(null);

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ── logo select handler ─────────────────────────────────────────────────────
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed for the logo.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setError("Logo must be under 1MB.");
      return;
    }

    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── upload logo to S3 via NestJS ────────────────────────────────────────────
  const uploadLogo = async (accessToken) => {
    if (!logoFile) return null;

    const formData = new FormData();
    formData.append("file", logoFile);

    try {
      const res = await axiosInstance.post(
          "/s3/upload?uploadFolderName=business_logo",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${accessToken}`,
            },
          }
      );
      return res.data?.payload?.key || null;
    } catch (err) {
      console.error("Logo upload failed:", err);
      return null; // logo upload fail হলেও signup block করবো না
    }
  };

  // ── sign up handler ─────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (!passwordValid) {
      setError("Please choose a stronger password — see the requirements below.");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Supabase signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.claimking.ai"}/auth/callback?next=/dashboard`,
          data: {
            first_name: firstName,
            last_name: lastName,
            business_name: businessName,
            address: address,
            phone: phone,
            business_logo: null,
          },
        },
      });

      if (authError) throw authError;

      // Supabase doesn't error on duplicate emails (anti-enumeration). When the
      // email already exists, it returns a user with an empty `identities` array.
      if (authData?.user && (authData.user.identities?.length ?? 0) === 0) {
        setError("An account with this email already exists. Please log in instead.");
        setIsLoading(false);
        return;
      }

  /*    debugger

      // Step 2: User
      const accessToken = authData?.session?.access_token;
      if (accessToken && logoFile) {
        const logoKey = await uploadLogo(accessToken);

        // Step 3: logo key Supabase user metadata
        if (logoKey) {
          await supabase.auth.updateUser({
            data: { business_logo: logoKey },
          });
        }
      }*/

      router.push("/auth/sign-up-success");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div
          className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl mx-auto items-center p-4",
              className
          )}
          {...props}
      >
        {/* Left Column: Branding */}
        <div className="space-y-8 text-center md:text-left px-2 md:px-6">

          <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            Your AI-Powered{" "}
            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Claims Assistant
            </span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed">
            Sign up today and experience the future of claims management.
            Streamline your processes, save time, and boost efficiency.
          </p>

          <ul className="space-y-4 text-left max-w-sm mx-auto md:mx-0">
            {[
              { icon: Zap, title: "AI estimates in minutes", desc: "Generate accurate estimates instantly." },
              { icon: ShieldCheck, title: "Built for contractors", desc: "Measurements, mockups & client portals." },
              { icon: Clock, title: "Get started in minutes", desc: "No credit card required to begin." },
            ].map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-600">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">{f.title}</p>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Sign Up Form */}
        <Card className="shadow-2xl border-t-4 border-t-yellow-500 rounded-2xl">
          <CardHeader className="text-center pb-2 space-y-2">
            <CardTitle className="text-2xl md:text-3xl font-bold">Create Account</CardTitle>
            <CardDescription>Enter your details to get started</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-5">

              {/* Business Info */}
              <div className="grid gap-4 border p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <Building2 className="h-4 w-4 text-yellow-600" />
                  Business Details
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="business-name"
                        className="pl-9"
                        placeholder="ClaimKing Solutions"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                {/* ── Logo Upload ── */}
                {/*<div className="grid gap-2">
                  <Label>Business Logo</Label>

                   Preview
                  {logoPreview ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50 transition"
                        >
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                  ) : (
                      <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 hover:border-yellow-400 transition cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500">
                      Click to upload logo
                    </span>
                        <span className="text-[10px] text-gray-400">
                      JPG, PNG, WEBP — max 1MB
                    </span>
                      </button>
                  )}

                  <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleLogoSelect}
                  />
                </div>*/}

                <div className="grid gap-2">
                  <Label htmlFor="address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="address"
                        className="pl-9"
                        placeholder="Street, City, Country"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="phone"
                        className="pl-9"
                        placeholder="+1 (555) 000-0000"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid gap-4 border p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <User className="h-4 w-4 text-yellow-600" />
                  Your Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                        id="first-name"
                        placeholder="John"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                        id="last-name"
                        placeholder="Doe"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="grid gap-4 border p-4 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <Lock className="h-4 w-4 text-yellow-600" />
                  Account Credentials
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        placeholder="email@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          className="pr-10"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                          id="repeat-password"
                          type={showRepeat ? "text" : "password"}
                          required
                          className={cn(
                              "pr-10",
                              repeatMismatch && "border-red-400 focus-visible:ring-red-400",
                              passwordsMatch && "border-green-500 focus-visible:ring-green-500"
                          )}
                          placeholder="••••••••"
                          value={repeatPassword}
                          onChange={(e) => setRepeatPassword(e.target.value)}
                      />
                      <button
                          type="button"
                          onClick={() => setShowRepeat((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                          tabIndex={-1}
                          aria-label={showRepeat ? "Hide password" : "Show password"}
                      >
                        {showRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live password requirements */}
                {password.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {passwordChecks.map((c) => (
                          <li
                              key={c.key}
                              className={cn(
                                  "flex items-center gap-1.5 text-xs transition-colors",
                                  c.ok ? "text-green-600" : "text-muted-foreground"
                              )}
                          >
                            {c.ok ? (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0 mx-1" />
                            )}
                            {c.label}
                          </li>
                      ))}
                    </ul>
                )}

                {/* Live confirm-password feedback */}
                {repeatPassword.length > 0 && (
                    <p
                        className={cn(
                            "flex items-center gap-1.5 text-xs font-medium",
                            passwordsMatch ? "text-green-600" : "text-red-500"
                        )}
                    >
                      {passwordsMatch ? (
                          <><Check className="h-3.5 w-3.5" /> Passwords match</>
                      ) : (
                          <><AlertCircle className="h-3.5 w-3.5" /> Passwords do not match</>
                      )}
                    </p>
                )}
              </div>

              {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                    {error}
                  </div>
              )}

              <Button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoading || !passwordValid || !passwordsMatch}
              >
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <GoogleAuth />
              <OutlookAuth />

              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{" "}
                <Link
                    href="/auth/login"
                    className="text-yellow-600 font-bold hover:underline"
                >
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}