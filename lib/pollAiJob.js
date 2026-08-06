import axiosInstance from '@/lib/axiosInstance';

/**
 * Poll an async AI job (created by a backend endpoint that returns
 * `{ job_id, status: 'processing' }`) until it finishes.
 *
 * Resolves with the job's `result` payload on success. Throws on failure or
 * timeout — the thrown error carries `.userMessage` (failed job's message) or
 * `.code = 'ECONNABORTED'` (timeout) so callers can reuse their existing
 * error/timeout handling.
 *
 * @param {string} jobId
 * @param {{ intervalMs?: number, maxMs?: number, onTick?: (elapsedMs:number)=>void }} [opts]
 */
export async function pollAiJob(jobId, opts = {}) {
    const intervalMs = opts.intervalMs ?? 3000;
    const maxMs = opts.maxMs ?? 300000; // 5 min
    const started = Date.now();
    let attempt = 0;

    while (Date.now() - started < maxMs) {
        // Check quickly first (short jobs feel instant), then settle to the
        // steady interval — keeps the poll count down on long jobs.
        const wait = attempt === 0 ? 800 : attempt === 1 ? 1500 : intervalMs;
        await new Promise((r) => setTimeout(r, wait));
        attempt += 1;
        let job;
        try {
            const { data } = await axiosInstance.get(`/ai-jobs/${jobId}`, { suppressErrorToast: true });
            job = data;
        } catch {
            // Transient poll error (network blip) — keep trying until maxMs.
            continue;
        }
        if (opts.onTick) opts.onTick(Date.now() - started);
        if (job?.status === 'done') return job.result;
        if (job?.status === 'failed') {
            const err = new Error(job.error_message || 'The AI job failed.');
            err.userMessage = job.error_message || 'The AI job failed. Please try again.';
            throw err;
        }
    }
    const timeout = new Error('AI job timed out');
    timeout.code = 'ECONNABORTED';
    throw timeout;
}
