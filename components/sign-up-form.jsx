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
import { MapPin, Phone, Sparkles, Upload, X, ImageIcon } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance.js";

export function SignUpForm({ className, ...props }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

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
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
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
              "grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mx-auto items-center p-4",
              className
          )}
          {...props}
      >
        {/* Left Column: Branding */}
        <div className="space-y-6 text-center md:text-left mt-10 px-6">
          <div className="flex justify-center md:justify-start">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                C
              </div>
              <span className="text-3xl font-extrabold tracking-tighter">
              ClaimKing<span className="text-yellow-600">.AI</span>
            </span>
            </Link>
          </div>
          <h1 className="text-2xl md:text-5xl font-bold leading-tight">
            Your AI-Powered Claims Assistant
          </h1>
          <p className="text-xl text-muted-foreground">
            Sign up today and experience the future of claims management.
            Streamline your processes, save time, and boost efficiency.
          </p>
          <div className="flex items-center gap-2 pt-4 justify-center md:justify-start">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-medium">Get started in minutes!</span>
          </div>
        </div>

        {/* Right Column: Sign Up Form */}
        <Card className="shadow-2xl border-t-4 border-t-yellow-500 p-2">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
            <CardDescription>Enter your details to register</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-5">

              {/* Business Info */}
              <div className="grid gap-4 border p-4 rounded-xl bg-muted/50">
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                      id="business-name"
                      placeholder="ClaimKing Solutions"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                  />
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

              {/* Credentials */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Confirm Password</Label>
                    <Input
                        id="repeat-password"
                        type="password"
                        required
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                    {error}
                  </div>
              )}

              <Button
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 text-lg"
                  disabled={isLoading}
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