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

export const CLIENT_STATES = [
    ["TX", "Texas"], ["OK", "Oklahoma"], ["LA", "Louisiana"], ["AR", "Arkansas"],
    ["FL", "Florida"], ["CO", "Colorado"], ["CA", "California"], ["AZ", "Arizona"],
    ["GA", "Georgia"], ["NC", "North Carolina"],
];

export const CLIENT_INSURANCE = [
    ["state-farm", "State Farm"], ["allstate", "Allstate"], ["farmers", "Farmers"],
    ["liberty", "Liberty Mutual"], ["usaa", "USAA"], ["other", "Other"],
];

export const CLIENT_CLAIM_STATUSES = [
    ["1", "1. Need Claim #"], ["2", "2. Scheduled Inspection"], ["3", "3. In Progress"],
    ["4", "4. Partial Approval"], ["5", "5. Supplementing"], ["6", "6. Final Check Processing"],
    ["7", "7. Completed"], ["8", "8. Declined"], ["9", "9. Cold Claims"],
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

    if (!d.insurance_company) errors.insurance_company = "Insurance company is required";
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
    insurance_company: form.insurance_company,
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
