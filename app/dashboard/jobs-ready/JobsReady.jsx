'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import './jobs-ready.css';

// ─── Static seed data (replace with backend fetch later) ──────────────
const JOBS = [
    {
        id: 'JOB-2024-058',
        clientName: 'Henderson Property',
        address: '421 Pine Ridge Rd, Akron, OH',
        fromLead: true,
        mode: 'insurance',
        source: 'google-ad',
        sourceLabel: 'Google Ads',
        leadTemp: 'HOT lead',
        carrier: 'State Farm',
        policyNumber: 'POL-7728492',
        dateOfLoss: 'May 8, 2026',
        estValue: '$14,500',
        checklist: [
            { label: 'Contract signed', done: true },
            { label: 'Letter of Representation', done: true },
            { label: 'Property inspection complete', done: true },
            { label: 'Insurance info captured', done: true },
            { label: 'Initial scope drafted', done: true },
        ],
        owner: 'Sarah',
        timeInStage: '2 days in stage',
    },
    {
        id: 'JOB-2024-057',
        clientName: 'Patricia Martinez',
        address: '3204 Sunset Blvd, Akron, OH',
        mode: 'insurance',
        source: 'referral',
        sourceLabel: 'Referral',
        leadTemp: 'Ref: john-smith',
        carrier: 'Allstate',
        policyNumber: 'POL-3328104',
        dateOfLoss: 'May 5, 2026',
        estValue: '$11,200',
        checklist: [
            { label: 'Contract signed', done: true },
            { label: 'Letter of Representation', done: true },
            { label: 'Property inspection complete', done: true },
            { label: 'Insurance info captured', done: true },
            { label: 'Initial scope drafted', done: true },
        ],
        owner: 'Mike',
        timeInStage: '1 day in stage',
    },
    {
        id: 'JOB-2024-056',
        clientName: 'Robert Chen',
        address: '1567 Birch Ln, Canton, OH',
        mode: 'insurance',
        source: 'gmb',
        sourceLabel: 'Google My Business',
        leadTemp: 'HOT lead',
        carrier: 'Liberty Mutual',
        policyNumber: { value: 'Missing', missing: true },
        dateOfLoss: 'May 6, 2026',
        estValue: '$8,800',
        checklist: [
            { label: 'Contract signed', done: true },
            { label: 'Letter of Representation', done: true },
            { label: 'Property inspection complete', done: true },
            { label: 'Insurance info captured', done: false },
            { label: 'Initial scope drafted', done: false },
        ],
        owner: 'Sarah',
        timeInStage: '4 days in stage',
    },
    {
        id: 'JOB-2024-055',
        clientName: 'Tom Wilson',
        address: '221 Aspen Ct, Wooster, OH',
        mode: 'retail',
        modeLabel: 'Retail / Cash',
        source: 'organic',
        sourceLabel: 'Organic Search',
        leadTemp: 'No insurance',
        // Retail-specific fields
        retail: {
            jobType: 'Full Replacement',
            material: 'Architectural Shingle',
            sqFootage: '2,400 sf',
        },
        estValue: '$18,400',
        checklistTitle: 'Pre-Job Checklist (Retail)',
        checklist: [
            { label: 'Contract signed', done: true },
            { label: 'Property measurement complete', done: true },
            { label: 'Final estimate approved', done: true },
            { label: 'Deposit received', done: false },
        ],
        owner: 'Lisa',
        timeInStage: '5 days in stage',
        convertLabel: 'Schedule Install',
    },
    {
        id: 'JOB-2024-054',
        clientName: 'Williams Family',
        address: '812 Sycamore Dr, Wooster, OH',
        mode: 'insurance',
        source: 'facebook-ad',
        sourceLabel: 'Facebook Ads',
        leadTemp: 'WARM lead',
        carrier: 'USAA',
        policyNumber: 'POL-9981023',
        dateOfLoss: { value: 'Missing', missing: true },
        estValue: '$16,200',
        checklist: [
            { label: 'Contract signed', done: true },
            { label: 'Letter of Representation', done: false },
            { label: 'Property inspection complete', done: false },
            { label: 'Insurance info captured', done: true },
            { label: 'Initial scope drafted', done: false },
        ],
        owner: 'Mike',
        timeInStage: '6 days in stage',
    },
];

const FILTERS = ['All', 'Ready to Convert', 'Insurance Jobs', 'Retail Jobs', 'Missing Info'];

