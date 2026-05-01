"use client"
import React, {useState} from 'react';
import {createClient} from "@/lib/supabase/client.js";
import {Button} from "@/components/ui/button.jsx";
import {toast} from "sonner";

const OutlookAuth = () => {

    const [isLoading, setIsLoading] = useState(false);


    const handleOutlookLogin = async () => {
        const supabase = createClient();
        setIsLoading(true);

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.claimking.ai";

        // Outlook (Azure) login start
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "azure",
            options: {
                scopes: "email offline_access openid profile",
                redirectTo: `${baseUrl}/auth/callback`,
            },
        });

        if (error) {
            toast.error(error.message);
            setIsLoading(false);
        }
    };

    return (
        <div>
            <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleOutlookLogin}
                disabled={isLoading}
            >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                    <path fill="#7fba00" d="M12 1h10v10H12z"/>
                    <path fill="#ffb900" d="M12 12h10v10H12z"/>
                </svg>
                Continue with Microsoft
            </Button>
        </div>
    );
};

export default OutlookAuth;
