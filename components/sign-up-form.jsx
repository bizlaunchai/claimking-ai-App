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
import React, { useState } from "react";
import GoogleAuth from "@/components/auth/GoogleAuth.jsx";
import { Building2, MapPin, Phone, User, Mail, Lock, Sparkles } from "lucide-react";
import FileUploader from "@/utiles/FileUploader.jsx";

export function SignUpForm({ className, ...props }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [logoFiles, setLogoFiles] = useState([]); // State for logo upload

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
      const logoUrl = logoFiles?.length > 0 ? logoFiles[0]?.serverResponse?.payload?.key : null;

      const { error } = await supabase.auth.signUp({
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
            business_logo: logoUrl // Save logo URL if applicable
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (err) {
      console.log(err)
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl mx-auto items-center p-4", className)} {...props}>

        {/* --- Left Column: Branding --- */}
        <div className="space-y-6 text-center md:text-left mt-10 px-6">
          <div className="flex justify-center md:justify-start">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                C
              </div>
              <span className="text-3xl font-extrabold tracking-tighter">ClaimKing<span className="text-yellow-600">.AI</span></span>
            </Link>
          </div>
          <h1 className="text-2xl md:text-5xl font-bold leading-tight">Your AI-Powered Claims Assistant</h1>
          <p className="text-xl text-muted-foreground">Sign up today and experience the future of claims management. Streamline your processes, save time, and boost efficiency.</p>
          <div className="flex items-center gap-2 pt-4 justify-center md:justify-start">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            <span className="text-lg font-medium">Get started in minutes!</span>
          </div>
        </div>

        {/* --- Right Column: Sign Up Form --- */}
        <Card className="shadow-2xl border-t-4 border-t-yellow-500 p-2">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
            <CardDescription>Enter your details to register</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-5">

              {/* Business Info (Condensed) */}
              <div className="grid gap-4 border p-4 rounded-xl bg-muted/50">
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input id="business-name" placeholder="ClaimKing Solutions" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>

                {/* Logo Uploader Field */}
                <div className="grid gap-2">
                  <Label>Business Logo</Label>
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

                <div className="grid gap-2">
                  <Label htmlFor="address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="address" className="pl-9" placeholder="Street, City, Country" required value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" className="pl-9" placeholder="+1 (555) 000-0000" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              {/* Account Credentials */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="email@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Confirm Password</Label>
                    <Input id="repeat-password" type="password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
                  </div>
                </div>
              </div>

              {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                    {error}
                  </div>
              )}

              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 text-lg" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign Up"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
              </div>

              <GoogleAuth />

              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-yellow-600 font-bold hover:underline">Login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}