// ─────────────────────────────────────────────────────────────────────────────
// Policy Analysis — printable report builder
//
// Builds a self-contained HTML document for an analysis row and opens it in
// a popup window with `window.print()` queued, matching the existing
// document-generator + estimation print pattern in this codebase. No PDF
// library required — the browser produces the PDF via "Save as PDF".
//
// Every report MUST end with the legal disclaimer (compliance). The footer
// is rendered by disclaimer.disclaimerHtmlFooter() so the disclaimer module
// stays the single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

import { disclaimerHtmlFooter, escapeHtml } from './disclaimer';

const fmtSection = (title, html, accent = '#1f2937') => `
<section class="section">
    <h2 style="color:${accent}">${escapeHtml(title)}</h2>
    ${html}
</section>`;

const documentTypeLabel = (key) => {
    switch (key) {
        case 'policy': return 'Insurance Policy';
        case 'claim_ack': return 'Claim Acknowledgment';
        case 'denial': return 'Denial Letter';
        case 'adjuster_estimate': return 'Adjuster Estimate';
        case 'scope_of_work': return 'Scope of Work';
        case 'email_thread': return 'Carrier Email';
        case 'unknown': return 'Unknown';
        default: return key || '—';
    }
};

// Generic recursive renderer for the type-specific extracted_data object.
const renderExtracted = (value) => {
    if (value == null || value === '') return '';
    if (Array.isArray(value)) {
        if (!value.length) return '';
        return `<ul>${value.map((v) => `<li>${renderExtracted(v)}</li>`).join('')}</ul>`;
    }
    if (typeof value === 'object') {
        const rows = Object.entries(value)
            .filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length))
            .map(([k, v]) => {
                const label = escapeHtml(k.replace(/_/g, ' '));
                if (typeof v === 'object') {
                    return `<div class="kv-block"><div class="kv-key">${label}</div>${renderExtracted(v)}</div>`;
                }
                return `<div class="kv-row"><span class="kv-key">${label}:</span> <span>${escapeHtml(String(v))}</span></div>`;
            });
        return rows.join('');
    }
    return escapeHtml(String(value));
};