export default function JobsReady() {
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');

    const filteredJobs = JOBS.filter((job) => {
        // search
        if (search) {
            const q = search.toLowerCase();
            const haystack = `${job.clientName} ${job.address} ${job.id}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        // pill filter
        if (filter === 'All') return true;
        const ready = job.checklist.every((c) => c.done);
        if (filter === 'Ready to Convert') return ready;
        if (filter === 'Insurance Jobs') return job.mode === 'insurance';
        if (filter === 'Retail Jobs') return job.mode === 'retail';
        if (filter === 'Missing Info') {
            const anyMissing = !ready
                || (job.policyNumber && typeof job.policyNumber === 'object' && job.policyNumber.missing)
                || (job.dateOfLoss && typeof job.dateOfLoss === 'object' && job.dateOfLoss.missing);
            return anyMissing;
        }
        return true;
    });

    return (
        <div className="jobs-ready-page">
            {/* Page header */}
            <div className="page-header">
                <div>
                    <div className="page-title">Jobs Ready</div>
                    <div className="page-subtitle">
                        Qualified jobs being prepared to convert into active claims
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-secondary">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export
                    </button>
                    <button className="btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Job
                    </button>
                </div>
            </div>

            <div className="content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Jobs in Staging</div>
                        <div className="stat-value">{JOBS.length}</div>
                        <div className="stat-meta">
                            {JOBS.filter((j) => j.checklist.every((c) => c.done)).length} ready to convert
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Pipeline Value</div>
                        <div className="stat-value">$74.2K</div>
                        <div className="stat-meta">Across all staged jobs</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Time in Stage</div>
                        <div className="stat-value">3.2 days</div>
                        <div className="stat-meta">Lead → Active Claim</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Conversion Rate</div>
                        <div className="stat-value">87%</div>
                        <div className="stat-meta">Job → Active Claim</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="toolbar">
                    <div className="toolbar-left">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search jobs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {FILTERS.map((f) => (
                            <span
                                key={f}
                                className={`filter-pill ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Jobs Grid */}
                <div className="jobs-grid" style={{ marginTop: '1rem' }}>
                    {filteredJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                    {filteredJobs.length === 0 && (
                        <div style={{
                            gridColumn: '1 / -1',
                            background: 'white',
                            borderRadius: 12,
                            padding: '3rem',
                            textAlign: 'center',
                            color: '#6b7280',
                            border: '1px solid #e5e7eb',
                        }}>
                            No jobs match the current filter.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const JobCard = ({ job }) => {
    const totalChecks = job.checklist.length;
    const doneChecks = job.checklist.filter((c) => c.done).length;
    const progressPct = totalChecks ? Math.round((doneChecks / totalChecks) * 100) : 0;
    const ready = doneChecks === totalChecks;
    const modeLabel = job.modeLabel ?? (job.mode === 'insurance' ? 'Insurance' : 'Retail / Cash');
    const checklistTitle = job.checklistTitle ?? 'Pre-Claim Checklist';
    const convertLabel = job.convertLabel ?? 'Convert to Claim →';

    return (
        <div className="job-card">
            <div className="job-card-header">
                <div className="job-client-info">
                    <div className="job-client-name">{job.clientName}</div>
                    <div className="job-address">{job.address}</div>
                    <div className="job-id" style={{ marginTop: '0.35rem' }}>
                        {job.id}
                        {job.fromLead && ' · From Lead'}
                    </div>
                </div>
                <span className={`job-mode ${job.mode}`}>{modeLabel}</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <span className={`source-badge ${job.source}`}>{job.sourceLabel}</span>
                {job.leadTemp && (
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', alignSelf: 'center' }}>
                        {job.leadTemp}
                    </span>
                )}
            </div>

            {job.mode === 'insurance' ? (
                <div className="job-details">
                    <Detail label="Carrier" value={job.carrier} />
                    <Detail label="Policy #" value={job.policyNumber} />
                    <Detail label="Date of Loss" value={job.dateOfLoss} />
                    <Detail label="Est. Value" value={job.estValue} />
                </div>
            ) : (
                <div className="job-details">
                    <Detail label="Job Type" value={job.retail?.jobType} />
                    <Detail label="Material" value={job.retail?.material} />
                    <Detail label="Sq. Footage" value={job.retail?.sqFootage} />
                    <Detail label="Est. Value" value={job.estValue} />
                </div>
            )}

            <div className="job-checklist">
                <div className="job-checklist-title">{checklistTitle}</div>
                {job.checklist.map((c, idx) => (
                    <div key={idx} className={`job-checklist-item ${c.done ? 'done' : ''}`}>
                        <span className={`check-icon ${c.done ? 'done' : 'pending'}`}>
                            {c.done ? '✓' : '○'}
                        </span>
                        <span>{c.label}</span>
                    </div>
                ))}
            </div>
            <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="progress-label">
                <span>{doneChecks} of {totalChecks} complete</span>
                {ready ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>Ready</span>
                ) : (
                    <span>{progressPct}%</span>
                )}
            </div>

            <div className="job-footer">
                <div className="job-meta">{job.owner} · {job.timeInStage}</div>
                <div className="job-actions">
                    <button className="btn-secondary">View</button>
                    {ready ? (
                        <button className="btn-success">{convertLabel}</button>
                    ) : (
                        <button
                            className="btn-secondary"
                            disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                        >
                            {job.mode === 'retail' ? 'Schedule Install' : 'Convert'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Detail = ({ label, value }) => {
    // value can be string OR { value, missing } (for highlighting missing fields in red)
    const isObj = value && typeof value === 'object';
    const display = isObj ? value.value : value;
    const missing = isObj && value.missing;
    return (
        <div className="job-detail-row">
            <div className="job-detail-label">{label}</div>
            <div className="job-detail-value" style={missing ? { color: '#dc2626' } : undefined}>
                {display ?? '—'}
            </div>
        </div>
    );
};
