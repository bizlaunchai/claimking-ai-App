'use client';

import React from 'react';

/**
 * Live, in-settings preview of a contractor-branded outbound email.
 *
 * This is a lightweight React mirror of the real email HTML built server-side
 * in `portal-link-sender.service.ts` (same layout: header logo/wordmark → title
 * → body → CTA button → footer, same slot→role mapping). It reads the 5 brand
 * slots straight from live state so the contractor sees the result before they
 * save. Structural neutrals (white card, hairline borders) match the emails and
 * are intentionally not part of the brand palette.
 *
 * `template` picks the copy/CTA for one of the 5 outbound emails.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

// Fall back to the ClaimKing default for any slot that isn't a valid hex yet
// (e.g. the contractor is mid-typing in the hex field) so the preview never
// renders a broken colour.
const DEFAULTS = { c1: '#1a1f3a', c2: '#FDB813', c3: '#374151', c4: '#6b7280', c5: '#f5f5f5' };
const safe = (brand, key) => (HEX.test(brand?.[key] || '') ? brand[key] : DEFAULTS[key]);

// One entry per REAL outbound homeowner email (copy mirrors the server-side
// builders in portal-link-sender.service.ts / portal-messages.service.ts), plus
// an `invoice` design mock (no invoice email exists in the backend yet — it will
// use this same shell when built). Every one of these is already brand-driven
// when actually sent; this list just lets the contractor preview each look.
const TEMPLATES = {
    estimate: {
        title: 'Your estimate is ready',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has finalized your estimate for Roof Replacement. Review the full scope and line items on your private portal.`,
        cta: 'View my estimate',
        fine: 'This link is private to you. Please don’t share it.',
    },
    deposit: {
        title: 'Deposit request',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has requested a deposit of $1,500.00 for Roof Replacement. You can pay securely online in under a minute.`,
        cta: 'Pay $1,500.00 deposit',
        fine: 'Payments are processed securely by Stripe. Link valid for 24 hours.',
    },
    invoice: {
        title: 'Your invoice is ready',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has issued an invoice of $6,200.00 for Roof Replacement. Review the charges and pay online whenever you’re ready.`,
        cta: 'View & pay invoice',
        fine: 'This invoice link is private to you.',
    },
    sign: {
        title: 'Review & sign your estimate',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has prepared an estimate for Roof Replacement. Review the line items and sign when you’re ready — it only takes a minute.`,
        cta: 'Review & sign estimate',
        fine: 'This signing link is private to you and expires soon.',
    },
    reminder: {
        title: 'A quick reminder',
        greeting: 'Hi Jordan,',
        body: (c) => `Just a friendly reminder from ${c} — your estimate for Roof Replacement is still waiting for your review. Open your portal any time to take a look.`,
        cta: 'Open my portal',
        fine: 'This link is private to you. Please don’t share it.',
    },
    invite: {
        title: 'Your claim portal is ready',
        greeting: 'Hi Jordan,',
        body: () => `Your claim portal is ready. Track every estimate, mockup, and status update we make on your claim — no login required.`,
        cta: 'Open my claim portal',
        fine: 'This link is private to you. Please don’t share it.',
    },
    mockup: {
        title: '3D mockup ready',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has prepared a 3D mockup of your property — see exactly how the new materials and colors will look before the work starts.`,
        cta: 'View my 3D mockup',
        fine: 'This link is private to you. Please don’t share it.',
    },
    policy: {
        title: 'Document analysis ready',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} has reviewed your insurance document and shared a plain-English breakdown on your private portal — key dates, what it means, and recommended next steps.`,
        cta: 'View my analysis',
        fine: 'This link is private to you. Please don’t share it.',
    },
    reply: {
        title: 'New message',
        greeting: 'Hi Jordan,',
        body: (c) => `${c} sent you a message via your claim portal. Open your portal to read it and reply — no login required.`,
        cta: 'Open your portal & reply',
        fine: 'Sent on behalf of your contractor.',
    },
};

export default function EmailBrandPreview({ brand, logoUrl, companyName, template }) {
    const c1 = safe(brand, 'c1');
    const c2 = safe(brand, 'c2');
    const c3 = safe(brand, 'c3');
    const c4 = safe(brand, 'c4');
    const c5 = safe(brand, 'c5');
    const t = TEMPLATES[template] || TEMPLATES.estimate;
    const name = companyName || 'Your Company';

    return (
        <div style={{ background: c5, padding: 24, borderRadius: 12, marginTop: 10 }}>
            <div style={{
                maxWidth: 520, margin: '0 auto', background: '#ffffff',
                borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb',
                fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
            }}>
                {/* Header — logo image, or company wordmark when no logo */}
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    {logoUrl ? (
                        <>
                            <img src={logoUrl} alt={name}
                                style={{ display: 'block', height: 44, width: 'auto', maxWidth: 200, objectFit: 'contain', borderRadius: 8 }} />
                            <div style={{ marginTop: 10, fontSize: 13, color: c4, fontWeight: 600 }}>{name}</div>
                        </>
                    ) : (
                        <div style={{ fontSize: 18, fontWeight: 800, color: c1 }}>{name}</div>
                    )}
                </div>

                {/* Body */}
                <div style={{ padding: 24 }}>
                    <h1 style={{ margin: '0 0 8px', fontSize: 20, color: c1 }}>{t.greeting || 'Hi Jordan,'}</h1>
                    <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6, color: c3 }}>
                        {t.body(name)}
                    </p>
                    <p style={{ textAlign: 'center', margin: '24px 0' }}>
                        <span style={{
                            display: 'inline-block', padding: '12px 22px', background: c2, color: c1,
                            textDecoration: 'none', fontWeight: 700, fontSize: 14, borderRadius: 8,
                        }}>{t.cta}</span>
                    </p>
                    <p style={{ margin: '16px 0 0', fontSize: 12, color: c4, lineHeight: 1.6 }}>
                        {t.fine}
                    </p>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', background: '#f9fafb', fontSize: 12, color: c4, borderTop: '1px solid #f3f4f6' }}>
                    Sent on behalf of {name}.
                </div>
            </div>
        </div>
    );
}