const buildClientLine = (client) => {
    if (!client) return '';
    const name =
        client.full_name ||
        `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
    const addr = [client.address, client.city, client.state, client.zip_code]
        .filter(Boolean).join(', ');
    return [name, addr, client.insurance_carrier, client.policy_number]
        .filter(Boolean).map(escapeHtml).join(' · ');
};

export const buildAnalysisReportHtml = ({ analysis, client }) => {
    if (!analysis) return '';

    const deadlines = Array.isArray(analysis.critical_deadlines) ? analysis.critical_deadlines : [];
    const actions = Array.isArray(analysis.suggested_actions) ? analysis.suggested_actions : [];
    const extracted = analysis.extracted_data || {};

    const metaBits = [
        `Document type: <strong>${escapeHtml(documentTypeLabel(analysis.document_type))}</strong>`,
        analysis.detected_carrier ? `Carrier: <strong>${escapeHtml(analysis.detected_carrier)}</strong>` : '',
        analysis.document_date ? `Document date: ${escapeHtml(analysis.document_date)}` : '',
        `Generated: ${escapeHtml(new Date().toLocaleString())}`,
    ].filter(Boolean).join('&nbsp;·&nbsp;');

    return `
<header class="report-header">
    <div class="title">ClaimKing.AI — Policy Analysis Report</div>
    <div class="meta">${metaBits}</div>
    ${client ? `<div class="client">${buildClientLine(client)}</div>` : ''}
</header>

<section class="hero">
    <div class="summary">
        <h2>Summary</h2>
        <p>${escapeHtml(analysis.summary || '—')}</p>
    </div>
</section>

${deadlines.length ? fmtSection('Critical Deadlines',
    `<ul>${deadlines.map((d) => `
        <li>
            <p class="title">${escapeHtml(d.description || '—')}</p>
            <p class="muted">${escapeHtml(d.date || 'No date')}${typeof d.days_remaining === 'number' ? ` · ${d.days_remaining} day(s) remaining` : ''}</p>
        </li>`).join('')}</ul>`,
    '#b91c1c') : ''}

${actions.length ? fmtSection('Suggested Actions',
    `<ul>${actions.map((a) => `
        <li>
            <p class="title">${a.done ? '☑' : '☐'} ${escapeHtml(a.title || '—')}</p>
            ${a.detail ? `<p>${escapeHtml(a.detail)}</p>` : ''}
        </li>`).join('')}</ul>`,
    '#92400e') : ''}

${fmtSection('Extracted Details',
    renderExtracted(extracted) || '<p class="empty">No structured data extracted.</p>',
    '#1d4ed8')}

${disclaimerHtmlFooter()}
`;
};

/**
 * Open the report in a new window and queue the print dialog. Mirrors the
 * existing DocumentResultModal / Estimation print-to-PDF pattern so no new
 * runtime dependency is required.
 */
export const openAnalysisReport = ({ analysis, client, onPopupBlocked }) => {
    const body = buildAnalysisReportHtml({ analysis, client });
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
        onPopupBlocked?.();
        return false;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Policy Analysis Report</title>
<style>
@media print { @page { margin: 0.6in; } }
* { box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5pt; line-height: 1.55; color: #1f2937; max-width: 780px; margin: 24px auto; padding: 0 24px; }
.report-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 18px; }
.report-header .title { font-size: 18pt; font-weight: 700; }
.report-header .meta, .report-header .client { font-size: 10pt; color: #6b7280; margin-top: 4px; }
.hero { display: flex; gap: 18px; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 18px; }
.hero .score { min-width: 110px; text-align: center; }
.hero .score-num { font-size: 26pt; font-weight: 700; color: #1d4ed8; line-height: 1; }
.hero .score-label { font-size: 9pt; color: #1d4ed8; }
.hero .summary h2 { margin: 0 0 4pt 0; font-size: 12pt; }
.hero .summary p { margin: 0; }
.snapshot h2 { font-size: 12pt; margin: 0 0 8pt 0; }
.snapshot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 18px; }
.card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; background: #f9fafb; }
.card h3 { font-size: 10pt; margin: 0 0 6pt 0; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
.card p { margin: 0 0 4pt 0; }
.card .big { font-size: 14pt; font-weight: 700; color: #111827; }
.card .muted { color: #6b7280; font-size: 9pt; }
.card table { width: 100%; font-size: 10.5pt; }
.card td { padding: 2pt 0; }
.card td:first-child { color: #6b7280; }
.section { margin-bottom: 16px; page-break-inside: avoid; }
.section h2 { font-size: 12pt; margin: 0 0 6pt 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
.section ul { padding: 0; margin: 0; list-style: none; }
.section li { padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
.section li:last-child { border-bottom: none; }
.section .title { font-weight: 600; color: #111827; }
.section blockquote { margin: 4pt 0 0 0; padding: 4pt 8pt; border-left: 3px solid #9ca3af; font-style: italic; color: #4b5563; font-size: 10pt; }
.section .muted { color: #6b7280; font-size: 10pt; }
.section .empty { color: #9ca3af; font-style: italic; font-size: 10pt; }
.kv-row { padding: 1pt 0; }
.kv-key { color: #6b7280; text-transform: capitalize; }
.kv-block { margin: 4pt 0; padding-left: 8pt; border-left: 2px solid #e5e7eb; }
.kv-block > .kv-key { font-weight: 600; color: #374151; margin-bottom: 2pt; }
.badge { display: inline-block; font-size: 8pt; padding: 1pt 6pt; border-radius: 4px; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.badge.sev-low { background: #f3f4f6; color: #374151; }
.badge.sev-medium { background: #fef3c7; color: #92400e; }
.badge.sev-high { background: #fee2e2; color: #991b1b; }
.badge.aud-contractor { background: #dbeafe; color: #1e40af; }
.badge.aud-homeowner { background: #ede9fe; color: #6b21a8; }
.badge.aud-both { background: #f3f4f6; color: #374151; }
</style>
</head>
<body>
${body}
<script>
window.onload = function () { setTimeout(function(){ window.focus(); window.print(); }, 200); };
</script>
</body></html>`);
    win.document.close();
    return true;
};
