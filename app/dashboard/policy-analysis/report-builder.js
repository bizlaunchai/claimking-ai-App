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

export const buildAnalysisReportHtml = ({ analysis, client, company }) => {
    if (!analysis) return '';

    // Contractor branding — falls back to ClaimKing.AI if the company hasn't
    // set a business name / logo. `company.logo` is a self-contained data: URI
    // (built in PolicyAnalysis.jsx) so it survives into the print popup.
    const brandName = company?.name?.trim() || 'ClaimKing.AI';
    const logoHtml = company?.logo
        ? `<img class="brand-logo" src="${company.logo}" alt="${escapeHtml(brandName)} logo" />`
        : '';

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
    <div class="brand-row">
        ${logoHtml}
        <div class="title">${escapeHtml(brandName)} — Policy Analysis Report</div>
    </div>
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
export const openAnalysisReport = ({ analysis, client, company, onPopupBlocked }) => {
    const body = buildAnalysisReportHtml({ analysis, client, company });
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
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5pt; line-height: 1.6; color: #1f2937; max-width: 780px; margin: 28px auto; padding: 0 28px; -webkit-font-smoothing: antialiased; }
.report-header { border-bottom: 2px solid #c9a24b; padding-bottom: 18px; margin-bottom: 26px; }
.report-header .brand-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.report-header .brand-logo { max-height: 46px; max-width: 180px; width: auto; height: auto; object-fit: contain; }
.report-header .title { font-size: 19pt; font-weight: 700; color: #0f2a4a; letter-spacing: -0.01em; line-height: 1.2; }
.report-header .meta { font-size: 9.5pt; color: #6b7280; line-height: 1.7; }
.report-header .client { font-size: 10pt; color: #374151; font-weight: 500; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
.hero { padding: 18px 20px; background: #f7f9fc; border: 1px solid #e2e8f0; border-left: 4px solid #0f2a4a; border-radius: 8px; margin-bottom: 24px; }
.hero .summary h2 { margin: 0 0 8pt 0; font-size: 11pt; color: #0f2a4a; text-transform: uppercase; letter-spacing: 0.06em; }
.hero .summary p { margin: 0; font-size: 11.5pt; line-height: 1.65; color: #374151; }
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
.section { margin-bottom: 22px; page-break-inside: avoid; }
.section h2 { font-size: 11pt; margin: 0 0 10pt 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 6pt; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
.section ul { padding: 0; margin: 0; list-style: none; }
.section li { padding: 10px 0; border-bottom: 1px dashed #e5e7eb; }
.section li:last-child { border-bottom: none; }
.section .title { font-weight: 600; color: #111827; margin: 0 0 3pt 0; }
.section blockquote { margin: 4pt 0 0 0; padding: 4pt 8pt; border-left: 3px solid #9ca3af; font-style: italic; color: #4b5563; font-size: 10pt; }
.section .muted { color: #6b7280; font-size: 10pt; }
.section .empty { color: #9ca3af; font-style: italic; font-size: 10pt; }
.kv-row { padding: 3pt 0; display: flex; gap: 6pt; }
.kv-row .kv-key { flex: 0 0 auto; min-width: 130px; }
.kv-key { color: #6b7280; text-transform: capitalize; }
.kv-block { margin: 6pt 0; padding-left: 10pt; border-left: 2px solid #e5e7eb; }
.kv-block > .kv-key { font-weight: 600; color: #374151; margin-bottom: 3pt; }
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
