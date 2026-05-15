'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import './new-leads.css';

// ─── Lead source breakdown (this month) ──────────────────────────────
const SOURCES = [
    { key: 'google-ad', label: 'Google Ads', icon: 'Ad', count: 58, color: '#4285F4', width: 100 },
    { key: 'organic', label: 'Organic Search', icon: 'SEO', count: 42, color: '#16a34a', width: 72 },
    { key: 'gmb', label: 'Google My Business', icon: 'GMB', count: 23, color: '#FDB813', width: 40 },
    { key: 'facebook-ad', label: 'Facebook Ads', icon: 'fb', count: 14, color: '#1877F2', width: 24 },
    { key: 'referral', label: 'Referrals', icon: '★', count: 7, color: '#8b5cf6', width: 12 },
    { key: 'direct', label: 'Direct', icon: '→', count: 3, color: '#6b7280', width: 5 },
];

// ─── Lead rows (seed data — replace with backend later) ──────────────
const LEADS = [
    {
        id: 1, channel: 'phone', score: 'hot', status: 'new', received: '12 min ago',
        name: 'Henderson Property', contact: 'Mike Henderson', phone: '(330) 555-2147',
        source: 'google-ad', sourceLabel: 'Google Ads',
        channelLabel: 'Phone Call', channelMeta: 'Campaign: Storm Damage 2025',
        trackingNumber: '(555) 123-0001', trackingMeta: 'Google Ads tracking #',
        callDuration: '3:42',
        summary: 'AI: Hail damage last weekend, State Farm, wants inspection ASAP.',
    },
    {
        id: 2, channel: 'form', score: 'warm', status: 'new', received: '45 min ago',
        name: 'Sarah Williams', contact: 'sarah.w@email.com', phone: '(330) 555-8821',
        source: 'organic', sourceLabel: 'Organic Search',
        channelLabel: 'Form Submission', formTag: 'free-inspection',
        formMessage: '"Just had hail storm, weekends only."',
    },
    {
        id: 3, channel: 'phone', score: 'hot', status: 'contacted', received: '2h ago',
        name: 'Robert Chen', contact: 'Property: Akron', phone: '(330) 555-9904',
        source: 'gmb', sourceLabel: 'Google My Business',
        channelLabel: 'Phone Call', channelMeta: 'Via GMB profile',
        trackingNumber: '(555) 123-0003', trackingMeta: 'GMB tracking #',
        callDuration: '5:18',
        summary: 'AI: Saw Google reviews. Wind damage. Allstate.',
        claimed: { by: 'Sarah K.', when: '1h 47min ago', response: '13m' },
    },
    {
        id: 4, channel: 'form', score: 'hot', status: 'contacted', received: '3h ago',
        name: 'Jennifer Lopez', contact: 'jen.lopez@email.com', phone: '(330) 555-3387',
        source: 'google-ad', sourceLabel: 'Google Ads',
        channelLabel: 'Form Submission', formTag: 'storm-damage',
        formMessage: '"Tree fell on garage roof. State Farm."',
        claimed: { by: 'Mike R.', when: '2h 38min ago', response: '22m' },
    },
    {
        id: 5, channel: 'phone', score: 'cold', status: 'contacted', received: '5h ago',
        name: 'David Brown', contact: 'Wooster', phone: '(330) 555-7732',
        source: 'facebook-ad', sourceLabel: 'Facebook Ads',
        channelLabel: 'Phone Call', channelMeta: 'Campaign: Spring Promo',
        trackingNumber: '(555) 123-0004', trackingMeta: 'Facebook tracking #',
        callDuration: '1:23',
        summary: 'AI: Price shopping only.',
        claimed: { by: 'Sarah K.', when: '4h 12min ago', response: '48m', slow: true },
        coldOnly: true, // only "Call" button instead of Schedule/Convert
    },
    {
        id: 6, channel: 'form', score: 'warm', status: 'qualified', received: 'Yesterday',
        name: 'Patricia Martinez', contact: 'pmartinez@email.com', phone: '(330) 555-4419',
        source: 'referral', sourceLabel: 'Referral',
        channelLabel: 'Form Submission', formTag: 'quote-request',
        channelMeta: 'Ref: john-smith',
        formMessage: '"John recommended you. Wind damage."',
        claimed: { by: 'Mike R.', when: '1d ago', response: '8m' },
    },
    {
        id: 7, channel: 'phone', score: 'warm', status: 'qualified', received: 'Yesterday',
        name: 'Tom Wilson', contact: 'Canton', phone: '(330) 555-1156',
        source: 'organic', sourceLabel: 'Organic Search',
        channelLabel: 'Phone Call', channelMeta: '"roof repair near me"',
        trackingNumber: '(555) 123-0002', trackingMeta: 'Organic tracking #',
        callDuration: '4:55',
        summary: 'AI: Cash job replacement.',
        claimed: { by: 'Sarah K.', when: '1d ago', response: '4m' },
    },
];

