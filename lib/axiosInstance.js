import axios from 'axios';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 60000,
});

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        const { data: { session }, error } = await supabase.auth.getSession();

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

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            const { status, data } = error.response || {};
            const message = typeof data?.error === 'string' ? data.error : undefined;
            const requestUrl = error.config?.url || '';

            const isPaymentRequest = requestUrl.includes('/order/create-order') ||
                requestUrl.includes('/order/capture-order') ||
                requestUrl.includes('/payment/');

            switch (status) {
                case 401:
                    if (!isPaymentRequest) {
                        toast.error('Error', { description: 'Session expired. Please log in again.' });
                    }
                    break;
                case 403:
                    toast.error('Error', { description: message || 'You do not have permission for this action.' });
                    break;
                case 500:
                    toast.error('Error', { description: 'Internal server error. Please try again later.' });
                    break;
                default:
                    toast.error('Error', { description: message || `An error occurred: ${status}` });
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;