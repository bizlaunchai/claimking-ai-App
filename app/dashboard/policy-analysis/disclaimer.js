// ─────────────────────────────────────────────────────────────────────────────
// Policy Analysis — legal disclaimer (single source of truth)
//
// Required text (per the Policy Analysis compliance brief): every analysis
// page and every generated output MUST clearly state that the AI's output is
// NOT legal advice, public adjusting, or insurance adjusting.
//
// Centralising the copy here so that:
//   - The screen banner   (PolicyAnalysis.jsx)
//   - The "Generate Report" PDF       (Step 22)
//   - The "Share with Client" page    (Step 24)
//   - The "Create Estimate" handoff   (Step 23) — carries it as a note
//   - The client portal renderer      (Step 27)
// all read from one constant. A regulator only ever needs to audit one string.
// ─────────────────────────────────────────────────────────────────────────────

export const LEGAL_DISCLAIMER_HEADLINE =
    'Not legal, public-adjusting, or insurance-adjusting advice';

export const LEGAL_DISCLAIMER_BODY =
    'This AI-generated analysis is for informational purposes only. It is NOT legal advice, ' +
    'public adjusting, or insurance adjusting, and it does not create an attorney-client, ' +
    'adjuster-client, or any other professional relationship. Coverage decisions are made by ' +
    'the carrier under the binding policy language. Consult a licensed attorney, licensed ' +
    'public adjuster, or your insurance carrier before acting on anything you see here.';

// Short variant for tight UI footers (already shown on screen + at the bottom
// of every results card).
export const LEGAL_DISCLAIMER_SHORT =
    'Informational only — not legal advice, public adjusting, or insurance adjusting.';

/**
 * Plain-text block suitable for clipboards, email bodies, PDF metadata,
 * and any other place that can't render HTML/JSX. Always emits the headline
 * + the full body separated by a blank line.
 */
export const disclaimerPlainText = () =>
    `${LEGAL_DISCLAIMER_HEADLINE}\n\n${LEGAL_DISCLAIMER_BODY}`;

/**
 * HTML footer block for the "Generate Report" PDF (Step 22) and the
 * "Share with Client" page (Step 24). Inline styles only so the markup
 * stays portable when piped through PDF renderers / portal HTML.
 */
export const disclaimerHtmlFooter = () => `
<section
    role="note"
    aria-label="Legal disclaimer"
    style="
        margin-top: 24px;
        padding: 14px 16px;
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #78350f;
    "
>
    <p style="font-weight: 600; font-size: 13px; margin: 0 0 6px 0;">
        ${LEGAL_DISCLAIMER_HEADLINE}
    </p>
    <p style="font-size: 11px; line-height: 1.5; margin: 0;">
        ${LEGAL_DISCLAIMER_BODY}
    </p>
</section>`.trim();

/**
 * Decorator: any output payload destined for the user gets the disclaimer
 * attached. Use this when emitting JSON (e.g. exported analysis bundles)
 * so downstream consumers can't accidentally drop the disclaimer.
 *
 *   const exportable = withDisclaimer({ ...analysisRow });
 *   // exportable.disclaimer === { headline, body, short }
 */
/**
 * HTML-escape helper for any value embedded into the report HTML. Kept tiny
 * and dependency-free so the disclaimer module remains pure utility code.
 */
export const escapeHtml = (v) => {
    if (v === null || v === undefined) return '';
    return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

export const withDisclaimer = (payload) => ({
    ...payload,
    disclaimer: {
        headline: LEGAL_DISCLAIMER_HEADLINE,
        body: LEGAL_DISCLAIMER_BODY,
        short: LEGAL_DISCLAIMER_SHORT,
    },
});
