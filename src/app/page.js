import React from 'react';
import Link from "next/link";

const Page = () => {
    return (
        <div className='flex justify-center'>
            <Link href="/dashboard" className='text-center my-14'>Dashboard</Link>
        </div>
    );
};

export default Page;