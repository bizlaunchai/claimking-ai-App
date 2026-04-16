'use client';
import React, { useState } from 'react';
import {
    ShieldCheck,
    Cpu,
    Image as ImageIcon,
    Phone,
    Mail,
    CloudRain,
    HardDrive,
    Copy,
    CheckCircle2,
    AlertCircle, Loader2
} from 'lucide-react';
import axiosInstance from "@/lib/axiosInstance.js";
import {toast} from "sonner";

const IntegrationPage = () => {

    const [openaiKey, setOpenaiKey] = useState('');
    const [openaiStatus, setOpenaiStatus] = useState();


    const handleSaveOpenAI = async () => {
        if (!openaiKey) {
            toast.error('Please enter API key');
            return;
        }

        setOpenaiStatus('loading');

        try {
            const res = await axiosInstance.post('/openai-key-save', {
                apiKey: openaiKey
            });

            if (res.data.success) {
                setOpenaiStatus('success');
                toast.success('OpenAI key saved successfully');
                setOpenaiKey(''); // clear input
            } else {
                setOpenaiStatus('error');
                toast.error(res.data.message || 'Failed to save key');
            }

        } catch (err) {
            setOpenaiStatus('error');
        }
    };

    const StatusIcon = ({ status }) => {
        if (status === 'loading') return <Loader2 className="w-4 h-4 animate-spin" />;
        if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Integrations Settings</h1>
                    <p className="text-gray-600 mt-2">Connect your external tools and API keys to power ClaimKing.AI features.</p>
                    <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                       Live API features will not work until these are configured.
                    </div>
                </header>

                <div className="space-y-8">

                    {/*  AI Provider Settings */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <Cpu className="w-5 h-5 text-blue-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800"> AI Provider Settings</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                                    <p className="text-xs text-gray-500 mb-2">Used for estimates, policy analysis, email replies, supplement generation,
                                        document generation.</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            placeholder="sk-..."
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={handleSaveOpenAI}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition text-sm font-medium flex items-center gap-2"
                                        >
                                            Save & Test
                                            <StatusIcon status={openaiStatus} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Gemini API Key</label>
                                    <p className="text-xs text-gray-500 mb-2">alternative AI provider for image generation and analysis.</p>
                                    <div className="flex gap-2">
                                        <input type="password" placeholder="AIza..." className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        <button className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-md transition text-sm font-medium">Connection Test</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/*  Image Generation Settings */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <ImageIcon className="w-5 h-5 text-purple-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800">Image Generation Settings</h2>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Replicate API Token</label>
                            <p className="text-xs text-gray-500 mb-2">Used for 3D mockup generation via Stable Diffusion XL.</p>
                            <div className="flex flex-col md:flex-row gap-4">
                                <input type="password" placeholder="r8_..." className="md:w-2/3 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none" />
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Default: stability-ai/sdxl</span>
                                    <button className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium text-sm">Test Token</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Phone / Call Tracking */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <Phone className="w-5 h-5 text-orange-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800">Phone / Call Tracking Integrations</h2>
                        </div>
                        <div className="p-6 grid md:grid-cols-2 gap-8">
                            {/* RingCentral */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-700 border-b pb-2">RingCentral</h3>
                                <input type="text" placeholder="Client ID" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                <input type="password" placeholder="Client Secret" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                <textarea placeholder="JWT Token" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm h-20"></textarea>
                                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md font-bold transition">
                                    Connect RingCentral
                                </button>
                                <p className="text-[10px] text-gray-400">Webhook: /api/webhooks/ringcentral</p>
                            </div>
                            {/* CTM */}
                            <div className="space-y-4 border-l pl-0 md:pl-8 border-gray-100">
                                <h3 className="font-bold text-gray-700 border-b pb-2">Call Tracking Metrics (CTM)</h3>
                                <input type="text" placeholder="Account ID" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                <input type="text" placeholder="API Key" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                <input type="password" placeholder="API Secret" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-md font-bold transition border border-gray-300">
                                    Import Last 30 Days Data
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Email Connections */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <Mail className="w-5 h-5 text-emerald-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800"> Email Account Connections</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                <button className="flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Logo.svg" className="w-5" alt="Google" />
                                    <span className="font-medium text-gray-700">Connect Gmail (OAuth)</span>
                                </button>
                                <button className="flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" className="w-5" alt="Microsoft" />
                                    <span className="font-medium text-gray-700">Connect Outlook (OAuth)</span>
                                </button>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-800 mb-1">Email Forwarding Alternative</h4>
                                <p className="text-xs text-blue-700 mb-3">Fallback for non-Gmail/Outlook users. Forward insurance emails here:</p>
                                <div className="flex gap-2">
                                    <input readOnly value="intake+acc12345@claimking.ai" className="bg-white border border-blue-200 rounded px-3 py-2 text-sm font-mono flex-1 text-gray-700" />
                                    <button className="bg-white border border-blue-300 p-2 rounded hover:bg-blue-100 transition shadow-sm">
                                        <Copy className="w-4 h-4 text-blue-600" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/*  Storm / Weather Data */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <CloudRain className="w-5 h-5 text-cyan-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800">Storm / Weather Data</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Area (ZIP Codes)</label>
                                    <input type="text" placeholder="e.g. 77001, 77002, 77003" className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notification Radius (Miles)</label>
                                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none">
                                        <option>Within 10 miles</option>
                                        <option>Within 25 miles</option>
                                        <option>Within 50 miles</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-dashed border-gray-300">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-xs text-gray-600 italic">NOAA & NWS API Integrated (Active)</span>
                            </div>
                        </div>
                    </section>

                    {/* Storage Settings */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center">
                            <HardDrive className="w-5 h-5 text-red-600 mr-2" />
                            <h2 className="text-lg font-semibold text-gray-800">Storage Settings (AWS S3)</h2>
                        </div>
                        <div className="p-6 grid md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Access Key ID" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            <input type="password" placeholder="Secret Access Key" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            <input type="text" placeholder="Region (e.g. us-east-1)" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            <input type="text" placeholder="Bucket Name" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            <div className="md:col-span-2 mt-2">
                                <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-bold transition flex items-center justify-center gap-2">
                                    Save & Test
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default IntegrationPage;