import axios from 'axios';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 60000,
});

// Dedupe concurrent getSession() calls so parallel requests share a single
// refresh-token rotation. Without this, 2+ in-flight requests can each consume
// the same refresh token and trigger "refresh_token_not_found" on all but one.
let sessionPromise = null;
function getSessionDeduped() {
    if (!sessionPromise) {
        sessionPromise = supabase.auth.getSession().finally(() => {
            sessionPromise = null;
        });
    }
    return sessionPromise;
}

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        const { data: { session } } = await getSessionDeduped();

        if (session) {
            const token = session.access_token;
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Extract the most useful human-readable message from a backend error response.
 *
 * NestJS error envelope looks like:
 *   { statusCode: 500, message: "Gemini 429: quota exceeded…", error: "Internal Server Error" }
 *
 * For class-validator failures, `message` is an array of strings instead.
 *
 * Older callers in this app rely on `data.error` so we fall back to it.
 */
function extractBackendMessage(data) {
    if (!data) return undefined;
    if (Array.isArray(data.message)) return data.message.join(' — ');
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    return undefined;
}

/**
 * Soften known technical errors into something a non-technical user can act on.
 * Returns the input unchanged when no friendly mapping applies.
 */
function humanizeBackendMessage(raw) {
    if (!raw) return raw;
    const lower = raw.toLowerCase();

    // Gemini quota / billing
    if (lower.includes('quota') && lower.includes('gemini')) {
        return 'Your Gemini plan is out of free-tier quota. Enable billing on your Google AI key, or switch to Replicate in API Settings.';
    }
    if (lower.includes('429')) {
        return 'AI provider rate-limit hit. Wait a minute and try again, or upgrade your plan.';
    }

    // Missing API key
    if (lower.includes('api key not configured') || lower.includes('not configured. please set up')) {
        return 'API key is not configured. Open Dashboard → API Settings to add it.';
    }
    if (lower.includes('no image generation provider')) {
        return 'No image AI is connected. Save a Gemini key in API Settings to enable 3D Mockups.';
    }

    // Model availability
    if (lower.includes('no gemini image model is available')) {
        return 'Your Gemini API key cannot access any image-capable model. Enable billing or set GEMINI_IMAGE_MODEL.';
    }

    // Email delivery (nodemailer surfaces the raw SMTP 5xx reply)
    if (lower.includes('invalid `to` field') || lower.includes('testing email address')) {
        return 'Your email provider is still in test mode and only accepts verified addresses — real client emails (and example.com addresses) are rejected. Verify your sending domain to send for real.';
    }
    if (lower.includes('message failed') || lower.includes('smtp')) {
        return 'The email could not be sent. Check your SMTP settings in API Settings.';
    }

    // S3 / storage
    if (lower.includes('s3 credentials not configured')) {
        return 'File storage (AWS S3) is not configured yet. Open API Settings → AWS S3 Storage to set it up.';
    }

    return raw;
}

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            const { status, data } = error.response || {};
            const rawMessage = extractBackendMessage(data);
            const friendlyMessage = humanizeBackendMessage(rawMessage);
            const requestUrl = error.config?.url || '';

            // Surface the resolved message back on the error so callers can
            // display it inline (not just rely on the toast).
            error.userMessage = friendlyMessage || rawMessage || `Request failed (${status ?? 'network'})`;

            const isPaymentRequest = requestUrl.includes('/order/create-order') ||
                requestUrl.includes('/order/capture-order') ||
                requestUrl.includes('/payment/');

            // Some callers prefer to render errors themselves — opt out of the
            // global toast by setting `config.suppressErrorToast = true`.
            if (error.config?.suppressErrorToast) {
                return Promise.reject(error);
            }

            switch (status) {
                case 401:
                    if (!isPaymentRequest) {
                        toast.error('Session expired', { description: 'Please log in again.' });
                    }
                    break;
                case 403:
                    toast.error('Not allowed', { description: friendlyMessage || 'You do not have permission for this action.' });
                    break;
                case 422:
                    toast.error('Setup needed', { description: friendlyMessage || 'A required setting is missing.' });
                    break;
                case 402: {
                    const isCreditsError =
                        typeof data?.required === 'number' && typeof data?.available === 'number';
                    if (isCreditsError) {
                        toast.error('Insufficient credits', {
                            description: friendlyMessage ||
                                `This action needs ${data.required} credits but you only have ${data.available}.`,
                        });
                    } else {
                        toast.error('Setup needed', {
                            description: friendlyMessage || 'A required setting is missing.',
                        });
                    }
                    break;
                }
                case 500:
                    toast.error('Server error', { description: friendlyMessage || 'Something went wrong on the server.' });
                    break;
                default:
                    toast.error('Error', { description: friendlyMessage || `An error occurred (${status ?? 'network'}).` });
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;