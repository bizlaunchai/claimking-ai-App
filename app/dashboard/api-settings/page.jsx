'use client';
import React, { useState } from 'react';
import {
    Cpu,
    Image as ImageIcon,
    Phone,
    Mail,
    CloudRain,
    HardDrive,
    Copy,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Check,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from "../../../lib/axiosInstance.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const StatusIcon = ({ status }) => {
    if (status === 'loading') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'error') return <XCircle className="w-4 h-4" />;
    return null;
};

const extractError = (err) =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Something went wrong';

const StatusBanner = ({ status, error }) => {
    if (!status || status === 'loading') return null;
    if (status === 'success') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs mt-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Connected successfully</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs mt-3">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error || 'Something went wrong'}</span>
        </div>
    );
};

const MaskedInput = ({ placeholder, value, onChange, className = '' }) => (
    <input
        type="password"
        autoComplete="new-password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition ${className}`}
    />
);

const TextInput = ({ placeholder, value, onChange, className = '' }) => (
    <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition ${className}`}
    />
);

const SaveButton = ({ onClick, status, label = 'Save & Test', color = 'blue' }) => {
    const colors = {
        blue: 'bg-blue-600 hover:bg-blue-700',
        purple: 'bg-purple-600 hover:bg-purple-700',
        orange: 'bg-orange-500 hover:bg-orange-600',
        red: 'bg-red-600 hover:bg-red-700',
        emerald: 'bg-emerald-600 hover:bg-emerald-700',
        cyan: 'bg-cyan-600 hover:bg-cyan-700',
    };
    return (
        <button
            onClick={onClick}
            disabled={status === 'loading'}
            className={`${colors[color]} text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap disabled:opacity-60`}
        >
            {label}
            <StatusIcon status={status} />
        </button>
    );
};

const SectionHeader = ({ icon: Icon, title, iconColor, iconBg }) => (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
    </div>
);

// ─── main component ──────────────────────────────────────────────────────────

const IntegrationPage = () => {
    const [openaiKey, setOpenaiKey] = useState('');
    const [openaiStatus, setOpenaiStatus] = useState(null);
    const [openaiError, setOpenaiError] = useState('');

    const [geminiKey, setGeminiKey] = useState('');
    const [geminiStatus, setGeminiStatus] = useState(null);
    const [geminiError, setGeminiError] = useState('');

    const [replicateToken, setReplicateToken] = useState('');
    const [replicateStatus, setReplicateStatus] = useState(null);
    const [replicateError, setReplicateError] = useState('');

    const [rcClientId, setRcClientId] = useState('');
    const [rcClientSecret, setRcClientSecret] = useState('');
    const [rcJwt, setRcJwt] = useState('');
    const [rcStatus, setRcStatus] = useState(null);
    const [rcError, setRcError] = useState('');

    const [ctmApiKey, setCtmApiKey] = useState('');
    const [ctmApiSecret, setCtmApiSecret] = useState('');
    const [ctmAccountId, setCtmAccountId] = useState('');
    const [ctmStatus, setCtmStatus] = useState(null);
    const [ctmError, setCtmError] = useState('');
    const [ctmImported, setCtmImported] = useState(null);

    const [weatherZips, setWeatherZips] = useState('');
    const [weatherRadius, setWeatherRadius] = useState('25');
    const [weatherStatus, setWeatherStatus] = useState(null);
    const [weatherError, setWeatherError] = useState('');

    const [s3AccessKey, setS3AccessKey] = useState('');
    const [s3SecretKey, setS3SecretKey] = useState('');
    const [s3Region, setS3Region] = useState('');
    const [s3Bucket, setS3Bucket] = useState('');
    const [s3Status, setS3Status] = useState(null);
    const [s3Error, setS3Error] = useState('');

    const [copied, setCopied] = useState(false);
    const forwardingEmail = 'intake+acc12345@claimking.ai';

    const handleCopy = () => {
        navigator.clipboard.writeText(forwardingEmail);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── generic API caller ──────────────────────────────────────────────────

    const callApi = async (endpoint, payload, setStatus, setError, onSuccess) => {
        if (Object.values(payload).some((v) => !v?.toString().trim())) {
            toast.error('Please fill in all fields');
            return;
        }
        setStatus('loading');
        setError('');
        try {
            await axiosInstance.post(endpoint, payload);
            setStatus('success');
            setError('');
            toast.success('Saved & connected successfully');
            onSuccess?.();
        } catch (err) {
            const msg = extractError(err);
            setStatus('error');
            setError(msg);
            toast.error(msg);
        }
    };

    // ── handlers ────────────────────────────────────────────────────────────

    const handleSaveOpenAI = () =>
        callApi('/openai-key-save', { apiKey: openaiKey }, setOpenaiStatus, setOpenaiError, () => setOpenaiKey(''));

    const handleSaveGemini = () =>
        callApi('/gemini-key-save', { apiKey: geminiKey }, setGeminiStatus, setGeminiError, () => setGeminiKey(''));

    const handleSaveReplicate = () =>
        callApi('/replicate-token-save', { apiToken: replicateToken }, setReplicateStatus, setReplicateError, () =>
            setReplicateToken(''),
        );

    const handleSaveRingCentral = () =>
        callApi(
            '/ringcentral-save',
            { clientId: rcClientId, clientSecret: rcClientSecret, jwtToken: rcJwt },
            setRcStatus,
            setRcError,
        );

    const handleSaveCtm = async () => {
        if (!ctmApiKey || !ctmApiSecret || !ctmAccountId) {
            toast.error('Please fill in all CTM fields');
            return;
        }
        setCtmStatus('loading');
        setCtmError('');
        try {
            const res = await axiosInstance.post('/ctm-save', {
                apiKey: ctmApiKey,
                apiSecret: ctmApiSecret,
                accountId: ctmAccountId,
            });
            setCtmStatus('success');
            setCtmImported(res.data?.importedCount ?? 0);
            toast.success(`Connected! Imported ${res.data?.importedCount ?? 0} calls from last 30 days`);
        } catch (err) {
            const msg = extractError(err);
            setCtmStatus('error');
            setCtmError(msg);
            toast.error(msg);
        }
    };

    const handleSaveWeather = () =>
        callApi(
            '/weather-settings-save',
            { serviceAreaZips: weatherZips, alertRadiusMiles: Number(weatherRadius) },
            setWeatherStatus,
            setWeatherError,
        );

    const handleSaveS3 = () =>
        callApi(
            '/aws-s3-save',
            { accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey, region: s3Region, bucketName: s3Bucket },
            setS3Status,
            setS3Error,
        );

    // ── render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integrations Settings</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Connect your external tools and API keys to power ClaimKing.AI features.
                    </p>
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Live API features will not work until these integrations are configured.
                    </div>
                </header>

                {/* ── AI Provider Settings ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <SectionHeader icon={Cpu} title="AI Provider Settings" iconColor="text-blue-600" iconBg="bg-blue-50" />
                    <div className="p-6 grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">OpenAI API Key</label>
                            <p className="text-xs text-gray-400">Estimates, policy analysis, email replies, document generation.</p>
                            <div className="flex gap-2">
                                <MaskedInput placeholder="sk-..." value={openaiKey} onChange={setOpenaiKey} />
                                <SaveButton onClick={handleSaveOpenAI} status={openaiStatus} color="blue" />
                            </div>
                            <StatusBanner status={openaiStatus} error={openaiError} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Google Gemini API Key</label>
                            <p className="text-xs text-gray-400">Alternative AI provider for image generation and analysis.</p>
                            <div className="flex gap-2">
                                <MaskedInput placeholder="AIza..." value={geminiKey} onChange={setGeminiKey} />
                                <SaveButton onClick={handleSaveGemini} status={geminiStatus} label="Test & Save" color="blue" />
                            </div>
                            <StatusBanner status={geminiStatus} error={geminiError} />
                        </div>
                    </div>
                </section>

                {/* ── Image Generation ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <SectionHeader icon={ImageIcon} title="Image Generation Settings" iconColor="text-purple-600" iconBg="bg-purple-50" />
                    <div className="p-6 space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Replicate API Token</label>
                        <p className="text-xs text-gray-400">Used for 3D mockup generation via Stable Diffusion XL.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <MaskedInput placeholder="r8_..." value={replicateToken} onChange={setReplicateToken} />
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg self-center whitespace-nowrap border border-gray-200">
                                Model: stability-ai/sdxl
                            </span>
                            <SaveButton onClick={handleSaveReplicate} status={replicateStatus} label="Test Token" color="purple" />
                        </div>
                        <StatusBanner status={replicateStatus} error={replicateError} />
                    </div>
                </section>

                {/* ── Phone / Call Tracking ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <SectionHeader icon={Phone} title="Phone / Call Tracking Integrations" iconColor="text-orange-500" iconBg="bg-orange-50" />
                    <div className="p-6 grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200">RingCentral</h3>
                            <TextInput placeholder="Client ID" value={rcClientId} onChange={setRcClientId} />
                            <MaskedInput placeholder="Client Secret" value={rcClientSecret} onChange={setRcClientSecret} />
                            <textarea
                                placeholder="JWT Token"
                                value={rcJwt}
                                onChange={(e) => setRcJwt(e.target.value)}
                                className="w-full h-20 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition resize-none"
                            />
                            <SaveButton onClick={handleSaveRingCentral} status={rcStatus} label="Connect RingCentral" color="orange" />
                            <StatusBanner status={rcStatus} error={rcError} />
                            <p className="text-[10px] text-gray-400 font-mono">
                                Webhook endpoint: POST /api/webhooks/ringcentral
                            </p>
                        </div>

                        <div className="space-y-3 md:border-l md:border-gray-200 md:pl-8">
                            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200">Call Tracking Metrics (CTM)</h3>
                            <TextInput placeholder="Account ID" value={ctmAccountId} onChange={setCtmAccountId} />
                            <TextInput placeholder="API Key" value={ctmApiKey} onChange={setCtmApiKey} />
                            <MaskedInput placeholder="API Secret" value={ctmApiSecret} onChange={setCtmApiSecret} />
                            <SaveButton onClick={handleSaveCtm} status={ctmStatus} label="Save & Import Last 30 Days" color="orange" />
                            {ctmStatus === 'success' && ctmImported !== null ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs mt-3">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Connected — {ctmImported} calls imported from last 30 days</span>
                                </div>
                            ) : (
                                <StatusBanner status={ctmStatus === 'success' ? null : ctmStatus} error={ctmError} />
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Email Connections ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <SectionHeader icon={Mail} title="Email Account Connections" iconColor="text-emerald-600" iconBg="bg-emerald-50" />
                    <div className="p-6 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => toast.info('Redirect to Google OAuth...')}
                                className="flex items-center justify-center gap-3 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-emerald-400 transition group"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Color_Logo.svg" className="w-5" alt="Google" />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Connect Gmail (OAuth)</span>
                            </button>
                            <button
                                onClick={() => toast.info('Redirect to Microsoft OAuth...')}
                                className="flex items-center justify-center gap-3 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-400 transition group"
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" className="w-5" alt="Microsoft" />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Connect Outlook (OAuth)</span>
                            </button>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                            <div>
                                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Email Forwarding Alternative</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Fallback for non-Gmail/Outlook users. Forward insurance emails to this address:
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={forwardingEmail}
                                    className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono text-blue-700"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="p-2 border border-blue-200 bg-white rounded-lg hover:bg-blue-50 transition"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-blue-500" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Storm / Weather ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <SectionHeader icon={CloudRain} title="Storm / Weather Data" iconColor="text-cyan-600" iconBg="bg-cyan-50" />
                    <div className="p-6 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Service Area (ZIP Codes)</label>
                                <TextInput placeholder="e.g. 77001, 77002, 77003" value={weatherZips} onChange={setWeatherZips} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Alert Radius (Miles)</label>
                                <select
                                    value={weatherRadius}
                                    onChange={(e) => setWeatherRadius(e.target.value)}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-cyan-500 transition"
                                >
                                    <option value="10">Within 10 miles</option>
                                    <option value="25">Within 25 miles</option>
                                    <option value="50">Within 50 miles</option>
                                    <option value="100">Within 100 miles</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                                NOAA & NWS APIs (free, no key required)
                            </div>
                            <SaveButton onClick={handleSaveWeather} status={weatherStatus} label="Save Settings" color="cyan" />
                        </div>
                        <StatusBanner status={weatherStatus} error={weatherError} />
                    </div>
                </section>

                {/* ── AWS S3 ── */}
                <section className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-10">
                    <SectionHeader icon={HardDrive} title="Storage Settings (AWS S3)" iconColor="text-red-600" iconBg="bg-red-50" />
                    <div className="p-6 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Access Key ID</label>
                                <TextInput placeholder="AKIA..." value={s3AccessKey} onChange={setS3AccessKey} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Secret Access Key</label>
                                <MaskedInput placeholder="••••••••" value={s3SecretKey} onChange={setS3SecretKey} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Region</label>
                                <TextInput placeholder="us-east-1" value={s3Region} onChange={setS3Region} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Bucket Name</label>
                                <TextInput placeholder="my-claimking-bucket" value={s3Bucket} onChange={setS3Bucket} />
                            </div>
                        </div>
                        <SaveButton onClick={handleSaveS3} status={s3Status} label="Save & Test Connection" color="red" />
                        <StatusBanner status={s3Status} error={s3Error} />
                    </div>
                </section>

            </div>
        </div>
    );
};

export default IntegrationPage;