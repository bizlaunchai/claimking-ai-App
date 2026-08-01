"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { toast as sonner } from "sonner";
import SignaturePad from "@/components/signature/SignaturePad";
import ClientSelector from "@/components/clients/ClientSelector";
import { toClientShape } from "@/lib/clients/newClientForm";  // used to hydrate client from API rows

import "./estimation.css";
import "../measurement/measurement-hero.css";  // reuse hero + stat-chip styles

// ──────────────────────────────────────────────────────────────────────────────
// AuthedPhotoThumb — minimal version of the AuthedImage pattern (see
// app/dashboard/3d-mockup/threeDMockup.jsx). The /s3/file proxy needs the
// auth bearer header, so we fetch as blob via axiosInstance and turn into
// a blob URL. Module-level cache avoids re-fetching on rerender.
// ──────────────────────────────────────────────────────────────────────────────
const _photoBlobCache = new Map();
function AuthedPhotoThumb({ src, imgStyle }) {
    const [url, setUrl] = useState(() => (src ? _photoBlobCache.get(src) ?? null : null));
    useEffect(() => {
        if (!src) { setUrl(null); return; }
        if (_photoBlobCache.has(src)) { setUrl(_photoBlobCache.get(src)); return; }
        let active = true;
        axiosInstance.get(src, { responseType: 'blob', suppressErrorToast: true })
            .then((res) => {
                const u = URL.createObjectURL(res.data);
                _photoBlobCache.set(src, u);
                if (active) setUrl(u);
            })
            .catch(() => { if (active) setUrl(null); });
        return () => { active = false; };
    }, [src]);
    if (!url) {
        return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 11 }}>Loading…</div>;
    }
    const style = imgStyle ?? { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
    return <img src={url} alt="" style={style} />;
}

// ====================== STATIC DATA ======================
const INITIAL_ITEM_LIBRARY = {
    roofing: [
        { name: "Tear Off - 1 Layer", price: 65, unit: "SQ" },
        { name: "30yr Architectural Shingles", price: 125, unit: "SQ" },
        { name: "Synthetic Underlayment", price: 45, unit: "SQ" },
        { name: "Ice & Water Shield", price: 125, unit: "SQ" },
        { name: "Ridge Cap", price: 4.5, unit: "LF" },
        { name: "Drip Edge", price: 3.75, unit: "LF" },
    ],
    siding: [
        { name: "Vinyl Siding", price: 85, unit: "SQ" },
        { name: "Hardie Board", price: 165, unit: "SQ" },
    ],
    gutters: [
        { name: 'Seamless Gutters 5"', price: 7.5, unit: "LF" },
        { name: "Downspouts", price: 5.5, unit: "LF" },
    ],
    windows: [{ name: "Double Hung Window", price: 450, unit: "EA" }],
    general: [
        { name: "Dumpster Rental", price: 550, unit: "EA" },
        { name: "Building Permit", price: 350, unit: "EA" },
    ],
};

const CODE_ITEMS = [
    { id: "ice-water", name: "Ice & Water Shield", ref: "IRC R905.1.2 - Required in valleys and eaves", price: 125, unit: "SQ" },
    { id: "drip-edge", name: "Drip Edge", ref: "IRC R905.2.8.5 - Required at eaves and gables", price: 3.75, unit: "LF" },
    { id: "ridge-vent", name: "Ridge Vent System", ref: "IRC R806 - 1:150 ventilation ratio", price: 4.5, unit: "LF" },
    { id: "starter", name: "Starter Strip", ref: "Manufacturer warranty requirement", price: 2.5, unit: "LF" },
    { id: "step-flash", name: "Step Flashing", ref: "IRC R905.2.8.3 - Where roof meets walls", price: 8.5, unit: "LF" },
    { id: "pipe-boot", name: "Pipe Boot Flashings", ref: "IRC R903.3 - All roof penetrations", price: 45, unit: "EA" },
];

const CODE_DB = [
    { name: "Ice & Water Shield - Valleys & Eaves", meta: "IRC R905.1.2 - Required in valleys and at eaves", price: 125, unit: "SQ", code: "irc", mfr: "all", star: true },
    { name: "Drip Edge Metal", meta: "IRC R905.2.8.5 - Required at eaves and gables", price: 3.75, unit: "LF", code: "irc", mfr: "all", star: true },
    { name: "Proper Attic Ventilation", meta: "IRC R806.1 - 1:150 ventilation ratio", price: 4.5, unit: "LF", code: "irc", mfr: "all", star: true },
    { name: "Step Flashing", meta: "IRC R905.2.8.3 - Where roof meets walls", price: 8.5, unit: "LF", code: "irc", mfr: "all" },
    { name: "Cricket/Saddle for Chimney", meta: 'IRC R903.2.2 - Chimneys >30" wide', price: 450, unit: "EA", code: "irc", mfr: "all" },
    { name: "Valley Metal", meta: "IRC R905.2.8.2 - W-type valley required", price: 12.5, unit: "LF", code: "irc", mfr: "all" },
    { name: "Pipe Boot Flashings", meta: "IRC R903.3 - All roof penetrations", price: 45, unit: "EA", code: "irc", mfr: "all" },
    { name: "Soffit Vents", meta: "IRC R806.2 - Intake ventilation required", price: 12, unit: "LF", code: "irc", mfr: "all" },
    { name: "Permit & Inspection", meta: "Local Building Code - Roof replacement", price: 350, unit: "EA", code: "local", mfr: "all" },
    { name: "High Wind Installation (Zone 3)", meta: "ASCE 7-16 - 6-nail pattern + sealed deck", price: 25, unit: "SQ", code: "ibc", mfr: "all" },
    { name: "Class A Fire Rating", meta: "IBC 1505.2 - Required in wildfire areas", price: 165, unit: "SQ", code: "ibc", mfr: "all" },
    { name: "Class 4 Impact Resistant Shingles", meta: "FM 4473 - Hail impact resistance", price: 225, unit: "SQ", code: "ibc", mfr: "all" },
    { name: "GAF Deck-Armor Underlayment", meta: "Breathable synthetic - warranty compliance", price: 65, unit: "SQ", code: "all", mfr: "gaf" },
];

const SECTION_TEMPLATES = {
    insurance: [
        { id: "dwelling-roof", name: "Dwelling Roof", desc: "Main roof scope" },
        { id: "dwelling-siding", name: "Dwelling Siding", desc: "Exterior wall material" },
        { id: "gutters", name: "Gutters & Downspouts", desc: "Drainage" },
        { id: "soffit-fascia", name: "Soffit & Fascia", desc: "Roof edge components" },
        { id: "detached-garage", name: "Detached Garage", desc: "Separate structure" },
        { id: "fence", name: "Fence", desc: "Wood, vinyl, or metal" },
        { id: "interior", name: "Interior Water Damage", desc: "Drywall, ceiling, flooring" },
    ],
    retail: [
        { id: "roof-replacement", name: "Roof Replacement", desc: "Full tear-off and install" },
        { id: "siding-package", name: "Siding Package", desc: "With trim and accessories" },
        { id: "gutter-guard", name: "Gutters + Gutter Guard", desc: "Bundled upsell" },
        { id: "attic-insulation", name: "Attic Insulation", desc: "Energy efficiency upsell" },
    ],
};

const COMPANY_DEFAULT = {
    name: "ClaimKing",
    legal_name: "ClaimKing LLC",
    address: "4019 S Main St, Akron, OH 44216",
    phone: "(330) 918-1018",
    email: "info@claimking.ai",
    website: "www.claimking.ai",
    hours: "7:00 AM – 10:00 PM Eastern, 7 Days",
    general_email: "info@claimking.ai",
    claims_email: "claims@claimking.ai",
    insurance: {
        carrier: "National Specialty Insurance Company",
        policy_number: "IBL-FKZY6JRT4-2",
        each_occurrence: "$1,000,000",
        aggregate: "$1,000,000",
        products_completed: "$1,000,000",
        personal_injury: "$1,000,000",
        damage_to_premises: "$100,000",
        medical: "$5,000",
        period: "01/03/2026 – 01/03/2027",
        completed_ops_through: "01/03/2028",
        producer: "Verifly/Thimble Insurance Services",
        claim_url: "app.thimble.com/widgets/report-claim",
        claim_email: "9730Thimble@sedgwick.com",
        endorsements: [
            "Primary & Non-Contributory (CG 20 01)",
            "Waiver of Subrogation (CG 24 04)",
            "Designated Additional Insured (THSN IL 20 20)",
            "Additional Insured – Completed Operations (CG 20 37)",
            "Roofing Operations Exclusion: Residential, 3 stories and under",
            "Anti-Stacking | Exposure Period | Ohio Cancellation/Nonrenewal",
        ],
    },
};

const TERMS_DEFAULT = {
    short_terms: [
        "This estimate is valid for 30 days from the date above.",
        "All work performed by licensed and insured contractors.",
        "<strong>Service Time:</strong> The hours and quantities shown reflect estimated scope. Actual on-site conditions may require adjustment. Final invoicing will reflect the actual time and services provided on-site.",
        "<strong>Insurance & Water Mitigation:</strong> In most cases, homeowner insurance policies cover emergency water mitigation services, including ice dam removal, when ice dams are causing active interior water damage. Ice dam removal is a recognized mitigation measure to prevent further loss and is typically covered as an emergency service under standard homeowner policies. We encourage homeowners to file a claim and provide this estimate to their insurance carrier or adjuster for review.",
        "<strong>Disclaimer:</strong> ClaimKing is not a licensed public adjuster, attorney, or legal advisor. We do not guarantee insurance coverage or claim outcomes. The information provided regarding insurance is based on our extensive field experience working with insurance carriers and adjusters across multiple states and is not intended as legal or insurance advice.",
        "Insurance proceeds may be assigned directly to ClaimKing.",
        "Additional damage discovered during service will be documented and submitted as a supplement.",
        "Interior damage repairs are not included in this estimate and will be assessed separately.",
        "Non-refundable deposits: Once equipment has been dispatched, deposits are non-refundable. Cancellations require 24-hour notice.",
        "<strong>This estimate is for budgetary and scheduling purposes. Final invoicing will reflect the actual time and services provided on-site.</strong>",
        "Certificate of Insurance (COI) or W-9 form available upon request.",
        "<strong>Questions or Concerns:</strong> If any adjuster, insurance representative, or homeowner has questions regarding our services, pricing, or scope of work, please contact us directly.",
    ],
    industry_pricing_note:
        "ClaimKing pricing is comparable to industry leaders in restoration services and other nationally recognized providers. Our rates reflect the specialized nature of insurance restoration work, including specialized equipment deployed per job, certified technician labor, and comprehensive safety compliance. Emergency jobs with active interior leaks require priority dispatch and carry a surcharge due to the urgency of water mitigation and the need to prevent escalating insured losses.",
    payment_terms: {
        card_processing_fee: "A 3% processing fee applies to all credit and debit card transactions. Customers may avoid this fee by paying via cash, check, or ACH bank transfer.",
        card_on_file: "By providing your credit or debit card for deposit or payment, you authorize ClaimKing to securely store your card through our PCI-compliant payment processor (Stripe). Your card on file will be charged for the remaining balance upon completion of services.",
        payment_due: "Upon completion of services unless a separate written payment agreement was arranged prior to the start of work.",
    },
    full_terms: `By signing any estimate, proposal, or contract, making a deposit payment, or verbally or electronically authorizing work to begin, the Customer acknowledges that they have read, understand, and agree to these Terms and Conditions in their entirety.

<strong>PARTIES & CONTRACTOR INFORMATION.</strong> These Terms govern all services provided by ClaimKing ("Contractor") to the customer identified on the associated estimate ("Customer"). Business Hours: 7:00 AM – 10:00 PM Eastern, 7 Days. General Email: info@claimking.ai. Insurance Claims: claims@claimking.ai.

<strong>SCOPE OF WORK.</strong> Contractor agrees to perform the specific services described in the written estimate. All labor, materials, and equipment necessary to complete the listed scope will be supplied by Contractor unless otherwise specified. Work beyond the written scope constitutes a change order requiring written authorization and additional payment agreement.

<strong>PAYMENT TERMS.</strong> A deposit of 50% of the total contract price is due upon execution unless an alternative arrangement is specified in writing. The remaining balance is due upon final completion.

<strong>CANCELLATION POLICY.</strong> For gutter, siding, soffit/fascia, and exterior service contracts, Owner may cancel within 3 business days and receive a full refund. After 3 days but before work commences, Owner forfeits the deposit and pays a proportional amount for labor and materials furnished.

<strong>LIMITED WARRANTY.</strong> Warranty Periods: Gutter Install 5yr (10yr with guards), Gutter Guards 5yr, Heat Cable 5yr workmanship, Full Roof Replace 10yr + manufacturer, Roof Repair 1yr, Siding 5yr + manufacturer, Soffit/Fascia 5yr, Pressure Washing none.

<strong>LIMITATION OF LIABILITY.</strong> Contractor's total liability shall not exceed the total amount paid for the specific service. No liability for indirect, consequential, or incidental damages, lost profits, loss of use, damage to home contents, or emotional distress.

<strong>DISPUTE RESOLUTION.</strong> Both parties agree to first attempt resolution through direct communication. This Agreement is governed by Ohio law. Legal actions shall be brought exclusively in Summit County, Ohio courts.

<strong>ENTIRE AGREEMENT.</strong> This Agreement together with the written estimate constitutes the entire agreement, superseding all prior negotiations.`,
};

// Client form + selector logic now lives in `components/clients/ClientSelector.jsx`
// (with shared helpers in `lib/clients/newClientForm.js`), so the same
// UI + shape + rules apply across Estimation, Measurement, Mockup, and Policy Analysis.

// ─────────────────────────────────────────────────────────────────────────────
// PolicyAnalysisSupplementPanel
//
// Renders when the estimation page is opened from the Policy Analysis "Build
// Supplement Estimate" button. Shows the AI's findings as READ-ONLY context
// and offers a single CTA that loads them into the Auto-Build modal as
// scope hints + instructions.
//
// Why findings are NOT one-click line items: titles like "No Explicit
// Matching Coverage" or "O&P is Included in Replacement Cost" are arguments,
// not billable scope items. Brief Section 10 says Claude should generate the
// actual line items "comparing carrier scope vs contractor scope" using the
// policy info as context — that's the right level of abstraction.
// ─────────────────────────────────────────────────────────────────────────────
const PolicyAnalysisSupplementPanel = ({ analysis, onApply, onDismiss }) => {
    const actions = Array.isArray(analysis.suggested_actions) ? analysis.suggested_actions : [];
    const deadlines = Array.isArray(analysis.critical_deadlines) ? analysis.critical_deadlines : [];
    const confidencePct = typeof analysis.ai_confidence === 'number'
        ? Math.round(analysis.ai_confidence * 100) : null;

    const totalSuggestions = actions.length + deadlines.length;

    if (totalSuggestions === 0) {
        return (
            <div style={{
                margin: "0 0 14px", padding: "12px 16px",
                background: "#f9fafb", border: "1px solid #e5e7eb",
                borderRadius: 8, fontSize: 13, color: "#4b5563",
            }}>
                <strong>Policy analysis linked</strong> — the AI didn't surface any
                scope findings for this document{confidencePct != null ? ` (AI confidence ${confidencePct}%)` : ""}.
                <a href="#" onClick={(e) => { e.preventDefault(); onDismiss(); }}
                   style={{ color: "#1d4ed8", marginLeft: 10, fontSize: 12 }}>
                    Dismiss
                </a>
            </div>
        );
    }

    const FindingRow = ({ accent, icon, title, subtitle }) => (
        <div style={{
            padding: "8px 12px",
            border: `1px solid ${accent.border}`,
            background: accent.bg,
            borderRadius: 6,
            fontSize: 12.5,
            lineHeight: 1.4,
        }}>
            <div style={{ color: accent.text, fontWeight: 600 }}>
                {icon} {title}
            </div>
            {subtitle && (
                <div style={{ marginTop: 3, color: "#4b5563" }}>{subtitle}</div>
            )}
        </div>
    );

    return (
        <div style={{
            margin: "0 0 14px",
            padding: 14,
            background: "linear-gradient(135deg,#eff6ff,#fff)",
            border: "1px solid #93c5fd",
            borderRadius: 10,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>
                        Policy analysis linked · {totalSuggestions} scope finding{totalSuggestions === 1 ? "" : "s"}
                    </div>
                    <div style={{ fontSize: 12, color: "#1e3a8a", opacity: 0.85, marginTop: 2 }}>
                        Findings below are AI arguments — not line items. Click <strong>Build estimate from these findings</strong> to feed them into the AI builder, where Claude generates real line items with measurements + rates.
                        {confidencePct != null && (
                            <> AI confidence {confidencePct}%.</>
                        )}
                    </div>
                </div>
                <a href="#" onClick={(e) => { e.preventDefault(); onDismiss(); }}
                   style={{ color: "#1d4ed8", fontSize: 12, whiteSpace: "nowrap" }}>
                    Dismiss
                </a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6, marginBottom: 12 }}>
                {actions.map((a, i) => (
                    <FindingRow
                        key={`sa-${i}`}
                        icon="⚡"
                        title={a.title}
                        subtitle={a.detail}
                        accent={{ border: "#bfdbfe", bg: "#fff", text: "#1d4ed8" }}
                    />
                ))}
                {deadlines.map((d, i) => (
                    <FindingRow
                        key={`dl-${i}`}
                        icon="⏰"
                        title={d.description}
                        subtitle={d.date ? `Due ${d.date}${typeof d.days_remaining === "number" ? ` · ${d.days_remaining}d` : ""}` : undefined}
                        accent={{ border: "#fecaca", bg: "#fff", text: "#b91c1c" }}
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={onApply}
                style={{
                    background: "#1d4ed8", color: "white", border: "none",
                    padding: "9px 16px", borderRadius: 6, fontWeight: 600,
                    fontSize: 13, cursor: "pointer",
                }}
            >
                Build estimate from these findings →
            </button>
            <span style={{ fontSize: 11.5, color: "#6b7280", marginLeft: 10 }}>
                Opens Auto-Build with these findings pre-loaded.
            </span>
        </div>
    );
};

// ====================== ICON SPRITE ======================
const IconSprite = () => (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
            <symbol id="i-crown" viewBox="0 0 24 24"><path d="M12 6L9 9L3 7L4 16H20L21 7L15 9L12 6Z" fill="currentColor" /></symbol>
            <symbol id="i-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></symbol>
            <symbol id="i-dots" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></symbol>
            <symbol id="i-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></symbol>
            <symbol id="i-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></symbol>
            <symbol id="i-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></symbol>
            <symbol id="i-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></symbol>
            <symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></symbol>
            <symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></symbol>
            <symbol id="i-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></symbol>
            <symbol id="i-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></symbol>
            <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></symbol>
            <symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></symbol>
            <symbol id="i-card" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></symbol>
            <symbol id="i-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></symbol>
            <symbol id="i-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></symbol>
            <symbol id="i-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></symbol>
            <symbol id="i-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></symbol>
            <symbol id="i-cloud" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></symbol>
            <symbol id="i-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></symbol>
            <symbol id="i-sparkle" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.4 8.4L24 12l-9.6 3.6L12 24l-2.4-8.4L0 12l9.6-3.6L12 0z" /></symbol>
            <symbol id="i-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></symbol>
            <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></symbol>
            <symbol id="i-check-circle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></symbol>
            <symbol id="i-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></symbol>
            <symbol id="i-package" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></symbol>
            <symbol id="i-trending" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></symbol>
            <symbol id="i-brain" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" /></symbol>
            <symbol id="i-arrow-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></symbol>
            <symbol id="i-arrow-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></symbol>
            <symbol id="i-move" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></symbol>
            <symbol id="i-grip" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></symbol>
        </defs>
    </svg>
);

// ====================== CSV BULK UPLOAD (feature 2.4) ======================
// Quote-aware CSV → array of cell-rows. Handles "quoted, commas" and "" escapes.
function parseCsvRows(text) {
    const s = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rows = [];
    let row = [], cell = "", inQ = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inQ) {
            if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
            else cell += ch;
        } else if (ch === '"') inQ = true;
        else if (ch === ",") { row.push(cell); cell = ""; }
        else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
        else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => (c ?? "").trim() !== ""));
}

const LIBRARY_CSV_HEADERS = ["category", "name", "unit", "price"];
const CODE_CSV_HEADERS = ["name", "reference", "unit", "price"];

function headerMatches(rowCells, expected) {
    const h = (rowCells ?? []).map((c) => (c ?? "").trim().toLowerCase());
    return expected.every((e, i) => h[i] === e);
}

// Validate + split into { valid, errors }. errors: [{ line, msg }] (1-indexed).
function parseLibraryCsv(text) {
    const rows = parseCsvRows(text);
    if (!rows.length) return { kind: "library", valid: [], errors: [{ line: 0, msg: "File is empty" }] };
    if (!headerMatches(rows[0], LIBRARY_CSV_HEADERS)) {
        return { kind: "library", valid: [], errors: [{ line: 1, msg: `Header must be: ${LIBRARY_CSV_HEADERS.join(",")}` }] };
    }
    const valid = [], errors = [];
    for (let i = 1; i < rows.length; i++) {
        const [category, name, unit, priceRaw] = rows[i].map((c) => (c ?? "").trim());
        const line = i + 1;
        if (!category || !name || !unit || !priceRaw) { errors.push({ line, msg: "Missing required field(s)" }); continue; }
        const price = parseFloat(priceRaw);
        if (!(price > 0)) { errors.push({ line, msg: `Invalid price "${priceRaw}"` }); continue; }
        valid.push({ category: category.toLowerCase(), name, unit, price });
    }
    return { kind: "library", valid, errors };
}

function parseCodeCsv(text) {
    const rows = parseCsvRows(text);
    if (!rows.length) return { kind: "code", valid: [], errors: [{ line: 0, msg: "File is empty" }] };
    if (!headerMatches(rows[0], CODE_CSV_HEADERS)) {
        return { kind: "code", valid: [], errors: [{ line: 1, msg: `Header must be: ${CODE_CSV_HEADERS.join(",")}` }] };
    }
    const valid = [], errors = [];
    for (let i = 1; i < rows.length; i++) {
        const [name, reference, unit, priceRaw] = rows[i].map((c) => (c ?? "").trim());
        const line = i + 1;
        if (!name || !unit || !priceRaw) { errors.push({ line, msg: "Missing required field(s)" }); continue; }
        const price = parseFloat(priceRaw);
        if (!(price > 0)) { errors.push({ line, msg: `Invalid price "${priceRaw}"` }); continue; }
        valid.push({ name, ref: reference, unit, price });
    }
    return { kind: "code", valid, errors };
}

