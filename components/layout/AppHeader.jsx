import React from 'react';
import Link from "next/link";
import {hasEnvVars} from "@/lib/utils";
import {EnvVarWarning} from "@/components/env-var-warning";
import {AuthButton} from "@/components/auth-button";

const AppHeader = () => {
    return (
        <>
            <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                    <div className='flex items-center gap-2'>
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md flex items-center justify-center text-white font-bold">
                            C
                        </div>
                        <Link href='/'><p> <span className="text-lg font-semibold">ClaimKing.AI</span></p></Link>
                    </div>
                    {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
                </div>
            </nav>
        </>
    );
};

export default AppHeader;