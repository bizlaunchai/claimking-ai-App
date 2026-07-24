// ============================================================================
// Shared client form constants + validation
//
// Single source of truth for the "Add New Client" form used in:
//   • dashboard/client-portal       (the canonical source)
//   • dashboard/estimation
//   • dashboard/measurement
//   • dashboard/3d-mockup
//   • dashboard/policy-analysis
//
// Keep this aligned with the backend `client_portals` schema + the public
// /client-portal POST endpoint.
// ============================================================================

export const NEW_CLIENT_BLANK = {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    property_type: "single-family",
    insurance_company: "",
    policy_number: "",
    claim_number: "",
    claim_status: "",
    claim_value: "",
    notes: "",
};

// CK-FIX Jul-22: full 50-state list + DC (was only 10 states — root cause of
// the "my state isn't in the dropdown" bug reported on every client form).
export const CLIENT_STATES = [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
    ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
    ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
    ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
    ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
    ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
    ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
    ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
    ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
    ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
    ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
    ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
    ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

// CK-FIX Jul-22: expanded carrier list. These are now TYPEAHEAD SUGGESTIONS
// behind a free-text input — any carrier name is accepted, and the field is
// no longer required. Legacy rows hold the slug (`state-farm`); new rows hold
// whatever the contractor typed. Use `carrierLabel()` when displaying.
export const CLIENT_INSURANCE = [
    ["state-farm", "State Farm"], ["allstate", "Allstate"], ["farmers", "Farmers"],
    ["liberty", "Liberty Mutual"], ["usaa", "USAA"], ["nationwide", "Nationwide"],
    ["progressive", "Progressive"], ["travelers", "Travelers"], ["american-family", "American Family"],
    ["erie", "Erie Insurance"], ["auto-owners", "Auto-Owners"], ["chubb", "Chubb"],
    ["safeco", "Safeco"], ["the-hartford", "The Hartford"], ["amica", "Amica"],
    ["cincinnati", "Cincinnati Insurance"], ["westfield", "Westfield"], ["grange", "Grange"],
    ["shelter", "Shelter Insurance"], ["american-modern", "American Modern"],
    ["foremost", "Foremost"], ["tower-hill", "Tower Hill"], ["universal-property", "Universal Property"],
    ["citizens-fl", "Citizens (FL)"], ["other", "Other"],
];

/**
 * Display helper for `insurance_company`.
 * Rows created before CK-FIX Jul-22 store a slug (`state-farm`); rows created
 * after store free text ("State Farm", "Some Regional Mutual"). Map the known
 * slugs back to their label, pass anything else through unchanged.
 */
export const carrierLabel = (value) => {
    if (!value) return "";
    const hit = CLIENT_INSURANCE.find(([slug]) => slug === value);
    return hit ? hit[1] : value;
};

// 12-stage pipeline — kept in sync with sql/30_client_portals.sql
// (CHECK (claim_status BETWEEN 1 AND 12)) and STATUS_MAP in
// app/dashboard/client-portal/ClientPortal.jsx. This list was stuck on the
// legacy 9-stage names, so a client created from Estimation / Measurement /
// Mockup landed on the WRONG stage (old "7. Completed" is really "7. Partial
// Approval" today).
export const CLIENT_CLAIM_STATUSES = [
    ["1", "1. Need Claim Number"], ["2", "2. Awaiting Initial Inspection"],
    ["3", "3. Scheduled Inspection"], ["4", "4. In Progress"],
    ["5", "5. Tile Sample Required"], ["6", "6. Reinspection Requested"],
    ["7", "7. Partial Approval"], ["8", "8. Supplementing"],
    ["9", "9. Final Check Processing"], ["10", "10. Completed"],
    ["11", "11. Declined"], ["12", "12. Cold Claims / Lost"],
];

export const CLIENT_PROPERTY_TYPES = [
    ["single-family", "Single Family Home"],
    ["multi-family", "Multi-Family"],
    ["commercial", "Commercial"],
    ["condo", "Condo/Townhouse"],
];

export const validateNewClient = (d) => {
    const errors = {};
    if (!d.first_name?.trim()) errors.first_name = "First name is required";
    else if (d.first_name.trim().length < 2) errors.first_name = "First name must be at least 2 characters";

    if (!d.last_name?.trim()) errors.last_name = "Last name is required";
    else if (d.last_name.trim().length < 2) errors.last_name = "Last name must be at least 2 characters";

    if (!d.phone?.trim()) errors.phone = "Phone number is required";
    else if (!/^\(\d{3}\)\s\d{3}-\d{4}$|^\d{10}$|^\+1\d{10}$/.test(d.phone.trim()))
        errors.phone = "Phone must be a valid US number e.g. (555) 123-4567";

    if (!d.email?.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
        errors.email = "Email must be a valid email address";

    if (!d.address?.trim()) errors.address = "Address is required";
    if (!d.city?.trim()) errors.city = "City is required";
    if (!d.state?.trim()) errors.state = "State is required";

    if (!d.zip_code?.trim()) errors.zip_code = "ZIP code is required";
    else if (!/^\d{5}(-\d{4})?$/.test(d.zip_code.trim()))
        errors.zip_code = "ZIP code must be valid (e.g. 75201)";

    // CK-FIX Jul-22: insurance company is optional now (free text, may be
    // unknown at intake — the carrier is often confirmed days after the claim).
    if (!d.claim_status) errors.claim_status = "Claim status is required";

    return errors;
};

/**
 * Shape the form state into the exact payload `POST /client-portal` expects.
 * Trims whitespace, normalises state to 2-char upper, coerces numeric fields.
 */
export const toClientCreatePayload = (form) => ({
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.toUpperCase().slice(0, 2),
    zip_code: form.zip_code.trim(),
    property_type: form.property_type || "single-family",
    // CK-FIX Jul-22: optional + free text — send undefined rather than ""
    // so the backend's @IsOptional() validators don't see an empty string.
    insurance_company: form.insurance_company?.trim() || undefined,
    policy_number: form.policy_number?.trim() || undefined,
    claim_number: form.claim_number?.trim() || undefined,
    claim_status: parseInt(form.claim_status, 10),
    claim_value: form.claim_value ? parseInt(form.claim_value, 10) : 0,
    notes: form.notes?.trim() || undefined,
});

/**
 * Map a backend `message` array (NestJS class-validator output) onto the
 * matching form fields so each error appears under the right input.
 */
/**
 * Map a raw `client_portals` row from the API to a lightweight display shape
 * used by every feature page (Estimation, Measurement, Mockup, Policy Analysis).
 * Keeps the original row attached as `_raw` so callers can read extra fields
 * (insurance_company, state, etc.) without a second fetch.
 */
export const toClientShape = (raw) => ({
    id: raw.id,
    name: raw.full_name || `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim() || "Unnamed",
    address: [raw.address, raw.city, raw.state, raw.zip_code].filter(Boolean).join(", "),
    claim: raw.claim_number || raw.claim || null,
    email: raw.email || null,
    phone: raw.phone || null,
    _raw: raw,
});

export const mapBackendErrors = (msg) => {
    if (!Array.isArray(msg)) return {};
    const mapped = {};
    msg.forEach((m) => {
        const field = Object.keys(NEW_CLIENT_BLANK).find((k) =>
            m.toLowerCase().includes(k.replace("_", " ")),
        );
        if (field) mapped[field] = m;
    });
    return mapped;
};