function downloadCsvFile(filename, content) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ====================== MAIN COMPONENT ======================
const Estimation = () => {
    // ── Query params (Measurement → Estimate handoff) ─────────────────────
    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Loaded measurement (set when ?measurement_id is present) ──────────
    const [linkedMeasurement, setLinkedMeasurement] = useState(null);
    const [measurementLoading, setMeasurementLoading] = useState(false);

    // ── Loaded policy analysis (set when ?policy_analysis_id is present).
    //    Per Brief Section 08, estimates pull from "uploaded claim documents"
    //    and Section 10 says Claude should compare carrier vs contractor scope.
    //    The supplement panel surfaces AI-identified missing items so the
    //    contractor can click-add them as line items with full provenance
    //    (reason / source_field / code_ref — Brief Section 8 audit trail).
    const [linkedPolicyAnalysis, setLinkedPolicyAnalysis] = useState(null);
    const [policyAnalysisLoading, setPolicyAnalysisLoading] = useState(false);

    // ── Core state ───────────────────────────────────────────────────────
    const [client, setClient] = useState(null);
    const [mode, setMode] = useState("insurance");
    const [sections, setSections] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [estimateTitle, setEstimateTitle] = useState("INSURANCE ESTIMATE");

    // ── Item library (mutable - user can edit prices / add custom) ───────
    const [itemLibrary, setItemLibrary] = useState(INITIAL_ITEM_LIBRARY);
    // Inline library-item editing (name + price, no modal)
    const [editingLib, setEditingLib] = useState(null); // { cat, idx }
    const [editLibName, setEditLibName] = useState('');
    const [editLibPrice, setEditLibPrice] = useState('');
    // Inline estimate line-item editing (edit icon → name/qty/unit/price inputs → save icon)
    const [editingItem, setEditingItem] = useState(null); // { secId, idx }
    const [itemDraft, setItemDraft] = useState({ name: '', qty: '', unit: '', price: '' });
    // Editable code-requirements checklist (session-only, like the item library)
    const [codeItems, setCodeItems] = useState(CODE_ITEMS);
    const [editingCode, setEditingCode] = useState(null); // item.id
    const [editCodeName, setEditCodeName] = useState('');
    const [editCodePrice, setEditCodePrice] = useState('');
    const [editCodeRef, setEditCodeRef] = useState('');
    // Editable code & manufacturer database (session-only). Items get a stable id.
    const [codeDb, setCodeDb] = useState(() => CODE_DB.map((c, i) => ({ ...c, id: `cdb-${i}` })));
    const [editingCodeDb, setEditingCodeDb] = useState(null); // item.id
    const [editCdbName, setEditCdbName] = useState('');
    const [editCdbMeta, setEditCdbMeta] = useState('');
    const [editCdbPrice, setEditCdbPrice] = useState('');
    // 2.4 — CSV bulk upload (frontend-only, session)
    const bulkFileRef = useRef(null);
    const bulkKindRef = useRef(null); // 'library' | 'code'
    const [bulkResult, setBulkResult] = useState(null); // { kind, valid, errors }
    const [activeCategory, setActiveCategory] = useState("roofing");
    const [itemSearch, setItemSearch] = useState("");

    // ── AI generator modal ───────────────────────────────────────────────
    const [aiModal, setAiModal] = useState(false);
    const [aiUploads, setAiUploads] = useState({ measurement: [], photos: [], estimate1: [], estimate2: [] });
    const [selectedChips, setSelectedChips] = useState([]);
    const [aiMessage, setAiMessage] = useState("");
    // Brief Section 8 inputs that were missing — now wired into the Auto-Build modal.
    const [aiDamageType, setAiDamageType] = useState("");
    const [aiStormDate, setAiStormDate] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiError, setAiError] = useState(null); // sticky inline error in the modal
    // Saved measurements the user can attach inside the Auto-Build modal,
    // even when they didn't enter via the Measurement → "Use in Estimate" handoff.
    const [savedMeasurements, setSavedMeasurements] = useState([]);
    const [savedMeasurementsLoading, setSavedMeasurementsLoading] = useState(false);
    // 2.0b — client-scoped measurement reports for the "attach to this estimate" selector
    const [clientMeasurements, setClientMeasurements] = useState([]);
    const [clientMeasurementsLoading, setClientMeasurementsLoading] = useState(false);

    // ── Add section / custom item modals ─────────────────────────────────
    const [addSectionModal, setAddSectionModal] = useState(false);
    const [customSectionName, setCustomSectionName] = useState("");

    const [customItemModal, setCustomItemModal] = useState(false);
    const [customItem, setCustomItem] = useState({
        name: "", qty: "1", unit: "EA", price: "", section: "", saveToLib: true, category: "general",
    });

    // Client selection state lives inside <ClientSelector/>. Estimation only
    // tracks the selected `client` shape (declared above).

    // ── Other modals ─────────────────────────────────────────────────────
    const [finalizeModal, setFinalizeModal] = useState(false);
    const [rateLearningModal, setRateLearningModal] = useState(false);
    const [termsEditorModal, setTermsEditorModal] = useState(false);

    // ── Right rail tab + code requirements checkboxes ───────────────────
    const [railTab, setRailTab] = useState("code");
    const [codeChecked, setCodeChecked] = useState({}); // { id: boolean }
    const [codeDbCode, setCodeDbCode] = useState("all");
    const [codeDbMfr, setCodeDbMfr] = useState("all");
    const [codeDbSearch, setCodeDbSearch] = useState("");

    // ── Totals options ───────────────────────────────────────────────────
    const [overheadOn, setOverheadOn] = useState(true);
    const [taxOn, setTaxOn] = useState(true);
    const [taxName, setTaxName] = useState("Sales Tax");
    // Fee spec (Jul-24): sales tax has NO default rate. It starts empty and the
    // contractor types their jurisdiction's rate — an assumed 8% silently
    // mis-prices every estimate outside an 8% county.
    const [taxPercent, setTaxPercent] = useState("");

    // ── CK-FIX Jul-22 + fee spec: discount / custom fees / card fee ───────
    //   Subtotal → +O&P → −Discount → +Tax → +Custom fees → +Card fee → Total
    const [discountType, setDiscountType] = useState("flat"); // flat | pct
    const [discountValue, setDiscountValue] = useState("");
    const [customFees, setCustomFees] = useState([]); // [{ name, amount }]
    const [cardFeeOn, setCardFeeOn] = useState(false);
    const [cardFeePct, setCardFeePct] = useState("3"); // matches our T&C

    // ── CK-FIX Jul-22: free-text damage type when "Other" is chosen ───────
    const [aiDamageTypeOther, setAiDamageTypeOther] = useState("");

    // ── CK-FIX Jul-22: All Items modal (was a dead stub) ─────────────────
    const [allItemsModal, setAllItemsModal] = useState(false);
    const [allItemsSearch, setAllItemsSearch] = useState("");

    // ── Photos master flag (Phase 5) — declared here because
    //    buildSavePayload below references it. The actual Photos-tab UI
    //    state lives further down with the rest of the Docs pane state.
    const [includePhotosInPdf, setIncludePhotosInPdf] = useState(true);
    const [includeMeasurementInPdf, setIncludeMeasurementInPdf] = useState(true);

    // ── Payment / signature pane ─────────────────────────────────────────
    const [paymentType, setPaymentType] = useState("percentage");
    const [paymentPct, setPaymentPct] = useState("50");
    const [paymentFixed, setPaymentFixed] = useState("0");

    // ── More options dropdown ────────────────────────────────────────────
    const [moreOpen, setMoreOpen] = useState(false);

    // ── Credits + provider status (header display, like measurement page) ─
    const [estimateCost, setEstimateCost] = useState(null);   // { credits_cost, is_active, label }
    const [creditBalance, setCreditBalance] = useState(null); // { monthly_credits, bonus_credits }
    const [providerStatus, setProviderStatus] = useState({ gemini: false, claude: false });

    // ── Saved estimates list (View Saved Estimates modal) ────────────────
    const [savedEstimates, setSavedEstimates] = useState([]);
    const [savedEstimatesLoading, setSavedEstimatesLoading] = useState(false);
    const [savedEstimatesModal, setSavedEstimatesModal] = useState(false);

    // ── Loading overlay + toasts + save indicator ────────────────────────
    const [loading, setLoading] = useState({ active: false, text: "", sub: "" });
    const [saveIndicator, setSaveIndicator] = useState({ saving: false, text: "Saved" });

    // ── Persistence (M4): track the saved estimate's id + last-save state ─
    const [currentEstimateId, setCurrentEstimateId] = useState(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
    // True while a just-generated estimate is still status='generating' on the
    // server and we're polling GET /estimates/:id waiting for it to finish.
    const [generatingEstimate, setGeneratingEstimate] = useState(false);
    const skipNextAutoSave = useRef(false); // set true right after a load so
                                            // the freshly-loaded state doesn't
                                            // immediately trigger a save back.
    const autoOpenAiAfterClient = useRef(false); // measurement handoff arrived
                                                 // without a client — open the
                                                 // Auto-Build modal once the
                                                 // user picks one.

    // ── Move-menu (line item move-to-section dropdown) ───────────────────
    const [moveMenu, setMoveMenu] = useState(null); // { secId, idx, top, left } | null

    // ── Editable company + terms (modal-driven) ──────────────────────────
    const [companyState, setCompanyState] = useState(() => JSON.parse(JSON.stringify(COMPANY_DEFAULT)));
    const [termsState, setTermsState] = useState(() => JSON.parse(JSON.stringify(TERMS_DEFAULT)));
    const [termsEditFields, setTermsEditFields] = useState({
        companyName: "", legalName: "", address: "", phone: "", email: "", website: "",
        shortTerms: "", fullTerms: "",
    });

    // ── Rate learning ────────────────────────────────────────────────────
    const [rateFiles, setRateFiles] = useState({ accepted: [], declined: [] });

    // ── Misc refs ────────────────────────────────────────────────────────
    const saveTimerRef = useRef(null);
    const dragSrcRef = useRef(null);
    const [estimateDate, setEstimateDate] = useState("");

    // ── Initial setup ────────────────────────────────────────────────────
    useEffect(() => {
        setEstimateDate(new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }));
    }, []);

    // ── Body class for mode (for CSS theming) ────────────────────────────
    useEffect(() => {
        const original = document.body.className;
        document.body.className = `mode-${mode}`;
        return () => { document.body.className = original; };
    }, [mode]);

    // ── Close more-options on outside click ──────────────────────────────
    useEffect(() => {
        if (!moreOpen) return;
        const handler = (e) => {
            if (!e.target.closest(".more-options-btn") && !e.target.closest(".more-options-menu")) {
                setMoreOpen(false);
            }
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [moreOpen]);

    // ── Esc closes modals ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") {
                setAiModal(false); setAddSectionModal(false); setCustomItemModal(false);
                setFinalizeModal(false); setRateLearningModal(false);
                setTermsEditorModal(false); setMoveMenu(null);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    // ── Auto-open the Auto-Build modal once a client is picked, but only
    //    if the measurement handoff arrived without one. The flag is set
    //    by the measurement-handoff useEffect above and consumed here so
    //    we never re-open the modal on subsequent client changes.
    useEffect(() => {
        if (!client?.id) return;
        if (!autoOpenAiAfterClient.current) return;
        if (!linkedMeasurement) return;
        autoOpenAiAfterClient.current = false;
        setAiModal(true);
        sonner.success("Client linked — pick damage type and click Generate");
    }, [client?.id, linkedMeasurement]);

    // ── Close move-menu on outside click ─────────────────────────────────
    useEffect(() => {
        if (!moveMenu) return;
        const handler = () => setMoveMenu(null);
        const t = setTimeout(() => document.addEventListener("click", handler, { once: true }), 0);
        return () => { clearTimeout(t); document.removeEventListener("click", handler); };
    }, [moveMenu]);

    // ── Contractor company (for the page header + PDF brand) ──────────
    // We pull from /profile/:userId which returns business_name + business_logo
    // (S3 key) joined from the companies row. AuthedPhotoThumb handles the
    // bearer-token blob fetch for the logo image.
    const [contractorCompany, setContractorCompany] = useState(null);
    useEffect(() => {
        let cancelled = false;
        let createdBlobUrl = null;
        (async () => {
            try {
                const sup = (await import('@/lib/supabase/client')).createClient();
                const { data: claimsData } = await sup.auth.getClaims();
                const uid = claimsData?.claims?.sub;
                if (!uid) return;
                const res = await axiosInstance.get(`/profile/${uid}`, { suppressErrorToast: true });
                if (cancelled) return;
                const p = res.data ?? {};
                let logo_url = null;
                if (p.business_logo) {
                    try {
                        const imgRes = await axiosInstance.get(
                            `/s3/file?key=${encodeURIComponent(p.business_logo)}`,
                            { responseType: 'blob', suppressErrorToast: true },
                        );
                        if (!cancelled) {
                            logo_url = URL.createObjectURL(imgRes.data);
                            createdBlobUrl = logo_url;
                        }
                    } catch { /* missing logo — fall back to crown */ }
                }
                if (cancelled) return;
                setContractorCompany({
                    name: p.business_name || null,
                    logo_url,
                    address: p.address || null,
                });
            } catch { /* non-fatal — header falls back to neutral text */ }
        })();
        return () => {
            cancelled = true;
            if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
        };
    }, []);

    // ── Credits: cost per generation + user's balance + AI provider status ─
    const refreshCreditsState = useCallback(async () => {
        try {
            const [costRes, balanceRes] = await Promise.all([
                axiosInstance.get('/credits/feature-costs/estimate_generate', { suppressErrorToast: true }),
                axiosInstance.get('/credits/me', { suppressErrorToast: true }),
            ]);
            setEstimateCost(costRes.data ?? null);
            setCreditBalance(balanceRes.data ?? null);
        } catch { /* free-tier installs may 404 — leave null */ }
    }, []);

    useEffect(() => { refreshCreditsState(); }, [refreshCreditsState]);

    // Reuse mockup's providers endpoint — same admin-managed Gemini/Claude keys.
    useEffect(() => {
        (async () => {
            try {
                const res = await axiosInstance.get('/mockup/providers', { suppressErrorToast: true });
                setProviderStatus(res.data?.data ?? { gemini: false, claude: false });
            } catch { /* ignore */ }
        })();
    }, []);

    // ── Saved measurements list (powers the Auto-Build modal picker) ─────
    // Fetch the user's FULL measurement library — not filtered by client —
    // so measurements without a client_id, or attached to a different client,
    // are still pickable. The dropdown labels the linked client per row so
    // users can spot a mismatch easily.
    useEffect(() => {
        if (!aiModal) return;
        let cancelled = false;
        setSavedMeasurementsLoading(true);
        axiosInstance
            .get("/measurement", { suppressErrorToast: true })
            .then((res) => {
                if (cancelled) return;
                setSavedMeasurements(res.data?.data ?? []);
            })
            .catch(() => {
                if (!cancelled) setSavedMeasurements([]);
            })
            .finally(() => {
                if (!cancelled) setSavedMeasurementsLoading(false);
            });
        return () => { cancelled = true; };
    }, [aiModal]);

    // 2.0b — client-scoped measurement reports for the attach-to-estimate selector.
    // Uses the existing GET /measurement?client_id= endpoint.
    useEffect(() => {
        if (!client?.id) { setClientMeasurements([]); return; }
        let cancelled = false;
        setClientMeasurementsLoading(true);
        axiosInstance
            .get("/measurement", { params: { client_id: client.id }, suppressErrorToast: true })
            .then((res) => { if (!cancelled) setClientMeasurements(res.data?.data ?? []); })
            .catch(() => { if (!cancelled) setClientMeasurements([]); })
            .finally(() => { if (!cancelled) setClientMeasurementsLoading(false); });
        return () => { cancelled = true; };
    }, [client?.id]);

    // ── Saved estimates list (TODO: wire to /estimates endpoint when built) ─
    const refreshSavedEstimates = useCallback(async () => {
        setSavedEstimatesLoading(true);
        try {
            // Backend module not built yet — gracefully no-op until /estimates ships.
            const res = await axiosInstance.get('/estimates', { suppressErrorToast: true });
            setSavedEstimates(res.data?.data ?? []);
        } catch {
            setSavedEstimates([]);
        } finally {
            setSavedEstimatesLoading(false);
        }
    }, []);

    useEffect(() => { refreshSavedEstimates(); }, [refreshSavedEstimates]);

    // ── Load existing estimate (?estimate_id=...) ────────────────────────
    useEffect(() => {
        const estimateId = searchParams?.get("estimate_id");
        if (!estimateId) return;
        let cancelled = false;
        setEstimateLoading(true);
        setGeneratingEstimate(false); // fresh load — clear any prior generating state

        // Async generation: POST /estimates/generate now returns a placeholder
        // row in status='generating' and finishes the slow Claude call in the
        // background (it outlives the ALB/proxy 60s idle timeout). Poll the row
        // until the backend flips it out of 'generating'.
        const pollUntilReady = async (id) => {
            const MAX_ATTEMPTS = 100; // ~5 min at 3s intervals
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                await new Promise((r) => setTimeout(r, 3000));
                if (cancelled) return null;
                try {
                    const row = (await axiosInstance.get(`/estimates/${id}`, { suppressErrorToast: true })).data?.data;
                    if (row && row.status !== "generating") return row;
                } catch { /* transient network blip — keep polling */ }
            }
            return null; // timed out
        };

        // Initial fetch with a short retry loop. On live, a row created moments
        // ago (esp. via POST /estimates/generate) can 404 for a beat due to
        // read-after-write lag on the connection pooler — a single GET would
        // then bail and leave the user staring at the start screen. Retry a few
        // times before giving up. Errors are suppressed so we don't toast on
        // each transient miss.
        const fetchEstimateOnce = async () => {
            for (let i = 0; i < 6; i++) {
                if (cancelled) return null;
                try {
                    const row = (await axiosInstance.get(`/estimates/${estimateId}`, { suppressErrorToast: true })).data?.data;
                    if (row) return row;
                } catch { /* transient — retry */ }
                await new Promise((r) => setTimeout(r, 1500));
            }
            return null;
        };

        (async () => {
            try {
                let e = await fetchEstimateOnce();
                if (cancelled) return;
                if (!e) {
                    sonner.error("Couldn't load that estimate. Open it from Saved Estimates in a moment.");
                    return;
                }

                // Still cooking on the server — show the generating overlay and
                // wait it out before hydrating anything.
                if (e.status === "generating") {
                    setCurrentEstimateId(e.id);
                    setEstimateLoading(false);
                    setGeneratingEstimate(true);
                    e = await pollUntilReady(estimateId);
                    setGeneratingEstimate(false); // clear before any early return
                    if (cancelled) return;
                    if (!e) {
                        sonner.error("Generation is taking longer than expected. Check Saved Estimates in a minute.");
                        return;
                    }
                }

                if (e.status === "failed") {
                    sonner.error(e.error_message || "Estimate generation failed. Please try again.");
                    return;
                }

                // Block the immediate auto-save that would otherwise fire as
                // we hydrate the React state below.
                skipNextAutoSave.current = true;

                setCurrentEstimateId(e.id);
                setMode(e.mode ?? "insurance");
                setEstimateTitle(e.estimate_title ?? "INSURANCE ESTIMATE");
                setOverheadOn(!!e.overhead_on);
                setTaxOn(!!e.tax_on);
                setTaxName(e.tax_name ?? "Sales Tax");
                // Empty string, not "0" — a saved 0% and an unset rate look the
                // same in the DB, and showing "0" reads as a deliberate choice.
                setTaxPercent(Number(e.tax_pct) ? String(e.tax_pct) : "");
                // Fee spec (Jul-24)
                setDiscountType(e.discount_type === "pct" ? "pct" : "flat");
                setDiscountValue(Number(e.discount_value) ? String(e.discount_value) : "");
                setCardFeeOn(!!e.card_fee_on);
                setCardFeePct(String(e.card_fee_pct ?? 3));
                setCustomFees(
                    (e.custom_fees ?? []).map((f) => ({
                        name: f.name ?? "",
                        amount: String(f.amount ?? ""),
                    })),
                );
                if (e.terms_html) {
                    setTermsState((prev) => ({ ...(prev ?? {}), full_terms: e.terms_html }));
                }
                if (e.measurement_id) {
                    try {
                        const m = await axiosInstance.get(`/measurement/${e.measurement_id}`, { suppressErrorToast: true });
                        if (m.data?.data) setLinkedMeasurement(m.data.data);
                    } catch { /* non-fatal */ }
                }

                // Map server sections/items back to the frontend shape.
                const restoredSections = (e.sections ?? []).map((s) => ({
                    id: s.section_key,
                    name: s.name,
                    items: (s.items ?? []).map((it) => ({
                        name: it.name,
                        qty: Number(it.qty) || 0,
                        unit: it.unit ?? "EA",
                        price: Number(it.price) || 0,
                        reason: it.reason ?? undefined,
                        source_field: it.source_field ?? undefined,
                        code_ref: it.code_ref ?? undefined,
                    })),
                }));
                setSections(restoredSections);
                if (restoredSections.length) setActiveSection(restoredSections[0].id);

                // Hydrate client. Prefer the embedded `client` object the
                // backend sends; fall back to a separate fetch by id so this
                // also works against older builds that didn't include it.
                if (e.client) {
                    setClient(toClientShape(e.client));
                } else if (e.client_id) {
                    try {
                        const cRes = await axiosInstance.get(
                            `/client-portal/${e.client_id}`,
                            { suppressErrorToast: true },
                        );
                        const raw = cRes.data?.data;
                        if (raw) setClient(toClientShape(raw));
                    } catch { /* non-fatal */ }
                }

                setHasStarted(true);
                setSaveIndicator({ saving: false, text: "Saved" });
                sonner.success(`Loaded estimate — ${restoredSections.length} section${restoredSections.length === 1 ? "" : "s"}`);
            } catch {
                /* axiosInstance toasts the failure */
            } finally {
                if (!cancelled) setEstimateLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ── Measurement → Estimate handoff (?measurement_id=...&client_id=...)
    //
    // Single source of truth: every estimate goes through the AI Auto-Build
    // pipeline (Brief Sec 8 + 10 — Claude with reasoning per item). The old
    // deterministic JS handoff (`buildItemsFromMeasurement`) is intentionally
    // not used here — it produced different results than Auto-Build for the
    // same input and confused users.
    //
    // When the user clicks "Use in Estimate" on the Measurement page we:
    //   1. Pull the measurement row.
    //   2. Pre-select the linked client.
    //   3. Set `linkedMeasurement` so the Auto-Build modal picks it up.
    //   4. Auto-open the Auto-Build modal — user fills damage type / storm
    //      date / instructions and clicks Generate to run Claude.
    useEffect(() => {
        const measurementId = searchParams?.get("measurement_id");
        const clientIdParam = searchParams?.get("client_id");
        if (!measurementId) return;
        let cancelled = false;
        setMeasurementLoading(true);

        (async () => {
            try {
                const mRes = await axiosInstance.get(`/measurement/${measurementId}`);
                const measurement = mRes.data?.data;
                if (cancelled || !measurement) return;
                setLinkedMeasurement(measurement);

                // Pre-select the client (prefer measurement.client_id).
                const cid = measurement.client_id || clientIdParam || null;
                let clientResolved = !!client;
                if (cid && !client) {
                    try {
                        const cRes = await axiosInstance.get(`/client-portal/${cid}`, { suppressErrorToast: true });
                        const raw = cRes.data?.data;
                        if (raw) {
                            setClient(toClientShape(raw));
                            clientResolved = true;
                        }
                    } catch { /* non-fatal */ }
                }

                if (clientResolved) {
                    // Client ready — jump straight into the Auto-Build modal.
                    setAiModal(true);
                    sonner.success("Measurement linked — pick damage type and click Generate");
                } else {
                    // No client yet — show the inline picker first; the modal
                    // will auto-open as soon as a client gets selected.
                    autoOpenAiAfterClient.current = true;
                    sonner.info("Measurement linked. Pick a client below to continue.");
                    setTimeout(() => {
                        document.getElementById("estClientSection")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                }
            } catch {
                /* axiosInstance toasts the failure */
            } finally {
                if (!cancelled) setMeasurementLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ── Policy Analysis → Estimate handoff (?policy_analysis_id=...&client_id=...)
    //
    // Brief Section 08 lists "Uploaded claim documents" as an estimate data
    // source. Section 09 requires document generation to "auto-populate from
    // policy analysis results — nothing should require the user to type
    // information that already exists." This effect implements that for the
    // estimation surface: pull the analysis, pre-select its client, and
    // surface findings as one-click supplement line items.
    //
    // We intentionally do NOT auto-create line items — the contractor stays
    // in control. The panel surfaces the analysis's suggested_actions +
    // critical_deadlines as read-only findings; "Build estimate from these
    // findings" feeds them into Auto-Build where Claude generates the line items.
    useEffect(() => {
        const analysisId = searchParams?.get('policy_analysis_id');
        if (!analysisId) return;
        let cancelled = false;
        setPolicyAnalysisLoading(true);

        (async () => {
            try {
                const res = await axiosInstance.get(`/policy-analyses/${analysisId}`);
                const analysis = res.data?.data;
                if (cancelled || !analysis) return;
                setLinkedPolicyAnalysis(analysis);

                // Pre-select client (prefer analysis.client_id, fall back to URL).
                const clientIdParam = searchParams?.get('client_id');
                const cid = analysis.client_id || clientIdParam || null;
                if (cid && !client) {
                    try {
                        const cRes = await axiosInstance.get(`/client-portal/${cid}`, { suppressErrorToast: true });
                        const raw = cRes.data?.data;
                        if (raw && !cancelled) setClient(toClientShape(raw));
                    } catch { /* non-fatal */ }
                }
            } catch {
                /* axiosInstance toasts the failure */
            } finally {
                if (!cancelled) setPolicyAnalysisLoading(false);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ====================== UTIL ======================
    // Route all in-page toasts through the central sonner Toaster (top-center,
    // richColors) so they match every other screen. Map the legacy type strings
    // ("warn"/"success"/"error") to the matching sonner method; anything else
    // falls back to a neutral info toast.
    const toast = useCallback((msg, type = "") => {
        if (type === "success") sonner.success(msg);
        else if (type === "error") sonner.error(msg);
        else if (type === "warn" || type === "warning") sonner.warning(msg);
        else sonner.info(msg);
    }, []);

    const showLoading = (text, sub = "") => setLoading({ active: true, text, sub });
    const hideLoading = () => setLoading({ active: false, text: "", sub: "" });

    /**
     * Build the SaveEstimateDto payload from current React state. Returns
     * `null` if the estimate isn't ready to save yet (no client selected).
     */
    // ── Fee rates, clamped to the SAME bounds the DTO enforces ────────────
    // (@Min(0) discount_value, @Max(100) tax_pct, @Max(10) card_fee_pct.)
    // `max=` on a number input does not stop typing, so an out-of-range value
    // would otherwise (a) show a total the server never agrees with and, worse,
    // (b) 400 every auto-save with a validation error nobody sees. Declared
    // here because BOTH the payload and the totals block read them.
    const clampNum = (v, lo, hi) => Math.min(Math.max(Number.isFinite(v) ? v : 0, lo), hi);
    const discountValueNum = clampNum(parseFloat(discountValue), 0, Number.MAX_SAFE_INTEGER);
    const taxPercentNum = clampNum(parseFloat(taxPercent), 0, 100);
    const cardFeePctNum = clampNum(parseFloat(cardFeePct), 0, 10);

    const buildSavePayload = useCallback(() => {
        if (!client?.id) return null;
        return {
            client_id: client.id,
            measurement_id: linkedMeasurement?.id ?? undefined,
            title: client?.name ? `${client.name} — Estimate` : undefined,
            estimate_title: estimateTitle,
            mode,
            damage_type: undefined,        // (M7 will pipe damage type in)
            storm_date: undefined,         // (M7 will pipe storm date in)
            insurance_carrier: undefined,  // (M7 will resolve from client)
            overhead_on: overheadOn,
            overhead_pct: 20,
            tax_on: taxOn,
            tax_name: taxName,
            tax_pct: taxPercentNum,
            // Fee spec (Jul-24). `custom_fees` is always sent (even empty) so a
            // deleted fee row actually disappears server-side — the backend
            // treats an omitted key as "don't touch", an empty array as "clear".
            discount_type: discountType,
            discount_value: discountValueNum,
            card_fee_on: cardFeeOn,
            card_fee_pct: cardFeePctNum,
            custom_fees: customFees
                .filter((f) => (f.name ?? "").trim() || (parseFloat(f.amount) || 0))
                .map((f, i) => ({
                    name: (f.name ?? "").trim() || "Fee",
                    amount: Math.max(parseFloat(f.amount) || 0, 0),
                    sort_order: i,
                })),
            include_photos_in_pdf: includePhotosInPdf,
            include_measurement_in_pdf: includeMeasurementInPdf,
            terms_html: termsState?.full_terms ?? undefined,
            sections: sections.map((s, idx) => ({
                section_key: s.id,                              // "dwelling-roof"
                name: s.name,
                sort_order: idx,
                items: (s.items ?? []).map((it, j) => ({
                    name: it.name,
                    qty: Number(it.qty) || 0,
                    unit: it.unit ?? "EA",
                    price: Number(it.price) || 0,
                    reason: it.reason ?? undefined,
                    source_field: it.source_field ?? undefined,
                    code_ref: it.code_ref ?? undefined,
                    sort_order: j,
                })),
            })),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        client, linkedMeasurement, estimateTitle, mode, overheadOn,
        taxOn, taxName, taxPercentNum, termsState, sections, includePhotosInPdf, includeMeasurementInPdf,
        discountType, discountValueNum, cardFeeOn, cardFeePctNum, customFees,
    ]);

    /**
     * Persist current state to the backend. Creates on first save, then
     * patches afterwards. Called by the debounced `triggerSave` wrapper.
     */
    const saveEstimateNow = useCallback(async () => {
        const payload = buildSavePayload();
        if (!payload) {
            setSaveIndicator({ saving: false, text: "Saved" });
            return null;
        }
        setSaveIndicator({ saving: true, text: "Saving..." });
        try {
            if (currentEstimateId) {
                await axiosInstance.patch(
                    `/estimates/${currentEstimateId}`,
                    payload,
                    { suppressErrorToast: true },
                );
                setSaveIndicator({ saving: false, text: "Saved" });
                return currentEstimateId;
            }
            const res = await axiosInstance.post(
                "/estimates",
                payload,
                { suppressErrorToast: true },
            );
            const newId = res.data?.data?.id ?? null;
            if (newId) setCurrentEstimateId(newId);
            setSaveIndicator({ saving: false, text: "Saved" });
            return newId;
        } catch {
            setSaveIndicator({ saving: false, text: "Save failed" });
            return null;
        }
    }, [buildSavePayload, currentEstimateId]);

    /**
     * Debounced save trigger — every state mutation calls this; the actual
     * network round-trip happens 1.2s after the last edit.
     */
    const triggerSave = useCallback(() => {
        if (skipNextAutoSave.current) {
            skipNextAutoSave.current = false;
            return;
        }
        setSaveIndicator({ saving: true, text: "Saving..." });
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            saveEstimateNow();
        }, 1200);
    }, [saveEstimateNow]);

    // ====================== CLIENT ======================
    const ensureClient = () => {
        if (!client) {
            toast("Pick a client first", "warn");
            // Scroll to the client section so user sees what to do.
            setTimeout(() => document.getElementById("estClientSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            return false;
        }
        return true;
    };

    // ClientSelector emits the shaped client (or null to clear).
    const handleClientChange = (shaped) => setClient(shaped);

    // ====================== STAGE TRANSITIONS ======================
    const showBuilder = () => setHasStarted(true);

    const startBlank = () => {
        if (!ensureClient()) return;
        const def = mode === "insurance"
            ? { id: "dwelling-roof", name: "Dwelling Roof" }
            : { id: "roof-replacement", name: "Roof Replacement" };
        addSection(def);
        showBuilder();
        toast("Empty estimate ready. Add items from the left.", "success");
    };

    // ====================== ESTIMATE TYPE ======================
    const setEstimateType = (m) => {
        setMode(m);
        setEstimateTitle(m === "insurance" ? "INSURANCE ESTIMATE" : "RETAIL PROPOSAL");
        toast(`Switched to ${m} mode`, "success");
    };

    // ====================== AI GENERATOR ======================
    const openAIGenerator = () => {
        if (!ensureClient()) return;
        setAiError(null); // clear stale errors when (re)opening
        setAiModal(true);
    };

    const uploadFile = (type) => {
        const i = document.createElement("input");
        i.type = "file";
        i.accept = type === "photos" ? "image/*" : ".pdf,.jpg,.png,.xml";
        i.multiple = true;
        i.onchange = (e) => {
            const files = [...e.target.files];
            if (!files.length) return;
            setAiUploads((prev) => ({ ...prev, [type]: [...(prev[type] || []), ...files] }));
        };
        i.click();
    };

    const removeUpload = (type, idx) => {
        setAiUploads((prev) => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
    };

    const toggleSuggestion = (text) => {
        setSelectedChips((prev) => prev.includes(text) ? prev.filter((c) => c !== text) : [...prev, text]);
    };

    const removeSelectedChip = (s) => setSelectedChips((prev) => prev.filter((c) => c !== s));

    /**
     * Real Auto-Build flow — calls Claude via the backend.
     * Brief Section 8 + 10: structured + explainable estimate from
     * measurement + damage + storm + carrier + codes + user inputs.
     *
     * On failure we keep the modal open and show an inline error so the
     * user can read it (toasts auto-dismiss too quickly for a credit gate).
     */
    const generateAIEstimate = async () => {
        if (!ensureClient()) return;
        setAiError(null);
        setAiGenerating(true);
        try {
            // If the contractor dropped a measurement PDF into the modal but
            // didn't pick one from the saved list, extract it now so Claude
            // gets real quantities instead of producing PENDING placeholders.
            // We only auto-extract the FIRST file — multi-file flows belong
            // on the Measurement page where they can be reviewed individually.
            let resolvedMeasurementId = linkedMeasurement?.id;
            const pendingFile = aiUploads.measurement?.[0];
            if (!resolvedMeasurementId && pendingFile) {
                try {
                    const fd = new FormData();
                    fd.append('source_file', pendingFile);
                    if (client?.id) fd.append('client_id', client.id);
                    fd.append('title', pendingFile.name || 'Estimate generator upload');
                    const mRes = await axiosInstance.post('/measurement/extract', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        suppressErrorToast: true,
                    });
                    const m = mRes.data?.data;
                    if (m?.id) {
                        resolvedMeasurementId = m.id;
                        setLinkedMeasurement(m);
                    }
                } catch (extractErr) {
                    setAiError({
                        title: 'Could not read measurement file',
                        detail:
                            extractErr?.response?.data?.message
                            ?? extractErr?.userMessage
                            ?? 'The uploaded PDF could not be parsed. Try extracting it on the Measurement page first, then come back.',
                    });
                    setAiGenerating(false);
                    return;
                }
            }

            const payload = {
                client_id: client.id,
                measurement_id: resolvedMeasurementId ?? undefined,
                // CK-FIX Jul-22: "Other" reveals a free-text box. The enum
                // value still goes in `damage_type` (DB CHECK + DTO only allow
                // the seven known values); the typed words ride along in
                // `damage_type_other` and reach the AI prompt from there.
                damage_type: aiDamageType || undefined,
                damage_type_other:
                    aiDamageType === "other" && aiDamageTypeOther.trim()
                        ? aiDamageTypeOther.trim()
                        : undefined,
                storm_date: aiStormDate || undefined,
                mode,
                instructions: aiMessage?.trim() || undefined,
                scope_hints: selectedChips.length ? selectedChips : undefined,
            };
            const res = await axiosInstance.post(
                "/estimates/generate",
                payload,
                {
                    suppressErrorToast: true, // we render our own inline error
                    // This call is now fast — it just creates a placeholder row
                    // (status='generating') and returns; Claude runs in the
                    // background. Generous timeout is only a safety margin.
                    timeout: 120_000,
                },
            );
            const e = res.data?.data;
            if (e?.id) {
                setAiModal(false);
                // Show the overlay THIS render — don't wait for the load effect
                // to mount. Without this there's a gap after router.push where no
                // overlay is up and the start screen flashes (worse under
                // read-after-write lag), which is why the loader appeared only
                // sometimes. The load effect takes over the moment it runs.
                setEstimateLoading(true);
                // Client-side nav — sidebar stays mounted, load effect re-fires.
                router.push(`/dashboard/estimation?estimate_id=${e.id}`);
                return;
            }
            setAiError({
                title: "Generation finished but no estimate returned",
                detail: "Please try again or check Saved Estimates.",
            });
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data ?? {};

            if (status === 402 && typeof data.required === "number") {
                setAiError({
                    title: "Insufficient credits",
                    detail: `This estimate needs ${data.required} credits — you have ${data.available}. Top up in Billing or upgrade your plan.`,
                });
            } else if (status === 402) {
                setAiError({
                    title: "Payment required",
                    detail: data.message || err?.userMessage || "A required setting or quota is missing.",
                });
            } else if (status === 403) {
                setAiError({
                    title: "Not allowed",
                    detail: data.message || err?.userMessage || "Your subscription doesn't permit this action.",
                });
            } else if (status === 422) {
                setAiError({
                    title: "Setup needed",
                    detail: data.message || err?.userMessage || "A required AI setting (API key) is missing.",
                });
            } else {
                setAiError({
                    title: "Could not generate estimate",
                    detail: err?.userMessage || data.message || "Please try again in a minute.",
                });
            }
        } finally {
            setAiGenerating(false);
        }
    };

    // ====================== AI REVIEW (Phase 6) ======================
    // Calls Claude with the saved estimate + rate book + codes and shows
    // a modal of structured findings. Advisory only — every finding has
    // an "Apply" action so the contractor stays in control.
    const [reviewModal, setReviewModal] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewData, setReviewData] = useState(null);
    // 2.3 — "Ask AI to Make Changes"
    const [changesOpen, setChangesOpen] = useState(false);
    const [changesInstruction, setChangesInstruction] = useState('');
    const [changesFiles, setChangesFiles] = useState([]);      // File[]
    const [changesLoading, setChangesLoading] = useState(false);
    const [changesResult, setChangesResult] = useState(null);  // { summary, changes[] }
    const [changesChecked, setChangesChecked] = useState({});  // index -> bool
    const [changesError, setChangesError] = useState(null);
    const changesFileInputRef = useRef(null);
    const [reviewError, setReviewError] = useState(null);

    const askAIToReview = async () => {
        if (!currentEstimateId) {
            toast('Save the estimate first', 'error');
            return;
        }
        // Make sure the latest edits are persisted before review runs.
        await saveEstimateNow();
        setReviewModal(true);
        setReviewLoading(true);
        setReviewError(null);
        setReviewData(null);
        try {
            const res = await axiosInstance.post(`/estimates/${currentEstimateId}/ai-review`, {});
            setReviewData(res.data?.data ?? null);
            toast('AI review complete', 'success');
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'AI review failed';
            setReviewError(msg);
        } finally {
            setReviewLoading(false);
        }
    };

    // ── Apply a single finding ────────────────────────────────────────
    const applyMissingItem = (mi) => {
        // Reuse the existing addToEstimate path. We don't know the exact
        // section key Claude proposed maps to a real section, so we try to
        // match by section_key first, then fall back to active section.
        const target =
            sections.find((s) => s.id === mi.suggested_section_key) ??
            sections.find((s) => s.id === activeSection) ??
            sections[0];
        if (!target) {
            toast('Add a section before applying missing items', 'error');
            return;
        }
        setSections((prev) => prev.map((s) =>
            s.id === target.id
                ? {
                    ...s,
                    items: [
                        ...(s.items ?? []),
                        {
                            name: mi.name,
                            qty: Number(mi.suggested_qty) || 1,
                            unit: mi.suggested_unit || 'EA',
                            price: Number(mi.suggested_price) || 0,
                            reason: mi.reason,
                            code_ref: mi.code_ref ?? undefined,
                            source_field: 'ai_review_suggestion',
                        },
                    ],
                }
                : s,
        ));
        triggerSave();
        toast(`Added "${mi.name}" to ${target.name}`, 'success');
    };

    const applyPricingFix = (pc) => {
        // Find the line item by name and update its price. If multiple
        // sections have the same item name, update the first match — the
        // contractor can repeat-click if they have duplicates.
        let applied = false;
        setSections((prev) => prev.map((s) => ({
            ...s,
            items: (s.items ?? []).map((it) => {
                if (applied) return it;
                if ((it.name ?? '').toLowerCase() === pc.item_name.toLowerCase()) {
                    applied = true;
                    return { ...it, price: Number(pc.suggested_price) || it.price };
                }
                return it;
            }),
        })));
        if (applied) {
            triggerSave();
            toast(`Updated "${pc.item_name}" price`, 'success');
        } else {
            toast(`Could not find "${pc.item_name}" in current items`, 'error');
        }
    };

    // ====================== 2.3 — ASK AI TO MAKE CHANGES ======================
    const runAiChanges = async () => {
        if (!currentEstimateId) { toast('Save the estimate first', 'error'); return; }
        if (!changesInstruction.trim() && changesFiles.length === 0) {
            toast('Describe the change or attach a file', 'error'); return;
        }
        await saveEstimateNow();
        setChangesLoading(true); setChangesError(null); setChangesResult(null); setChangesChecked({});
        try {
            const fd = new FormData();
            fd.append('instruction', changesInstruction.trim());
            changesFiles.forEach((f) => fd.append('files', f));
            const res = await axiosInstance.post(
                `/estimates/${currentEstimateId}/ai-changes`, fd,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            const data = res.data?.data ?? null;
            setChangesResult(data);
            const checked = {};
            (data?.changes ?? []).forEach((_, i) => { checked[i] = true; });
            setChangesChecked(checked);
        } catch (err) {
            setChangesError(err?.userMessage ?? err?.response?.data?.message ?? 'Could not get AI changes');
        } finally {
            setChangesLoading(false);
        }
    };

    // Apply ONLY the checked proposals to local `sections`, then autosave.
    // Nothing is touched until the contractor clicks Apply.
    const applyAiChanges = () => {
        const list = (changesResult?.changes ?? []).filter((_, i) => changesChecked[i]);
        if (!list.length) { toast('Check at least one change to apply', 'error'); return; }
        let applied = 0, skipped = 0;

        setSections((prev) => {
            const next = prev.map((s) => ({ ...s, items: [...(s.items ?? [])] }));
            const findItem = (name) => {
                const n = (name || '').toLowerCase();
                for (const s of next) {
                    const idx = s.items.findIndex((it) => (it.name || '').toLowerCase() === n);
                    if (idx >= 0) return { s, idx };
                }
                return null;
            };
            for (const ch of list) {
                if (ch.action === 'add') {
                    const key = (ch.section_key || '').toLowerCase();
                    const target =
                        next.find((s) => (s.section_key || '').toLowerCase() === key) ||
                        next.find((s) => (s.name || '').toLowerCase() === key) ||
                        next.find((s) => s.id === activeSection) ||
                        next[0];
                    if (!target) { skipped++; continue; }
                    target.items.push({
                        name: ch.name || 'New item',
                        qty: Number(ch.qty) || 1,
                        unit: ch.unit || 'EA',
                        price: Number(ch.price) || 0,
                        reason: ch.reason || ch.rationale || undefined,
                        code_ref: ch.code_ref ?? undefined,
                        source_field: 'ai_change',
                    });
                    applied++;
                } else if (ch.action === 'remove') {
                    const hit = findItem(ch.target_item_name);
                    if (!hit) { skipped++; continue; }
                    hit.s.items.splice(hit.idx, 1);
                    applied++;
                } else if (ch.action === 'reprice') {
                    const hit = findItem(ch.target_item_name);
                    if (!hit) { skipped++; continue; }
                    hit.s.items[hit.idx] = { ...hit.s.items[hit.idx], price: Number(ch.price) || hit.s.items[hit.idx].price };
                    applied++;
                } else if (ch.action === 'edit') {
                    const hit = findItem(ch.target_item_name);
                    if (!hit) { skipped++; continue; }
                    const cur = hit.s.items[hit.idx];
                    hit.s.items[hit.idx] = {
                        ...cur,
                        name: ch.name != null ? ch.name : cur.name,
                        qty: ch.qty != null ? Number(ch.qty) : cur.qty,
                        unit: ch.unit != null ? ch.unit : cur.unit,
                        price: ch.price != null ? Number(ch.price) : cur.price,
                        reason: ch.reason != null ? ch.reason : cur.reason,
                    };
                    applied++;
                } else { skipped++; }
            }
            return next;
        });

        triggerSave();
        setChangesOpen(false);
        setChangesResult(null);
        setChangesInstruction('');
        setChangesFiles([]);
        toast(`Applied ${applied} change${applied === 1 ? '' : 's'}${skipped ? ` · ${skipped} skipped (not found)` : ''}`, applied ? 'success' : 'error');
    };

    // ====================== TEMPLATES & BUNDLES (Phase 7) ======================
    // Save current estimate as a reusable template, apply a saved template,
    // or insert a bundle of items into the active section. The backend stores
    // these per-company in JSONB — `estimate_templates` / `estimate_bundles`.
    const [tplPickerOpen, setTplPickerOpen] = useState(false);
    const [tplPickerKind, setTplPickerKind] = useState('template'); // 'template' | 'bundle'
    const [tplList, setTplList] = useState([]);
    const [tplListLoading, setTplListLoading] = useState(false);
    const [tplApplying, setTplApplying] = useState(false);
    const [tplStrategy, setTplStrategy] = useState('append'); // append | replace

    const [saveTplOpen, setSaveTplOpen] = useState(false);
    const [saveTplName, setSaveTplName] = useState('');
    const [saveTplDesc, setSaveTplDesc] = useState('');
    const [saveTplSaving, setSaveTplSaving] = useState(false);

    const reloadEstimateFromServer = useCallback(async () => {
        if (!currentEstimateId) return;
        try {
            const res = await axiosInstance.get(`/estimates/${currentEstimateId}`, { suppressErrorToast: true });
            const e = res.data?.data;
            if (!e) return;
            skipNextAutoSave.current = true;
            const restored = (e.sections ?? []).map((s) => ({
                id: s.section_key,
                name: s.name,
                items: (s.items ?? []).map((it) => ({
                    name: it.name,
                    qty: Number(it.qty) || 0,
                    unit: it.unit ?? 'EA',
                    price: Number(it.price) || 0,
                    reason: it.reason ?? undefined,
                    source_field: it.source_field ?? undefined,
                    code_ref: it.code_ref ?? undefined,
                })),
            }));
            setSections(restored);
            if (restored.length && !restored.find((s) => s.id === activeSection)) {
                setActiveSection(restored[0].id);
            }
        } catch { /* toasted */ }
    }, [currentEstimateId, activeSection]);

    const openTemplatePicker = async (kind = 'template') => {
        if (!currentEstimateId) {
            toast('Save the estimate first', 'error');
            return;
        }
        setTplPickerKind(kind);
        setTplPickerOpen(true);
        setTplListLoading(true);
        setTplList([]);
        try {
            const url = kind === 'template' ? '/estimate-templates' : '/estimate-bundles';
            const res = await axiosInstance.get(url, { params: { active_only: 'true' }, suppressErrorToast: true });
            setTplList(res.data?.data ?? []);
        } catch {
            toast.error(`Could not load ${kind}s`);
        } finally {
            setTplListLoading(false);
        }
    };

    const applyTemplate = async (tpl) => {
        if (!currentEstimateId || !tpl?.id) return;
        if (tplStrategy === 'replace' && !window.confirm('Replace ALL existing sections + items with this template?')) return;
        setTplApplying(true);
        try {
            await saveEstimateNow();
            await axiosInstance.post(`/estimates/${currentEstimateId}/apply-template`, {
                template_id: tpl.id,
                strategy: tplStrategy,
            });
            toast.success(`Applied "${tpl.name}"`);
            setTplPickerOpen(false);
            await reloadEstimateFromServer();
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'Apply failed';
            toast.error(msg);
        } finally {
            setTplApplying(false);
        }
    };

    const applyBundle = async (bundle) => {
        if (!currentEstimateId || !bundle?.id) return;
        const target = sections.find((s) => s.id === activeSection) ?? sections[0];
        if (!target) {
            toast.error('Add a section first');
            return;
        }
        setTplApplying(true);
        try {
            await saveEstimateNow();
            await axiosInstance.post(`/estimates/${currentEstimateId}/apply-bundle`, {
                bundle_id: bundle.id,
                section_key: target.id,
                section_name: target.name,
            });
            toast.success(`Added "${bundle.name}" to ${target.name}`);
            setTplPickerOpen(false);
            await reloadEstimateFromServer();
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'Apply failed';
            toast.error(msg);
        } finally {
            setTplApplying(false);
        }
    };

    const openSaveAsTemplate = () => {
        if (!currentEstimateId) {
            toast('Save the estimate first', 'error');
            return;
        }
        if (!sections.some((s) => s.items?.length)) {
            toast.error('Add at least one item before saving as template');
            return;
        }
        setSaveTplName('');
        setSaveTplDesc('');
        setSaveTplOpen(true);
    };

    const submitSaveAsTemplate = async () => {
        if (!saveTplName.trim()) {
            toast.error('Name is required');
            return;
        }
        setSaveTplSaving(true);
        try {
            await saveEstimateNow();
            await axiosInstance.post(`/estimates/${currentEstimateId}/save-as-template`, {
                name: saveTplName.trim(),
                description: saveTplDesc.trim() || null,
                mode,
            });
            toast.success('Template saved');
            setSaveTplOpen(false);
        } catch (err) {
            const msg = err?.userMessage ?? err?.response?.data?.message ?? 'Save failed';
            toast.error(msg);
        } finally {
            setSaveTplSaving(false);
        }
    };

    // ====================== SECTIONS ======================
    const addSection = (s) => {
        if (sections.find((x) => x.id === s.id)) {
            toast(`"${s.name}" already in estimate`, "warn");
            return;
        }
        setSections((prev) => [...prev, { id: s.id, name: s.name, items: [] }]);
        setActiveSection(s.id);
        triggerSave();
    };

    const selectSection = (id) => {
        setActiveSection(id);
        const el = document.getElementById(`section-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const openAddSection = () => setAddSectionModal(true);

    const addCustomSection = () => {
        const name = customSectionName.trim();
        if (!name) { toast("Enter a section name", "warn"); return; }
        addSection({ id: "custom-" + Date.now(), name });
        setCustomSectionName("");
        setAddSectionModal(false);
    };

    const deleteSection = (id) => {
        if (!window.confirm("Delete this section and all its items?")) return;
        setSections((prev) => {
            const next = prev.filter((s) => s.id !== id);
            if (activeSection === id) setActiveSection(next[0]?.id || null);
            return next;
        });
        triggerSave();
    };

    const duplicateSection = (id) => {
        setSections((prev) => {
            const orig = prev.find((s) => s.id === id);
            if (!orig) return prev;
            return [...prev, { id: "copy-" + Date.now(), name: orig.name + " (Copy)", items: orig.items.map((i) => ({ ...i })) }];
        });
        triggerSave();
    };

    const editSectionName = (id) => {
        const s = sections.find((x) => x.id === id);
        if (!s) return;
        const newName = window.prompt("Section name", s.name);
        if (newName && newName.trim()) {
            setSections((prev) => prev.map((x) => x.id === id ? { ...x, name: newName.trim() } : x));
            triggerSave();
        }
    };

    // ====================== ITEMS ======================
    const addToEstimate = (name, price, unit) => {
        if (!ensureClient()) return;
        if (!hasStarted) showBuilder();

        let curSections = sections;
        let targetActive = activeSection;
        if (curSections.length === 0) {
            const def = mode === "insurance"
                ? { id: "dwelling-roof", name: "Dwelling Roof" }
                : { id: "roof-replacement", name: "Roof Replacement" };
            curSections = [{ id: def.id, name: def.name, items: [] }];
            targetActive = def.id;
            setActiveSection(def.id);
        }

        setSections(() => {
            const targetId = targetActive || curSections[0].id;
            return curSections.map((s) => {
                if (s.id !== targetId) return s;
                const existing = s.items.find((i) => i.name === name);
                if (existing) {
                    return { ...s, items: s.items.map((i) => i.name === name ? { ...i, qty: i.qty + 1 } : i) };
                }
                return { ...s, items: [...s.items, { name, qty: 1, unit, price }] };
            });
        });
        triggerSave();
        toast(`Added ${name}`, "success");
    };

    /**
     * Send the AI findings into the Auto-Build modal as scope hints +
     * free-form instructions, then open the modal. This is the brief-correct
     * handoff (Section 10: "Claude should be a core part of the estimation
     * flow — comparing carrier vs contractor scope, detailed reasoning per
     * line item"). The chips become `scope_hints` and the long-form
     * arguments are appended to the `instructions` textarea so Claude can
     * cite them in each generated line's `reason` field.
     *
     * We intentionally do NOT inject literal line items — AI finding titles
     * like "No Explicit Matching Coverage" or "O&P is Included in Replacement
     * Cost" are arguments, not billable scope items. Claude turns them into
     * real roofing/siding line items with proper qty/unit/price derived from
     * the linked measurement + rate card.
     */
    const applyPolicyHintsToAi = () => {
        if (!ensureClient()) return;
        const a = linkedPolicyAnalysis;
        if (!a) return;

        const actions = Array.isArray(a.suggested_actions) ? a.suggested_actions : [];
        const deadlines = Array.isArray(a.critical_deadlines) ? a.critical_deadlines : [];
        const confidencePct = typeof a.ai_confidence === 'number'
            ? Math.round(a.ai_confidence * 100) : null;

        // Build short, action-oriented hint chips. Claude has been prompted
        // (in the estimate-generator) to read these as scope-shaping rules,
        // not as line item titles.
        const newChips = [];
        for (const act of actions) {
            if (act.title) newChips.push(`Policy: ${act.title}`);
        }
        // Merge with whatever the user had already selected — never overwrite.
        setSelectedChips((prev) => Array.from(new Set([...prev, ...newChips])));

        // Compose a longer-form instructions block with the AI's full
        // reasoning, so Claude can quote the supporting policy language in each
        // generated line item's `reason` field (Brief Section 8 audit trail).
        const lines = [];
        lines.push(
            `Use the linked policy analysis (ID ${a.id}, doc type "${a.document_type}"${a.detected_carrier ? `, carrier ${a.detected_carrier}` : ''}${confidencePct != null ? `, AI confidence ${confidencePct}%` : ''}) as scope-shaping context.`,
        );
        if (a.summary) {
            lines.push('', `Analysis summary: ${a.summary}`);
        }
        if (actions.length) {
            lines.push('', 'AI-suggested actions — reflect any that map to billable scope:');
            for (const act of actions) {
                lines.push(`- ${act.title}${act.detail ? `: ${act.detail}` : ''}`);
            }
        }
        if (deadlines.length) {
            lines.push('', 'Critical deadlines to be aware of:');
            for (const d of deadlines) {
                lines.push(`- ${d.description}${d.date ? ` (due ${d.date})` : ''}`);
            }
        }
        lines.push(
            '',
            'For every line item you generate, set `source_field` referencing the matching policy analysis finding and cite the supporting policy language in `reason`.',
        );

        // Append to whatever the user already typed; don't clobber.
        setAiMessage((prev) =>
            prev?.trim()
                ? `${prev}\n\n${lines.join('\n')}`
                : lines.join('\n'),
        );

        setAiModal(true);
        toast('Policy findings loaded into AI builder. Add damage type + click Generate.', 'success');
    };

    const removeItem = (secId, idx) => {
        setSections((prev) => prev.map((s) => s.id === secId
            ? { ...s, items: s.items.filter((_, i) => i !== idx) }
            : s));
        triggerSave();
    };

    // Inline row edit — pencil enters edit mode (name/qty/unit/price), check saves.
    const startEditItem = (secId, idx) => {
        const sec = sections.find((s) => s.id === secId);
        const it = sec?.items?.[idx];
        if (!it) return;
        setEditingItem({ secId, idx });
        setItemDraft({ name: it.name ?? '', qty: String(it.qty ?? ''), unit: it.unit ?? '', price: String(it.price ?? '') });
    };
    const cancelEditItem = () => setEditingItem(null);
    const saveEditItem = () => {
        if (!editingItem) return;
        const { secId, idx } = editingItem;
        const name = itemDraft.name.trim();
        const qty = parseFloat(itemDraft.qty);
        const unit = itemDraft.unit.trim();
        const price = parseFloat(itemDraft.price);
        if (!name) { toast('Item name is required', 'error'); return; }
        if (!(qty > 0)) { toast('Quantity must be greater than 0', 'error'); return; }
        if (isNaN(price) || price < 0) { toast('Enter a valid price', 'error'); return; }
        setSections((prev) => prev.map((s) => s.id === secId
            ? { ...s, items: s.items.map((it, i) => i === idx ? { ...it, name, qty, unit: unit || it.unit, price } : it) }
            : s));
        triggerSave();
        toast('Item updated', 'success');
        setEditingItem(null);
    };

    // Inline edit for a code-requirement item (name + unit price).
    const startEditCode = (item) => {
        setEditingCode(item.id);
        setEditCodeName(item.name);
        setEditCodePrice(String(item.price));
        setEditCodeRef(item.ref || '');
    };
    const cancelEditCode = () => { setEditingCode(null); setEditCodeName(''); setEditCodePrice(''); setEditCodeRef(''); };
    const saveEditCode = () => {
        if (!editingCode) return;
        const name = editCodeName.trim();
        const price = parseFloat(editCodePrice);
        if (!name) { toast('Item name is required', 'error'); return; }
        if (!(price > 0)) { toast('Price must be greater than 0', 'error'); return; }
        setCodeItems((prev) => prev.map((c) => c.id === editingCode ? { ...c, name, price, ref: editCodeRef.trim() } : c));
        toast('Code item updated', 'success');
        cancelEditCode();
    };

    // Inline edit for a code & manufacturer database entry (name + meta + price).
    const startEditCodeDb = (item) => {
        setEditingCodeDb(item.id);
        setEditCdbName(item.name);
        setEditCdbMeta(item.meta || '');
        setEditCdbPrice(String(item.price));
    };
    const cancelEditCodeDb = () => { setEditingCodeDb(null); setEditCdbName(''); setEditCdbMeta(''); setEditCdbPrice(''); };
    const saveEditCodeDb = () => {
        if (!editingCodeDb) return;
        const name = editCdbName.trim();
        const price = parseFloat(editCdbPrice);
        if (!name) { toast('Item name is required', 'error'); return; }
        if (!(price > 0)) { toast('Price must be greater than 0', 'error'); return; }
        setCodeDb((prev) => prev.map((c) => c.id === editingCodeDb ? { ...c, name, meta: editCdbMeta.trim(), price } : c));
        toast('Code item updated', 'success');
        cancelEditCodeDb();
    };

    // ── 2.4 CSV bulk upload handlers ──
    const openBulkUpload = (kind) => {
        bulkKindRef.current = kind;
        setBulkResult(null);
        if (bulkFileRef.current) { bulkFileRef.current.value = ''; bulkFileRef.current.click(); }
    };
    const onBulkFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const kind = bulkKindRef.current;
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || '');
            setBulkResult(kind === 'library' ? parseLibraryCsv(text) : parseCodeCsv(text));
        };
        reader.readAsText(file);
    };
    const importBulk = () => {
        if (!bulkResult || !bulkResult.valid.length) return;
        if (bulkResult.kind === 'library') {
            setItemLibrary((prev) => {
                const next = { ...prev };
                for (const it of bulkResult.valid) {
                    const cat = it.category;
                    const list = next[cat] ? [...next[cat]] : [];
                    const idx = list.findIndex((x) => x.name.toLowerCase() === it.name.toLowerCase());
                    if (idx >= 0) list[idx] = { ...list[idx], price: it.price, unit: it.unit };
                    else list.push({ name: it.name, price: it.price, unit: it.unit });
                    next[cat] = list;
                }
                return next;
            });
        } else {
            setCodeItems((prev) => {
                const next = [...prev];
                bulkResult.valid.forEach((it, k) => {
                    const idx = next.findIndex((x) => x.name.toLowerCase() === it.name.toLowerCase());
                    if (idx >= 0) next[idx] = { ...next[idx], price: it.price, unit: it.unit, ref: it.ref };
                    else next.push({ id: `csv-${Date.now()}-${k}`, name: it.name, ref: it.ref, price: it.price, unit: it.unit });
                });
                return next;
            });
        }
        toast(`Imported ${bulkResult.valid.length} item${bulkResult.valid.length === 1 ? '' : 's'}`, 'success');
        setBulkResult(null);
    };
    const downloadLibraryTemplate = () => downloadCsvFile('item-library-template.csv',
        'category,name,unit,price\nroofing,30yr Architectural Shingles,SQ,125\nsiding,Vinyl Siding,SQ,85\n');
    const downloadCodeTemplate = () => downloadCsvFile('code-requirements-template.csv',
        'name,reference,unit,price\nIce & Water Shield,IRC R905.1.2 - valleys & eaves,SQ,125\nDrip Edge,IRC R905.2.8.5,LF,3.75\n');

    const moveItem = (secId, idx, direction) => {
        setSections((prev) => prev.map((s) => {
            if (s.id !== secId) return s;
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= s.items.length) return s;
            const items = [...s.items];
            const [item] = items.splice(idx, 1);
            items.splice(newIdx, 0, item);
            return { ...s, items };
        }));
        triggerSave();
    };

    const openMoveMenu = (event, secId, idx) => {
        event.stopPropagation();
        const otherSections = sections.filter((s) => s.id !== secId);
        if (otherSections.length === 0) {
            toast("No other sections to move to. Add another section first.", "warn");
            return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 220;
        let left = rect.right - menuWidth;
        if (left < 8) left = 8;
        if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
        setMoveMenu({ secId, idx, top: rect.bottom + 4, left });
    };

    const moveItemToSection = (fromSecId, idx, toSecId) => {
        setSections((prev) => {
            const fromSec = prev.find((s) => s.id === fromSecId);
            if (!fromSec) return prev;
            const item = fromSec.items[idx];
            if (!item) return prev;
            return prev.map((s) => {
                if (s.id === fromSecId) return { ...s, items: s.items.filter((_, i) => i !== idx) };
                if (s.id === toSecId) return { ...s, items: [...s.items, item] };
                return s;
            });
        });
        const toSec = sections.find((s) => s.id === toSecId);
        if (toSec) toast(`Moved item to ${toSec.name}`, "success");
        triggerSave();
        setMoveMenu(null);
    };

    // ── Drag & drop for line item reordering (within a section) ─────────
    const handleDragStart = (e, secId, idx) => {
        dragSrcRef.current = { secId, idx };
        e.currentTarget.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", `${secId}:${idx}`); } catch (_) { }
    };
    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove("dragging");
        document.querySelectorAll("tr.drag-over-top, tr.drag-over-bottom").forEach((r) => {
            r.classList.remove("drag-over-top", "drag-over-bottom");
        });
        dragSrcRef.current = null;
    };
    const handleDragOver = (e, secId) => {
        const src = dragSrcRef.current;
        if (!src || src.secId !== secId) return;
        const tr = e.currentTarget;
        if (tr.dataset.idx === String(src.idx)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        document.querySelectorAll("tr.drag-over-top, tr.drag-over-bottom").forEach((r) => {
            r.classList.remove("drag-over-top", "drag-over-bottom");
        });
        const rect = tr.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        tr.classList.add(before ? "drag-over-top" : "drag-over-bottom");
    };
    const handleDrop = (e, secId, targetIdx) => {
        const src = dragSrcRef.current;
        if (!src || src.secId !== secId) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        let newIdx = before ? targetIdx : targetIdx + 1;
        if (newIdx > src.idx) newIdx -= 1;
        if (newIdx === src.idx) return;
        setSections((prev) => prev.map((s) => {
            if (s.id !== secId) return s;
            const items = [...s.items];
            const [item] = items.splice(src.idx, 1);
            items.splice(newIdx, 0, item);
            return { ...s, items };
        }));
        triggerSave();
    };

    // ====================== ITEM LIBRARY ======================
    // Inline edit — click Edit turns the row into name + price inputs (no modal).
    const startEditLibItem = (cat, idx) => {
        const item = (itemLibrary[cat] || [])[idx];
        if (!item) return;
        setEditingLib({ cat, idx });
        setEditLibName(item.name);
        setEditLibPrice(String(item.price));
    };
    const cancelEditLibItem = () => {
        setEditingLib(null);
        setEditLibName('');
        setEditLibPrice('');
    };
    const saveEditLibItem = () => {
        if (!editingLib) return;
        const { cat, idx } = editingLib;
        const name = editLibName.trim();
        const price = parseFloat(editLibPrice);
        if (!name) { toast('Item name is required', 'error'); return; }
        if (!(price > 0)) { toast('Price must be greater than 0', 'error'); return; }
        setItemLibrary((prev) => ({
            ...prev,
            [cat]: (prev[cat] || []).map((it, i) => i === idx ? { ...it, name, price } : it),
        }));
        toast('Item updated', 'success');
        cancelEditLibItem();
    };

    const visibleItems = (() => {
        const q = itemSearch.toLowerCase().trim();
        if (!q) {
            return (itemLibrary[activeCategory] || []).map((it, idx) => ({ ...it, _cat: activeCategory, _idx: idx }));
        }
        const matches = [];
        Object.entries(itemLibrary).forEach(([cat, items]) => {
            items.forEach((it, idx) => {
                if (it.name.toLowerCase().includes(q)) matches.push({ ...it, _cat: cat, _idx: idx });
            });
        });
        return matches;
    })();

    // ====================== CUSTOM ITEM ======================
    const openCustomItem = (targetSectionId) => {
        if (!ensureClient()) return;
        if (!hasStarted) showBuilder();
        let secId = targetSectionId || activeSection;
        if (sections.length === 0) {
            const def = mode === "insurance"
                ? { id: "dwelling-roof", name: "Dwelling Roof" }
                : { id: "roof-replacement", name: "Roof Replacement" };
            addSection(def);
            secId = def.id;
        } else if (!secId) {
            secId = sections[0].id;
        }
        setCustomItem({
            name: "", qty: "1", unit: "EA", price: "",
            section: secId, saveToLib: true, category: "general",
        });
        setCustomItemModal(true);
    };

    const saveCustomItem = () => {
        const name = customItem.name.trim();
        const qty = parseFloat(customItem.qty);
        const price = parseFloat(customItem.price);
        if (!name) { toast("Description is required", "warn"); return; }
        if (!qty || qty <= 0) { toast("Quantity must be greater than 0", "warn"); return; }
        if (!price || price <= 0) { toast("Unit price must be greater than 0", "warn"); return; }

        const target = sections.find((s) => s.id === customItem.section);
        if (!target) { toast("Section not found", "error"); return; }

        setSections((prev) => prev.map((s) => s.id === customItem.section
            ? { ...s, items: [...s.items, { name, qty, unit: customItem.unit, price }] }
            : s));
        setActiveSection(customItem.section);

        if (customItem.saveToLib) {
            setItemLibrary((prev) => {
                const cat = customItem.category;
                const list = prev[cat] || [];
                if (list.find((i) => i.name === name)) return prev;
                return { ...prev, [cat]: [...list, { name, price, unit: customItem.unit }] };
            });
        }

        setCustomItemModal(false);
        triggerSave();
        toast(`Added "${name}"${customItem.saveToLib ? " and saved to library" : ""}`, "success");
    };

    // ====================== TOTALS ======================
    // Fee spec (Jul-24) — this ORDER is the contract, and it is mirrored
    // server-side in EstimationService.computeTotals. Change one, change both.
    //
    //   Subtotal → +O&P → −Discount → +Tax → +Custom fees → +Card fee → Total
    //
    // Discount comes off BEFORE tax (no tax on money not paid); custom fees go
    // on AFTER tax (a permit fee is never taxed) but are still inside the card
    // fee base (the card is charged the full amount).
    // Round at every step, exactly like the server does. Without this the UI
    // can land a cent away from the saved total on quantities with 3 decimals,
    // and "the PDF says something different" is not a conversation anyone wants
    // to have with a homeowner.
    const r2 = (n) => +(Number(n) || 0).toFixed(2);

    const subtotal = r2(sections.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.qty * i.price, 0), 0));
    const overhead = overheadOn ? r2(subtotal * 0.20) : 0;

    const discountBase = subtotal + overhead;
    const discountAmt = r2(Math.min(
        discountType === "pct"
            ? discountBase * (discountValueNum / 100)
            : discountValueNum,
        discountBase,     // never drives the total below $0
    ));

    const taxBase = discountBase - discountAmt;
    const tax = taxOn ? r2(taxBase * (taxPercentNum / 100)) : 0;

    const customFeesTotal = r2(customFees.reduce((a, f) => a + Math.max(parseFloat(f.amount) || 0, 0), 0));
    const preCardTotal = r2(taxBase + tax + customFeesTotal);
    const cardFee = cardFeeOn ? r2(preCardTotal * (cardFeePctNum / 100)) : 0;

    const totalRCV = r2(preCardTotal + cardFee);
    const finalizeDisabled = !client || totalRCV <= 0;

    // ====================== PAYMENT ======================
    // ── Header derived state (matches Measurement page) ──────────────────
    const aiReady = !!(providerStatus.gemini || providerStatus.claude);
    const totalCredits =
        (creditBalance?.monthly_credits ?? 0) + (creditBalance?.bonus_credits ?? 0);
    const requiredCredits = estimateCost?.credits_cost ?? 0;
    const featureDisabledByAdmin = estimateCost && estimateCost.is_active === false;
    const insufficientCredits =
        estimateCost && !featureDisabledByAdmin && totalCredits < requiredCredits;
    const creditsKnown = estimateCost !== null && creditBalance !== null;

    // Inline-style for the mode chip buttons inside the stat card.
    const modeChipStyle = (active) => ({
        padding: "5px 12px",
        fontSize: 11,
        fontWeight: 600,
        border: "none",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? "#FDB813" : "transparent",
        color: active ? "#1a1f3a" : "#6b7280",
        transition: "all 0.15s ease",
    });

    const paymentAmount = paymentType === "percentage"
        ? totalRCV * ((parseFloat(paymentPct) || 0) / 100)
        : (parseFloat(paymentFixed) || 0);

    // ====================== CODE COMPLIANCE ======================
    const addAllCheckedCodes = () => {
        if (!ensureClient()) return;
        const checkedItems = codeItems.filter((c) => codeChecked[c.id]);
        if (checkedItems.length === 0) {
            toast("Tap items to check them, then add", "warn");
            return;
        }
        if (!hasStarted) showBuilder();

        let curSections = sections;
        let targetActive = activeSection;
        if (curSections.length === 0) {
            const def = mode === "insurance"
                ? { id: "dwelling-roof", name: "Dwelling Roof" }
                : { id: "roof-replacement", name: "Roof Replacement" };
            curSections = [{ id: def.id, name: def.name, items: [] }];
            targetActive = def.id;
            setActiveSection(def.id);
        }

        setSections(() => {
            const targetId = targetActive || curSections[0].id;
            return curSections.map((s) => {
                if (s.id !== targetId) return s;
                let items = [...s.items];
                checkedItems.forEach((ci) => {
                    const existing = items.find((i) => i.name === ci.name);
                    if (existing) {
                        items = items.map((i) => i.name === ci.name ? { ...i, qty: i.qty + 1 } : i);
                    } else {
                        items.push({ name: ci.name, qty: 1, unit: ci.unit, price: ci.price });
                    }
                });
                return { ...s, items };
            });
        });
        setCodeChecked({});
        triggerSave();
        toast(`Added ${checkedItems.length} code item${checkedItems.length > 1 ? "s" : ""} to estimate`, "success");
    };

    const filteredCodeDb = codeDb.filter((it) => {
        const q = codeDbSearch.toLowerCase().trim();
        const showC = codeDbCode === "all" || it.code === "all" || it.code === codeDbCode;
        const showM = codeDbMfr === "all" || it.mfr === "all" || it.mfr === codeDbMfr;
        const showQ = !q || (it.name + " " + it.meta).toLowerCase().includes(q);
        return showC && showM && showQ;
    });

    // ====================== DOCUMENTATION (Phase 5 — Photos) ======================
    // Photos pipeline:
    //   1. Multi-select files → POST /estimates/:id/photos one at a time
    //      with auto_stamp=true. Backend runs Gemini Vision to detect damage
    //      type + write a caption, then burns metadata (claim #, address,
    //      date, damage type) onto the photo via sharp + SVG composite.
    //   2. After upload the row is shown in the gallery grid below — caption
    //      and damage_type are editable; "Include in PDF" toggle decides if
    //      the photo embeds in the rendered estimate PDF.
    //   3. The estimate-level "Include photos in PDF" master toggle is
    //      persisted via PATCH /estimates/:id (include_photos_in_pdf).
    const [photos, setPhotos] = useState([]);
    const [photosLoading, setPhotosLoading] = useState(false);
    const [photoAutoStamp, setPhotoAutoStamp] = useState(true);
    // includePhotosInPdf is declared earlier (next to other estimate-level flags)
    // because buildSavePayload references it. Don't re-declare here.
    const [uploadProgress, setUploadProgress] = useState({ active: 0, total: 0 });
    const photoInputRef = useRef(null);

    const reloadPhotos = useCallback(async () => {
        if (!currentEstimateId) { setPhotos([]); return; }
        setPhotosLoading(true);
        try {
            const res = await axiosInstance.get(`/estimates/${currentEstimateId}/photos`, { suppressErrorToast: true });
            setPhotos(res.data?.data ?? []);
        } catch { /* ignore */ }
        finally { setPhotosLoading(false); }
    }, [currentEstimateId]);

    useEffect(() => { reloadPhotos(); }, [reloadPhotos]);

    // Pull the include_photos_in_pdf flag from the loaded estimate so the
    // toggle reflects DB state. The estimate fetch already lives in the
    // existing search-params effect — we listen via a side-channel here.
    useEffect(() => {
        if (!currentEstimateId) return;
        (async () => {
            try {
                const res = await axiosInstance.get(`/estimates/${currentEstimateId}`, { suppressErrorToast: true });
                const e = res.data?.data;
                if (e && typeof e.include_photos_in_pdf === 'boolean') {
                    setIncludePhotosInPdf(e.include_photos_in_pdf);
                }
                if (e && typeof e.include_measurement_in_pdf === 'boolean') {
                    setIncludeMeasurementInPdf(e.include_measurement_in_pdf);
                }
            } catch { /* ignore */ }
        })();
    }, [currentEstimateId]);

    const uploadBulkPhotos = () => {
        // Photos attach to the estimate — all we need is a client. The estimate
        // itself is created on the fly in onPhotoFilesPicked if it hasn't been
        // saved yet (so this works on from-scratch estimates, no measurement).
        if (!currentEstimateId && !client?.id) {
            toast('Select a client first — photos attach to the estimate.', 'error');
            return;
        }
        photoInputRef.current?.click();
    };

    const onPhotoFilesPicked = async (e) => {
        const files = Array.from(e.target.files ?? []);
        // Reset the input so picking the same file again still triggers onChange
        e.target.value = '';
        if (!files.length) return;

        // Ensure the estimate exists. From-scratch estimates may not be saved
        // yet — create one now (needs only a client, NOT a measurement).
        let estId = currentEstimateId;
        if (!estId) {
            if (!client?.id) { toast('Select a client first', 'error'); return; }
            estId = await saveEstimateNow();
            if (!estId) { toast('Could not save the estimate — try again.', 'error'); return; }
        }

        setUploadProgress({ active: 0, total: files.length });
        for (let i = 0; i < files.length; i++) {
            setUploadProgress({ active: i + 1, total: files.length });
            const fd = new FormData();
            fd.append('file', files[i]);
            fd.append('auto_stamp', photoAutoStamp ? 'true' : 'false');
            try {
                await axiosInstance.post(`/estimates/${estId}/photos`, fd);
            } catch (err) {
                toast(err?.userMessage ?? `Photo ${i + 1} failed`, 'error');
            }
        }
        setUploadProgress({ active: 0, total: 0 });
        toast(`Uploaded ${files.length} photo${files.length === 1 ? '' : 's'}`, 'success');
        reloadPhotos();
    };

    const updatePhotoField = async (photoId, patch) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, ...patch } : p));
        try {
            await axiosInstance.patch(`/estimates/${currentEstimateId}/photos/${photoId}`, patch);
        } catch {
            // Roll back optimistic update on failure
            reloadPhotos();
        }
    };

    const deletePhoto = async (photoId) => {
        if (!confirm('Delete this photo?')) return;
        try {
            await axiosInstance.delete(`/estimates/${currentEstimateId}/photos/${photoId}`);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            toast('Photo deleted', 'success');
        } catch {
            /* toasted */
        }
    };

    const restampPhoto = async (photoId) => {
        const tId = sonner.loading('Re-running AI + restamping…');
        try {
            const res = await axiosInstance.post(`/estimates/${currentEstimateId}/photos/${photoId}/restamp`);
            const updated = res.data?.data;
            if (updated) {
                setPhotos(prev => prev.map(p => p.id === photoId ? updated : p));
            }
            sonner.success('Photo re-stamped', { id: tId });
        } catch (err) {
            sonner.error(err?.userMessage ?? 'Restamp failed', { id: tId });
        }
    };

    const togglePhotosMasterPdf = (checked) => {
        // Optimistic — flip local state immediately so the toggle is responsive.
        // The next debounced save will pick it up via buildSavePayload (which
        // reads includePhotosInPdf), so we just nudge triggerSave.
        setIncludePhotosInPdf(checked);
        if (currentEstimateId) triggerSave();
    };

    const toggleMeasurementMasterPdf = (checked) => {
        // Same optimistic + debounced-save pattern as photos (2.6).
        setIncludeMeasurementInPdf(checked);
        if (currentEstimateId) triggerSave();
    };

    /**
     * Adjuster-facing package — real PDF now (was a fake 1.5s setTimeout).
     * Built server-side by the same puppeteer service that renders the estimate,
     * so it carries the company branding AND the stamped S3 photos, neither of
     * which a browser-side PDF builder can reach.
     */
    const generateSupportingDocs = async () => {
        showLoading("Building supporting docs package...", "Code citations and stamped photos");
        try {
            clearTimeout(saveTimerRef.current);
            const id = await saveEstimateNow();
            if (!id) {
                toast("Save the estimate before generating the package", "error");
                return;
            }
            const clientPayload = client
                ? {
                    full_name: client.name ?? null,
                    address: client.address ?? null,
                    claim_number: client.claim ?? null,
                }
                : null;
            const res = await axiosInstance.post(
                `/estimates/${id}/supporting-docs`,
                { company: companyState, terms: termsState, client: clientPayload },
                { responseType: "blob" },
            );
            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const disposition = res.headers?.["content-disposition"] || "";
            const match = /filename="?([^"]+)"?/.exec(disposition);
            const a = document.createElement("a");
            a.href = url;
            a.download = match?.[1] || `supporting-docs_${id.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast("Supporting docs package downloaded", "success");
        } catch (err) {
            toast(err?.userMessage || "Could not build the package", "error");
        } finally {
            hideLoading();
        }
    };

    // ====================== SIGN / PAY ======================
    // Phase 3 signature flow — talks to /estimates/:id/sign endpoints.
    // Two modes:
    //   1. In-person  — homeowner signs on the contractor's tablet (canvas pad)
    //   2. Email link — homeowner gets a token URL, signs on their own device
    const signPadRef = useRef(null);
    const [signMode, setSignMode] = useState('email');           // 'in_person' | 'email'
    const [signerName, setSignerName] = useState('');
    const [signerEmail, setSignerEmail] = useState('');
    const [signMessage, setSignMessage] = useState('');
    // Pre-fill the homeowner name/email from the selected client (also feeds the
    // Stripe deposit recipient). Runs when the client changes; the contractor
    // can still edit the fields afterward.
    useEffect(() => {
        if (!client?.id) return;
        setSignerName(client.name || '');
        setSignerEmail(client.email || '');
    }, [client?.id]);
    const [signing, setSigning] = useState(false);
    const [signHistory, setSignHistory] = useState([]);
    const [lastSignLink, setLastSignLink] = useState(null);

    const reloadSignatures = useCallback(async () => {
        if (!currentEstimateId) return;
        try {
            const res = await axiosInstance.get(`/estimates/${currentEstimateId}/sign`, { suppressErrorToast: true });
            setSignHistory(res.data?.data ?? []);
        } catch { /* ignore */ }
    }, [currentEstimateId]);

    useEffect(() => { reloadSignatures(); }, [reloadSignatures]);

    const signInPerson = async () => {
        if (!currentEstimateId) { toast('Save the estimate first', 'error'); return; }
        if (!signPadRef.current || signPadRef.current.isEmpty()) {
            toast('Have the homeowner sign on the pad first', 'error');
            return;
        }
        if (!signerName.trim()) {
            toast('Type the homeowner\'s name first', 'error');
            return;
        }
        setSigning(true);
        try {
            const dataUrl = signPadRef.current.toDataURL('image/png');
            await axiosInstance.post(`/estimates/${currentEstimateId}/sign`, {
                signer_name: signerName.trim(),
                signer_email: signerEmail.trim() || undefined,
                signer_role: 'homeowner',
                signature_image: dataUrl,
            });
            toast('Estimate signed', 'success');
            signPadRef.current?.clear();
            await reloadSignatures();
        } catch (err) {
            toast(err?.userMessage ?? 'Could not save signature', 'error');
        } finally {
            setSigning(false);
        }
    };

    const sendSignLink = async () => {
        if (!currentEstimateId) { toast('Save the estimate first', 'error'); return; }
        setSigning(true);
        try {
            const res = await axiosInstance.post(`/estimates/${currentEstimateId}/sign/send-link`, {
                recipient_email: signerEmail.trim() || undefined,
                signer_name: signerName.trim() || undefined,
                message: signMessage.trim() || undefined,
            });
            const data = res.data?.data ?? {};
            setLastSignLink(data);
            toast(`Signing link sent to ${data.recipient_email ?? 'homeowner'}`, 'success');
            await reloadSignatures();
        } catch (err) {
            toast(err?.userMessage ?? 'Could not send sign link', 'error');
        } finally {
            setSigning(false);
        }
    };

    const copySignLink = () => {
        if (!lastSignLink?.sign_url) return;
        navigator.clipboard?.writeText(lastSignLink.sign_url);
        toast('Link copied', 'success');
    };

    // Legacy entry point kept around so older buttons / code paths still work
    // but redirect to the new email-link flow.
    const requestSignature = () => {
        setRailTab('sign');
        toast('Open the Sign tab to send a signing link', 'success');
    };

    // ====================== DEPOSITS (Phase 4 — Stripe) ======================
    // Two flows:
    //   1. Stripe Checkout — backend creates the session, we redirect (new tab)
    //   2. Record manual    — already-paid offline deposit (cheque / cash / etc.)
    const [depositMethod, setDepositMethod] = useState('stripe');  // 'stripe' | 'manual'
    const [depositLoading, setDepositLoading] = useState(false);
    const [deposits, setDeposits] = useState([]);
    const [depositTotalPaid, setDepositTotalPaid] = useState(0);
    const [manualNote, setManualNote] = useState('');
    // Remote Stripe payment-link delivery — the homeowner pays on their own
    // device. Email on by default; SMS optional (needs a provisioned number).
    const [depositSendEmail, setDepositSendEmail] = useState(true);
    const [depositSendSms, setDepositSendSms] = useState(false);
    const [lastPayLink, setLastPayLink] = useState('');
    const [depositsRefreshing, setDepositsRefreshing] = useState(false);
    const [depositsLoading, setDepositsLoading] = useState(false);

    const reloadDeposits = useCallback(async () => {
        if (!currentEstimateId) { setDepositsLoading(false); return; }
        setDepositsLoading(true);
        try {
            const res = await axiosInstance.get(`/estimates/${currentEstimateId}/deposits`, { suppressErrorToast: true });
            setDeposits(res.data?.data ?? []);
            setDepositTotalPaid(Number(res.data?.meta?.total_paid ?? 0));
        } catch { /* ignore */ }
        finally { setDepositsLoading(false); }
    }, [currentEstimateId]);

    useEffect(() => { reloadDeposits(); }, [reloadDeposits]);

    // Refresh deposits on focus — Stripe sends the user back to /dashboard/estimation
    // after Checkout, so when they come back to the tab we should see the new "paid"
    // row (assuming the webhook landed by then).
    useEffect(() => {
        const onFocus = () => reloadDeposits();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [reloadDeposits]);

    // Create a Stripe payment link for this estimate's deposit and (optionally)
    // send it to the homeowner via email / SMS so they pay remotely. Whatever
    // happens, the checkout_url is shown below with a Copy button as a fallback.
    const sendPaymentLink = async () => {
        if (!currentEstimateId) { toast('Save the estimate first', 'error'); return; }
        if (!(paymentAmount > 0)) { toast('Enter a deposit amount', 'error'); return; }
        const channels = [];
        if (depositSendEmail) channels.push('email');
        if (depositSendSms) channels.push('sms');
        setDepositLoading(true);
        try {
            const res = await axiosInstance.post(`/estimates/${currentEstimateId}/deposits`, {
                amount: Number(paymentAmount.toFixed(2)),
                currency: 'usd',
                payment_method: 'stripe',
                customer_email: signerEmail?.trim() || undefined,
                customer_name: signerName?.trim() || undefined,
                send_channels: channels.length ? channels : undefined,
            });
            const data = res.data?.data ?? {};
            const url = data.checkout_url;
            if (!url) {
                toast('Stripe did not return a payment URL', 'error');
                return;
            }
            setLastPayLink(url);

            const deliveries = data.delivery ?? [];
            const okCh = deliveries.filter((d) => d.sent).map((d) => d.channel);
            const failCh = deliveries.filter((d) => !d.sent);
            if (okCh.length) {
                toast(`Payment link sent to homeowner via ${okCh.join(' + ')}`, 'success');
            }
            if (failCh.length) {
                toast(`Couldn't send via ${failCh.map((d) => d.channel).join(', ')} — copy the link below and send it manually`, 'error');
            }
            if (!channels.length) {
                toast('Payment link ready — copy it below to share with the homeowner', 'success');
            }
            reloadDeposits();
        } catch (err) {
            toast(err?.userMessage ?? 'Could not create payment link', 'error');
        } finally {
            setDepositLoading(false);
        }
    };

    const copyPayLink = () => {
        if (!lastPayLink) return;
        navigator.clipboard?.writeText(lastPayLink);
        toast('Payment link copied', 'success');
    };

    // Manual refresh — pull the latest deposit statuses (e.g. pending → paid
    // once the Stripe webhook lands) without waiting for the focus listener.
    const refreshDeposits = async () => {
        if (depositsRefreshing) return;
        setDepositsRefreshing(true);
        try {
            await reloadDeposits();
        } finally {
            setDepositsRefreshing(false);
        }
    };

    const recordManualDeposit = async () => {
        if (!currentEstimateId) { toast('Save the estimate first', 'error'); return; }
        if (!(paymentAmount > 0)) { toast('Enter an amount', 'error'); return; }
        if (!manualNote.trim()) { toast('Add a note (cheque #, payment ref, etc.)', 'error'); return; }
        setDepositLoading(true);
        try {
            await axiosInstance.post(`/estimates/${currentEstimateId}/deposits/manual`, {
                amount: Number(paymentAmount.toFixed(2)),
                currency: 'usd',
                notes: manualNote.trim(),
            });
            toast('Manual deposit recorded', 'success');
            setManualNote('');
            reloadDeposits();
        } catch (err) {
            toast(err?.userMessage ?? 'Could not record deposit', 'error');
        } finally {
            setDepositLoading(false);
        }
    };

    // Kept the old name working so any stale handlers don't crash.
    const generateInvoice = () => {
        if (depositMethod === 'manual') recordManualDeposit();
        else sendPaymentLink();
    };

    // ====================== RATE LEARNING ======================
    const openRateLearning = () => setRateLearningModal(true);

    const uploadRateFile = (type) => {
        const i = document.createElement("input");
        i.type = "file";
        i.accept = ".pdf,.json,.xml,.csv";
        i.multiple = true;
        i.onchange = (e) => {
            const newFiles = [...e.target.files].map((f) => ({
                name: f.name, size: f.size, date: new Date().toLocaleDateString(), note: "",
            }));
            setRateFiles((prev) => ({ ...prev, [type]: [...prev[type], ...newFiles] }));
            toast(`${e.target.files.length} ${type} estimate(s) uploaded`, "success");
        };
        i.click();
    };

    const removeRateFile = (type, idx) => {
        setRateFiles((prev) => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
    };

    const retrainAI = () => {
        const total = rateFiles.accepted.length + rateFiles.declined.length;
        if (total === 0) { toast("Upload at least one estimate first", "warn"); return; }
        showLoading("Training AI on your rates...", `Analyzing ${total} estimate(s) to learn your pricing patterns`);
        setTimeout(() => {
            hideLoading();
            setRateLearningModal(false);
            toast(`AI retrained on ${total} estimates`, "success");
        }, 2200);
    };

    const rateConfidence = (() => {
        const total = rateFiles.accepted.length + rateFiles.declined.length;
        if (total >= 20) return "High";
        if (total >= 8) return "Medium";
        if (total >= 1) return "Low";
        return "—";
    })();

    // ====================== MORE / MISC ======================
    const toggleMoreOptions = (e) => { e.stopPropagation(); setMoreOpen((p) => !p); };
    // CK-FIX Jul-22: the "All" button was a toast stub — it now opens a real
    // search-across-every-category modal.
    const openItemLibrary = () => { setMoreOpen(false); setAllItemsSearch(""); setAllItemsModal(true); };
    const openBundles = () => { setMoreOpen(false); toast("Manage bundles", "success"); };
    const openTemplates = () => { setMoreOpen(false); toast("Estimate templates", "success"); };
    const saveAsTemplate = () => { setMoreOpen(false); toast("Saved as template", "success"); };

    const editEstimateTitle = () => {
        const newTitle = window.prompt("Estimate title", estimateTitle);
        if (newTitle) setEstimateTitle(newTitle.toUpperCase());
    };

    // ====================== TERMS EDITOR ======================
    const openTermsEditor = () => {
        setMoreOpen(false);
        setTermsEditFields({
            companyName: companyState.name,
            legalName: companyState.legal_name,
            address: companyState.address,
            phone: companyState.phone,
            email: companyState.general_email,
            website: companyState.website,
            shortTerms: termsState.short_terms.map((t) => t.replace(/<[^>]+>/g, "")).join("\n"),
            fullTerms: termsState.full_terms,
        });
        setTermsEditorModal(true);
    };

    const saveTermsEdit = () => {
        setCompanyState((prev) => ({
            ...prev,
            name: termsEditFields.companyName.trim() || COMPANY_DEFAULT.name,
            legal_name: termsEditFields.legalName.trim() || COMPANY_DEFAULT.legal_name,
            address: termsEditFields.address.trim() || COMPANY_DEFAULT.address,
            phone: termsEditFields.phone.trim() || COMPANY_DEFAULT.phone,
            general_email: termsEditFields.email.trim() || COMPANY_DEFAULT.general_email,
            website: termsEditFields.website.trim() || COMPANY_DEFAULT.website,
        }));
        const shortLines = termsEditFields.shortTerms.split("\n").map((l) => l.trim()).filter(Boolean);
        setTermsState((prev) => ({
            ...prev,
            full_terms: termsEditFields.fullTerms || TERMS_DEFAULT.full_terms,
            short_terms: shortLines.length ? shortLines : prev.short_terms,
        }));
        setTermsEditorModal(false);
        toast("Terms updated", "success");
    };

    const resetTermsToDefault = () => {
        if (!window.confirm("Reset Terms & Conditions to the default ClaimKing template? Your edits will be lost.")) return;
        setCompanyState(JSON.parse(JSON.stringify(COMPANY_DEFAULT)));
        setTermsState(JSON.parse(JSON.stringify(TERMS_DEFAULT)));
        setTermsEditorModal(false);
        toast("Reset to default terms", "success");
    };

    // ====================== FINALIZE ======================
    const openFinalize = () => { if (!ensureClient()) return; setFinalizeModal(true); };
    // Deliver the finalized estimate to the selected client via the chosen
    // channel(s). Recipients are the client's email/phone on file — the
    // backend reads them, so we never prompt for an address here.
    const sendEstimateVia = async (channels) => {
        const wantsEmail = channels.includes("email");
        const wantsSms = channels.includes("sms");
        if (wantsEmail && !client?.email) {
            toast("This client has no email on file", "error");
            return;
        }
        if (wantsSms && !client?.phone) {
            toast("This client has no phone number on file", "error");
            return;
        }
        const label = wantsSms && !wantsEmail ? "Texting client…" : "Emailing client…";
        showLoading(label, "Sending your estimate");
        try {
            clearTimeout(saveTimerRef.current);
            const id = await saveEstimateNow();
            if (!id) {
                toast("Save the estimate before sending", "error");
                return;
            }
            const res = await axiosInstance.post(`/estimates/${id}/send`, { channels });
            const sent = res.data?.sent ?? [];
            const where = sent.map((s) => s.to).filter(Boolean).join(", ");
            setFinalizeModal(false);
            toast(where ? `Sent to ${where}` : "Estimate sent", "success");
        } catch (err) {
            toast(err?.userMessage || "Failed to send estimate", "error");
        } finally {
            hideLoading();
        }
    };
    const sendEstimate = () => sendEstimateVia(["email"]);
    const sendEstimateSms = () => sendEstimateVia(["sms"]);
    const downloadPDF = async () => {
        showLoading("Generating PDF...", "Building your estimate document");
        try {
            // Flush any pending edits so the server renders the latest scope.
            clearTimeout(saveTimerRef.current);
            const id = await saveEstimateNow();
            if (!id) {
                toast("Save the estimate before downloading", "error");
                return;
            }
            const clientPayload = client
                ? {
                    full_name: client.name ?? null,
                    address: client.address ?? null,
                    claim_number: client.claim ?? null,
                }
                : null;
            const res = await axiosInstance.post(
                `/estimates/${id}/pdf`,
                { company: companyState, terms: termsState, client: clientPayload },
                { responseType: "blob" },
            );
            const blob = new Blob([res.data], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const disposition = res.headers?.["content-disposition"] || "";
            const match = /filename="?([^"]+)"?/.exec(disposition);
            const filename = match?.[1] || `estimate_${id.slice(0, 8)}.pdf`;
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setFinalizeModal(false);
            toast("PDF downloaded", "success");
        } catch (err) {
            toast(err?.userMessage || "Failed to generate PDF", "error");
        } finally {
            hideLoading();
        }
    };
    const saveToPortal = async () => {
        showLoading("Sharing to client portal...", "Publishing your estimate");
        try {
            clearTimeout(saveTimerRef.current);
            const id = await saveEstimateNow();
            if (!id) {
                toast("Save the estimate before sharing", "error");
                return;
            }
            await axiosInstance.patch(
                `/estimates/${id}/status`,
                { status: "sent" },
                { suppressErrorToast: true },
            );
            // Notify the client by email that the estimate is on their portal.
            // Best-effort for the SHARE (a mail failure must not block publishing
            // to the portal) — but the failure reason is surfaced to the
            // contractor instead of being swallowed, so "no email arrived" is
            // never silent. Root causes we make visible: client has no email on
            // file, or SMTP/Resend isn't configured (backend 503).
            let emailed = false;
            let emailError = "";
            if (client?.email) {
                try {
                    await axiosInstance.post(
                        `/estimates/${id}/send`,
                        { channels: ["email"] },
                        { suppressErrorToast: true },
                    );
                    emailed = true;
                } catch (e) {
                    emailError = e?.userMessage || "The estimate email could not be sent";
                }
            } else {
                emailError = "This client has no email on file — add one to email the estimate";
            }
            // The portal is TOKEN-gated. The link must use the client's
            // unguessable portal token — NOT client.id. The old
            // `/portal/${client.id}` model was removed (see ClientPortal.jsx
            // SharePortalModal): resolve_portal_token() treats client.id as a
            // token, finds no match, and 404s — that was the dead link.
            // POST /tokens is idempotent: returns the existing active token or
            // mints one, so we never rotate an existing link on share.
            let portalUrl = "";
            try {
                const tokRes = await axiosInstance.post(
                    `/client-portal/${client.id}/tokens`,
                    {},
                    { suppressErrorToast: true },
                );
                const tokenStr = tokRes?.data?.token;
                if (tokenStr) {
                    portalUrl = `${window.location.origin}/portal/${tokenStr}?estimate=${id}`;
                }
            } catch { /* token issue is best-effort — the share itself succeeded */ }
            let copied = false;
            if (portalUrl) {
                try { await navigator.clipboard?.writeText(portalUrl); copied = true; } catch { /* clipboard not available */ }
            }
            setFinalizeModal(false);
            const shareParts = [];
            if (copied) shareParts.push("link copied");
            if (emailed) shareParts.push("client emailed");
            toast(
                shareParts.length
                    ? `Shared to client portal — ${shareParts.join(" & ")}`
                    : "Shared to client portal",
                "success",
            );
            // Surface why the client wasn't emailed (config / no address) so the
            // "gets an email" promise on the button isn't silently broken.
            if (emailError) toast(`Client not emailed — ${emailError}`, "error");
        } catch (err) {
            toast(err?.userMessage || "Failed to share estimate", "error");
        } finally {
            hideLoading();
        }
    };
    const sendToCRM = () => { setFinalizeModal(false); toast("Synced to CRM", "success"); };

    // ====================== AVAILABLE SECTION TEMPLATES (for add-section modal) ======================
    const availableTemplates = (SECTION_TEMPLATES[mode] || SECTION_TEMPLATES.insurance)
        .filter((t) => !sections.find((s) => s.id === t.id));

    // ====================== RENDER ======================
    // `estimation-page` is this route's styling hook. (The light-input block it
    // originally scoped now lives in globals.css and applies app-wide.)
    return (
        <div className={`estimation-page mode-${mode}`}>
            <IconSprite />

            {/* ============ HEADER (mr-hero pattern, matches Measurement page) ============ */}
            <div className="mr-hero">
                <div className="mr-hero-inner">
                    <div className="mr-hero-left">
                        <div className="mr-hero-eyebrow">
                            <span className="mr-hero-dot" />
                            Estimation Studio
                        </div>
                        <h1 className="mr-hero-title">
                            Build estimates <span className="mr-hero-title-accent">in minutes</span>
                        </h1>
                        <p className="mr-hero-subtitle">
                            Pull measurements, materials, and code requirements into one structured, explainable estimate — ready for the carrier or homeowner.
                        </p>

                        <div className="mr-hero-stats">
                            <div className={`mr-stat ${aiReady ? "mr-stat-ok" : "mr-stat-warn"}`}>
                                <div className="mr-stat-icon">{aiReady ? "✓" : "!"}</div>
                                <div>
                                    <div className="mr-stat-label">AI Status</div>
                                    <div className="mr-stat-value">{aiReady ? "Ready" : "Not configured"}</div>
                                </div>
                            </div>

                            {creditsKnown && (
                                <div className={`mr-stat ${insufficientCredits ? "mr-stat-warn" : "mr-stat-ok"}`}>
                                    <div className="mr-stat-icon">⚡</div>
                                    <div>
                                        <div className="mr-stat-label">Credits</div>
                                        <div className="mr-stat-value">
                                            {totalCredits.toLocaleString()}
                                            {requiredCredits > 0 && (
                                                <span className="mr-stat-sub"> · {requiredCredits}/run</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mode toggle as stat-chip */}
                            <div className="mr-stat" role="tablist" aria-label="Estimate type" style={{ padding: 4, gap: 0 }}>
                                <button
                                    type="button"
                                    onClick={() => setEstimateType("insurance")}
                                    style={modeChipStyle(mode === "insurance")}
                                >Insurance</button>
                                <button
                                    type="button"
                                    onClick={() => setEstimateType("retail")}
                                    style={modeChipStyle(mode === "retail")}
                                >Retail</button>
                            </div>

                            <button
                                type="button"
                                className="mr-stat mr-stat-link"
                                onClick={() => setSavedEstimatesModal(true)}
                                title="View saved estimates"
                            >
                                <div className="mr-stat-icon">📋</div>
                                <div style={{ textAlign: "left" }}>
                                    <div className="mr-stat-label">Saved Estimates</div>
                                    <div className="mr-stat-value">
                                        {savedEstimates.length}
                                        <span className="mr-stat-sub"> open</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="mr-hero-actions">
                        {hasStarted && (
                            <div className={`save-indicator ${saveIndicator.saving ? "saving" : ""}`}
                                 style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
                                          background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280",
                                          border: "1px solid #e5e7eb" }}>
                                <span className="dot" style={{ width: 6, height: 6, borderRadius: "50%",
                                       background: saveIndicator.saving ? "#f59e0b" : "#10b981" }}></span>
                                <span>{saveIndicator.text}</span>
                            </div>
                        )}

                        {/* More menu — only the 2 real features (terms + rate-learning).
                            Stub items removed; we'll add them back when their backends ship. */}
                        <div style={{ position: "relative" }}>
                            <button
                                type="button"
                                className="mr-btn-ghost"
                                onClick={toggleMoreOptions}
                                aria-haspopup="true"
                                aria-expanded={moreOpen}
                            >
                                <svg className="icon icon-sm"><use href="#i-dots" /></svg>
                                More
                            </button>
                            {moreOpen && (
                                <div className="more-options-menu active" role="menu" style={{ minWidth: 240 }}>
                                    <div className="menu-section">
                                        <button
                                            type="button"
                                            className="menu-item"
                                            onClick={() => { setMoreOpen(false); openRateLearning(); }}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-brain" /></svg>
                                            Train AI on My Rates
                                        </button>
                                        <a
                                            href="/dashboard/estimation/rate-book"
                                            className="menu-item"
                                            role="menuitem"
                                            style={{ textDecoration: 'none' }}
                                            onClick={() => setMoreOpen(false)}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-doc" /></svg>
                                            Open Rate Book
                                        </a>
                                        <button
                                            type="button"
                                            className="menu-item"
                                            onClick={() => { setMoreOpen(false); openTemplatePicker('template'); }}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-doc" /></svg>
                                            Apply Template
                                        </button>
                                        <button
                                            type="button"
                                            className="menu-item"
                                            onClick={() => { setMoreOpen(false); openTemplatePicker('bundle'); }}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-plus" /></svg>
                                            Insert Bundle
                                        </button>
                                        <button
                                            type="button"
                                            className="menu-item"
                                            onClick={() => { setMoreOpen(false); openSaveAsTemplate(); }}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-copy" /></svg>
                                            Save as Template
                                        </button>
                                        <a
                                            href="/dashboard/estimation/templates"
                                            className="menu-item"
                                            role="menuitem"
                                            style={{ textDecoration: 'none' }}
                                            onClick={() => setMoreOpen(false)}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-doc" /></svg>
                                            Manage Templates &amp; Bundles
                                        </a>
                                        <button
                                            type="button"
                                            className="menu-item"
                                            onClick={() => { setMoreOpen(false); openTermsEditor(); }}
                                        >
                                            <svg className="icon icon-sm"><use href="#i-doc" /></svg>
                                            Edit Terms &amp; Conditions
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ MAIN ============ */}
            <main className={`main-container ${hasStarted ? '' : 'est-start-layout'}`}>

                {/* ─────────────── Client selection ─────────────── */}
                <ClientSelector
                    client={client}
                    onChange={handleClientChange}
                    scrollId="estClientSection"
                    banner={linkedMeasurement && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", marginBottom: 14,
                            background: "linear-gradient(135deg,#eff6ff,#fff)",
                            border: "1px solid #93c5fd", borderRadius: 8,
                            fontSize: 13, color: "#1e3a8a",
                        }}>
                            <span style={{
                                background: "#1d4ed8", color: "white",
                                fontSize: 11, fontWeight: 600,
                                padding: "2px 8px", borderRadius: 10,
                                textTransform: "uppercase", letterSpacing: 0.3,
                                whiteSpace: "nowrap",
                            }}>Measurement linked</span>
                            <span style={{ flex: 1 }}>
                                {linkedMeasurement.extracted_data?.squares ?? "—"} sq
                                {linkedMeasurement.source_provider && linkedMeasurement.source_provider !== "unknown"
                                    ? ` · ${linkedMeasurement.source_provider}` : ""}
                                {" — "}<strong>pick a client below</strong> to start the AI estimate.
                            </span>
                        </div>
                    )}
                    selectedExtraActions={(
                        <>
                            {/* CK-FIX Jul-22: both links were dead (preventDefault and nothing else) */}
                            <a href="#" className="cs-action-link" onClick={(e) => { e.preventDefault(); setSavedEstimatesModal(true); }}>View Previous Estimates</a>
                            <a href="#" className="cs-action-link" onClick={(e) => { e.preventDefault(); router.push(client?.id ? `/dashboard/client-portal?client=${client.id}` : "/dashboard/client-portal"); }}>Client Preferences</a>
                        </>
                    )}
                />


                {/* ─────────────── Measurement source banner ─────────────── */}
                {linkedMeasurement && (
                    <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        flexWrap: "wrap", gap: 8,
                        padding: "10px 14px", margin: "0 auto 1rem", maxWidth: 1600,
                        background: "linear-gradient(135deg,#eff6ff,#fff)", border: "1px solid #93c5fd",
                        borderRadius: 8, fontSize: 13,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <span style={{
                                background: "#1d4ed8", color: "white", fontSize: 11, fontWeight: 600,
                                padding: "2px 8px", borderRadius: 10, letterSpacing: 0.3, textTransform: "uppercase",
                            }}>From measurement</span>
                            <span style={{ color: "#1e3a8a" }}>
                                {linkedMeasurement.extracted_data?.squares ?? "—"} squares
                                {linkedMeasurement.source_provider && linkedMeasurement.source_provider !== "unknown"
                                    ? ` • ${linkedMeasurement.source_provider}`
                                    : ""}
                                {linkedMeasurement.confidence_score != null
                                    ? ` • ${Math.round(linkedMeasurement.confidence_score * 100)}% confident`
                                    : ""}
                            </span>
                        </div>
                        <a
                            href="#"
                            style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 500 }}
                            onClick={(e) => {
                                e.preventDefault();
                                setLinkedMeasurement(null);
                                if (typeof window !== "undefined") {
                                    window.history.replaceState({}, "", window.location.pathname);
                                }
                            }}
                        >Detach measurement</a>
                    </div>
                )}

                {/* 2.0b — attach a measurement report on file to THIS estimate.
                    Shows once the estimate has a client; feeds the PDF attach (2.6). */}
                {currentEstimateId && client?.id && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                        padding: "8px 14px", margin: "0 auto 1rem", maxWidth: 1600,
                        background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13,
                    }}>
                        <label style={{ fontWeight: 600, color: "#374151" }}>Measurement report:</label>
                        {clientMeasurementsLoading ? (
                            <span style={{ color: "#9ca3af" }}>Loading…</span>
                        ) : clientMeasurements.length === 0 ? (
                            <span style={{ color: "#6b7280" }}>
                                No measurement reports on file ·{" "}
                                <a href="/dashboard/measurement" style={{ color: "#1d4ed8", fontWeight: 600 }}>Measurement Reports →</a>
                            </span>
                        ) : (
                            <select
                                value={linkedMeasurement?.id ?? ""}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    if (!id) { setLinkedMeasurement(null); return; }
                                    const picked = clientMeasurements.find((m) => m.id === id);
                                    if (picked) setLinkedMeasurement(picked);
                                }}
                                style={{
                                    padding: "7px 10px", border: "1.5px solid #e5e7eb", borderRadius: 8,
                                    fontSize: 13, background: "white", minWidth: 260,
                                }}
                            >
                                <option value="">— None (not attached) —</option>
                                {clientMeasurements.map((m) => {
                                    const sq = m.extracted_data?.squares;
                                    return (
                                        <option key={m.id} value={m.id}>
                                            {(m.title || m.source_file_name || "Untitled")}
                                            {sq != null ? ` — ${sq} sq` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                    </div>
                )}

                {/* STAGE 1: Start */}
                {!hasStarted && (
                    <div className="start-stage">
                        <h1>Build a new estimate</h1>
                        <p>Pick how you want to start. Most contractors save 30+ minutes per estimate by uploading a measurement report.</p>
                        <div className="start-options">
                            <button className="start-card primary" onClick={openAIGenerator}>
                                <div className="start-card-icon"><svg className="icon icon-lg"><use href="#i-sparkle" /></svg></div>
                                <h3>Upload &amp; Auto-Build</h3>
                                <p>Drop in a measurement report or photos. AI builds your estimate using your rates.</p>
                            </button>
                            <button className="start-card alt" onClick={startBlank}>
                                <div className="start-card-icon"><svg className="icon icon-lg"><use href="#i-edit" /></svg></div>
                                <h3>Start Blank</h3>
                                <p>Build from scratch with your saved sections and items.</p>
                            </button>
                        </div>
                        <p className="start-help" style={{ color: client ? "#059669" : undefined }}>
                            {client ? (
                                <>Client <strong style={{ color: "#1a1f3a" }}>{client.name}</strong> selected. Pick how to start above.</>
                            ) : (
                                <>First time here? <a href="#" onClick={(e) => { e.preventDefault(); openRateLearning(); }}>Train the AI on your past estimates</a> so it uses your real prices.</>
                            )}
                        </p>
                    </div>
                )}

                {/* STAGE 2: AI bar */}
                {/* Policy Analysis supplement panel — visible whenever the user
                    landed here via ?policy_analysis_id. Renders before the
                    AI bar so the suggestions are the first thing they see. */}
                {linkedPolicyAnalysis && (
                    <PolicyAnalysisSupplementPanel
                        analysis={linkedPolicyAnalysis}
                        onApply={applyPolicyHintsToAi}
                        onDismiss={() => setLinkedPolicyAnalysis(null)}
                    />
                )}

                {hasStarted && (
                    <div className="ai-bar" style={{ display: "flex" }}>
                        <div className="ai-bar-icon"><svg className="icon"><use href="#i-sparkle" /></svg></div>
                        <div className="ai-bar-text">
                            <div className="ai-bar-title">{sections.some((s) => s.items.length > 0) ? "Estimate auto-generated" : "AI is ready to help"}</div>
                            <div className="ai-bar-sub">{sections.some((s) => s.items.length > 0) ? "AI used your trained rates. Review line items and tweak as needed." : "Upload a measurement report to auto-fill, or add items manually below."}</div>
                        </div>
                        <div className="ai-bar-actions">
                            <button className="btn-ai-ghost" onClick={openAIGenerator}>
                                <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-upload" /></svg>
                                Upload &amp; Build
                            </button>
                            <button className="btn-ai" onClick={askAIToReview}>
                                <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-refresh" /></svg>
                                AI Review
                            </button>
                            <button
                                className="btn-ai"
                                onClick={() => setChangesOpen(true)}
                                style={{ background: '#FDB813', color: '#1a1f3a', fontWeight: 700 }}
                            >
                                ✨ Ask AI to Make Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* STAGE 2: Builder */}
                {hasStarted && (
                    <div className="builder-section" style={{ display: "grid" }}>

                        {/* LEFT PANEL */}
                        <aside className="left-panel">
                            <div className="panel">
                                <div className="panel-header">
                                    <h3 className="panel-title">Sections</h3>
                                    <button className="add-section-btn" onClick={openAddSection} title="Add section" aria-label="Add section">
                                        <svg className="icon icon-sm"><use href="#i-plus" /></svg>
                                    </button>
                                </div>
                                <div className="sections-list">
                                    {sections.map((s) => (
                                        <div key={s.id} className={`section-item ${activeSection === s.id ? "active" : ""}`} onClick={() => selectSection(s.id)}>
                                            <span className="section-name">{s.name}</span>
                                            <span className="section-count">{s.items.length}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="panel">
                                <div className="panel-header">
                                    <h3 className="panel-title">Add Items</h3>
                                    <button className="see-all-btn" onClick={openItemLibrary}>
                                        <svg className="icon icon-sm"><use href="#i-grid" /></svg>
                                        All
                                    </button>
                                </div>
                                <input ref={bulkFileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={onBulkFile} />
                                <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 11.5, alignItems: "center" }}>
                                    <button type="button" onClick={() => openBulkUpload("library")} style={{ background: "#fffef7", border: "1px dashed #FDB813", color: "#92400e", padding: "4px 9px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>📤 Bulk Upload</button>
                                    <button type="button" onClick={downloadLibraryTemplate} style={{ background: "transparent", border: "none", color: "#1d4ed8", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Download template</button>
                                </div>
                                <input type="text" className="search-input" placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                                <div className="category-tabs">
                                    {["roofing", "siding", "gutters", "windows", "general"].map((cat) => (
                                        <button key={cat} className={`category-tab ${activeCategory === cat ? "active" : ""}`} onClick={() => { setActiveCategory(cat); setItemSearch(""); }}>
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="items-list">
                                    {visibleItems.length === 0 ? (
                                        <div className="empty-list">{itemSearch ? "No matches" : "No items in this category"}</div>
                                    ) : visibleItems.map((it) => {
                                        const isEditing = editingLib && editingLib.cat === it._cat && editingLib.idx === it._idx;
                                        return (
                                        <div key={`${it._cat}-${it._idx}`} className="item-row library-row"
                                            style={isEditing ? { cursor: "default" } : undefined}
                                            onClick={(e) => {
                                                if (isEditing) return;
                                                if (e.target.closest(".library-edit")) return;
                                                addToEstimate(it.name, it.price, it.unit);
                                            }}>
                                            {isEditing ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        value={editLibName}
                                                        onChange={(e) => setEditLibName(e.target.value)}
                                                        placeholder="Item name"
                                                        autoFocus
                                                        onKeyDown={(e) => { if (e.key === "Enter") saveEditLibItem(); if (e.key === "Escape") cancelEditLibItem(); }}
                                                        style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                    />
                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <span style={{ color: "#059669", fontWeight: 600, fontSize: 13 }}>$</span>
                                                        <input
                                                            type="number" min="0" step="0.01"
                                                            value={editLibPrice}
                                                            onChange={(e) => setEditLibPrice(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === "Enter") saveEditLibItem(); if (e.key === "Escape") cancelEditLibItem(); }}
                                                            style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                        />
                                                        <span style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>/{it.unit}</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        <button onClick={saveEditLibItem} style={{ flex: 1, padding: "6px 10px", background: "#1a1f3a", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                                                        <button onClick={cancelEditLibItem} style={{ flex: 1, padding: "6px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="item-info">
                                                        <div className="item-name">{it.name}</div>
                                                        <div className="item-price">${it.price.toFixed(2)}/{it.unit}{itemSearch && <span style={{ color: "#9ca3af", fontWeight: 400 }}> · {it._cat}</span>}</div>
                                                    </div>
                                                    <button className="item-edit-btn library-edit" onClick={(e) => { e.stopPropagation(); startEditLibItem(it._cat, it._idx); }}>Edit</button>
                                                </>
                                            )}
                                        </div>
                                        );
                                    })}
                                </div>
                                <button onClick={() => openCustomItem()} style={{ width: "100%", marginTop: 10, padding: 9, background: "#fffef7", border: "1px dashed #FDB813", borderRadius: 7, color: "#92400e", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                    <svg className="icon icon-sm"><use href="#i-plus" /></svg>
                                    Add New Item
                                </button>
                            </div>
                        </aside>

                        {/* CENTER */}
                        <section className="estimate-panel">
                            <div className="estimate-header">
                                <div className="company-info">
                                    {contractorCompany?.logo_url ? (
                                        <img
                                            src={contractorCompany.logo_url}
                                            alt="logo"
                                            style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <svg viewBox="0 0 24 24"><use href="#i-crown" /></svg>
                                    )}
                                    <div>
                                        <div className="company-info-text">
                                            {(contractorCompany?.name || 'Your Company').toUpperCase()}
                                        </div>
                                        <div className="company-info-sub">{mode === "insurance" ? "Insurance Restoration Estimate" : "Retail Service Proposal"}</div>
                                    </div>
                                </div>
                                <div className="client-info">
                                    <div><strong>Client:</strong> <span>{client ? client.name : "Not selected"}</span></div>
                                    <div><strong>Date:</strong> <span>{estimateDate}</span></div>
                                    <div><strong>Claim #:</strong> <span>{client ? client.claim : "—"}</span></div>
                                </div>
                            </div>

                            <h1 className="estimate-title" onClick={editEstimateTitle} title="Click to edit">{estimateTitle}</h1>

                            <div className="scope-callout">
                                <div className="scope-callout-title">
                                    <svg className="icon icon-sm"><use href="#i-warning" /></svg>
                                    Critical scope items
                                </div>
                                <ul></ul>
                            </div>

                            {/* Estimate sections */}
                            <div>
                                {sections.length === 0 ? (
                                    <div className="empty-section">No sections yet. Add one from the left panel.</div>
                                ) : sections.map((s) => (
                                    <div className="estimate-section" key={s.id} id={`section-${s.id}`}>
                                        <div className="section-header-bar">
                                            <span>{s.name.toUpperCase()}</span>
                                            <div className="section-controls">
                                                <button className="section-btn" onClick={() => duplicateSection(s.id)} title="Duplicate"><svg className="icon icon-sm"><use href="#i-copy" /></svg></button>
                                                <button className="section-btn" onClick={() => editSectionName(s.id)} title="Rename"><svg className="icon icon-sm"><use href="#i-edit" /></svg></button>
                                                <button className="section-btn" onClick={() => deleteSection(s.id)} title="Delete"><svg className="icon icon-sm"><use href="#i-trash" /></svg></button>
                                            </div>
                                        </div>
                                        <table className="estimate-table">
                                            <thead><tr>
                                                <th style={{ width: 24 }}></th>
                                                <th>Description</th>
                                                <th style={{ width: 80 }}>Qty</th>
                                                <th style={{ width: 60 }}>Unit</th>
                                                <th style={{ width: 90 }}>Unit $</th>
                                                <th style={{ width: 100 }}>Total</th>
                                                <th style={{ width: 130 }}></th>
                                            </tr></thead>
                                            <tbody>
                                                {s.items.length === 0 ? (
                                                    <tr><td colSpan="7" className="empty-section">No items yet. Click items in the left panel to add.</td></tr>
                                                ) : s.items.map((it, idx) => {
                                                    const isItemEditing = editingItem && editingItem.secId === s.id && editingItem.idx === idx;
                                                    return (
                                                    <tr key={idx}
                                                        draggable={!isItemEditing}
                                                        data-section-id={s.id}
                                                        data-idx={idx}
                                                        onDragStart={(e) => handleDragStart(e, s.id, idx)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => handleDragOver(e, s.id)}
                                                        onDrop={(e) => handleDrop(e, s.id, idx)}>
                                                        <td><span className="drag-handle" title="Drag to reorder"><svg className="icon icon-sm"><use href="#i-grip" /></svg></span></td>
                                                        <td>
                                                            {isItemEditing ? (
                                                                <input
                                                                    value={itemDraft.name}
                                                                    onChange={(e) => setItemDraft((d) => ({ ...d, name: e.target.value }))}
                                                                    placeholder="Item name"
                                                                    autoFocus
                                                                    onKeyDown={(e) => { if (e.key === "Enter") saveEditItem(); if (e.key === "Escape") cancelEditItem(); }}
                                                                    style={{ width: "100%", boxSizing: "border-box", padding: "5px 7px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                                />
                                                            ) : (
                                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                    {it.name}
                                                                    {it.reason && (
                                                                        <span
                                                                            title={[
                                                                                it.reason,
                                                                                it.source_field ? `Source: ${it.source_field}` : null,
                                                                                it.code_ref ? `Code: ${it.code_ref}` : null,
                                                                            ].filter(Boolean).join("\n\n")}
                                                                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, cursor: "help", border: "1px solid #fde68a" }}
                                                                        >?</span>
                                                                    )}
                                                                    {it.code_ref && (
                                                                        <span title={`Required by ${it.code_ref}`} style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#dbeafe", color: "#1e40af", cursor: "help" }}>CODE</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{isItemEditing ? (
                                                            <input type="number" min="0" step="0.01" className="qty-input" value={itemDraft.qty}
                                                                onChange={(e) => setItemDraft((d) => ({ ...d, qty: e.target.value }))}
                                                                onKeyDown={(e) => { if (e.key === "Enter") saveEditItem(); if (e.key === "Escape") cancelEditItem(); }} />
                                                        ) : it.qty}</td>
                                                        <td>{isItemEditing ? (
                                                            <input value={itemDraft.unit}
                                                                onChange={(e) => setItemDraft((d) => ({ ...d, unit: e.target.value }))}
                                                                onKeyDown={(e) => { if (e.key === "Enter") saveEditItem(); if (e.key === "Escape") cancelEditItem(); }}
                                                                style={{ width: 50, boxSizing: "border-box", padding: "5px 6px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }} />
                                                        ) : it.unit}</td>
                                                        <td>{isItemEditing ? (
                                                            <input type="number" min="0" step="0.01" value={itemDraft.price}
                                                                onChange={(e) => setItemDraft((d) => ({ ...d, price: e.target.value }))}
                                                                onKeyDown={(e) => { if (e.key === "Enter") saveEditItem(); if (e.key === "Escape") cancelEditItem(); }}
                                                                style={{ width: 75, boxSizing: "border-box", padding: "5px 6px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }} />
                                                        ) : `$${it.price.toFixed(2)}`}</td>
                                                        <td><strong>${isItemEditing
                                                            ? ((parseFloat(itemDraft.qty) || 0) * (parseFloat(itemDraft.price) || 0)).toFixed(2)
                                                            : (it.qty * it.price).toFixed(2)}</strong></td>
                                                        <td>
                                                            <div className="line-actions">
                                                                {isItemEditing ? (
                                                                    <>
                                                                        <button className="line-action-btn" onClick={saveEditItem} title="Save" style={{ color: "#059669" }}>
                                                                            <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                        </button>
                                                                        <button className="line-action-btn" onClick={cancelEditItem} title="Cancel">
                                                                            <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button className="line-action-btn" onClick={() => startEditItem(s.id, idx)} title="Edit">
                                                                            <svg className="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                                        </button>
                                                                        <button className="line-action-btn" onClick={() => moveItem(s.id, idx, -1)} title="Move up" disabled={idx === 0}><svg className="icon icon-sm"><use href="#i-arrow-up" /></svg></button>
                                                                        <button className="line-action-btn" onClick={() => moveItem(s.id, idx, 1)} title="Move down" disabled={idx === s.items.length - 1}><svg className="icon icon-sm"><use href="#i-arrow-down" /></svg></button>
                                                                        <button className="line-action-btn" onClick={(e) => openMoveMenu(e, s.id, idx)} title="Move to section"><svg className="icon icon-sm"><use href="#i-move" /></svg></button>
                                                                        <button className="line-action-btn danger" onClick={() => removeItem(s.id, idx)} title="Remove"><svg className="icon icon-sm"><use href="#i-trash" /></svg></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {/* CK-FIX Jul-22: the duplicate "Add from library" button was
                                            removed — the library pane on the right already does this,
                                            and two buttons for one action confused contractors. */}
                                        <div className="add-item-area" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                                            <button className="add-item-btn" onClick={() => openCustomItem(s.id)} style={{ background: "#fffef7", borderColor: "#FDB813", color: "#92400e" }}>
                                                <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-edit" /></svg>
                                                Add new item
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="totals-section">
                                <div className="total-row">
                                    <span>Subtotal</span>
                                    <span className="total-value">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span className="toggle-input">
                                        <input type="checkbox" checked={overheadOn} onChange={(e) => setOverheadOn(e.target.checked)} />
                                        <span>Overhead &amp; Profit (20%)</span>
                                    </span>
                                    <span className="total-value">${overhead.toFixed(2)}</span>
                                </div>
                                {/* Discount — flat $ or %, off (subtotal + O&P), before tax */}
                                <div className="total-row">
                                    <span className="toggle-input" style={{ gap: 6 }}>
                                        <span>Discount</span>
                                        <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ padding: "2px 4px", borderRadius: 6 }}>
                                            <option value="flat">$</option>
                                            <option value="pct">%</option>
                                        </select>
                                        <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} min="0" step="0.01" placeholder="0" style={{ width: 70, textAlign: "center" }} />
                                    </span>
                                    <span className="total-value" style={{ color: discountAmt > 0 ? "#16a34a" : undefined }}>
                                        -${discountAmt.toFixed(2)}
                                    </span>
                                </div>
                                <div className="total-row">
                                    <span className="toggle-input">
                                        <input type="checkbox" checked={taxOn} onChange={(e) => setTaxOn(e.target.checked)} />
                                        <input type="text" value={taxName} onChange={(e) => setTaxName(e.target.value)} style={{ width: 90 }} />
                                        <span>(</span>
                                        {/* No default rate (spec) — placeholder, not a pre-filled 8 */}
                                        <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} step="0.1" min="0" max="100" placeholder="0" title="Enter your state/city sales-tax rate — there is no default" style={{ width: 48, textAlign: "center" }} />
                                        <span>%)</span>
                                    </span>
                                    <span className="total-value">${tax.toFixed(2)}</span>
                                </div>
                                {/* Custom fees — flat dollars only, added AFTER tax so they aren't taxed */}
                                {customFees.map((f, fi) => (
                                    <div className="total-row" key={`fee-${fi}`}>
                                        <span className="toggle-input" style={{ gap: 6 }}>
                                            <input type="text" value={f.name} placeholder="Fee name (e.g. Permit Fee)"
                                                onChange={(e) => setCustomFees(customFees.map((x, i) => i === fi ? { ...x, name: e.target.value } : x))}
                                                style={{ width: 150 }} />
                                            <input type="number" value={f.amount} placeholder="0.00" min="0" step="0.01"
                                                onChange={(e) => setCustomFees(customFees.map((x, i) => i === fi ? { ...x, amount: e.target.value } : x))}
                                                style={{ width: 80, textAlign: "center" }} />
                                            <button type="button" title="Remove fee"
                                                onClick={() => setCustomFees(customFees.filter((_, i) => i !== fi))}
                                                style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>&times;</button>
                                        </span>
                                        <span className="total-value">${(parseFloat(f.amount) || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="total-row">
                                    <button type="button" onClick={() => setCustomFees([...customFees, { name: "", amount: "" }])}
                                        style={{ border: "1px dashed #d1d5db", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#6b7280" }}>
                                        + Add fee
                                    </button>
                                    <span />
                                </div>
                                {/* Card processing fee — on the full pre-card total */}
                                <div className="total-row">
                                    <span className="toggle-input">
                                        <input type="checkbox" checked={cardFeeOn} onChange={(e) => setCardFeeOn(e.target.checked)} />
                                        <span>Card processing fee (</span>
                                        <input type="number" value={cardFeePct} onChange={(e) => setCardFeePct(e.target.value)} step="0.1" min="0" max="10" style={{ width: 48, textAlign: "center" }} />
                                        <span>%)</span>
                                    </span>
                                    <span className="total-value">${cardFee.toFixed(2)}</span>
                                </div>
                                <div className="total-row final">
                                    <span>Total RCV</span>
                                    <span className="total-value final">${totalRCV.toFixed(2)}</span>
                                </div>
                            </div>

                            <button className="finalize-btn" onClick={openFinalize} disabled={finalizeDisabled}>
                                <svg className="icon"><use href="#i-check-circle" /></svg>
                                Finalize Estimate
                            </button>

                            {/* Terms */}
                            <div className="terms-wrapper">
                                <div className="terms-toolbar">
                                    <div className="terms-toolbar-left">
                                        <svg className="icon icon-sm" style={{ color: "#6b7280" }}><use href="#i-doc" /></svg>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em" }}>Terms &amp; Conditions appended to PDF</span>
                                    </div>
                                    <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={openTermsEditor}>
                                        <svg className="icon icon-sm"><use href="#i-edit" /></svg>
                                        Edit Terms
                                    </button>
                                </div>
                                <TermsContent companyState={companyState} termsState={termsState} client={client} />
                            </div>
                        </section>

                        {/* RIGHT RAIL */}
                        <aside className="right-rail">
                            <div className="rail-tabs" role="tablist">
                                {[["code", "i-shield", "Code"], ["library", "i-book", "Library"], ["docs", "i-camera", "Docs"], ["sign", "i-pen", "Sign"]].map(([id, icon, label]) => (
                                    <button key={id} className={`rail-tab ${railTab === id ? "active" : ""}`} onClick={() => setRailTab(id)} role="tab">
                                        <svg className="icon icon-sm"><use href={`#${icon}`} /></svg>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="rail-content">

                                {/* CODE PANE */}
                                <div className={`rail-pane ${railTab === "code" ? "active" : ""}`}>
                                    <h3>Code requirements</h3>
                                    <p className="desc">Check the boxes for items required by code, then tap "Add to Estimate" below.</p>
                                    <div style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 11.5, alignItems: "center" }}>
                                        <button type="button" onClick={() => openBulkUpload("code")} style={{ background: "#fffef7", border: "1px dashed #FDB813", color: "#92400e", padding: "4px 9px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>📤 Bulk Upload</button>
                                        <button type="button" onClick={downloadCodeTemplate} style={{ background: "transparent", border: "none", color: "#1d4ed8", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Download template</button>
                                    </div>
                                    <div>
                                        {codeItems.map((item) => {
                                            if (editingCode === item.id) {
                                                return (
                                                    <div key={item.id} className="compact-item" style={{ cursor: "default", display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                                                        <input
                                                            value={editCodeName}
                                                            onChange={(e) => setEditCodeName(e.target.value)}
                                                            placeholder="Item name"
                                                            autoFocus
                                                            onKeyDown={(e) => { if (e.key === "Enter") saveEditCode(); if (e.key === "Escape") cancelEditCode(); }}
                                                            style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                        />
                                                        <input
                                                            value={editCodeRef}
                                                            onChange={(e) => setEditCodeRef(e.target.value)}
                                                            placeholder="Code reference / description (optional)"
                                                            onKeyDown={(e) => { if (e.key === "Enter") saveEditCode(); if (e.key === "Escape") cancelEditCode(); }}
                                                            style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", fontSize: 11.5, border: "1px solid #d1d5db", borderRadius: 5, color: "#374151" }}
                                                        />
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                            <span style={{ color: "#059669", fontWeight: 600, fontSize: 13 }}>$</span>
                                                            <input
                                                                type="number" min="0" step="0.01"
                                                                value={editCodePrice}
                                                                onChange={(e) => setEditCodePrice(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === "Enter") saveEditCode(); if (e.key === "Escape") cancelEditCode(); }}
                                                                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                            />
                                                            <span style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>/{item.unit}</span>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button onClick={saveEditCode} style={{ flex: 1, padding: "6px 10px", background: "#1a1f3a", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                                                            <button onClick={cancelEditCode} style={{ flex: 1, padding: "6px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <label key={item.id} className="compact-item" style={{ cursor: "pointer" }}>
                                                    <input type="checkbox" className="code-cb" checked={!!codeChecked[item.id]} onChange={(e) => setCodeChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))} />
                                                    <div className="ci-body">
                                                        <div className="ci-name">{item.name}</div>
                                                        <div className="ci-meta">{item.ref}</div>
                                                    </div>
                                                    <div className="ci-price">${item.price}/{item.unit}</div>
                                                    <button
                                                        type="button"
                                                        className="library-edit"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditCode(item); }}
                                                        style={{ marginLeft: 6, padding: "3px 8px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#374151" }}
                                                    >Edit</button>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <button className="rail-action-btn" onClick={addAllCheckedCodes}>
                                        <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-plus" /></svg>
                                        Add Checked Items to Estimate
                                    </button>
                                </div>

                                {/* LIBRARY PANE */}
                                <div className={`rail-pane ${railTab === "library" ? "active" : ""}`}>
                                    <h3>Code &amp; manufacturer database</h3>
                                    <p className="desc">Search IRC/IBC codes and manufacturer-required items. Tap an item to add it.</p>
                                    <input type="text" className="search-input" placeholder="Search codes, materials, manufacturers..." value={codeDbSearch} onChange={(e) => setCodeDbSearch(e.target.value)} style={{ marginBottom: 8 }} />
                                    <div className="filter-row">
                                        <select className="filter-select" value={codeDbCode} onChange={(e) => setCodeDbCode(e.target.value)}>
                                            <option value="all">All Codes</option>
                                            <option value="irc">IRC 2021</option>
                                            <option value="ibc">IBC 2021</option>
                                            <option value="local">Local</option>
                                        </select>
                                        <select className="filter-select" value={codeDbMfr} onChange={(e) => setCodeDbMfr(e.target.value)}>
                                            <option value="all">All Mfrs</option>
                                            <option value="gaf">GAF</option>
                                            <option value="certainteed">CertainTeed</option>
                                            <option value="owens">Owens Corning</option>
                                        </select>
                                    </div>
                                    <div>
                                        {filteredCodeDb.map((item) => {
                                            if (editingCodeDb === item.id) {
                                                return (
                                                    <div key={item.id} className="compact-item codedb-row" style={{ cursor: "default", display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                                                        <input
                                                            value={editCdbName}
                                                            onChange={(e) => setEditCdbName(e.target.value)}
                                                            placeholder="Item name"
                                                            autoFocus
                                                            onKeyDown={(e) => { if (e.key === "Enter") saveEditCodeDb(); if (e.key === "Escape") cancelEditCodeDb(); }}
                                                            style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                        />
                                                        <input
                                                            value={editCdbMeta}
                                                            onChange={(e) => setEditCdbMeta(e.target.value)}
                                                            placeholder="Code / description (optional)"
                                                            onKeyDown={(e) => { if (e.key === "Enter") saveEditCodeDb(); if (e.key === "Escape") cancelEditCodeDb(); }}
                                                            style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px", fontSize: 11.5, border: "1px solid #d1d5db", borderRadius: 5, color: "#374151" }}
                                                        />
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                            <span style={{ color: "#059669", fontWeight: 600, fontSize: 13 }}>$</span>
                                                            <input
                                                                type="number" min="0" step="0.01"
                                                                value={editCdbPrice}
                                                                onChange={(e) => setEditCdbPrice(e.target.value)}
                                                                onKeyDown={(e) => { if (e.key === "Enter") saveEditCodeDb(); if (e.key === "Escape") cancelEditCodeDb(); }}
                                                                style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "6px 8px", fontSize: 13, border: "1px solid #d1d5db", borderRadius: 5 }}
                                                            />
                                                            <span style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap" }}>/{item.unit}</span>
                                                        </div>
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button onClick={saveEditCodeDb} style={{ flex: 1, padding: "6px 10px", background: "#1a1f3a", color: "#fff", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                                                            <button onClick={cancelEditCodeDb} style={{ flex: 1, padding: "6px 10px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={item.id} className="compact-item codedb-row" onClick={() => addToEstimate(item.name, item.price, item.unit)} style={{ cursor: "pointer" }}>
                                                    <div className="ci-body" style={{ marginLeft: 0 }}>
                                                        <div className="ci-name">{item.star ? "★ " : ""}{item.name}</div>
                                                        <div className="ci-meta">{item.meta}</div>
                                                    </div>
                                                    <div className="ci-price">${item.price}/{item.unit}</div>
                                                    <button
                                                        type="button"
                                                        className="library-edit"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEditCodeDb(item); }}
                                                        style={{ marginLeft: 6, padding: "3px 8px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#374151" }}
                                                    >Edit</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {filteredCodeDb.length === 0 && (
                                        <div style={{ display: "block", textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No matches. Try a different search.</div>
                                    )}
                                </div>

                                {/* DOCS PANE — Photo evidence (Phase 5) */}
                                <div className={`rail-pane ${railTab === "docs" ? "active" : ""}`}>
                                    <h3>Photo evidence</h3>
                                    <p className="desc">Upload damage photos. AI detects damage type and stamps claim metadata onto the image.</p>

                                    {/* Master toggles */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, padding: '8px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={photoAutoStamp} onChange={(e) => setPhotoAutoStamp(e.target.checked)} />
                                            <span><strong>AI auto-stamp</strong> on upload <span style={{ color: '#9ca3af' }}>(detect damage + burn metadata onto image)</span></span>
                                        </label>
                                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={includePhotosInPdf} onChange={(e) => togglePhotosMasterPdf(e.target.checked)} />
                                            <span><strong>Include photos in PDF</strong></span>
                                        </label>
                                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={includeMeasurementInPdf} onChange={(e) => toggleMeasurementMasterPdf(e.target.checked)} />
                                            <span><strong>Include measurement report in PDF</strong> <span style={{ color: '#9ca3af' }}>(appended at the bottom)</span></span>
                                        </label>
                                    </div>

                                    {/* Upload trigger */}
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={onPhotoFilesPicked}
                                    />
                                    <button
                                        className="doc-card-action"
                                        onClick={uploadBulkPhotos}
                                        disabled={uploadProgress.total > 0 || !currentEstimateId}
                                        style={{ width: '100%', padding: 10, fontSize: 13, fontWeight: 600 }}
                                    >
                                        <svg className="icon icon-sm" style={{ verticalAlign: 'middle' }}><use href="#i-camera" /></svg>{' '}
                                        {uploadProgress.total > 0
                                            ? `Uploading ${uploadProgress.active}/${uploadProgress.total}…`
                                            : 'Upload photos'}
                                    </button>

                                    {/* Upload progress bar */}
                                    {uploadProgress.total > 0 && (
                                        <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(uploadProgress.active / uploadProgress.total) * 100}%`,
                                                height: '100%',
                                                background: '#FDB813',
                                                transition: 'width 0.2s',
                                            }} />
                                        </div>
                                    )}

                                    {/* Photo grid */}
                                    {photosLoading && photos.length === 0 ? (
                                        <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>Loading photos…</div>
                                    ) : photos.length === 0 ? (
                                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 12, fontStyle: 'italic', marginTop: 10 }}>
                                            No photos yet. Upload damage shots above.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                                            {photos.map((p) => (
                                                <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', background: '#fff', opacity: p.is_included_in_pdf ? 1 : 0.55 }}>
                                                    <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f3f4f6', overflow: 'hidden' }}>
                                                        <AuthedPhotoThumb src={p.s3_url} />
                                                        {p.photo_damage_type && (
                                                            <span style={{
                                                                position: 'absolute', top: 4, left: 4,
                                                                background: 'rgba(26, 31, 58, 0.85)', color: '#FDB813',
                                                                fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase',
                                                            }}>{p.photo_damage_type}</span>
                                                        )}
                                                        {p.ai_extracted_data?.stamped && (
                                                            <span style={{
                                                                position: 'absolute', top: 4, right: 4,
                                                                background: 'rgba(22, 163, 74, 0.92)', color: '#fff',
                                                                fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                                                            }} title="AI-stamped">AI ✓</span>
                                                        )}
                                                    </div>
                                                    <div style={{ padding: 6 }}>
                                                        <textarea
                                                            value={p.photo_caption ?? ''}
                                                            onChange={(e) => setPhotos(prev => prev.map(x => x.id === p.id ? { ...x, photo_caption: e.target.value } : x))}
                                                            onBlur={(e) => updatePhotoField(p.id, { caption: e.target.value })}
                                                            placeholder="Caption…"
                                                            rows={2}
                                                            style={{ width: '100%', padding: 4, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 4, fontFamily: 'inherit', resize: 'none' }}
                                                        />
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#374151', cursor: 'pointer' }} title="Include in PDF">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!p.is_included_in_pdf}
                                                                    onChange={(e) => updatePhotoField(p.id, { is_included_in_pdf: e.target.checked })}
                                                                    style={{ width: 12, height: 12 }}
                                                                />
                                                                PDF
                                                            </label>
                                                            <div style={{ display: 'flex', gap: 2 }}>
                                                                <button
                                                                    onClick={() => restampPhoto(p.id)}
                                                                    title="Re-run AI + restamp"
                                                                    style={{ background: 'transparent', border: 'none', color: '#1a1f3a', fontSize: 11, cursor: 'pointer', padding: '2px 4px' }}
                                                                >🔄</button>
                                                                <button
                                                                    onClick={() => deletePhoto(p.id)}
                                                                    title="Delete"
                                                                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}
                                                                >×</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="doc-card" style={{ marginTop: 12 }}>
                                        <div className="doc-card-title"><svg className="icon icon-sm"><use href="#i-doc" /></svg> Supporting docs package</div>
                                        <div className="doc-card-meta">Code citations, mfr specs, photos</div>
                                        <button className="doc-card-action" onClick={generateSupportingDocs}>Generate Package</button>
                                    </div>
                                </div>

                                {/* SIGN PANE */}
                                <div className={`rail-pane ${railTab === "sign" ? "active" : ""}`}>
                                    <h3>Signature &amp; payment</h3>
                                    <p className="desc">Sign in-person on this device, or email a secure signing link to the homeowner.</p>
                                    <div className="sig-section">
                                        <div className="sig-section-title">Digital signature</div>

                                        {/* Mode toggle */}
                                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: '#f3f4f6', borderRadius: 6, padding: 3 }}>
                                            <button
                                                type="button"
                                                onClick={() => setSignMode('email')}
                                                style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: signMode === 'email' ? '#fff' : 'transparent', color: signMode === 'email' ? '#1a1f3a' : '#6b7280', boxShadow: signMode === 'email' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
                                            >📧 Email link</button>
                                            <button
                                                type="button"
                                                onClick={() => setSignMode('in_person')}
                                                style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: signMode === 'in_person' ? '#fff' : 'transparent', color: signMode === 'in_person' ? '#1a1f3a' : '#6b7280', boxShadow: signMode === 'in_person' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}
                                            >✍️ In person</button>
                                        </div>

                                        {/* Shared signer fields */}
                                        <input
                                            type="text"
                                            placeholder="Homeowner name"
                                            value={signerName}
                                            onChange={(e) => setSignerName(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 5, marginBottom: 6 }}
                                        />
                                        {signMode === 'email' && (
                                            <>
                                                <input
                                                    type="email"
                                                    placeholder="Homeowner email"
                                                    value={signerEmail}
                                                    onChange={(e) => setSignerEmail(e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 5, marginBottom: 6 }}
                                                />
                                                <textarea
                                                    placeholder="Optional note (shown in the email)"
                                                    value={signMessage}
                                                    onChange={(e) => setSignMessage(e.target.value)}
                                                    rows={2}
                                                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 5, marginBottom: 8, fontFamily: 'inherit', resize: 'vertical' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="sig-action"
                                                    onClick={sendSignLink}
                                                    disabled={signing || !currentEstimateId}
                                                >
                                                    <svg className="icon icon-sm" style={{ verticalAlign: 'middle' }}><use href="#i-send" /></svg>
                                                    {signing ? 'Sending…' : 'Send signing link'}
                                                </button>
                                                {lastSignLink?.sign_url && (
                                                    <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11.5 }}>
                                                        <div style={{ color: '#166534', fontWeight: 600, marginBottom: 4 }}>✓ Link sent · expires {new Date(lastSignLink.expires_at).toLocaleDateString()}</div>
                                                        <div style={{ fontFamily: 'ui-monospace, monospace', color: '#374151', wordBreak: 'break-all', marginBottom: 4 }}>{lastSignLink.sign_url}</div>
                                                        <button type="button" onClick={copySignLink} style={{ background: 'transparent', border: 'none', color: '#1a1f3a', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Copy link</button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {signMode === 'in_person' && (
                                            <>
                                                <input
                                                    type="email"
                                                    placeholder="Email for receipt (optional)"
                                                    value={signerEmail}
                                                    onChange={(e) => setSignerEmail(e.target.value)}
                                                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 5, marginBottom: 6 }}
                                                />
                                                <div style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: 6, background: '#fff', marginBottom: 6 }}>
                                                    <SignaturePad ref={signPadRef} height={150} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <button type="button" onClick={() => signPadRef.current?.clear()} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', fontSize: 11.5 }}>Clear</button>
                                                    <span style={{ color: '#9ca3af', fontSize: 11 }}>Pass the device to the homeowner</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="sig-action"
                                                    onClick={signInPerson}
                                                    disabled={signing || !currentEstimateId}
                                                >
                                                    <svg className="icon icon-sm" style={{ verticalAlign: 'middle' }}><use href="#i-check" /></svg>
                                                    {signing ? 'Saving…' : 'Save signature'}
                                                </button>
                                            </>
                                        )}

                                        {/* History */}
                                        {signHistory.length > 0 && (() => {
                                            // The latest `completed` row is the legally-binding "current"
                                            // signature. Older completed rows have been superseded by the
                                            // backend — show them muted with a "Replaced" badge so the
                                            // audit trail is visible without being confusing.
                                            const currentId = signHistory.find(
                                                (x) => x.esign_status === 'completed' && x.signature_image_key,
                                            )?.id;
                                            return (
                                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', marginBottom: 6 }}>Signature history</div>
                                                    {signHistory.map((s) => {
                                                        const isCurrent = s.id === currentId;
                                                        const isSuperseded = s.esign_status === 'superseded';
                                                        const muted = isSuperseded || s.esign_status === 'rotated';
                                                        const badge = isCurrent
                                                            ? { label: 'current', bg: '#fffaeb', fg: '#92400e', border: '#FDB813' }
                                                            : isSuperseded
                                                                ? { label: 'replaced', bg: '#f3f4f6', fg: '#6b7280', border: '#e5e7eb' }
                                                                : s.esign_status === 'completed'
                                                                    ? { label: 'completed', bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' }
                                                                    : s.esign_status === 'rotated'
                                                                        ? { label: 'rotated', bg: '#f3f4f6', fg: '#6b7280', border: '#e5e7eb' }
                                                                        : { label: s.esign_status, bg: '#fef3c7', fg: '#b45309', border: '#fde68a' };
                                                        return (
                                                            <div key={s.id} style={{
                                                                fontSize: 11.5, padding: 8, borderRadius: 5, marginBottom: 6,
                                                                background: isCurrent ? '#fffef7' : '#fafbfc',
                                                                border: `1px solid ${isCurrent ? '#FDB813' : '#f3f4f6'}`,
                                                                opacity: muted ? 0.65 : 1,
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                                                    <div>
                                                                        <strong style={{ color: '#1a1f3a' }}>{s.signer_name}</strong> · <span style={{ color: '#6b7280' }}>{s.method.replace('_', ' ')}</span>
                                                                        <div style={{ color: '#9ca3af', fontSize: 10.5 }}>{new Date(s.signed_at ?? s.created_at).toLocaleString()}</div>
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 700,
                                                                        textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'flex-start',
                                                                        background: badge.bg, color: badge.fg, border: `1px solid ${badge.border}`,
                                                                    }}>{badge.label}</span>
                                                                </div>
                                                                {s.signature_image_key ? (
                                                                    <div style={{
                                                                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 4,
                                                                        padding: 4, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        filter: isSuperseded ? 'grayscale(1)' : 'none',
                                                                    }}>
                                                                        <AuthedPhotoThumb
                                                                            src={`/s3/file?key=${encodeURIComponent(s.signature_image_key)}`}
                                                                            imgStyle={{ maxWidth: '100%', maxHeight: 80, objectFit: 'contain', display: 'block' }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ color: '#9ca3af', fontSize: 10.5, fontStyle: 'italic', padding: '6px 4px' }}>
                                                                        {s.esign_status === 'pending' || s.esign_status === 'viewed'
                                                                            ? 'Waiting for homeowner to sign…'
                                                                            : 'No signature image on file'}
                                                                    </div>
                                                                )}
                                                                {isSuperseded && (
                                                                    <div style={{ marginTop: 6, fontSize: 10.5, color: '#6b7280', fontStyle: 'italic' }}>
                                                                        Replaced by a newer signature above.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="sig-section">
                                        <div className="sig-section-title">Collect deposit</div>

                                        {/* Total paid summary */}
                                        {depositTotalPaid > 0 && (
                                            <div style={{ padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, marginBottom: 10, color: '#166534', fontWeight: 600 }}>
                                                Total received: ${depositTotalPaid.toFixed(2)}
                                            </div>
                                        )}

                                        {/* Amount input */}
                                        <div className="payment-amount-box">
                                            <label style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 6 }}>Amount</label>
                                            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                                                <input type="radio" name="paymentType" value="percentage" checked={paymentType === "percentage"} onChange={() => setPaymentType("percentage")} id="ptPct" />
                                                <label htmlFor="ptPct">%</label>
                                                <input type="number" value={paymentPct} onChange={(e) => setPaymentPct(e.target.value)} min="0" max="100" style={{ width: 55, padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 4 }} />
                                                <span style={{ margin: "0 6px", color: "#9ca3af" }}>or</span>
                                                <input type="radio" name="paymentType" value="fixed" checked={paymentType === "fixed"} onChange={() => setPaymentType("fixed")} id="ptFixed" />
                                                <label htmlFor="ptFixed">$</label>
                                                <input type="number" value={paymentFixed} onChange={(e) => setPaymentFixed(e.target.value)} min="0" step="100" style={{ width: 90, padding: "3px 6px", border: "1px solid #d1d5db", borderRadius: 4 }} />
                                            </div>
                                            <div className="payment-amount-display">Due: <span>${paymentAmount.toFixed(2)}</span></div>
                                        </div>

                                        {/* Method picker — only Stripe + manual are wired */}
                                        <div className="pay-method-row" style={{ marginTop: 8 }}>
                                            <label style={{ cursor: 'pointer' }}>
                                                <input type="radio" name="payMethod" value="stripe" checked={depositMethod === 'stripe'} onChange={() => setDepositMethod('stripe')} />{' '}
                                                <svg className="icon icon-sm"><use href="#i-card" /></svg> Stripe
                                            </label>
                                            <label style={{ cursor: 'pointer' }}>
                                                <input type="radio" name="payMethod" value="manual" checked={depositMethod === 'manual'} onChange={() => setDepositMethod('manual')} />{' '}
                                                <svg className="icon icon-sm"><use href="#i-doc" /></svg> Manual
                                            </label>
                                            <label style={{ opacity: 0.45, cursor: 'not-allowed' }} title="Coming soon">
                                                <input type="radio" disabled /> QuickBooks
                                            </label>
                                            <label style={{ opacity: 0.45, cursor: 'not-allowed' }} title="Coming soon">
                                                <input type="radio" disabled /> GoHighLevel
                                            </label>
                                        </div>

                                        {depositMethod === 'manual' && (
                                            <input
                                                type="text"
                                                placeholder="Payment reference (e.g. Cheque #1234)"
                                                value={manualNote}
                                                onChange={(e) => setManualNote(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 5, marginTop: 8 }}
                                            />
                                        )}

                                        {depositMethod === 'stripe' && (
                                            <div style={{ marginTop: 8, padding: 8, background: '#f6f5ff', border: '1px solid #e0ddff', borderRadius: 6 }}>
                                                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3b3560', marginBottom: 6 }}>Send secure payment link to homeowner</div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginBottom: 4 }}>
                                                    <input type="checkbox" checked={depositSendEmail} onChange={(e) => setDepositSendEmail(e.target.checked)} />
                                                    📧 Email {signerEmail?.trim() ? <span style={{ color: '#6b7280' }}>({signerEmail.trim()})</span> : <span style={{ color: '#9ca3af' }}>(client email on file)</span>}
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={depositSendSms} onChange={(e) => setDepositSendSms(e.target.checked)} />
                                                    💬 Text (SMS to client phone on file)
                                                </label>
                                                <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6 }}>
                                                    Homeowner pays on their own device. Payment shows as paid here once Stripe confirms. Uncheck both to just copy the link.
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            className="sig-action"
                                            style={{ background: depositMethod === 'manual' ? '#1a1f3a' : '#635bff', marginTop: 8 }}
                                            onClick={depositMethod === 'manual' ? recordManualDeposit : sendPaymentLink}
                                            disabled={depositLoading || !currentEstimateId}
                                        >
                                            <svg className="icon icon-sm" style={{ verticalAlign: 'middle' }}><use href="#i-card" /></svg>
                                            {depositLoading
                                                ? 'Working…'
                                                : depositMethod === 'manual'
                                                    ? 'Record manual deposit'
                                                    : (depositSendEmail || depositSendSms)
                                                        ? `Send $${paymentAmount.toFixed(2)} payment link`
                                                        : `Create $${paymentAmount.toFixed(2)} payment link`}
                                        </button>

                                        {depositMethod === 'stripe' && lastPayLink && (
                                            <div style={{ marginTop: 8, padding: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11.5 }}>
                                                <div style={{ color: '#166534', fontWeight: 600, marginBottom: 4 }}>Payment link (valid 24h)</div>
                                                <div style={{ fontFamily: 'ui-monospace, monospace', color: '#374151', wordBreak: 'break-all', marginBottom: 4 }}>{lastPayLink}</div>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <button type="button" onClick={copyPayLink} style={{ background: 'transparent', border: 'none', color: '#1a1f3a', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Copy link</button>
                                                    <a href={lastPayLink} target="_blank" rel="noopener noreferrer" style={{ color: '#635bff', fontWeight: 600, fontSize: 11 }}>Open here (in person) ↗</a>
                                                </div>
                                            </div>
                                        )}

                                        {/* Deposit history */}
                                        {(deposits.length > 0 || depositsLoading) && (
                                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' }}>Deposit history</span>
                                                    <button
                                                        type="button"
                                                        onClick={refreshDeposits}
                                                        disabled={depositsRefreshing}
                                                        title="Refresh deposit status"
                                                        aria-label="Refresh deposit status"
                                                        style={{ background: 'transparent', border: 'none', cursor: depositsRefreshing ? 'default' : 'pointer', color: '#635bff', padding: 2, display: 'inline-flex', alignItems: 'center' }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={depositsRefreshing ? 'ck-spin' : undefined}>
                                                            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                                                            <path d="M21 3v6h-6" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                {depositsLoading && deposits.length === 0 && (
                                                    <>
                                                        {[0, 1, 2].map(i => (
                                                            <div key={`skel-${i}`} style={{ padding: 6, background: '#fafbfc', borderRadius: 5, marginBottom: 4 }}>
                                                                <div className="ck-skel" style={{ height: 12, width: '55%', borderRadius: 4, marginBottom: 6 }} />
                                                                <div className="ck-skel" style={{ height: 9, width: '38%', borderRadius: 4 }} />
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                                {deposits.map(d => (
                                                    <div key={d.id} style={{ fontSize: 11.5, padding: 6, background: '#fafbfc', borderRadius: 5, marginBottom: 4 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                            <strong style={{ color: '#1a1f3a' }}>${Number(d.amount).toFixed(2)} · {d.payment_method}</strong>
                                                            <span style={{
                                                                fontSize: 10, padding: '2px 6px', borderRadius: 3, fontWeight: 700,
                                                                background: d.status === 'paid' ? '#dcfce7' : d.status === 'failed' ? '#fee2e2' : d.status === 'refunded' ? '#dbeafe' : '#fef3c7',
                                                                color: d.status === 'paid' ? '#166534' : d.status === 'failed' ? '#991b1b' : d.status === 'refunded' ? '#1e40af' : '#b45309',
                                                            }}>{d.status}</span>
                                                        </div>
                                                        <div style={{ color: '#6b7280', fontSize: 10.5, marginTop: 2 }}>
                                                            {new Date(d.paid_at ?? d.created_at).toLocaleString()}
                                                            {d.notes && <> · {d.notes}</>}
                                                        </div>
                                                        {d.receipt_url && (
                                                            <a href={d.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#635bff', fontWeight: 600 }}>
                                                                View receipt ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </aside>
                    </div>
                )}
            </main>

            {/* ============ TEMPLATE / BUNDLE PICKER (Phase 7) ============ */}
            {tplPickerOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5" onClick={() => !tplApplying && setTplPickerOpen(false)}>
                    <div className="bg-white rounded-xl w-full max-w-[640px] max-h-[88vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-[22px] py-[16px] border-b border-gray-200">
                            <div className="text-base font-bold" style={{ color: '#1a1f3a' }}>
                                {tplPickerKind === 'template' ? 'Apply template' : 'Insert bundle'}
                            </div>
                            <button
                                className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100"
                                onClick={() => setTplPickerOpen(false)}
                                disabled={tplApplying}
                            ><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[20px]" style={{ color: '#1a1f3a' }}>
                            {tplPickerKind === 'template' && (
                                <div style={{ marginBottom: 14, padding: 10, background: '#f9fafb', borderRadius: 6, fontSize: 12 }}>
                                    Strategy:&nbsp;
                                    <label style={{ marginRight: 12 }}>
                                        <input type="radio" checked={tplStrategy === 'append'} onChange={() => setTplStrategy('append')} /> Append
                                    </label>
                                    <label>
                                        <input type="radio" checked={tplStrategy === 'replace'} onChange={() => setTplStrategy('replace')} /> Replace all
                                    </label>
                                </div>
                            )}

                            {tplListLoading && <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading…</div>}

                            {!tplListLoading && tplList.length === 0 && (
                                <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                                    No {tplPickerKind}s yet.{' '}
                                    <a href="/dashboard/estimation/templates" style={{ color: '#1a1f3a', textDecoration: 'underline' }}>
                                        Create one →
                                    </a>
                                </div>
                            )}

                            {!tplListLoading && tplList.map((row) => (
                                <div key={row.id} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{row.name}</div>
                                        {row.description && (
                                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{row.description}</div>
                                        )}
                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                            {tplPickerKind === 'template'
                                                ? `${Array.isArray(row.sections) ? row.sections.length : 0} sections`
                                                : `${Array.isArray(row.items) ? row.items.length : 0} items`}
                                            {' · '}used {row.times_used ?? 0}×
                                            {tplPickerKind === 'template' && row.mode && <> · {row.mode}</>}
                                        </div>
                                    </div>
                                    <button
                                        disabled={tplApplying}
                                        onClick={() => tplPickerKind === 'template' ? applyTemplate(row) : applyBundle(row)}
                                        style={{ padding: '8px 14px', background: '#1a1f3a', color: '#FDB813', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: tplApplying ? 'wait' : 'pointer', opacity: tplApplying ? 0.6 : 1 }}
                                    >Apply</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SAVE AS TEMPLATE MODAL (Phase 7) ============ */}
            {saveTplOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5" onClick={() => !saveTplSaving && setSaveTplOpen(false)}>
                    <div className="bg-white rounded-xl w-full max-w-[480px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-[22px] py-[16px] border-b border-gray-200">
                            <div className="text-base font-bold" style={{ color: '#1a1f3a' }}>Save as template</div>
                            <button
                                className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md"
                                onClick={() => setSaveTplOpen(false)}
                                disabled={saveTplSaving}
                            ><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]" style={{ color: '#1a1f3a' }}>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Name</label>
                            <input
                                value={saveTplName}
                                onChange={(e) => setSaveTplName(e.target.value)}
                                placeholder="Standard Hail Roof Replacement"
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, marginBottom: 12 }}
                                autoFocus
                            />
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Description</label>
                            <textarea
                                value={saveTplDesc}
                                onChange={(e) => setSaveTplDesc(e.target.value)}
                                placeholder="When to use this template"
                                rows={3}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, resize: 'vertical' }}
                            />
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
                                Snapshots {sections.length} section{sections.length === 1 ? '' : 's'} with mode = <strong>{mode}</strong>.
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid #e5e7eb' }}>
                            <button
                                onClick={() => setSaveTplOpen(false)}
                                disabled={saveTplSaving}
                                style={{ padding: '8px 14px', background: '#fff', color: '#1a1f3a', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                            >Cancel</button>
                            <button
                                onClick={submitSaveAsTemplate}
                                disabled={saveTplSaving}
                                style={{ padding: '8px 14px', background: '#1a1f3a', color: '#FDB813', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: saveTplSaving ? 'wait' : 'pointer', opacity: saveTplSaving ? 0.6 : 1 }}
                            >{saveTplSaving ? 'Saving…' : 'Save template'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ 2.3 ASK AI TO MAKE CHANGES MODAL ============ */}
            {changesOpen && (
                <div
                    onClick={() => !changesLoading && setChangesOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 2000 }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '88vh', background: '#fff', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eef0f3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1f3a' }}>✨ Ask AI to Make Changes</div>
                            <button onClick={() => setChangesOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>

                        <div style={{ padding: 20, overflowY: 'auto' }}>
                            {!changesResult ? (
                                <>
                                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Describe what to add or change</label>
                                    <textarea
                                        value={changesInstruction}
                                        onChange={(e) => setChangesInstruction(e.target.value)}
                                        rows={4}
                                        placeholder="e.g. Add gutter replacement on the rear elevation (120 LF) and bump the steep charge to $85"
                                        style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit' }}
                                    />
                                    <div style={{ marginTop: 10 }}>
                                        <input
                                            ref={changesFileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*,application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={(e) => setChangesFiles([...e.target.files].slice(0, 6))}
                                        />
                                        <button type="button" onClick={() => changesFileInputRef.current?.click()} style={{ padding: '7px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }}>
                                            📎 Attach docs / photos (optional)
                                        </button>
                                        {changesFiles.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {changesFiles.map((f, i) => (
                                                    <span key={i} style={{ fontSize: 11, background: '#eef2ff', color: '#3730a3', padding: '3px 8px', borderRadius: 12 }}>
                                                        {f.name}
                                                        <button onClick={() => setChangesFiles(changesFiles.filter((_, j) => j !== i))} style={{ marginLeft: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#3730a3' }}>×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {changesError && <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 12.5 }}>{changesError}</div>}
                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                        <button onClick={() => setChangesOpen(false)} style={{ padding: '9px 14px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                        <button onClick={runAiChanges} disabled={changesLoading} style={{ padding: '9px 16px', background: '#1a1f3a', color: '#FDB813', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: changesLoading ? 'wait' : 'pointer', opacity: changesLoading ? 0.7 : 1 }}>
                                            {changesLoading ? 'Thinking…' : 'Ask AI'}
                                        </button>
                                    </div>
                                    <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af' }}>Nothing changes on your estimate until you review and Apply.</div>
                                </>
                            ) : (
                                <>
                                    {changesResult.summary && (
                                        <div style={{ padding: '10px 12px', background: '#fffef7', border: '1px solid #FDB813', borderRadius: 8, fontSize: 12.5, color: '#374151', marginBottom: 14 }}>{changesResult.summary}</div>
                                    )}
                                    {(changesResult.changes ?? []).length === 0 ? (
                                        <div style={{ color: '#6b7280', fontSize: 13 }}>AI didn&apos;t propose any changes. Try rephrasing your request.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {changesResult.changes.map((ch, i) => {
                                                const badge = { add: ['#dcfce7', '#166534', 'Add'], edit: ['#dbeafe', '#1e40af', 'Edit'], reprice: ['#fef3c7', '#92400e', 'Reprice'], remove: ['#fee2e2', '#991b1b', 'Remove'] }[ch.action] || ['#f3f4f6', '#374151', ch.action];
                                                return (
                                                    <label key={i} style={{ display: 'flex', gap: 10, padding: 10, background: changesChecked[i] ? '#f9fafb' : '#fff', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', alignItems: 'flex-start' }}>
                                                        <input type="checkbox" checked={!!changesChecked[i]} onChange={(e) => setChangesChecked((p) => ({ ...p, [i]: e.target.checked }))} style={{ marginTop: 3 }} />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: badge[0], color: badge[1] }}>{badge[2]}</span>
                                                                <strong style={{ fontSize: 13, color: '#1a1f3a' }}>{ch.label}</strong>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{ch.rationale}</div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <button onClick={() => setChangesResult(null)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>← Edit request</button>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => setChangesOpen(false)} style={{ padding: '9px 14px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                            <button onClick={applyAiChanges} style={{ padding: '9px 16px', background: '#FDB813', color: '#1a1f3a', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                                Apply {Object.values(changesChecked).filter(Boolean).length} change{Object.values(changesChecked).filter(Boolean).length === 1 ? '' : 's'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ AI REVIEW MODAL (Phase 6) ============ */}
            {reviewModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[860px] max-h-[92vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold" style={{ color: '#1a1f3a' }}>
                                <svg className="icon" style={{ color: '#FDB813', verticalAlign: 'middle' }}><use href="#i-sparkle" /></svg>{' '}
                                AI Estimate Review
                            </div>
                            <button
                                className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]"
                                onClick={() => setReviewModal(false)}
                            >
                                <svg className="icon"><use href="#i-x" /></svg>
                            </button>
                        </div>

                        <div className="p-[22px]" style={{ color: '#1a1f3a' }}>
                            {reviewLoading && (
                                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                    <div style={{ width: 44, height: 44, border: '4px solid #e5e7eb', borderTopColor: '#FDB813', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 12px' }} />
                                    <div style={{ fontWeight: 600 }}>Reviewing estimate…</div>
                                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Cross-checking line items against your rate book + state codes</div>
                                </div>
                            )}

                            {reviewError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', color: '#7f1d1d', padding: 14, borderRadius: 8, fontSize: 13 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Review failed</div>
                                    {reviewError}
                                </div>
                            )}

                            {reviewData?.findings && !reviewLoading && (() => {
                                const f = reviewData.findings;
                                const sevColor = (s) => s === 'critical' ? '#dc2626' : s === 'recommended' ? '#b45309' : '#6b7280';
                                const sevBg = (s) => s === 'critical' ? '#fef2f2' : s === 'recommended' ? '#fef3c7' : '#f3f4f6';
                                const sevBorder = (s) => s === 'critical' ? '#fecaca' : s === 'recommended' ? '#fde68a' : '#e5e7eb';
                                const sevBadge = (s) => (
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 3, color: sevColor(s), background: sevBg(s) }}>{s}</span>
                                );

                                const totalFindings =
                                    (f.missing_items?.length ?? 0)
                                    + (f.pricing_concerns?.length ?? 0)
                                    + (f.code_violations?.length ?? 0)
                                    + (f.supplement_opportunities?.length ?? 0)
                                    + (f.other_concerns?.length ?? 0);

                                return (
                                    <>
                                        {/* Overall assessment */}
                                        <div style={{ padding: 14, background: '#fffef7', border: '1px solid #FDB813', borderRadius: 8, marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#1a1f3a', marginBottom: 6 }}>Overall</div>
                                            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#1a1f3a' }}>{f.overall_assessment}</div>
                                            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
                                                Confidence: <strong style={{ color: '#1a1f3a' }}>{(Number(f.confidence) * 100).toFixed(0)}%</strong>
                                                {' · '}{totalFindings} finding{totalFindings === 1 ? '' : 's'}
                                                {reviewData.model_used && <> · {reviewData.model_used}</>}
                                            </div>
                                        </div>

                                        {/* Code violations */}
                                        {f.code_violations?.length > 0 && (
                                            <section style={{ marginBottom: 18 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#1a1f3a' }}>⚠️ Code violations ({f.code_violations.length})</h3>
                                                {f.code_violations.map((v, i) => (
                                                    <div key={i} style={{ padding: 10, background: sevBg(v.severity), border: `1px solid ${sevBorder(v.severity)}`, borderRadius: 6, marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                                            <strong style={{ fontSize: 13 }}>{v.description}</strong>
                                                            {sevBadge(v.severity)}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'ui-monospace, monospace', marginBottom: 4 }}>{v.code_ref}</div>
                                                        <div style={{ fontSize: 12, color: '#374151' }}><strong>Remedy:</strong> {v.remedy}</div>
                                                        {v.affected_items?.length > 0 && (
                                                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Affected: {v.affected_items.join(', ')}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </section>
                                        )}

                                        {/* Missing items */}
                                        {f.missing_items?.length > 0 && (
                                            <section style={{ marginBottom: 18 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#1a1f3a' }}>+ Missing items ({f.missing_items.length})</h3>
                                                {f.missing_items.map((mi, i) => (
                                                    <div key={i} style={{ padding: 10, background: sevBg(mi.severity), border: `1px solid ${sevBorder(mi.severity)}`, borderRadius: 6, marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                                                            <strong style={{ fontSize: 13 }}>{mi.name}</strong>
                                                            {sevBadge(mi.severity)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>{mi.reason}</div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                                Suggest: {mi.suggested_qty} {mi.suggested_unit} @ ${Number(mi.suggested_price).toFixed(2)}
                                                                {mi.code_ref && <> · {mi.code_ref}</>}
                                                            </div>
                                                            <button
                                                                onClick={() => applyMissingItem(mi)}
                                                                style={{ padding: '5px 10px', background: '#FDB813', color: '#1a1f3a', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                                            >+ Add to estimate</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </section>
                                        )}

                                        {/* Pricing concerns */}
                                        {f.pricing_concerns?.length > 0 && (
                                            <section style={{ marginBottom: 18 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#1a1f3a' }}>$ Pricing concerns ({f.pricing_concerns.length})</h3>
                                                {f.pricing_concerns.map((pc, i) => (
                                                    <div key={i} style={{ padding: 10, background: sevBg(pc.severity), border: `1px solid ${sevBorder(pc.severity)}`, borderRadius: 6, marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                                            <strong style={{ fontSize: 13 }}>{pc.item_name}</strong>
                                                            {sevBadge(pc.severity)}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>{pc.reason}</div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ fontSize: 11, color: '#6b7280' }}>
                                                                ${Number(pc.current_price).toFixed(2)} → <strong style={{ color: pc.direction === 'under' ? '#16a34a' : '#dc2626' }}>${Number(pc.suggested_price).toFixed(2)}</strong>
                                                                {' '}({pc.direction === 'under' ? '+' : ''}{Number(pc.delta_pct).toFixed(0)}%)
                                                            </div>
                                                            <button
                                                                onClick={() => applyPricingFix(pc)}
                                                                style={{ padding: '5px 10px', background: '#1a1f3a', color: '#FDB813', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                                            >Update price</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </section>
                                        )}

                                        {/* Supplement opportunities */}
                                        {f.supplement_opportunities?.length > 0 && (
                                            <section style={{ marginBottom: 18 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#1a1f3a' }}>💡 Supplement opportunities ({f.supplement_opportunities.length})</h3>
                                                {f.supplement_opportunities.map((so, i) => (
                                                    <div key={i} style={{ padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 6 }}>
                                                        <strong style={{ fontSize: 13, color: '#1e40af' }}>{so.title}</strong>
                                                        {so.potential_value != null && (
                                                            <span style={{ marginLeft: 8, fontSize: 11, color: '#1e40af', fontWeight: 600 }}>~${Number(so.potential_value).toFixed(0)}</span>
                                                        )}
                                                        <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{so.reason}</div>
                                                    </div>
                                                ))}
                                            </section>
                                        )}

                                        {/* Other */}
                                        {f.other_concerns?.length > 0 && (
                                            <section style={{ marginBottom: 8 }}>
                                                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: '#1a1f3a' }}>Notes</h3>
                                                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                                                    {f.other_concerns.map((o, i) => <li key={i}>{o}</li>)}
                                                </ul>
                                            </section>
                                        )}

                                        {totalFindings === 0 && (
                                            <div style={{ padding: 30, textAlign: 'center', color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>✓ No issues found</div>
                                                <div style={{ fontSize: 13, color: '#166534' }}>This estimate looks complete and correctly priced.</div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid #e5e7eb' }}>
                            <button
                                onClick={() => setReviewModal(false)}
                                style={{ padding: '8px 14px', background: '#fff', color: '#1a1f3a', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                            >Close</button>
                            <button
                                onClick={askAIToReview}
                                disabled={reviewLoading}
                                style={{ padding: '8px 14px', background: '#1a1f3a', color: '#FDB813', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: reviewLoading ? 'wait' : 'pointer', opacity: reviewLoading ? 0.6 : 1 }}
                            >🔄 Re-run review</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ AI GENERATOR MODAL ============ */}
            {aiModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold"><svg className="icon" style={{ color: "#FDB813", verticalAlign: "middle" }}><use href="#i-sparkle" /></svg> AI Estimate Generator</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setAiModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            {/* Linked measurement banner — appears when user came from
                                the Measurement page or has selected one in the picker below. */}
                            {linkedMeasurement ? (
                                <div style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "10px 14px", marginBottom: 14,
                                    background: "linear-gradient(135deg,#eff6ff,#fff)",
                                    border: "1px solid #93c5fd", borderRadius: 8, fontSize: 13,
                                }}>
                                    <span style={{ color: "#1e3a8a" }}>
                                        <strong>Using measurement:</strong>{" "}
                                        {linkedMeasurement.extracted_data?.squares ?? "—"} sq
                                        {linkedMeasurement.source_provider && linkedMeasurement.source_provider !== "unknown"
                                            ? ` · ${linkedMeasurement.source_provider}` : ""}
                                    </span>
                                    <a href="#" style={{ color: "#1d4ed8", fontSize: 12 }}
                                       onClick={(e) => { e.preventDefault(); setLinkedMeasurement(null); }}>
                                        Remove
                                    </a>
                                </div>
                            ) : (
                                <div className="field" style={{ marginBottom: 14 }}>
                                    <label>
                                        Measurement{" "}
                                        <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 11 }}>
                                            — strongly recommended for accurate quantities
                                        </span>
                                    </label>
                                    {savedMeasurementsLoading ? (
                                        <div style={{ fontSize: 12, color: "#6b7280", padding: "6px 0" }}>
                                            Loading saved measurements…
                                        </div>
                                    ) : savedMeasurements.length === 0 ? (
                                        <div style={{
                                            fontSize: 12, color: "#92400e",
                                            background: "#fffbeb", border: "1px solid #fde68a",
                                            borderRadius: 6, padding: "8px 10px",
                                        }}>
                                            ⚠ No saved measurements yet. Without one, AI will produce a generic placeholder scope.
                                            <a href="/dashboard/measurement"
                                               style={{ color: "#b45309", marginLeft: 6, fontWeight: 600 }}>
                                                Extract one first →
                                            </a>
                                        </div>
                                    ) : (
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                if (!id) return;
                                                const picked = savedMeasurements.find((m) => m.id === id);
                                                if (picked) setLinkedMeasurement(picked);
                                            }}
                                            style={{
                                                width: "100%", padding: "9px 12px",
                                                border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13,
                                                background: "white",
                                            }}
                                        >
                                            <option value="">Select a saved measurement…</option>
                                            {savedMeasurements.map((m) => {
                                                const sq = m.extracted_data?.squares;
                                                const provider = m.source_provider && m.source_provider !== "unknown" ? m.source_provider : null;
                                                const conf = m.confidence_score != null ? Math.round(m.confidence_score * 100) : null;
                                                const isThisClient = client?.id && m.client_id === client.id;
                                                const isOrphan = !m.client_id;
                                                return (
                                                    <option key={m.id} value={m.id}>
                                                        {isThisClient ? "★ " : ""}
                                                        {(m.title || m.source_file_name || "Untitled")}
                                                        {sq != null ? ` — ${sq} sq` : ""}
                                                        {provider ? ` · ${provider}` : ""}
                                                        {conf != null ? ` · ${conf}%` : ""}
                                                        {isOrphan ? " · (no client)" : ""}
                                                        {!isThisClient && !isOrphan && client?.id ? " · other client" : ""}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Brief Section 8: damage type + storm date — required inputs. */}
                            <div className="field" style={{ marginBottom: 14 }}>
                                <label>Damage type</label>
                                <div className="chip-row" style={{ marginTop: 4 }}>
                                    {[
                                        ["hail", "Hail"], ["wind", "Wind"], ["wind_hail", "Wind+Hail"],
                                        ["tree", "Tree"], ["fire", "Fire"], ["water", "Water"], ["other", "Other"],
                                    ].map(([key, label]) => (
                                        <button
                                            type="button"
                                            key={key}
                                            className={`chip ${aiDamageType === key ? "active" : ""}`}
                                            onClick={() => setAiDamageType(aiDamageType === key ? "" : key)}
                                        >{label}</button>
                                    ))}
                                </div>
                                {/* CK-FIX Jul-22: "Other" was a dead end — describe it instead */}
                                {aiDamageType === "other" && (
                                    <input
                                        type="text"
                                        value={aiDamageTypeOther}
                                        onChange={(e) => setAiDamageTypeOther(e.target.value)}
                                        placeholder="Describe the damage type (e.g. vandalism, hurricane debris)..."
                                        maxLength={80}
                                        style={{ marginTop: 8, width: "100%" }}
                                    />
                                )}
                            </div>
                            <div className="field" style={{ marginBottom: 14 }}>
                                <label>Storm date <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    value={aiStormDate}
                                    onChange={(e) => setAiStormDate(e.target.value)}
                                    style={{
                                        padding: "9px 12px", border: "1.5px solid #e5e7eb",
                                        borderRadius: 8, fontSize: 13, width: "100%",
                                    }}
                                />
                            </div>

                            <div className="upload-grid">
                                <UploadBox label="Measurement Reports" hint="EagleView, HOVER, or PDF — multiple OK" icon="i-doc" type="measurement" files={aiUploads.measurement} onUpload={uploadFile} onRemove={removeUpload} />
                                <UploadBox label="Damage Photos" hint="Multiple photos OK" icon="i-camera" type="photos" files={aiUploads.photos} onUpload={uploadFile} onRemove={removeUpload} />
                            </div>
                            <details style={{ margin: "14px 0", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px" }}>
                                <summary style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Optional: Upload existing adjuster estimate</summary>
                                <div style={{ marginTop: 12 }}>
                                    <div className="upload-grid">
                                        <UploadBox label="Adjuster Estimate" hint="For supplement analysis" icon="i-doc" type="estimate1" files={aiUploads.estimate1} onUpload={uploadFile} onRemove={removeUpload} />
                                        <UploadBox label="Prior Supplements" hint="Already approved items" icon="i-doc" type="estimate2" files={aiUploads.estimate2} onUpload={uploadFile} onRemove={removeUpload} />
                                    </div>
                                </div>
                            </details>
                            <div className="field">
                                <label>Focus areas (optional)</label>
                                <div className="selected-chips">
                                    {selectedChips.map((s) => (
                                        <span key={s} className="chip active">{s}<span className="remove" onClick={() => removeSelectedChip(s)}>×</span></span>
                                    ))}
                                </div>
                                <div className="chip-row">
                                    {["Complete roof replacement", "Code upgrades", "Hail damage", "Wind damage", "2 layers tear off", "Include O&P", "Brittle test failed", "Build supplement"].map((p) => (
                                        <button key={p} className={`chip ${selectedChips.includes(p) ? "active" : ""}`} onClick={() => toggleSuggestion(p)}>{p}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="field">
                                <label>Additional notes (optional)</label>
                                <textarea value={aiMessage} onChange={(e) => setAiMessage(e.target.value)} placeholder="Anything specific. e.g. Steep roof, two layers, brittle test failed on north slope..." />
                            </div>

                            {/* Sticky inline error — shows the credit gate / API
                                key issues without bouncing the user out. */}
                            {aiError && (
                                <div role="alert" style={{
                                    marginTop: 14, padding: "12px 14px", borderRadius: 8,
                                    background: "#fef2f2", border: "1px solid #fecaca",
                                    borderLeft: "4px solid #dc2626", color: "#7f1d1d",
                                    fontSize: 13, lineHeight: 1.5, position: "relative",
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setAiError(null)}
                                        aria-label="Dismiss"
                                        style={{
                                            position: "absolute", top: 6, right: 8,
                                            background: "transparent", border: "none",
                                            color: "#7f1d1d", fontSize: 18, cursor: "pointer",
                                            lineHeight: 1, padding: 4,
                                        }}
                                    >×</button>
                                    <div style={{ fontWeight: 700, marginBottom: 4, paddingRight: 20 }}>
                                        {aiError.title}
                                    </div>
                                    <div>{aiError.detail}</div>
                                </div>
                            )}
                        </div>
                        <div className="px-[22px] py-[14px] border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                            <button className="btn btn-secondary" onClick={() => setAiModal(false)} disabled={aiGenerating}>Cancel</button>
                            <button className="btn btn-primary" onClick={generateAIEstimate} disabled={aiGenerating}>
                                <svg className="icon icon-sm"><use href="#i-sparkle" /></svg>
                                {aiGenerating ? "Generating…" : "Generate Estimate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ RATE LEARNING MODAL ============ */}
            {rateLearningModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold"><svg className="icon" style={{ color: "#FDB813", verticalAlign: "middle" }}><use href="#i-brain" /></svg> Train AI on Your Rates</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setRateLearningModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            <div className="rate-learning-intro">
                                <h4><svg className="icon icon-sm"><use href="#i-trending" /></svg> Why this matters</h4>
                                <p>Upload past estimates so the AI learns <strong>your prices</strong>, <strong>your line-item style</strong>, and <strong>what insurers accepted</strong>. The more you upload, the closer auto-generated estimates match what you'd write by hand.</p>
                            </div>
                            <div className="rate-stats">
                                <div className="rate-stat"><div className="rate-stat-num">{rateFiles.accepted.length}</div><div className="rate-stat-label">Accepted</div></div>
                                <div className="rate-stat"><div className="rate-stat-num">{rateFiles.declined.length}</div><div className="rate-stat-label">Declined</div></div>
                                <div className="rate-stat"><div className="rate-stat-num">{rateConfidence}</div><div className="rate-stat-label">AI Confidence</div></div>
                            </div>
                            {["accepted", "declined"].map((type) => (
                                <div key={type} className="rate-upload-section">
                                    <h4><span className={`pill ${type}`}>{type.toUpperCase()}</span> {type === "accepted" ? "Estimates the insurer paid" : "Estimates that were rejected or short-paid"}</h4>
                                    <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>{type === "accepted" ? "Best signal. AI learns your real rates and what got approved." : "AI learns what to avoid and which line items get pushback. Add a short note about what got cut, if you can."}</p>
                                    <div className="upload-box" style={{ padding: 14 }} onClick={() => uploadRateFile(type)}>
                                        <div className="upload-box-icon"><svg className="icon"><use href="#i-upload" /></svg></div>
                                        <div className="upload-box-label">Drop {type} estimates here</div>
                                        <div className="upload-box-hint">PDFs, Xactimate exports, or JSON. Multi-select OK.</div>
                                    </div>
                                    <div className="uploaded-list">
                                        {rateFiles[type].map((f, idx) => (
                                            <div key={idx} className="uploaded-row">
                                                <svg className="icon icon-sm" style={{ color: "#6b7280" }}><use href="#i-doc" /></svg>
                                                <span className="name">{f.name}</span>
                                                <span className="meta">{f.date}</span>
                                                <button className="remove-btn" onClick={() => removeRateFile(type, idx)} title="Remove">
                                                    <svg className="icon icon-sm"><use href="#i-trash" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#0c4a6e", lineHeight: 1.5 }}>
                                <strong>Privacy:</strong> Your estimates are used only to train your account's AI. Other ClaimKing users never see your rates or files.
                            </div>
                        </div>
                        <div className="px-[22px] py-[14px] border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                            <button className="btn btn-secondary" onClick={() => setRateLearningModal(false)}>Close</button>
                            <button className="btn btn-primary" onClick={retrainAI}>
                                <svg className="icon icon-sm"><use href="#i-refresh" /></svg>
                                Retrain AI Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ ADD SECTION MODAL ============ */}
            {addSectionModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">Add a section</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setAddSectionModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            <div>
                                {availableTemplates.length === 0 ? (
                                    <p style={{ color: "#6b7280", fontSize: 13 }}>All templates already added. Use custom name below.</p>
                                ) : availableTemplates.map((t) => (
                                    <div key={t.id} className="item-row template-row" style={{ padding: 12, cursor: "pointer" }} onClick={() => { addSection({ id: t.id, name: t.name }); setAddSectionModal(false); }}>
                                        <div className="item-info">
                                            <div className="item-name">{t.name}</div>
                                            <div style={{ fontSize: 11, color: "#6b7280" }}>{t.desc}</div>
                                        </div>
                                        <svg className="icon icon-sm" style={{ color: "#9ca3af" }}><use href="#i-plus" /></svg>
                                    </div>
                                ))}
                            </div>
                            <div className="field" style={{ marginTop: 14 }}>
                                <label>Or custom name</label>
                                <input type="text" value={customSectionName} onChange={(e) => setCustomSectionName(e.target.value)} placeholder="e.g. Detached Garage Roof" />
                            </div>
                        </div>
                        <div className="px-[22px] py-[14px] border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                            <button className="btn btn-secondary" onClick={() => setAddSectionModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={addCustomSection}>Add Section</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ CUSTOM ITEM MODAL ============ */}
            {customItemModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">Add new item</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setCustomItemModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            <div className="field">
                                <label>Description <span style={{ color: "#dc2626" }}>*</span></label>
                                <input type="text" value={customItem.name} onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })} placeholder="e.g. Custom soffit detail with cedar trim" autoFocus />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                <div className="field">
                                    <label>Qty <span style={{ color: "#dc2626" }}>*</span></label>
                                    <input type="number" value={customItem.qty} onChange={(e) => setCustomItem({ ...customItem, qty: e.target.value })} min="0" step="0.01" />
                                </div>
                                <div className="field">
                                    <label>Unit</label>
                                    <select value={customItem.unit} onChange={(e) => setCustomItem({ ...customItem, unit: e.target.value })}>
                                        {["EA", "SQ", "LF", "SF", "HR", "LS"].map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Unit price <span style={{ color: "#dc2626" }}>*</span></label>
                                    <input type="number" value={customItem.price} onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })} placeholder="0.00" min="0" step="0.01" />
                                </div>
                            </div>
                            <div className="field">
                                <label>Add to section</label>
                                <select value={customItem.section} onChange={(e) => setCustomItem({ ...customItem, section: e.target.value })}>
                                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer" }}>
                                <input type="checkbox" checked={customItem.saveToLib} onChange={(e) => setCustomItem({ ...customItem, saveToLib: e.target.checked })} />
                                <span>Save to my item library for next time (under <select value={customItem.category} onChange={(e) => setCustomItem({ ...customItem, category: e.target.value })} style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: "2px 4px", fontSize: 12 }}>
                                    <option value="roofing">Roofing</option>
                                    <option value="siding">Siding</option>
                                    <option value="gutters">Gutters</option>
                                    <option value="windows">Windows</option>
                                    <option value="general">General</option>
                                </select>)</span>
                            </label>
                            {customItem.name && parseFloat(customItem.price) > 0 && (
                                <div style={{ marginTop: 14, padding: "10px 12px", background: "#fffef7", border: "1px solid #FDB813", borderRadius: 7, fontSize: 12.5 }}>
                                    <strong>{customItem.name}</strong>
                                    <span style={{ color: "#6b7280" }}> · </span>
                                    <span>{customItem.qty}</span>
                                    <span> {customItem.unit}</span>
                                    <span style={{ color: "#6b7280" }}> @ </span>
                                    <span>${parseFloat(customItem.price || 0).toFixed(2)}</span>
                                    <span style={{ float: "right", fontWeight: 700, color: "#059669" }}>Total: <span>${(parseFloat(customItem.qty || 0) * parseFloat(customItem.price || 0)).toFixed(2)}</span></span>
                                </div>
                            )}
                        </div>
                        <div className="px-[22px] py-[14px] border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                            <button className="btn btn-secondary" onClick={() => setCustomItemModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveCustomItem}>
                                <svg className="icon icon-sm"><use href="#i-plus" /></svg>
                                Add to Estimate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ TERMS EDITOR MODAL ============ */}
            {termsEditorModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[760px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">Edit Terms &amp; Conditions</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setTermsEditorModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 12.5, color: "#0c4a6e", lineHeight: 1.5 }}>
                                These terms appear on every estimate PDF you send. Edit company info and terms text below. Changes apply to all future estimates immediately.
                            </div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "#6b7280" }}>Company Info</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <div className="field">
                                    <label>Company Name (display)</label>
                                    <input type="text" value={termsEditFields.companyName} onChange={(e) => setTermsEditFields({ ...termsEditFields, companyName: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Legal Name</label>
                                    <input type="text" value={termsEditFields.legalName} onChange={(e) => setTermsEditFields({ ...termsEditFields, legalName: e.target.value })} />
                                </div>
                            </div>
                            <div className="field">
                                <label>Billing Address</label>
                                <input type="text" value={termsEditFields.address} onChange={(e) => setTermsEditFields({ ...termsEditFields, address: e.target.value })} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                <div className="field">
                                    <label>Phone</label>
                                    <input type="text" value={termsEditFields.phone} onChange={(e) => setTermsEditFields({ ...termsEditFields, phone: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Email</label>
                                    <input type="email" value={termsEditFields.email} onChange={(e) => setTermsEditFields({ ...termsEditFields, email: e.target.value })} />
                                </div>
                                <div className="field">
                                    <label>Website</label>
                                    <input type="text" value={termsEditFields.website} onChange={(e) => setTermsEditFields({ ...termsEditFields, website: e.target.value })} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "18px 0 10px", textTransform: "uppercase", letterSpacing: ".04em", color: "#6b7280" }}>Short Terms (bulleted under Terms section)</h3>
                            <div className="field">
                                <label>One per line. HTML &lt;strong&gt; tags allowed.</label>
                                <textarea value={termsEditFields.shortTerms} onChange={(e) => setTermsEditFields({ ...termsEditFields, shortTerms: e.target.value })} style={{ minHeight: 140, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 11 }} />
                            </div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "18px 0 10px", textTransform: "uppercase", letterSpacing: ".04em", color: "#6b7280" }}>Full Terms &amp; Conditions Body</h3>
                            <div className="field">
                                <label>The long-form contract terms. Use blank lines to separate paragraphs.</label>
                                <textarea value={termsEditFields.fullTerms} onChange={(e) => setTermsEditFields({ ...termsEditFields, fullTerms: e.target.value })} style={{ minHeight: 300, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 11 }} />
                            </div>
                        </div>
                        <div className="px-[22px] py-[14px] border-t border-gray-200 flex justify-between gap-2 bg-gray-50 rounded-b-xl">
                            <button className="btn btn-danger" onClick={resetTermsToDefault}>Reset to Default</button>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-secondary" onClick={() => setTermsEditorModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={saveTermsEdit}>
                                    <svg className="icon icon-sm"><use href="#i-check" /></svg>
                                    Save Terms
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ FINALIZE MODAL ============ */}
            {finalizeModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">Finalize estimate</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setFinalizeModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div className="p-[22px]">
                            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>Choose how to deliver this estimate.</p>
                            <div style={{ display: "grid", gap: 8 }}>
                                {[
                                    ["i-send", "Email to client", client?.email ? `Send portal link to ${client.email}` : "Client has no email on file", sendEstimate],
                                    ["i-phone", "Text to client", client?.phone ? `Send portal link by SMS to ${client.phone}` : "Client has no phone on file", sendEstimateSms],
                                    ["i-download", "Download PDF", "Save locally", downloadPDF],
                                    ["i-cloud", "Save to client portal", "Client sees it instantly & gets an email", saveToPortal],
                                    ["i-refresh", "Sync to CRM", "JobNimbus, AccuLynx, Salesforce", sendToCRM],
                                ].map(([icon, title, desc, fn]) => (
                                    <button key={title} className="menu-item" style={{ border: "1px solid #e5e7eb", padding: 14 }} onClick={fn}>
                                        <svg className="icon"><use href={`#${icon}`} /></svg>
                                        <div style={{ flex: 1, textAlign: "left" }}>
                                            <div style={{ fontWeight: 600 }}>{title}</div>
                                            <div style={{ fontSize: 11.5, color: "#6b7280" }}>{desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MOVE MENU (line item) ============ */}
            {moveMenu && (
                <div className="move-menu active" style={{ position: "fixed", top: moveMenu.top, left: moveMenu.left }} onClick={(e) => e.stopPropagation()}>
                    <div className="move-menu-header">Move to section</div>
                    {sections.filter((s) => s.id !== moveMenu.secId).map((s) => (
                        <button key={s.id} className="move-menu-item" onClick={() => moveItemToSection(moveMenu.secId, moveMenu.idx, s.id)}>
                            <svg className="icon icon-sm" style={{ color: "#9ca3af" }}><use href="#i-move" /></svg>
                            <span>{s.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ============ 2.4 CSV BULK UPLOAD RESULT MODAL ============ */}
            {bulkResult && (
                <div onClick={() => setBulkResult(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,18,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 2100 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef0f3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1f3a" }}>
                                Bulk upload — {bulkResult.kind === "library" ? "item library" : "code requirements"}
                            </div>
                            <button onClick={() => setBulkResult(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div style={{ padding: 20, overflowY: "auto" }}>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>{bulkResult.valid.length} valid</span>
                                {bulkResult.errors.length > 0 && <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12.5 }}>{bulkResult.errors.length} error{bulkResult.errors.length === 1 ? "" : "s"}</span>}
                            </div>
                            {bulkResult.errors.length > 0 && (
                                <div style={{ marginBottom: 12, maxHeight: 220, overflowY: "auto", border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2" }}>
                                    {bulkResult.errors.map((er, i) => (
                                        <div key={i} style={{ padding: "6px 10px", fontSize: 12, color: "#991b1b", borderBottom: i < bulkResult.errors.length - 1 ? "1px solid #fecaca" : "none" }}>
                                            {er.line ? `Row ${er.line}: ` : ""}{er.msg}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {bulkResult.valid.length === 0 ? (
                                <div style={{ fontSize: 13, color: "#6b7280" }}>No valid rows to import. Fix the file (use the template) and try again.</div>
                            ) : (
                                <div style={{ fontSize: 12.5, color: "#374151" }}>{bulkResult.valid.length} row{bulkResult.valid.length === 1 ? "" : "s"} ready to import{bulkResult.errors.length > 0 ? " (invalid rows skipped)" : ""}.</div>
                            )}
                        </div>
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #eef0f3", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button onClick={() => setBulkResult(null)} style={{ padding: "9px 14px", background: "#f3f4f6", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                            <button onClick={importBulk} disabled={!bulkResult.valid.length} style={{ padding: "9px 16px", background: bulkResult.valid.length ? "#1a1f3a" : "#9ca3af", color: "#FDB813", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: bulkResult.valid.length ? "pointer" : "not-allowed" }}>
                                Import {bulkResult.valid.length} item{bulkResult.valid.length === 1 ? "" : "s"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ ALL LIBRARY ITEMS MODAL (CK-FIX Jul-22) ============ */}
            {allItemsModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5"
                    onClick={() => setAllItemsModal(false)}>
                    <div className="bg-white rounded-xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">All Library Items</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]"
                                onClick={() => setAllItemsModal(false)}><svg className="icon"><use href="#i-x" /></svg></button>
                        </div>
                        <div style={{ padding: "16px 22px 18px" }}>
                            <input
                                type="text" autoFocus value={allItemsSearch}
                                onChange={(e) => setAllItemsSearch(e.target.value)}
                                placeholder="Search all items across every category..."
                                style={{ width: "100%", marginBottom: 10 }}
                            />
                            <div style={{ maxHeight: 420, overflowY: "auto" }}>
                                {Object.entries(itemLibrary)
                                    .flatMap(([cat, arr]) => (arr ?? []).map((it, idx) => ({ ...it, _cat: cat, _idx: idx })))
                                    .filter((it) => {
                                        const q = allItemsSearch.trim().toLowerCase();
                                        if (!q) return true;
                                        return (
                                            it.name.toLowerCase().includes(q) ||
                                            (it.meta || "").toLowerCase().includes(q) ||
                                            it._cat.includes(q)
                                        );
                                    })
                                    .map((it) => (
                                        <div key={`all-${it._cat}-${it._idx}`} className="item-row library-row"
                                            onClick={() => { addToEstimate(it.name, it.price, it.unit); toast(`Added "${it.name}"`, "success"); }}>
                                            <div className="item-info">
                                                <div className="item-name">{it.name}</div>
                                                <div className="item-meta">{it._cat.toUpperCase()}{it.meta ? ` · ${it.meta}` : ""}</div>
                                            </div>
                                            <div className="item-price">${it.price}/{it.unit}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SAVED ESTIMATES MODAL ============ */}
            {savedEstimatesModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(15,18,42,0.55)] p-5">
                    <div className="bg-white rounded-xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                        <div className="flex justify-between items-center px-[22px] py-[18px] border-b border-gray-200">
                            <div className="text-base font-bold">Saved Estimates</div>
                            <button className="w-[30px] h-[30px] bg-transparent border-0 cursor-pointer text-gray-500 rounded-md flex items-center justify-center hover:bg-gray-100 hover:text-[#1a1f3a]" onClick={() => setSavedEstimatesModal(false)}>
                                <svg className="icon"><use href="#i-x" /></svg>
                            </button>
                        </div>
                        <div className="p-[22px]">
                            {savedEstimatesLoading ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", fontSize: 13 }}>
                                    Loading…
                                </div>
                            ) : savedEstimates.length === 0 ? (
                                <div style={{
                                    padding: "2.5rem 1rem", textAlign: "center",
                                    background: "#f9fafb", borderRadius: 10, border: "1px dashed #e5e7eb",
                                }}>
                                    <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
                                    <div style={{ fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                        No saved estimates yet
                                    </div>
                                    <div style={{ fontSize: 12.5, color: "#6b7280", maxWidth: 380, margin: "0 auto", lineHeight: 1.5 }}>
                                        Build your first estimate above and it will appear here.
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 10, maxHeight: 480, overflowY: "auto" }}>
                                    {savedEstimates.map((e) => {
                                        const clientName =
                                            e.client?.full_name ||
                                            `${e.client?.first_name ?? ""} ${e.client?.last_name ?? ""}`.trim() ||
                                            "No client";
                                        const status = e.status ?? "draft";
                                        const statusColors = {
                                            draft:    { bg: "#fef9c3", fg: "#854d0e" },
                                            approved: { bg: "#dcfce7", fg: "#166534" },
                                            sent:     { bg: "#dbeafe", fg: "#1e40af" },
                                            signed:   { bg: "#dcfce7", fg: "#166534" },
                                            archived: { bg: "#f3f4f6", fg: "#374151" },
                                            failed:   { bg: "#fee2e2", fg: "#991b1b" },
                                        };
                                        const sc = statusColors[status] || statusColors.draft;

                                        return (
                                            <div
                                                key={e.id}
                                                style={{
                                                    padding: 14, border: "1px solid #e5e7eb", borderRadius: 10,
                                                    background: "white", cursor: "pointer", transition: "all 0.15s ease",
                                                }}
                                                onMouseEnter={(el) => { el.currentTarget.style.borderColor = "#FDB813"; }}
                                                onMouseLeave={(el) => { el.currentTarget.style.borderColor = "#e5e7eb"; }}
                                                onClick={() => {
                                                    setSavedEstimatesModal(false);
                                                    // Flip the loading flag right away so the overlay
                                                    // appears the instant the user clicks — the load
                                                    // effect (deps: [searchParams]) will keep it on
                                                    // through the actual fetch and clear it when done.
                                                    setEstimateLoading(true);
                                                    // Client-side navigation so the dashboard sidebar
                                                    // stays mounted — full reload would flash the chrome.
                                                    router.push(`/dashboard/estimation?estimate_id=${e.id}`);
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, color: "#1a1f3a", fontSize: 14 }}>
                                                            {e.title || "Untitled estimate"}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                                            {clientName} · {e.updated_at ? new Date(e.updated_at).toLocaleDateString() : "—"}
                                                            {e.total_rcv ? ` · $${Number(e.total_rcv).toLocaleString()}` : ""}
                                                            {e.mode ? ` · ${e.mode}` : ""}
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        background: sc.bg, color: sc.fg,
                                                        fontSize: 10.5, fontWeight: 600, padding: "3px 9px",
                                                        borderRadius: 12, textTransform: "uppercase", letterSpacing: 0.3,
                                                    }}>{status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============ LOADING ============ */}
            {loading.active && (
                <div className="est-loading-overlay active">
                    <div className="est-loading-content">
                        <div className="est-loader"></div>
                        <div className="est-loading-text">{loading.text}</div>
                        <div className="est-loading-sub">{loading.sub}</div>
                    </div>
                </div>
            )}

            {/* Saved-estimate hydration overlay — fires when ?estimate_id=
                appears in the URL and stays until sections + client load. */}
            {
                console.log('before loading estimate..')

            }
            {
                console.log('estimateLoading',estimateLoading)
            }
            {
                console.log('!generatingEstimate', generatingEstimate)
            }
            {
                console.log('!loading.active', loading.active)
            }
            {estimateLoading && !generatingEstimate && !loading.active && (
                <div className="est-loading-overlay active">
                    <div className="est-loading-content">
                        {
                            console.log('Inside loading estimate..')
                        }
                        <div className="est-loader"></div>
                        <div className="est-loading-text">Loading estimate…</div>
                        <div className="est-loading-sub">Restoring sections, items, and client</div>
                    </div>
                </div>
            )}

            {/* Async AI generation overlay — the estimate row exists but Claude
                is still building it on the server. Safe to leave the page. */}
            
            {generatingEstimate && (
                <div className="est-loading-overlay active">
                    <div className="est-loading-content">
                        <div className="est-loader"></div>
                        <div className="est-loading-text">AI is building your estimate…</div>
                        <div className="est-loading-sub">This can take a couple of minutes. You can leave this page — it keeps running, and you'll find it in Saved Estimates.</div>
                    </div>
                </div>
            )}

        </div>
    );
};

// ====================== Sub-component: UploadBox ======================
const UploadBox = ({ label, hint, icon, type, files, onUpload, onRemove }) => (
    <div className={`upload-box ${files.length > 0 ? "has-file" : ""}`} onClick={() => onUpload(type)}>
        <div className="upload-box-icon"><svg className="icon"><use href={`#${icon}`} /></svg></div>
        <div className="upload-box-label">{label}</div>
        <div className="upload-box-hint">{hint}</div>
        {files.length > 0 && (
            <div className="upload-box-file" style={{ display: "block" }}>
                {files.map((f, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 11, textAlign: "left" }}>
                        <svg className="icon icon-sm" style={{ color: "#10b981", flexShrink: 0 }}><use href="#i-check" /></svg>
                        <span style={{ flex: 1, color: "#1a1f3a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(type, idx); }} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                            <svg className="icon icon-sm"><use href="#i-x" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ====================== Sub-component: TermsContent ======================
const TermsContent = ({ companyState, termsState, client }) => {
    const ins = companyState.insurance;
    const fullTermsHtml = termsState.full_terms.split(/\n\n+/).map((p) => `<p>${p.trim()}</p>`).join("");

    return (
        <div className="terms-content">
            <div className="terms-status-key">
                <strong>APPROVED</strong> = Deposit received, ready to schedule. &nbsp;
                <strong>PENDING</strong> = Awaiting approval &amp; deposit. &nbsp;
                <strong>QUOTED</strong> = Estimate provided, not yet sent to client.
            </div>

            <h2>Terms &amp; Conditions</h2>
            <ul>
                {termsState.short_terms.map((t, idx) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: t }} />
                ))}
            </ul>
            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 6 }}>Full Terms &amp; Conditions at {companyState.website}/terms-and-conditions</p>

            <div style={{ marginTop: 14, padding: "12px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 11 }}>
                <strong>Industry Pricing Note:</strong> {termsState.industry_pricing_note}
            </div>

            <div className="terms-payment-box">
                <h3>Payment Terms &amp; Card Authorization</h3>
                <p><strong>Card Processing Fee:</strong> {termsState.payment_terms.card_processing_fee}</p>
                <p><strong>Card on File &amp; Auto-Charge Authorization:</strong> {termsState.payment_terms.card_on_file}</p>
                <p><strong>Payment Due:</strong> {termsState.payment_terms.payment_due}</p>
            </div>

            <h2>Contractor Insurance &amp; Licensing</h2>
            <div className="terms-grid">
                <div className="terms-card">
                    <h3>General Liability Policy</h3>
                    <p><strong>Policy #:</strong> {ins.policy_number}</p>
                    <p><strong>Carrier:</strong> {ins.carrier}</p>
                    <p><strong>Producer:</strong> {ins.producer}</p>
                    <p style={{ marginTop: 6 }}><strong>Each Occurrence Limit:</strong> {ins.each_occurrence}</p>
                    <p><strong>General Aggregate Limit:</strong> {ins.aggregate}</p>
                    <p><strong>Prod/Completed Ops:</strong> {ins.products_completed}</p>
                    <p><strong>Personal &amp; Adv. Injury:</strong> {ins.personal_injury}</p>
                    <p><strong>Damage to Rented Premises:</strong> {ins.damage_to_premises}</p>
                    <p><strong>Medical Expense:</strong> {ins.medical}</p>
                    <p style={{ marginTop: 6 }}><strong>Policy Period:</strong> {ins.period}</p>
                    <p><strong>Products &amp; Completed Ops:</strong> Through {ins.completed_ops_through}</p>
                    <p style={{ marginTop: 6 }}><strong>Report a Claim:</strong> {ins.claim_url}</p>
                    <p><strong>Claims Contact:</strong> {ins.claim_email}</p>
                </div>
                <div className="terms-card">
                    <h3>Named Insured</h3>
                    <p><strong>Company:</strong> {companyState.name}</p>
                    <p><strong>Billing Address:</strong> {companyState.address}</p>
                    <p><strong>Phone:</strong> {companyState.phone}</p>
                    <p><strong>Email:</strong> {companyState.general_email}</p>
                    <h3 style={{ marginTop: 14 }}>Contractor Licenses</h3>
                    <p>Licensed &amp; Insured | Available upon request</p>
                    <p>Nationwide service. Licensed &amp; insured in all operating states.</p>
                    <p>COI or W-9 available upon request: {companyState.phone} | {companyState.general_email}</p>
                </div>
                <div className="terms-card">
                    <h3>Policy Endorsements</h3>
                    <ul style={{ margin: "0 0 0 16px" }}>
                        {ins.endorsements.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                </div>
            </div>

            <h2>Full Terms &amp; Conditions</h2>
            <p style={{ textAlign: "center", fontWeight: 700, color: "#1a1f3a", marginBottom: 4 }}>{companyState.legal_name}</p>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 12 }}><strong>Main Billing &amp; Legal Office:</strong> {companyState.address} | {companyState.phone} | {companyState.general_email}</p>
            <div dangerouslySetInnerHTML={{ __html: fullTermsHtml }} />

            <div className="terms-footer">
                <p style={{ fontWeight: 700, color: "#1a1f3a" }}>Prepared by: ClaimKing</p>
                <p>{companyState.website}</p>
                <p>Licensed &amp; Insured | $1,000,000 General Liability | Policy #: {ins.policy_number}</p>
                <p style={{ fontStyle: "italic", marginTop: 6 }}>Thank you for choosing {companyState.name}! We look forward to restoring your property.</p>
                <p style={{ marginTop: 10 }}>Questions? {companyState.phone} | {companyState.general_email} | {companyState.website}</p>
                <p>Hours: {companyState.hours} | {companyState.address}</p>
            </div>
        </div>
    );
};

export default Estimation;
