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

const fmtList = (items, render) => {
    if (!items || !items.length) return '<p class="empty">No items identified.</p>';
    return `<ul>${items.map(render).join('')}</ul>`;
};

const fmtSection = (title, html, accent = '#1f2937') => `
<section class="section">
    <h2 style="color:${accent}">${escapeHtml(title)}</h2>
    ${html}
</section>`;

const documentTypeLabel = (key) => {
    switch (key) {
        case 'policy': return 'Insurance Policy';
        case 'claim_document': return 'Claim Document';
        case 'denial_letter': return 'Denial Letter';
        case 'estimate': return 'Adjuster Estimate';
        case 'scope': return 'Scope of Work';
        case 'carrier_email': return 'Carrier Email';
        default: return key || '—';
    }
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
    const score = typeof analysis.coverage_score === 'number' ? analysis.coverage_score : 0;

    const cov = analysis.coverage_issues?.items ?? [];
    const exc = analysis.exclusions?.items ?? [];
    const matching = analysis.matching_issues?.items ?? [];
    const args = analysis.claim_arguments?.items ?? [];
    const next = analysis.next_steps?.items ?? [];

    const ded = analysis.deductible_info || {};
    const codeUp = analysis.code_upgrade_potential || {};
    const op = analysis.op_potential || {};
    const rcv = analysis.rcv_vs_acv || {};

    const dedRows = [
        ded.standard ? ['Standard', ded.standard] : null,
        ded.wind_hail ? ['Wind / Hail', ded.wind_hail] : null,
        ded.hurricane ? ['Hurricane', ded.hurricane] : null,
        ...(ded.other ?? []).map((o) => [o.name, o.value]),
    ].filter(Boolean);

    return `
<header class="report-header">
    <div class="title">ClaimKing.AI — Policy Analysis Report</div>
    <div class="meta">
        Document type: <strong>${escapeHtml(documentTypeLabel(analysis.document_type))}</strong>
        &nbsp;·&nbsp; Generated: ${escapeHtml(new Date().toLocaleString())}
    </div>
    ${client ? `<div class="client">${buildClientLine(client)}</div>` : ''}
</header>

<section class="hero">
    <div class="score">
        <div class="score-num">${score}/100</div>
        <div class="score-label">Coverage score</div>
    </div>
    <div class="summary">
        <h2>Summary</h2>
        <p>${escapeHtml(analysis.summary || '—')}</p>
    </div>
</section>

<section class="snapshot">
    <h2>Snapshot</h2>
    <div class="snapshot-grid">
        <div class="card">
            <h3>Deductibles</h3>
            ${dedRows.length
                ? `<table>${dedRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}</table>`
                : '<p class="empty">No deductibles detected.</p>'}
        </div>
        <div class="card">
            <h3>RCV vs ACV</h3>
            <p class="big">${escapeHtml(rcv.type || 'unknown')}</p>
            <p>${escapeHtml(rcv.detail || '—')}</p>
            ${rcv.depreciation_amount
                ? `<p class="muted">Depreciation: ${escapeHtml(rcv.depreciation_amount)}</p>` : ''}
        </div>
        <div class="card">
            <h3>Code Upgrade Potential</h3>
            <p class="big">${codeUp.available ? 'Available' : 'Not detected'}</p>
            ${codeUp.percent_or_amount ? `<p><strong>${escapeHtml(codeUp.percent_or_amount)}</strong></p>` : ''}
            <p>${escapeHtml(codeUp.detail || '—')}</p>
        </div>
        <div class="card">
            <h3>O&amp;P Potential</h3>
            <p class="big">${op.applicable ? 'Applicable' : 'Not applicable'}</p>
            ${typeof op.trades_count === 'number' ? `<p>Trades: <strong>${op.trades_count}</strong></p>` : ''}
            <p>${escapeHtml(op.detail || '—')}</p>
        </div>
    </div>
</section>

${fmtSection('Coverage Issues',
    fmtList(cov, (it) => `
        <li>
            <p class="title">${escapeHtml(it.title)} <span class="badge sev-${escapeHtml(it.severity || 'low')}">${escapeHtml(it.severity || 'low')}</span></p>
            <p>${escapeHtml(it.detail)}</p>
        </li>`),
    '#b91c1c')}

${fmtSection('Exclusions',
    fmtList(exc, (it) => `
        <li>
            <p class="title">${escapeHtml(it.title)}</p>
            <p>${escapeHtml(it.detail)}</p>
            ${it.source_quote ? `<blockquote>“${escapeHtml(it.source_quote)}”</blockquote>` : ''}
        </li>`))}

${fmtSection('Matching Issues',
    fmtList(matching, (it) => `
        <li>
            <p class="title">${escapeHtml(it.title)}</p>
            <p>${escapeHtml(it.detail)}</p>
            ${it.line_of_argument ? `<p class="muted">Argument: ${escapeHtml(it.line_of_argument)}</p>` : ''}
        </li>`),
    '#c2410c')}

${fmtSection('Potential Claim Arguments',
    fmtList(args, (it) => `
        <li>
            <p class="title">${escapeHtml(it.title)}</p>
            <p>${escapeHtml(it.argument)}</p>
            ${it.supporting_clause ? `<blockquote>“${escapeHtml(it.supporting_clause)}”</blockquote>` : ''}
        </li>`),
    '#1d4ed8')}

${fmtSection('Next Steps',
    fmtList(next, (it) => `
        <li>
            <p class="title">${escapeHtml(it.title)} <span class="badge aud-${escapeHtml(it.audience || 'both')}">${escapeHtml(it.audience || 'both')}</span></p>
            <p>${escapeHtml(it.detail)}</p>
        </li>`),
    '#92400e')}

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
