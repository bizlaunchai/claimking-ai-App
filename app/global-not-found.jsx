// Import global styles and fonts
import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: '404 - Page Not Found',
    description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
    return (
        <html lang="en" className={inter.className}>
        <body className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center ">
            <h1 className="text-7xl font-extrabold text-white tracking-tight">
                404
            </h1>

            <p className="mt-4 text-xl text-slate-300 font-medium">
                Page Not Found
            </p>

            <p className="mt-2 text-slate-400">
                Sorry, the page you’re looking for doesn’t exist or has been moved.
            </p>

            <div>
                <a
                    href="/"
                    className="inline-block mt-6 px-6 py-3 bg-white text-black rounded-lg"
                >
                    Go Home
                </a>
            </div>
        </div>
        </body>
        </html>
    )
}