const REPS = [
    { initials: 'SK', name: 'Sarah K.', slug: 'sarah', avatarBg: '#FDB813', avatarColor: '#1a1f3a', active: true },
    { initials: 'MR', name: 'Mike R.', slug: 'mike', avatarBg: '#1a1f3a' },
    { initials: 'JB', name: 'James B.', slug: 'james', avatarBg: '#16a34a' },
    { initials: 'AK', name: 'Ann K.', slug: 'ann', avatarBg: '#8b5cf6' },
];

// Phone icon SVG (reused several places)
const PhoneIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);
const FormIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

export default function NewLeads() {
    const [channel, setChannel] = useState('all');         // all | phone | form
    const [pill, setPill] = useState('all');                // all | new | hot
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('All Sources');
    const [dateFilter, setDateFilter] = useState('Last 7 days');
    const [claimModal, setClaimModal] = useState(null);     // null | leadObj
    const [selectedRep, setSelectedRep] = useState('');
    const [claimError, setClaimError] = useState('');

    // Filter logic
    const filtered = useMemo(() => {
        return LEADS.filter((l) => {
            if (channel !== 'all' && l.channel !== channel) return false;
            if (pill === 'new' && l.status !== 'new') return false;
            if (pill === 'hot' && l.score !== 'hot') return false;
            if (sourceFilter !== 'All Sources') {
                const map = {
                    'Google Ads': 'google-ad', 'Organic': 'organic', 'GMB': 'gmb',
                    'Facebook Ads': 'facebook-ad', 'Referral': 'referral',
                };
                if (l.source !== map[sourceFilter]) return false;
            }
            if (search) {
                const q = search.toLowerCase();
                const hay = `${l.name} ${l.contact} ${l.phone}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [channel, pill, search, sourceFilter]);

    // Channel tab counts
    const counts = useMemo(() => ({
        all: LEADS.length,
        phone: LEADS.filter((l) => l.channel === 'phone').length,
        form: LEADS.filter((l) => l.channel === 'form').length,
    }), []);

    // Modal handlers
    const openClaim = (lead) => {
        setClaimModal(lead);
        setSelectedRep('');
        setClaimError('');
    };
    const closeClaim = () => setClaimModal(null);
    const confirmClaim = () => {
        if (!selectedRep) {
            setClaimError('Please select a rep before claiming.');
            return;
        }
        // TODO: POST /api/leads/:id/claim
        closeClaim();
        // Optimistic: would refetch / update local state
    };

    return (
        <div className="new-leads-page">
            {/* Page header */}
            <div className="page-header">
                <div>
                    <div className="page-title">New Leads</div>
                    <div className="page-subtitle">
                        All incoming leads from calls (via CTM) and form submissions
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-secondary">Export CSV</button>
                    <button className="btn-primary">+ Add Manual Lead</button>
                </div>
            </div>

            <div className="content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Leads Today</div>
                        <div className="stat-value">12</div>
                        <div className="stat-meta up">▲ 33% vs yesterday</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">This Month</div>
                        <div className="stat-value">147</div>
                        <div className="stat-meta up">▲ 18%</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Conversion Rate</div>
                        <div className="stat-value">31%</div>
                        <div className="stat-meta">Lead → Job</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Response</div>
                        <div className="stat-value">8m</div>
                        <div
                            className="stat-meta up"
                            title="Computed from claimed_at − created_at across all claimed leads in last 30 days"
                        >
                            Lead → Claimed (30d)
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Value</div>
                        <div className="stat-value">$12.4K</div>
                        <div className="stat-meta">Closed jobs</div>
                    </div>
                </div>

                {/* Source breakdown */}
                <div className="source-card">
                    <div className="source-card-title">Lead Sources (This Month)</div>
                    <div className="source-list">
                        {SOURCES.map((s) => (
                            <div className="source-item" key={s.key}>
                                <div className="source-name">
                                    <span className={`source-icon ${s.key}`}>{s.icon}</span>
                                    {s.label}
                                </div>
                                <div className="source-count">{s.count}</div>
                                <div className="source-bar">
                                    <div
                                        className="source-bar-fill"
                                        style={{ width: `${s.width}%`, background: s.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Channel tabs */}
                <div className="channel-tabs">
                    <button
                        className={`channel-tab ${channel === 'all' ? 'active' : ''}`}
                        onClick={() => setChannel('all')}
                    >
                        All Leads <span className="tab-count">{counts.all}</span>
                    </button>
                    <button
                        className={`channel-tab ${channel === 'phone' ? 'active' : ''}`}
                        onClick={() => setChannel('phone')}
                    >
                        <PhoneIcon /> Phone Calls <span className="tab-count">{counts.phone}</span>
                    </button>
                    <button
                        className={`channel-tab ${channel === 'form' ? 'active' : ''}`}
                        onClick={() => setChannel('form')}
                    >
                        <FormIcon /> Website Forms <span className="tab-count">{counts.form}</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="toolbar">
                    <div className="toolbar-left">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {['all', 'new', 'hot'].map((p) => (
                            <span
                                key={p}
                                className={`filter-pill ${pill === p ? 'active' : ''}`}
                                onClick={() => setPill(p)}
                            >
                                {p === 'all' ? 'All' : p === 'new' ? 'New (Unread)' : 'Hot Leads Only'}
                            </span>
                        ))}
                        <select
                            className="filter-select"
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                        >
                            <option>All Sources</option>
                            <option>Google Ads</option>
                            <option>Organic</option>
                            <option>GMB</option>
                            <option>Facebook Ads</option>
                            <option>Referral</option>
                        </select>
                        <select
                            className="filter-select"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option>Last 7 days</option>
                            <option>Last 30 days</option>
                            <option>This month</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="table-card">
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Lead</th>
                                    <th>Source</th>
                                    <th>Form / Channel</th>
                                    <th>Phone Number Called</th>
                                    <th>Recording / Notes</th>
                                    <th>Score</th>
                                    <th>Received</th>
                                    <th>Status / Claimed By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((l) => (
                                    <LeadRow key={l.id} lead={l} onClaim={() => openClaim(l)} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length === 0 && (
                        <div className="empty-state">No leads match the current filters.</div>
                    )}
                </div>

                {/* Scheduling section */}
                <SchedulingSection />
            </div>

            {/* Claim Lead Modal */}
            {claimModal && (
                <div className="modal-backdrop active" onClick={closeClaim}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Claim This Lead</div>
                            <button className="modal-close" onClick={closeClaim}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-lead-summary">
                                <div className="name">{claimModal.name}</div>
                                <div className="meta">Received {claimModal.received}</div>
                            </div>
                            <label htmlFor="claim-rep-select">Which sales rep is taking this lead?</label>
                            <select
                                id="claim-rep-select"
                                value={selectedRep}
                                onChange={(e) => setSelectedRep(e.target.value)}
                            >
                                <option value="">— Select a rep —</option>
                                {REPS.map((r) => (
                                    <option key={r.slug} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                            {claimError && (
                                <div style={{ color: '#b91c1c', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                                    {claimError}
                                </div>
                            )}
                            <div className="help">
                                Claiming captures the rep's name + timestamp. This is how the Avg Response Time stat is computed (Lead received → Claimed).
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeClaim}>Cancel</button>
                            <button className="btn-primary" onClick={confirmClaim}>Claim Lead</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ====================================================================
// LeadRow
// ====================================================================
const LeadRow = ({ lead, onClaim }) => {
    const scoreLabel = lead.score === 'hot' ? '🔥 HOT' : lead.score === 'warm' ? '☀ WARM' : '❄ COLD';
    const channelIcon = lead.channel === 'phone' ? <PhoneIcon /> : <FormIcon />;

    return (
        <tr className="lead-row">
            {/* Lead */}
            <td>
                <div className="lead-name">{lead.name}</div>
                <div className="lead-contact">{lead.contact}</div>
                <div className="lead-contact lead-phone">{lead.phone}</div>
            </td>

            {/* Source */}
            <td>
                <span className={`source-pill ${lead.source}`}>{lead.sourceLabel}</span>
            </td>

            {/* Form / Channel */}
            <td>
                <div className="channel-icon">{channelIcon}{lead.channelLabel}</div>
                {lead.formTag && (
                    <div style={{ marginTop: '0.25rem' }}>
                        <span className="form-tag">{lead.formTag}</span>
                    </div>
                )}
                {lead.channelMeta && (
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                        {lead.channelMeta}
                    </div>
                )}
            </td>

            {/* Phone Number Called */}
            <td>
                {lead.trackingNumber ? (
                    <>
                        <span className="lead-phone">{lead.trackingNumber}</span>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {lead.trackingMeta}
                        </div>
                    </>
                ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                )}
            </td>

            {/* Recording / Notes */}
            <td>
                {lead.callDuration ? (
                    <>
                        <div className="call-player">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            <span className="call-duration">{lead.callDuration}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.35rem', maxWidth: 240 }}>
                            {lead.summary}
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: '0.8rem', color: '#1a1f3a', fontWeight: 500 }}>
                            Form Message:
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem', maxWidth: 240 }}>
                            {lead.formMessage}
                        </div>
                    </>
                )}
            </td>

            {/* Score */}
            <td><span className={`lead-score ${lead.score}`}>{scoreLabel}</span></td>

            {/* Received */}
            <td style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                {lead.received}
            </td>

            {/* Status / Claimed By */}
            <td>
                {!lead.claimed ? (
                    <span className="lead-status new">New</span>
                ) : (
                    <>
                        <span className="claimed-pill">✓ Claimed</span>
                        <div className="claimed-meta">by <strong>{lead.claimed.by}</strong></div>
                        <div className="claimed-meta">{lead.claimed.when}</div>
                        <div className={`response-time-pill ${lead.claimed.slow ? 'slow' : ''}`}>
                            Response: {lead.claimed.response}
                        </div>
                    </>
                )}
            </td>

            {/* Actions */}
            <td>
                <div className="action-cell">
                    {!lead.claimed ? (
                        <button className="btn-claim" onClick={onClaim}>Claim Lead</button>
                    ) : lead.coldOnly ? (
                        <button className="btn-secondary">Call</button>
                    ) : (
                        <>
                            <button className="btn-claim">Schedule</button>
                            <button className="btn-success">Convert</button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ====================================================================
// Scheduling section
// ====================================================================
const SchedulingSection = () => {
    const [activeRep, setActiveRep] = useState('sarah');
    const activeRepObj = REPS.find((r) => r.slug === activeRep) ?? REPS[0];

    return (
        <div className="scheduling-section">
            <div className="scheduling-header">
                <div>
                    <h3>Scheduling — Book Inspections</h3>
                    <div className="meta">
                        Native ClaimKing calendar per sales rep. Public booking link can be embedded on your website.
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary">Manage Working Hours</button>
                    <button className="btn-primary">+ New Appointment</button>
                </div>
            </div>

            <div className="scheduling-grid">
                {/* Rep list */}
                <div className="rep-list">
                    <div className="rep-list-title">Active Sales Reps</div>
                    {REPS.map((r) => (
                        <div
                            key={r.slug}
                            className={`rep-item ${activeRep === r.slug ? 'active' : ''}`}
                            onClick={() => setActiveRep(r.slug)}
                        >
                            <div className="rep-avatar" style={{ background: r.avatarBg, color: r.avatarColor ?? 'white' }}>
                                {r.initials}
                            </div>
                            <div className="rep-info">
                                <div className="rep-name">{r.name}</div>
                                <div className="rep-status">claimking.ai/book/nathaniel/{r.slug}</div>
                            </div>
                            <div className="rep-dot"></div>
                        </div>
                    ))}
                </div>

                {/* Calendar */}
                <div>
                    <div className="calendar-view">
                        <div className="calendar-toolbar">
                            <div className="calendar-nav">
                                <button className="cal-nav-btn">‹</button>
                                <span className="cal-title">Mon May 12 — Fri May 16</span>
                                <button className="cal-nav-btn">›</button>
                                <button className="cal-nav-btn">Today</button>
                            </div>
                            <div className="cal-view-toggle">
                                <button className="cal-view-btn">Day</button>
                                <button className="cal-view-btn active">Week</button>
                                <button className="cal-view-btn">Month</button>
                            </div>
                        </div>

                        <div className="calendar-grid">
                            <div className="cal-cell header"></div>
                            <div className="cal-cell header">Mon 12</div>
                            <div className="cal-cell header">Tue 13</div>
                            <div className="cal-cell header">Wed 14</div>
                            <div className="cal-cell header">Thu 15</div>
                            <div className="cal-cell header">Fri 16</div>

                            <div className="cal-cell time-label">8 AM</div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"><span className="cal-event">Henderson — Inspection</span></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>

                            <div className="cal-cell time-label">10 AM</div>
                            <div className="cal-cell"><span className="cal-event">R. Chen — Inspection</span></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"><span className="cal-event busy">Office time</span></div>
                            <div className="cal-cell"><span className="cal-event tentative">Williams — Tentative</span></div>
                            <div className="cal-cell"></div>

                            <div className="cal-cell time-label">12 PM</div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"><span className="cal-event">Lopez — Inspection</span></div>

                            <div className="cal-cell time-label">2 PM</div>
                            <div className="cal-cell"><span className="cal-event">Wilson — Consult</span></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"><span className="cal-event">Martinez — Inspection</span></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>

                            <div className="cal-cell time-label">4 PM</div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"><span className="cal-event">Brown — Follow-up</span></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                            <div className="cal-cell"></div>
                        </div>
                    </div>

                    <div className="booking-link-card">
                        <div className="booking-link-card-title">
                            {activeRepObj.name}'s Public Booking Link
                        </div>
                        <div className="booking-link-row">
                            <div className="booking-link-url">
                                https://claimking.ai/book/nathaniel-roofing/{activeRepObj.slug}
                            </div>
                            <button className="booking-link-copy">Copy</button>
                            <button className="booking-link-copy">Embed on Website</button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.625rem' }}>
                            Embed code adds a "Book Inspection" widget to your website. Homeowners pick a slot, fill in their info, and the appointment lands in {activeRepObj.name}'s calendar automatically.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
