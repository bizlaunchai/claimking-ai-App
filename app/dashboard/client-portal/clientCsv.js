/**
 * CSV export for client portals.
 *
 * Kept out of ClientPortal.jsx so the column list has one home and the
 * escaping rules are reviewable on their own. Column order deliberately
 * mirrors the Add-Client form (contact → property → insurance → claim →
 * adjuster → money → meta) so a spreadsheet reads like the UI.
 *
 * NOT exported, on purpose:
 *   - portal share tokens — they're the secret that grants portal access;
 *     a token in a spreadsheet that gets emailed around is an access leak
 *   - company_id / created_by / assigned_to_user_id — internal UUIDs with
 *     no meaning outside the database
 * `id` IS included (last column) so an exported sheet can be matched back
 * to live records.
 */

/** Column definitions: [header shown in the sheet, value getter]. */
const COLUMNS = [
    // ── Contact ──
    ['Full Name',        (c) => c.full_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()],
    ['First Name',       (c) => c.first_name],
    ['Last Name',        (c) => c.last_name],
    ['Email',            (c) => c.email],
    ['Phone',            (c) => c.phone],

    // ── Property ──
    ['Address',          (c) => c.address],
    ['City',             (c) => c.city],
    ['State',            (c) => c.state],
    ['ZIP Code',         (c) => c.zip_code],
    ['Property Type',    (c) => c.property_type],

    // ── Insurance ──
    ['Insurance Company', (c) => c.insurance_company],
    ['Insurance Carrier', (c) => c.insurance_carrier],
    ['Policy Number',     (c) => c.policy_number],
    ['Claim Number',      (c) => c.claim_number],

    // ── Claim ──
    ['Stage #',          (c) => c.claim_status],
    ['Stage',            (c) => c.status_label],
    ['Damage Type',      (c) => c.damage_type],
    ['Priority',         (c) => c.priority],
    ['Date of Loss',     (c) => formatDate(c.date_of_loss)],
    ['Progress %',       (c) => c.progress],

    // ── Adjuster ──
    ['Adjuster Name',    (c) => c.adjuster_name],
    ['Adjuster Email',   (c) => c.adjuster_email],
    ['Adjuster Phone',   (c) => c.adjuster_phone],

    // ── Money ── (raw numbers, no "$" or thousands separators — a currency
    // symbol makes Excel treat the column as text and breaks SUM())
    ['Claim Value',      (c) => c.claim_value],
    ['Approved Amount',  (c) => c.approved_amount],
    ['Paid Amount',      (c) => c.paid_amount],

    // ── Meta ──
    ['Documents',        (c) => c.documents_count],
    ['Notes',            (c) => c.notes],
    ['Created At',       (c) => formatDateTime(c.created_at)],
    ['Last Updated',     (c) => formatDateTime(c.updated_at)],
    ['Client ID',        (c) => c.id],
];

/** Header row, for showing the user what they're about to get. */
export const CSV_COLUMN_NAMES = COLUMNS.map(([header]) => header);

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
}

function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    // "YYYY-MM-DD HH:MM" — sorts correctly as text in every spreadsheet.
    return `${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Escape one value per RFC 4180.
 *
 * Two things beyond quoting:
 *  - Formula injection: Excel/Sheets execute a cell starting with = + - @
 *    (or tab/CR). Client names and notes are user-supplied, so a crafted
 *    value could fire a formula on whoever opens the sheet. Prefixing with
 *    a single quote neutralises it — the cell still displays as typed.
 *  - null/undefined become empty, never the literal string "null".
 */
function escapeCsv(value) {
    if (value === null || value === undefined) return '';

    let str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;

    // Quote when the value contains a delimiter, a quote, or a line break.
    // Inner double quotes are escaped by doubling them.
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

/** Build the full CSV text (header + rows) for a list of clients. */
export function buildClientsCsv(clients) {
    const header = COLUMNS.map(([name]) => escapeCsv(name)).join(',');
    const rows = clients.map((client) =>
        COLUMNS.map(([, getValue]) => escapeCsv(getValue(client))).join(','),
    );
    // CRLF is what RFC 4180 specifies and what Excel on Windows expects.
    return [header, ...rows].join('\r\n');
}

/**
 * Trigger a browser download of `csv` as `filename`.
 *
 * The ﻿ BOM is what makes Excel read the file as UTF-8 — without it,
 * accented names and non-Latin characters render as mojibake.
 */
export function downloadCsv(csv, filename) {
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke on the next tick — revoking synchronously can cancel the
    // download in some browsers before it starts.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `clients-all-2026-07-22.csv` */
export function csvFilename(scope) {
    return `clients-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
}
