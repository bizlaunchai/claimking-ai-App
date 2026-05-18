'use client';
import React from 'react';
import {
    CLIENT_STATES,
    CLIENT_INSURANCE,
    CLIENT_CLAIM_STATUSES,
    CLIENT_PROPERTY_TYPES,
} from '@/lib/clients/newClientForm';

/**
 * Single canonical "Add New Client" form used across:
 *   • dashboard/estimation
 *   • dashboard/measurement
 *   • dashboard/3d-mockup
 *   • dashboard/policy-analysis
 *
 * Pure controlled component — parent owns `value`, `fieldErrors`, `formError`,
 * `submitting`, and handles `onChange` (field, newValue) + `onSubmit`.
 *
 * Uses inline styles only (no global CSS dependency) so it drops into any
 * page regardless of its design system. ClaimKing navy + gold visual language.
 */
const inputBase = {
    padding: '0.625rem 0.875rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '0.875rem',
    color: '#1a1f3a',
    background: '#fff',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
};
const inputErr = { borderColor: '#dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.1)' };
const labelBase = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6, display: 'block' };
const labelReq = { ...labelBase };
const reqStar = { color: '#dc2626', marginLeft: 2 };
const errMsg = { color: '#dc2626', fontSize: 11, marginTop: 4, display: 'block' };
const sectionTitle = {
    fontSize: 12, fontWeight: 700, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    margin: '4px 0 12px', paddingBottom: 6,
    borderBottom: '1px solid #e5e7eb',
};
const grid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const errBanner = {
    background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626',
    color: '#7f1d1d', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginTop: 14,
};

const Field = ({ label, required, error, children, fullWidth }) => (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
        <label style={required ? labelReq : labelBase}>
            {label}{required && <span style={reqStar}>*</span>}
        </label>
        {children}
        {error && <span style={errMsg}>{error}</span>}
    </div>
);

const NewClientForm = ({
    value,
    fieldErrors = {},
    formError = null,
    submitting = false,
    onChange,
    onSubmit,
    onCancel,
    submitLabel = 'Save Client & Continue',
}) => {
    const styleFor = (k) => (fieldErrors[k] ? { ...inputBase, ...inputErr } : inputBase);
    const set = (k) => (e) => onChange(k, e.target.value);

    return (
        <div>
            {/* ── Client Information ───────────────────────────────────── */}
            <h4 style={sectionTitle}>Client Information</h4>
            <div style={grid}>
                <Field label="First Name" required error={fieldErrors.first_name}>
                    <input type="text" placeholder="John" style={styleFor('first_name')}
                        value={value.first_name} onChange={set('first_name')} />
                </Field>
                <Field label="Last Name" required error={fieldErrors.last_name}>
                    <input type="text" placeholder="Smith" style={styleFor('last_name')}
                        value={value.last_name} onChange={set('last_name')} />
                </Field>
                <Field label="Phone Number" required error={fieldErrors.phone}>
                    <input type="tel" placeholder="(555) 123-4567" style={styleFor('phone')}
                        value={value.phone} onChange={set('phone')} />
                </Field>
                <Field label="Email Address" required error={fieldErrors.email}>
                    <input type="email" placeholder="john.smith@email.com" style={styleFor('email')}
                        value={value.email} onChange={set('email')} />
                </Field>
            </div>

            {/* ── Property Information ─────────────────────────────────── */}
            <h4 style={{ ...sectionTitle, marginTop: 20 }}>Property Information</h4>
            <div style={grid}>
                <Field label="Property Address" required error={fieldErrors.address} fullWidth>
                    <input type="text" placeholder="123 Main Street" style={styleFor('address')}
                        value={value.address} onChange={set('address')} />
                </Field>
                <Field label="City" required error={fieldErrors.city}>
                    <input type="text" placeholder="Dallas" style={styleFor('city')}
                        value={value.city} onChange={set('city')} />
                </Field>
                <Field label="State" required error={fieldErrors.state}>
                    <select style={styleFor('state')} value={value.state} onChange={set('state')}>
                        <option value="">Select State</option>
                        {CLIENT_STATES.map(([code, label]) => (
                            <option key={code} value={code}>{label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="ZIP Code" required error={fieldErrors.zip_code}>
                    <input type="text" placeholder="75201" style={styleFor('zip_code')}
                        value={value.zip_code} onChange={set('zip_code')} />
                </Field>
                <Field label="Property Type">
                    <select style={inputBase} value={value.property_type} onChange={set('property_type')}>
                        {CLIENT_PROPERTY_TYPES.map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                        ))}
                    </select>
                </Field>
            </div>

            {/* ── Insurance Information ────────────────────────────────── */}
            <h4 style={{ ...sectionTitle, marginTop: 20 }}>Insurance Information</h4>
            <div style={grid}>
                <Field label="Insurance Company" required error={fieldErrors.insurance_company}>
                    <select style={styleFor('insurance_company')}
                        value={value.insurance_company} onChange={set('insurance_company')}>
                        <option value="">Select Insurance</option>
                        {CLIENT_INSURANCE.map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Policy Number">
                    <input type="text" placeholder="POL-123456" style={inputBase}
                        value={value.policy_number} onChange={set('policy_number')} />
                </Field>
                <Field label="Claim Number">
                    <input type="text" placeholder="CLM-2024-0001" style={inputBase}
                        value={value.claim_number} onChange={set('claim_number')} />
                </Field>
                <Field label="Claim Status" required error={fieldErrors.claim_status}>
                    <select style={styleFor('claim_status')}
                        value={value.claim_status} onChange={set('claim_status')}>
                        <option value="">Select Status</option>
                        {CLIENT_CLAIM_STATUSES.map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Claim Value ($)">
                    <input type="number" placeholder="50000" min="0" style={inputBase}
                        value={value.claim_value} onChange={set('claim_value')} />
                </Field>
                <Field label="Notes" fullWidth>
                    <textarea rows={3} placeholder="Add any additional notes about this client..."
                        style={{ ...inputBase, resize: 'vertical', minHeight: 80 }}
                        value={value.notes} onChange={set('notes')} />
                </Field>
            </div>

            {formError && <div role="alert" style={errBanner}>{formError}</div>}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={submitting}
                        style={{
                            padding: '0.625rem 1rem', background: '#fff', color: '#1a1f3a',
                            border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13,
                            fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1,
                        }}>
                        Cancel
                    </button>
                )}
                <button type="button" onClick={onSubmit} disabled={submitting}
                    style={{
                        padding: '0.625rem 1.25rem',
                        background: 'linear-gradient(135deg, #FDB813, #d4a000)',
                        color: '#1a1f3a', border: 0, borderRadius: 6, fontSize: 13,
                        fontWeight: 700, cursor: submitting ? 'wait' : 'pointer',
                        boxShadow: '0 2px 8px rgba(253,184,19,0.3)',
                        opacity: submitting ? 0.6 : 1,
                    }}>
                    {submitting ? 'Saving…' : submitLabel}
                </button>
            </div>
        </div>
    );
};

export default NewClientForm;
