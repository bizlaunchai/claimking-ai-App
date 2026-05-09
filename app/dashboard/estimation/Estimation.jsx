"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { toast as sonner } from "sonner";
import "./estimation.css";
import "../measurement/measurement-hero.css";  // reuse hero + stat-chip styles

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

const ICON_MAP = { success: "i-check-circle", warn: "i-warning", error: "i-warning" };

const NEW_CLIENT_BLANK = {
    first_name: "", last_name: "", email: "", phone: "",
    address: "", city: "", state: "", zip_code: "",
    preferred_contact: "both",
};

// Map a client_portals row to the lightweight shape estimation uses internally.
const toClientShape = (raw) => ({
    id: raw.id,
    name: raw.full_name || `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim() || "Unnamed",
    address: [raw.address, raw.city, raw.state, raw.zip_code].filter(Boolean).join(", "),
    claim: raw.claim_number || raw.claim || null,
});

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

// ====================== MAIN COMPONENT ======================
const Estimation = () => {
    // ── Query params (Measurement → Estimate handoff) ─────────────────────
    const searchParams = useSearchParams();

    // ── Loaded measurement (set when ?measurement_id is present) ──────────
    const [linkedMeasurement, setLinkedMeasurement] = useState(null);
    const [measurementLoading, setMeasurementLoading] = useState(false);

    // ── Core state ───────────────────────────────────────────────────────
    const [client, setClient] = useState(null);
    const [mode, setMode] = useState("insurance");
    const [sections, setSections] = useState([]);
    const [activeSection, setActiveSection] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [estimateTitle, setEstimateTitle] = useState("INSURANCE ESTIMATE");

    // ── Item library (mutable - user can edit prices / add custom) ───────
    const [itemLibrary, setItemLibrary] = useState(INITIAL_ITEM_LIBRARY);
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

    // ── Add section / custom item modals ─────────────────────────────────
    const [addSectionModal, setAddSectionModal] = useState(false);
    const [customSectionName, setCustomSectionName] = useState("");

    const [customItemModal, setCustomItemModal] = useState(false);
    const [customItem, setCustomItem] = useState({
        name: "", qty: "1", unit: "EA", price: "", section: "", saveToLib: true, category: "general",
    });

    // ── Client selection (tabbed inline section, not a modal) ────────────
    const [clientTab, setClientTab] = useState("existing");
    const [clientSearch, setClientSearch] = useState("");
    const [clientList, setClientList] = useState([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [newClientForm, setNewClientForm] = useState(NEW_CLIENT_BLANK);
    const [creatingClient, setCreatingClient] = useState(false);
    const [clientFormError, setClientFormError] = useState(null);

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
    const [taxPercent, setTaxPercent] = useState("8");

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
    const [toasts, setToasts] = useState([]);
    const [saveIndicator, setSaveIndicator] = useState({ saving: false, text: "Saved" });

    // ── Persistence (M4): track the saved estimate's id + last-save state ─
    const [currentEstimateId, setCurrentEstimateId] = useState(null);
    const [estimateLoading, setEstimateLoading] = useState(false);
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

    // ── Load existing clients (debounced search) ─────────────────────────
    useEffect(() => {
        if (clientTab !== "existing" || client) return;
        let cancelled = false;
        setClientsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const params = {};
                if (clientSearch.trim()) params.search = clientSearch.trim();
                const res = await axiosInstance.get("/client-portal", { params });
                if (cancelled) return;
                setClientList(res.data?.data ?? []);
            } catch {
                /* axiosInstance toasts */
            } finally {
                if (!cancelled) setClientsLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [clientTab, clientSearch, client]);

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

        (async () => {
            try {
                const res = await axiosInstance.get(`/estimates/${estimateId}`);
                if (cancelled) return;
                const e = res.data?.data;
                if (!e) return;

                // Block the immediate auto-save that would otherwise fire as
                // we hydrate the React state below.
                skipNextAutoSave.current = true;

                setCurrentEstimateId(e.id);
                setMode(e.mode ?? "insurance");
                setEstimateTitle(e.estimate_title ?? "INSURANCE ESTIMATE");
                setOverheadOn(!!e.overhead_on);
                setTaxOn(!!e.tax_on);
                setTaxName(e.tax_name ?? "Sales Tax");
                setTaxPercent(String(e.tax_pct ?? 8));
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

    // ====================== UTIL ======================
    const toast = useCallback((msg, type = "") => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
    }, []);

    const showLoading = (text, sub = "") => setLoading({ active: true, text, sub });
    const hideLoading = () => setLoading({ active: false, text: "", sub: "" });

    /**
     * Build the SaveEstimateDto payload from current React state. Returns
     * `null` if the estimate isn't ready to save yet (no client selected).
     */
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
            tax_pct: parseFloat(taxPercent) || 0,
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
        taxOn, taxName, taxPercent, termsState, sections,
    ]);

    /**
     * Persist current state to the backend. Creates on first save, then
     * patches afterwards. Called by the debounced `triggerSave` wrapper.
     */
    const saveEstimateNow = useCallback(async () => {
        const payload = buildSavePayload();
        if (!payload) {
            setSaveIndicator({ saving: false, text: "Saved" });
            return;
        }
        setSaveIndicator({ saving: true, text: "Saving..." });
        try {
            if (currentEstimateId) {
                await axiosInstance.patch(
                    `/estimates/${currentEstimateId}`,
                    payload,
                    { suppressErrorToast: true },
                );
            } else {
                const res = await axiosInstance.post(
                    "/estimates",
                    payload,
                    { suppressErrorToast: true },
                );
                const newId = res.data?.data?.id;
                if (newId) setCurrentEstimateId(newId);
            }
            setSaveIndicator({ saving: false, text: "Saved" });
        } catch {
            setSaveIndicator({ saving: false, text: "Save failed" });
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

    const selectExistingClient = (raw) => {
        const shaped = toClientShape(raw);
        setClient(shaped);
        toast(`Client set: ${shaped.name}`, "success");
    };

    const handleNewClientField = (field, value) =>
        setNewClientForm((prev) => ({ ...prev, [field]: value }));

    const submitNewClient = async () => {
        setClientFormError(null);
        const required = ["first_name", "last_name", "email", "phone", "address", "city", "state", "zip_code"];
        const missing = required.filter((k) => !newClientForm[k]?.trim());
        if (missing.length) {
            const msg = `Please fill in: ${missing.map((f) => f.replace("_", " ")).join(", ")}`;
            setClientFormError(msg);
            sonner.error(msg);
            return;
        }

        setCreatingClient(true);
        try {
            const res = await axiosInstance.post("/client-portal", {
                first_name: newClientForm.first_name,
                last_name: newClientForm.last_name,
                email: newClientForm.email,
                phone: newClientForm.phone,
                address: newClientForm.address,
                city: newClientForm.city,
                state: newClientForm.state.toUpperCase().slice(0, 2),
                zip_code: newClientForm.zip_code,
                property_type: "single-family",
                insurance_company: "other",
                claim_status: 1,
            });
            const created = res.data?.data;
            sonner.success("Client created");
            if (created) selectExistingClient(created);
            setNewClientForm(NEW_CLIENT_BLANK);
            setClientTab("existing");
        } catch (err) {
            setClientFormError(err?.userMessage ?? "Could not create client.");
        } finally {
            setCreatingClient(false);
        }
    };

    const changeClient = () => {
        setClient(null);
        setClientTab("existing");
    };

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
            const payload = {
                client_id: client.id,
                measurement_id: linkedMeasurement?.id ?? undefined,
                damage_type: aiDamageType || undefined,
                storm_date: aiStormDate || undefined,
                mode,
                instructions: aiMessage?.trim() || undefined,
                scope_hints: selectedChips.length ? selectedChips : undefined,
            };
            const res = await axiosInstance.post(
                "/estimates/generate",
                payload,
                { suppressErrorToast: true }, // we render our own inline error
            );
            const e = res.data?.data;
            if (e?.id) {
                setAiModal(false);
                window.location.href = `/dashboard/estimation?estimate_id=${e.id}`;
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

    const askAIToReview = () => {
        showLoading("Reviewing estimate...", "Checking for missing code items, price gaps, and supplement opportunities");
        setTimeout(() => {
            hideLoading();
            toast("AI suggests adding Ice & Water Shield and Drip Edge", "success");
        }, 1500);
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

    const updateItemQty = (secId, idx, val) => {
        const qty = parseFloat(val) || 0;
        setSections((prev) => prev.map((s) => s.id === secId
            ? { ...s, items: s.items.map((it, i) => i === idx ? { ...it, qty } : it) }
            : s));
        triggerSave();
    };

    const removeItem = (secId, idx) => {
        setSections((prev) => prev.map((s) => s.id === secId
            ? { ...s, items: s.items.filter((_, i) => i !== idx) }
            : s));
        triggerSave();
    };

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
    const editItemPrice = (cat, idx) => {
        const item = (itemLibrary[cat] || [])[idx];
        if (!item) return;
        const newPrice = window.prompt(`Edit price for "${item.name}" (per ${item.unit})`, item.price);
        if (newPrice && !isNaN(newPrice) && parseFloat(newPrice) > 0) {
            setItemLibrary((prev) => ({
                ...prev,
                [cat]: prev[cat].map((it, i) => i === idx ? { ...it, price: parseFloat(newPrice) } : it),
            }));
            toast(`Updated ${item.name} to $${parseFloat(newPrice).toFixed(2)}/${item.unit}`, "success");
        }
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
    const subtotal = sections.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.qty * i.price, 0), 0);
    const overhead = overheadOn ? subtotal * 0.20 : 0;
    const taxBase = subtotal + overhead;
    const tax = taxOn ? taxBase * ((parseFloat(taxPercent) || 0) / 100) : 0;
    const totalRCV = subtotal + overhead + tax;
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
        const checkedItems = CODE_ITEMS.filter((c) => codeChecked[c.id]);
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

    const filteredCodeDb = CODE_DB.filter((it) => {
        const q = codeDbSearch.toLowerCase().trim();
        const showC = codeDbCode === "all" || it.code === "all" || it.code === codeDbCode;
        const showM = codeDbMfr === "all" || it.mfr === "all" || it.mfr === codeDbMfr;
        const showQ = !q || (it.name + " " + it.meta).toLowerCase().includes(q);
        return showC && showM && showQ;
    });

    // ====================== DOCUMENTATION ======================
    const uploadBulkPhotos = () => {
        const i = document.createElement("input");
        i.type = "file";
        i.accept = "image/*";
        i.multiple = true;
        i.onchange = (e) => {
            if (e.target.files.length) {
                toast(`Uploading ${e.target.files.length} photos with auto-stamp`, "success");
            }
        };
        i.click();
    };
    const generateSupportingDocs = () => {
        showLoading("Building supporting docs package...", "Code citations, mfr specs, stamped photos");
        setTimeout(() => { hideLoading(); toast("Supporting docs package ready", "success"); }, 1500);
    };

    // ====================== SIGN / PAY ======================
    const requestSignature = () => toast("Signature request sent to homeowner", "success");
    const generateInvoice = () => toast(`Invoice for $${paymentAmount.toFixed(2)} generated`, "success");

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
    const openItemLibrary = () => { setMoreOpen(false); toast("Item library: full editor coming", "success"); };
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
    const sendEstimate = () => {
        setFinalizeModal(false);
        const e = window.prompt("Email address");
        if (e) toast(`Sent to ${e}`, "success");
    };
    const downloadPDF = () => { setFinalizeModal(false); window.print(); };
    const saveToPortal = () => { setFinalizeModal(false); toast("Saved to client portal", "success"); };
    const sendToCRM = () => { setFinalizeModal(false); toast("Synced to CRM", "success"); };

    // ====================== AVAILABLE SECTION TEMPLATES (for add-section modal) ======================
    const availableTemplates = (SECTION_TEMPLATES[mode] || SECTION_TEMPLATES.insurance)
        .filter((t) => !sections.find((s) => s.id === t.id));

    // ====================== RENDER ======================
    return (
        <div className={`mode-${mode}`}>
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
                {!client && (
                    <div className="cs-card" id="estClientSection">
                        {/* Measurement-waiting banner — appears when the user
                            arrived from "Use in Estimate" without a client. */}
                        {linkedMeasurement && (
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
                        <div className="cs-tabs">
                            <button
                                className={`cs-tab-btn ${clientTab === "existing" ? "active" : ""}`}
                                onClick={() => setClientTab("existing")}
                            >Existing Client</button>
                            <button
                                className={`cs-tab-btn ${clientTab === "new" ? "active" : ""}`}
                                onClick={() => setClientTab("new")}
                            >New Client</button>
                        </div>

                        {clientTab === "existing" && (
                            <div>
                                <input
                                    type="text"
                                    className="cs-search-input"
                                    placeholder="Type client name, address, email or phone…"
                                    value={clientSearch}
                                    onChange={(e) => setClientSearch(e.target.value)}
                                />
                                <div style={{ display: "grid", gap: ".5rem", maxHeight: 280, overflowY: "auto" }}>
                                    {clientsLoading && (
                                        <div style={{ fontSize: 13, color: "#6b7280", padding: ".5rem" }}>Searching…</div>
                                    )}
                                    {!clientsLoading && clientList.length === 0 && (
                                        <div style={{ fontSize: 13, color: "#6b7280", padding: ".5rem" }}>
                                            No clients found. Switch to <strong>New Client</strong> to add one.
                                        </div>
                                    )}
                                    {clientList.map((c) => (
                                        <div
                                            key={c.id}
                                            className="cs-option"
                                            onClick={() => selectExistingClient(c)}
                                        >
                                            <div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: "#1f2937" }}>{c.full_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim()}</div>
                                                    <div style={{ fontSize: ".75rem", color: "#6b7280" }}>
                                                        {[c.address, c.city, c.state].filter(Boolean).join(", ")}
                                                    </div>
                                                </div>
                                                <button
                                                    className="cs-btn cs-btn-outline"
                                                    style={{ padding: ".375rem .75rem", fontSize: ".75rem" }}
                                                    onClick={(e) => { e.stopPropagation(); selectExistingClient(c); }}
                                                >Select Client</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {clientTab === "new" && (
                            <div>
                                <div className="cs-form-grid">
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">First Name</label>
                                        <input type="text" className="cs-form-input" placeholder="John"
                                            value={newClientForm.first_name}
                                            onChange={(e) => handleNewClientField("first_name", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">Last Name</label>
                                        <input type="text" className="cs-form-input" placeholder="Smith"
                                            value={newClientForm.last_name}
                                            onChange={(e) => handleNewClientField("last_name", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">Email</label>
                                        <input type="email" className="cs-form-input" placeholder="john@example.com"
                                            value={newClientForm.email}
                                            onChange={(e) => handleNewClientField("email", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">Phone</label>
                                        <input type="tel" className="cs-form-input" placeholder="(555) 123-4567"
                                            value={newClientForm.phone}
                                            onChange={(e) => handleNewClientField("phone", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group full-width">
                                        <label className="cs-form-label required">Address</label>
                                        <input type="text" className="cs-form-input" placeholder="123 Main Street"
                                            value={newClientForm.address}
                                            onChange={(e) => handleNewClientField("address", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">City</label>
                                        <input type="text" className="cs-form-input" placeholder="Dallas"
                                            value={newClientForm.city}
                                            onChange={(e) => handleNewClientField("city", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">State</label>
                                        <input type="text" className="cs-form-input" maxLength={2} placeholder="TX"
                                            value={newClientForm.state}
                                            onChange={(e) => handleNewClientField("state", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label required">ZIP Code</label>
                                        <input type="text" className="cs-form-input" placeholder="75201"
                                            value={newClientForm.zip_code}
                                            onChange={(e) => handleNewClientField("zip_code", e.target.value)} />
                                    </div>
                                    <div className="cs-form-group">
                                        <label className="cs-form-label">Preferred Contact</label>
                                        <div style={{ display: "flex", gap: "1rem", marginTop: ".5rem" }}>
                                            {["sms", "email", "both"].map((o) => (
                                                <label key={o} style={{ fontSize: ".875rem" }}>
                                                    <input type="radio" name="estContact" value={o}
                                                        checked={newClientForm.preferred_contact === o}
                                                        onChange={() => handleNewClientField("preferred_contact", o)} />
                                                    {" "}{o.toUpperCase()}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {clientFormError && (
                                        <div className="cs-form-group full-width cs-error-banner" role="alert">
                                            {clientFormError}
                                        </div>
                                    )}
                                    <div className="cs-form-group full-width">
                                        <button type="button" className="cs-btn cs-btn-primary"
                                            onClick={submitNewClient}
                                            disabled={creatingClient}>
                                            {creatingClient ? "Creating…" : "Create & Continue"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────────── Selected client bar ─────────────── */}
                {client && (
                    <div className="cs-selected-bar">
                        <div className="cs-selected-info">
                            <span className="cs-selected-name">{client.name}</span>
                            {client.address && <span className="cs-selected-address">{client.address}</span>}
                            <a href="#" className="cs-action-link" onClick={(e) => { e.preventDefault(); changeClient(); }}>Change</a>
                        </div>
                        <div className="cs-selected-actions">
                            <a href="#" className="cs-action-link" onClick={(e) => e.preventDefault()}>View Previous Estimates</a>
                            <a href="#" className="cs-action-link" onClick={(e) => e.preventDefault()}>Client Preferences</a>
                        </div>
                    </div>
                )}

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
                                    ) : visibleItems.map((it) => (
                                        <div key={`${it._cat}-${it._idx}`} className="item-row library-row" onClick={(e) => {
                                            if (e.target.closest(".library-edit")) return;
                                            addToEstimate(it.name, it.price, it.unit);
                                        }}>
                                            <div className="item-info">
                                                <div className="item-name">{it.name}</div>
                                                <div className="item-price">${it.price.toFixed(2)}/{it.unit}{itemSearch && <span style={{ color: "#9ca3af", fontWeight: 400 }}> · {it._cat}</span>}</div>
                                            </div>
                                            <button className="item-edit-btn library-edit" onClick={(e) => { e.stopPropagation(); editItemPrice(it._cat, it._idx); }}>Edit</button>
                                        </div>
                                    ))}
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
                                    <svg viewBox="0 0 24 24"><use href="#i-crown" /></svg>
                                    <div>
                                        <div className="company-info-text">CLAIMKING</div>
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
                                                ) : s.items.map((it, idx) => (
                                                    <tr key={idx}
                                                        draggable="true"
                                                        data-section-id={s.id}
                                                        data-idx={idx}
                                                        onDragStart={(e) => handleDragStart(e, s.id, idx)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => handleDragOver(e, s.id)}
                                                        onDrop={(e) => handleDrop(e, s.id, idx)}>
                                                        <td><span className="drag-handle" title="Drag to reorder"><svg className="icon icon-sm"><use href="#i-grip" /></svg></span></td>
                                                        <td>
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                                                {it.name}
                                                                {/* Brief Sec 8: "user should see WHY each line item is included
                                                                    and where the data came from." */}
                                                                {it.reason && (
                                                                    <span
                                                                        title={[
                                                                            it.reason,
                                                                            it.source_field ? `Source: ${it.source_field}` : null,
                                                                            it.code_ref ? `Code: ${it.code_ref}` : null,
                                                                        ].filter(Boolean).join("\n\n")}
                                                                        style={{
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            width: 16, height: 16,
                                                                            borderRadius: "50%",
                                                                            background: "#fef3c7",
                                                                            color: "#92400e",
                                                                            fontSize: 10,
                                                                            fontWeight: 700,
                                                                            cursor: "help",
                                                                            border: "1px solid #fde68a",
                                                                        }}
                                                                    >?</span>
                                                                )}
                                                                {it.code_ref && (
                                                                    <span
                                                                        title={`Required by ${it.code_ref}`}
                                                                        style={{
                                                                            fontSize: 10, fontWeight: 600,
                                                                            padding: "1px 6px",
                                                                            borderRadius: 4,
                                                                            background: "#dbeafe",
                                                                            color: "#1e40af",
                                                                            cursor: "help",
                                                                        }}
                                                                    >CODE</span>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td><input type="number" className="qty-input" value={it.qty} min="0" step="0.01" onChange={(e) => updateItemQty(s.id, idx, e.target.value)} /></td>
                                                        <td>{it.unit}</td>
                                                        <td>${it.price.toFixed(2)}</td>
                                                        <td><strong>${(it.qty * it.price).toFixed(2)}</strong></td>
                                                        <td>
                                                            <div className="line-actions">
                                                                <button className="line-action-btn" onClick={() => moveItem(s.id, idx, -1)} title="Move up" disabled={idx === 0}><svg className="icon icon-sm"><use href="#i-arrow-up" /></svg></button>
                                                                <button className="line-action-btn" onClick={() => moveItem(s.id, idx, 1)} title="Move down" disabled={idx === s.items.length - 1}><svg className="icon icon-sm"><use href="#i-arrow-down" /></svg></button>
                                                                <button className="line-action-btn" onClick={(e) => openMoveMenu(e, s.id, idx)} title="Move to section"><svg className="icon icon-sm"><use href="#i-move" /></svg></button>
                                                                <button className="line-action-btn danger" onClick={() => removeItem(s.id, idx)} title="Remove"><svg className="icon icon-sm"><use href="#i-trash" /></svg></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="add-item-area" style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                                            <button className="add-item-btn" onClick={() => selectSection(s.id)}>
                                                <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-plus" /></svg>
                                                Add from library
                                            </button>
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
                                <div className="total-row">
                                    <span className="toggle-input">
                                        <input type="checkbox" checked={taxOn} onChange={(e) => setTaxOn(e.target.checked)} />
                                        <input type="text" value={taxName} onChange={(e) => setTaxName(e.target.value)} style={{ width: 90 }} />
                                        <span>(</span>
                                        <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} step="0.1" min="0" max="100" style={{ width: 48, textAlign: "center" }} />
                                        <span>%)</span>
                                    </span>
                                    <span className="total-value">${tax.toFixed(2)}</span>
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
                                    <div>
                                        {CODE_ITEMS.map((item) => (
                                            <label key={item.id} className="compact-item" style={{ cursor: "pointer" }}>
                                                <input type="checkbox" className="code-cb" checked={!!codeChecked[item.id]} onChange={(e) => setCodeChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))} />
                                                <div className="ci-body">
                                                    <div className="ci-name">{item.name}</div>
                                                    <div className="ci-meta">{item.ref}</div>
                                                </div>
                                                <div className="ci-price">${item.price}/{item.unit}</div>
                                            </label>
                                        ))}
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
                                        {filteredCodeDb.map((item, idx) => (
                                            <div key={idx} className="compact-item codedb-row" onClick={() => addToEstimate(item.name, item.price, item.unit)} style={{ cursor: "pointer" }}>
                                                <div className="ci-body" style={{ marginLeft: 0 }}>
                                                    <div className="ci-name">{item.star ? "★ " : ""}{item.name}</div>
                                                    <div className="ci-meta">{item.meta}</div>
                                                </div>
                                                <div className="ci-price">${item.price}/{item.unit}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {filteredCodeDb.length === 0 && (
                                        <div style={{ display: "block", textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12, fontStyle: "italic" }}>No matches. Try a different search.</div>
                                    )}
                                </div>

                                {/* DOCS PANE */}
                                <div className={`rail-pane ${railTab === "docs" ? "active" : ""}`}>
                                    <h3>Photo documentation</h3>
                                    <p className="desc">Upload damage photos. AI auto-stamps with claim number, address, and date.</p>
                                    <div className="doc-card">
                                        <div className="doc-card-title"><svg className="icon icon-sm"><use href="#i-camera" /></svg> Bulk photo upload</div>
                                        <div className="doc-card-meta">No photos uploaded yet</div>
                                        <button className="doc-card-action" onClick={uploadBulkPhotos}>Upload Photos</button>
                                    </div>
                                    <div className="doc-card">
                                        <div className="doc-card-title"><svg className="icon icon-sm"><use href="#i-doc" /></svg> Supporting docs package</div>
                                        <div className="doc-card-meta">Code citations, mfr specs, photos</div>
                                        <button className="doc-card-action" onClick={generateSupportingDocs}>Generate Package</button>
                                    </div>
                                </div>

                                {/* SIGN PANE */}
                                <div className={`rail-pane ${railTab === "sign" ? "active" : ""}`}>
                                    <h3>Signature &amp; payment</h3>
                                    <p className="desc">Send to homeowner for digital signature and collect deposit.</p>
                                    <div className="sig-section">
                                        <div className="sig-section-title">Digital signature</div>
                                        <div className="sig-canvas">
                                            <div className="sig-canvas-text">Homeowner signature pending</div>
                                        </div>
                                        <button className="sig-action" onClick={requestSignature}>
                                            <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-send" /></svg>
                                            Send for Signature
                                        </button>
                                    </div>
                                    <div className="sig-section">
                                        <div className="sig-section-title">Collect deposit</div>
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
                                        <div className="pay-method-row">
                                            <label><input type="radio" name="payMethod" defaultChecked /> <svg className="icon icon-sm"><use href="#i-card" /></svg> Stripe</label>
                                            <label><input type="radio" name="payMethod" /> <svg className="icon icon-sm"><use href="#i-card" /></svg> QuickBooks</label>
                                            <label><input type="radio" name="payMethod" /> <svg className="icon icon-sm"><use href="#i-card" /></svg> GoHighLevel</label>
                                        </div>
                                        <button className="sig-action" style={{ background: "#10b981" }} onClick={generateInvoice}>
                                            <svg className="icon icon-sm" style={{ verticalAlign: "middle" }}><use href="#i-send" /></svg>
                                            Send Invoice
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </aside>
                    </div>
                )}
            </main>

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
                                    ["i-send", "Email to client", "Send PDF with portal link", sendEstimate],
                                    ["i-download", "Download PDF", "Save locally", downloadPDF],
                                    ["i-cloud", "Save to client portal", "Client sees it instantly", saveToPortal],
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
                                                    window.location.href = `/dashboard/estimation?estimate_id=${e.id}`;
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
                <div className="loading-overlay active">
                    <div className="loading-content">
                        <div className="loader"></div>
                        <div className="loading-text">{loading.text}</div>
                        <div className="loading-sub">{loading.sub}</div>
                    </div>
                </div>
            )}

            {/* ============ TOASTS ============ */}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <svg className="icon icon-sm"><use href={`#${ICON_MAP[t.type] || "i-check"}`} /></svg>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>
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
