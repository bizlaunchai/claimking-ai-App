'use client';
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { createClient } from '@/lib/supabase/client';
import './team.css';

// Map a role slug to the badge label rendered in the table.
const ROLE_LABEL = {
    admin: 'Admin',
    estimator: 'Estimator',
    field: 'Field Worker',
    office: 'Office Staff',
    client: 'Client',
};

const initialsFor = (m) => {
    const a = (m.first_name || m.full_name?.split(' ')[0] || m.email || '?')[0];
    const b = (m.last_name || m.full_name?.split(' ')[1] || '')[0];
    return ((a || '') + (b || '')).toUpperCase() || '?';
};

const displayName = (m) =>
    m.full_name ||
    [m.first_name, m.last_name].filter(Boolean).join(' ') ||
    m.email ||
    '(unnamed)';

const ACTION_LABEL = {
    invited: 'Sent invite',
    resent_invite: 'Resent invite',
    cancelled_invite: 'Cancelled invite',
    accepted_invite: 'Accepted invite',
    role_changed: 'Changed role',
    suspended: 'Suspended user',
    reactivated: 'Reactivated user',
    removed: 'Removed user',
    role_perms_updated: 'Updated role permissions',
    user_perms_updated: 'Updated user permissions',
};
const prettyAction = (a) => ACTION_LABEL[a] ?? a;

const timeAgo = (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
    return new Date(iso).toLocaleDateString();
};

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin', desc: 'Full access to all features, billing, and team management.' },
    { value: 'estimator', label: 'Estimator', desc: 'Create/edit estimates, supplements, run AI tools.' },
    { value: 'field', label: 'Field Worker', desc: 'Mobile-first. Upload photos, log inspections on assigned claims.' },
    { value: 'office', label: 'Office Staff', desc: 'Manage claims, communications, scheduling. No financial access.' },
    { value: 'client', label: 'Client (Read-only)', desc: 'Homeowner login. Sees only their own claims.' },
];

// Permission catalog — keys mirror what the backend permission middleware checks.
// Groups are fine-grained (one feature area each) so admins can bulk-toggle
// access to just the surface they care about (e.g. "Client Portal" only).
const PERMISSION_CATALOG = [
    { group: 'Dashboard', items: [
        { key: 'view_dashboard', label: 'View Overview / Dashboard' },
    ]},

    // ── Pipeline (lead → job → claim) ─────────────────────────────────
    { group: 'New Leads', items: [
        { key: 'view_leads', label: 'View New Leads' },
        { key: 'convert_lead', label: 'Convert Lead to Job' },
    ]},
    { group: 'Jobs Ready', items: [
        { key: 'view_jobs', label: 'View Jobs Ready' },
        { key: 'convert_job', label: 'Convert Job to Claim' },
    ]},
    { group: 'Active Claims', items: [
        { key: 'view_claims', label: 'View Active Claims' },
        { key: 'create_claim', label: 'Create Active Claim' },
        { key: 'edit_claim', label: 'Edit Active Claim' },
        { key: 'delete_claim', label: 'Delete / Archive Claim' },
        { key: 'move_claim_stage', label: 'Move Claim Between Stages' },
    ]},
    { group: 'Supplements', items: [
        { key: 'create_supplement', label: 'Create Supplements' },
        { key: 'send_supplement', label: 'Send Supplement to Adjuster' },
    ]},
    { group: 'Client Portal', items: [
        { key: 'manage_portal_links', label: 'Manage Client Portal Links' },
        { key: 'revoke_portal_access', label: 'Revoke Portal Access' },
    ]},

    // ── AI Tools ──────────────────────────────────────────────────────
    { group: 'Measurement Reports', items: [
        { key: 'use_measurements', label: 'Use Measurement Reports' },
    ]},
    { group: 'Estimation', items: [
        { key: 'generate_estimates', label: 'Generate Estimates' },
        { key: 'edit_estimates', label: 'Edit / Approve Estimates' },
    ]},
    { group: '3D Mockups', items: [
        { key: 'generate_mockups', label: 'Generate 3D Mockups' },
    ]},
    { group: 'Policy Analysis', items: [
        { key: 'run_policy_analysis', label: 'Run Policy Analysis' },
    ]},
    { group: 'Document Generator', items: [
        { key: 'use_doc_generator', label: 'Use Document Generator (SOP)' },
    ]},
    { group: 'Email Assistant', items: [
        { key: 'use_email_assistant', label: 'Use Email Assistant (AI replies)' },
    ]},
    { group: 'AI Call Center', items: [
        { key: 'use_call_center', label: 'Use AI Call Center (PRO)' },
        { key: 'configure_call_center', label: 'Configure AI Call Center' },
    ]},
    { group: 'Storm Tracking', items: [
        { key: 'view_storm_tracking', label: 'View Storm Tracking (LIVE)' },
        { key: 'configure_storm_zones', label: 'Configure Storm Alert Zones' },
    ]},

    // ── Integrations ──────────────────────────────────────────────────
    { group: 'CRM Sync', items: [
        { key: 'view_crm_sync', label: 'View CRM Sync Status' },
        { key: 'manage_crm', label: 'Connect / Disconnect CRMs' },
        { key: 'configure_crm_mapping', label: 'Configure CRM Field Mapping' },
    ]},
    { group: 'Email & SMS', items: [
        { key: 'view_email_sms', label: 'View Email & SMS Activity' },
        { key: 'send_email', label: 'Send Emails (Resend)' },
        { key: 'send_sms', label: 'Send SMS (Twilio)' },
        { key: 'connect_email_oauth', label: 'Connect Email Accounts (OAuth)' },
        { key: 'provision_twilio', label: 'Provision Twilio Numbers' },
        { key: 'configure_campaigns', label: 'Configure Email Campaigns' },
    ]},
    { group: 'Google My Business', items: [
        { key: 'view_gmb', label: 'View Google My Business' },
        { key: 'reply_gmb', label: 'Reply to GMB Reviews' },
        { key: 'post_gmb', label: 'Post to GMB' },
        { key: 'configure_gmb_auto', label: 'Configure GMB Auto-Posting' },
    ]},
    { group: 'Social Media', items: [
        { key: 'manage_social', label: 'Manage Social Media' },
    ]},
    { group: 'API Settings', items: [
        { key: 'manage_api_settings', label: 'View / Edit API Settings' },
    ]},

    // ── Reports ───────────────────────────────────────────────────────
    { group: 'Analytics', items: [
        { key: 'view_analytics', label: 'View Analytics Dashboard' },
        { key: 'export_analytics', label: 'Export Analytics Data' },
    ]},
    { group: 'Payments', items: [
        { key: 'view_payments', label: 'View Payments' },
        { key: 'record_payments', label: 'Record Payments' },
        { key: 'issue_refunds', label: 'Issue Refunds' },
    ]},

    // ── Billing ───────────────────────────────────────────────────────
    { group: 'Billing & Credits', items: [
        { key: 'view_billing', label: 'View Billing & Plans' },
        { key: 'change_plan', label: 'Change Subscription Plan' },
        { key: 'purchase_credits', label: 'Purchase Credits' },
    ]},

    // ── Settings & Team ───────────────────────────────────────────────
    { group: 'General Settings', items: [
        { key: 'view_settings', label: 'View General Settings' },
        { key: 'edit_company', label: 'Edit Company Settings' },
        { key: 'edit_own_account', label: 'Edit Own Account' },
    ]},
    { group: 'Team Management', items: [
        { key: 'view_team', label: 'View Team' },
        { key: 'invite_members', label: 'Invite Team Members' },
        { key: 'change_roles', label: 'Change Team Member Roles' },
        { key: 'suspend_members', label: 'Suspend / Remove Members' },
        { key: 'edit_permissions', label: 'Edit Role Permissions' },
    ]},

    // ── Referrals ─────────────────────────────────────────────────────
    { group: 'Referrals', items: [
        { key: 'view_referrals', label: 'View Referral Program' },
        { key: 'send_referrals', label: 'Send Referral Invites' },
        { key: 'withdraw_earnings', label: 'View / Withdraw Earnings' },
    ]},

    // ── Admin / Compliance ────────────────────────────────────────────
    { group: 'Audit & Compliance', items: [
        { key: 'insurance_monitoring', label: 'Insurance Monitoring Settings' },
        { key: 'view_audit_log', label: 'View Audit Log' },
        { key: 'export_audit_log', label: 'Export Audit Log' },
    ]},
];

// Default role permissions (matches SQL seed). Used for inheritance preview in the
// per-user permissions modal — backend stays the source of truth.
const ROLE_DEFAULT_PERMS = {
    admin: Object.fromEntries(PERMISSION_CATALOG.flatMap(g => g.items.map(i => [i.key, true]))),
    estimator: {
        view_dashboard: true, view_leads: true, convert_lead: true, view_jobs: true,
        convert_job: true, view_claims: true, create_claim: true, edit_claim: true,
        move_claim_stage: true, create_supplement: true, send_supplement: true,
        manage_portal_links: true, use_measurements: true, generate_estimates: true,
        edit_estimates: true, generate_mockups: true, run_policy_analysis: true,
        use_doc_generator: true, use_email_assistant: true, view_storm_tracking: true,
        view_crm_sync: true, view_email_sms: true, send_email: true, send_sms: true,
        configure_campaigns: true, view_gmb: true, reply_gmb: true, post_gmb: true,
        manage_social: true, view_analytics: true, export_analytics: true,
        view_payments: true, view_settings: true, edit_own_account: true,
        view_referrals: true, send_referrals: true,
    },
    field: {
        view_dashboard: true, view_jobs: 'assigned', view_claims: 'assigned',
        edit_claim: 'notes_only', use_measurements: true, generate_mockups: true,
        view_storm_tracking: true, view_settings: true, edit_own_account: true,
        view_referrals: true, send_referrals: true,
    },
    office: {
        view_dashboard: true, view_leads: true, convert_lead: true, view_jobs: true,
        convert_job: true, view_claims: true, create_claim: true, edit_claim: true,
        move_claim_stage: true, manage_portal_links: true, use_measurements: true,
        generate_estimates: true, generate_mockups: true, run_policy_analysis: true,
        use_doc_generator: true, use_email_assistant: true, use_call_center: true,
        view_storm_tracking: true, view_crm_sync: true, view_email_sms: true,
        send_email: true, send_sms: true, view_gmb: true, reply_gmb: true,
        post_gmb: true, manage_social: true, view_analytics: true,
        record_payments: true, view_settings: true, edit_own_account: true,
        view_referrals: true, send_referrals: true,
    },
    client: {
        view_dashboard: 'own', view_claims: 'own',
        view_settings: true, edit_own_account: true,
    },
};

const Team = () => {
    const [activeTab, setActiveTab] = useState('members');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [toast, setToast] = useState(null);

    // Live data from the backend
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [auditLog, setAuditLog] = useState([]);
    const [companyMeta, setCompanyMeta] = useState({ seatLimit: null, ownerId: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserId(user?.id ?? null);
            } catch { /* ignore */ }
        })();
    }, []);

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    // ── Data loaders ────────────────────────────────────────────────────────

    const loadMembersAndInvites = useCallback(async () => {
        try {
            const [m, i] = await Promise.all([
                axiosInstance.get('/team/members'),
                axiosInstance.get('/team/invitations'),
            ]);
            setMembers(m.data ?? []);
            setInvitations(i.data ?? []);
        } catch (e) {
            setError(e?.userMessage || 'Failed to load team');
        }
    }, []);

    const loadAuditLog = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/team/audit-log?limit=100');
            setAuditLog(data ?? []);
        } catch {
            // non-critical — leave empty
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadMembersAndInvites(), loadAuditLog()]);
            setLoading(false);
        })();
    }, [loadMembersAndInvites, loadAuditLog]);

    // ── Action handlers (called by child components) ────────────────────────

    const handleInviteSent = async (email) => {
        setInviteOpen(false);
        showToast(`Invitation sent to ${email}`);
        await loadMembersAndInvites();
        loadAuditLog();
    };

    const handleUserPermsSaved = (member) => {
        setEditingMember(null);
        showToast(`Permissions updated for ${displayName(member)}`);
        loadAuditLog();
    };

    const handleSuspend = async (memberId, email) => {
        if (!confirm(`Suspend ${email}? They will lose access immediately.`)) return;
        try {
            await axiosInstance.patch(`/team/members/${memberId}`, {
                status: 'suspended',
            });
            showToast(`${email} suspended`);
            loadMembersAndInvites();
            loadAuditLog();
        } catch {
            /* axios interceptor surfaces the toast */
        }
    };

    const handleReactivate = async (memberId, email) => {
        try {
            await axiosInstance.patch(`/team/members/${memberId}`, {
                status: 'active',
            });
            showToast(`${email} reactivated`);
            loadMembersAndInvites();
            loadAuditLog();
        } catch {}
    };

    const handleResendInvite = async (invitationId, email) => {
        try {
            await axiosInstance.post(`/team/invitations/${invitationId}/resend`);
            showToast(`Invitation re-sent to ${email}`);
            loadMembersAndInvites();
            loadAuditLog();
        } catch {}
    };

    const handleCancelInvite = async (invitationId, email) => {
        if (!confirm(`Cancel invitation for ${email}?`)) return;
        try {
            await axiosInstance.delete(`/team/invitations/${invitationId}`);
            showToast(`Invitation cancelled`);
            loadMembersAndInvites();
            loadAuditLog();
        } catch {}
    };

    // ── Derived data for the table + stats ──────────────────────────────────

    // Show invitations as "pending" rows in the Members table (matches the
    // original mockup) — so admins see a single unified list. The dedicated
    // Pending Invites tab still gives a separate view focused on invite ops.
    const memberRowsForTable = [
        ...members.map((m) => ({
            kind: 'member',
            id: m.id,
            email: m.email,
            name: displayName(m),
            initials: initialsFor(m),
            role: m.role,
            roleLabel: ROLE_LABEL[m.role] ?? m.role,
            status: m.status,
            lastLogin: m.last_login_at ? timeAgo(m.last_login_at) : 'Never',
            joined: m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—',
            isOwner: companyMeta.ownerId === m.id,
            raw: m,
        })),
        ...invitations.map((i) => ({
            kind: 'invitation',
            id: i.id,
            email: i.email,
            name: i.email,
            initials: (i.email[0] || '?').toUpperCase(),
            role: i.role,
            roleLabel: ROLE_LABEL[i.role] ?? i.role,
            status: 'pending',
            lastLogin: 'Never',
            joined: '—',
            isOwner: false,
            raw: i,
        })),
    ];

    const stats = {
        total: memberRowsForTable.length,
        active: members.filter((m) => m.status === 'active').length,
        pending: invitations.length,
        admins: members.filter((m) => m.role === 'admin').length,
    };

    return (
        <div className="team-page">
            <div className="page-header">
                <div>
                    <div className="page-title">Team Management</div>
                    <div className="page-subtitle">Invite teammates, assign roles, and control access</div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setInviteOpen(true)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Invite Member
                </button>
            </div>

            <div className="content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Members</div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-meta">
                            {stats.active} active, {stats.pending} pending
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Admins</div>
                        <div className="stat-value">{stats.admins}</div>
                        <div className="stat-meta">Full company access</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Invites</div>
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-meta">Awaiting acceptance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Available Seats</div>
                        <div className="stat-value">
                            {companyMeta.seatLimit
                                ? Math.max(0, companyMeta.seatLimit - stats.total)
                                : '∞'}
                        </div>
                        <div className="stat-meta">
                            {companyMeta.seatLimit
                                ? `${stats.total} of ${companyMeta.seatLimit} used`
                                : 'Unlimited on this plan'}
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{
                        padding: '0.875rem 1rem',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                    }}>
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
                    <button className={`tab ${activeTab === 'invites' ? 'active' : ''}`} onClick={() => setActiveTab('invites')}>Pending Invites</button>
                    <button className={`tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>Roles & Permissions</button>
                    <button className={`tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>Audit Log</button>
                </div>

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="table-card">
                        <div className="table-toolbar">
                            <input type="text" className="search-input" placeholder="Search members..." />
                            <div className="filter-row">
                                <select className="filter-select">
                                    <option>All Roles</option>
                                    <option>Admin</option>
                                    <option>Estimator</option>
                                    <option>Field Worker</option>
                                    <option>Office Staff</option>
                                </select>
                                <select className="filter-select">
                                    <option>All Status</option>
                                    <option>Active</option>
                                    <option>Pending</option>
                                    <option>Suspended</option>
                                </select>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Last Login</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</td></tr>
                                )}
                                {!loading && memberRowsForTable.length === 0 && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>
                                        No team members yet — invite your first teammate.
                                    </td></tr>
                                )}
                                {memberRowsForTable.map((m) => (
                                    <tr key={`${m.kind}-${m.id}`}>
                                        <td>
                                            <div className="member-cell">
                                                <div className="avatar">{m.initials}</div>
                                                <div className="member-info">
                                                    <span className="member-name">
                                                        {m.name}
                                                        {m.isOwner && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#FDB813', fontWeight: 700 }}>OWNER</span>}
                                                    </span>
                                                    <span className="member-email">{m.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${m.role}`}>{m.roleLabel}</span></td>
                                        <td><span className={`status-dot ${m.status}`}>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</span></td>
                                        <td>{m.lastLogin}</td>
                                        <td>{m.joined}</td>
                                        <td>
                                            <div className="action-cell">
                                                {m.kind === 'invitation' ? (
                                                    <>
                                                        <button className="btn-secondary" onClick={() => handleResendInvite(m.id, m.email)}>Resend Invite</button>
                                                        <button className="btn-danger" onClick={() => handleCancelInvite(m.id, m.email)}>Cancel</button>
                                                    </>
                                                ) : m.status === 'suspended' ? (
                                                    <>
                                                        {m.id !== currentUserId && (
                                                            <button className="btn-secondary" onClick={() => setEditingMember(m.raw)}>Edit</button>
                                                        )}
                                                        {m.id !== currentUserId && (
                                                            <button className="btn-secondary" onClick={() => handleReactivate(m.id, m.email)}>Reactivate</button>
                                                        )}
                                                        {m.id === currentUserId && (
                                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>You</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {m.id !== currentUserId && (
                                                            <button className="btn-secondary" onClick={() => setEditingMember(m.raw)}>Edit</button>
                                                        )}
                                                        {!m.isOwner && m.id !== currentUserId && (
                                                            <button className="btn-danger" onClick={() => handleSuspend(m.id, m.email)}>Suspend</button>
                                                        )}
                                                        {m.id === currentUserId && (
                                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>You</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pending Invites Tab */}
                {activeTab === 'invites' && (
                    <div className="table-card">
                        <div className="table-toolbar">
                            <input type="text" className="search-input" placeholder="Search invites..." />
                            <button className="btn-primary" onClick={() => setInviteOpen(true)}>Send New Invite</button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Invited By</th>
                                    <th>Sent</th>
                                    <th>Expires</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.length === 0 && !loading && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#6b7280' }}>
                                        No pending invitations.
                                    </td></tr>
                                )}
                                {invitations.map((i) => (
                                    <tr key={i.id}>
                                        <td>{i.email}</td>
                                        <td><span className={`badge ${i.role}`}>{ROLE_LABEL[i.role] ?? i.role}</span></td>
                                        <td>{i.invited_by_user_id ? '—' : '—'}</td>
                                        <td>{timeAgo(i.last_sent_at ?? i.created_at)}</td>
                                        <td>{
                                            i.expires_at
                                                ? `In ${Math.max(0, Math.ceil((new Date(i.expires_at) - Date.now()) / 86400000))} days`
                                                : '—'
                                        }</td>
                                        <td>
                                            <div className="action-cell">
                                                <button className="btn-secondary" onClick={() => handleResendInvite(i.id, i.email)}>Resend</button>
                                                <button className="btn-danger" onClick={() => handleCancelInvite(i.id, i.email)}>Cancel</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Roles & Permissions Tab */}
                {activeTab === 'roles' && (
                    <RolesPermissionsEditor onSave={() => showToast('Role permissions saved')} />
                )}

                {/* Audit Log Tab */}
                {activeTab === 'audit' && (
                    <div className="table-card">
                        <div className="table-toolbar">
                            <input type="text" className="search-input" placeholder="Search audit log..." />
                            <button className="btn-secondary">Export CSV</button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Who</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLog.length === 0 && (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>
                                        No audit entries yet.
                                    </td></tr>
                                )}
                                {auditLog.map((row) => (
                                    <tr key={row.id}>
                                        <td>{timeAgo(row.created_at)}</td>
                                        <td>{row.actor?.full_name || row.actor?.email || 'System'}</td>
                                        <td>{prettyAction(row.action)}</td>
                                        <td>{row.target_label || row.target_type || '—'}</td>
                                        <td>{row.ip_address || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {inviteOpen && (
                <InviteModal
                    onClose={() => setInviteOpen(false)}
                    onSent={handleInviteSent}
                />
            )}

            {editingMember && (
                <UserPermissionsModal
                    member={editingMember}
                    onClose={() => setEditingMember(null)}
                    onSaved={handleUserPermsSaved}
                />
            )}

            {toast && (
                <div className="toast success">
                    <span className="toast-icon">✓</span>
                    {toast}
                </div>
            )}
        </div>
    );
};

const InviteModal = ({ onClose, onSent }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('estimator');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const validate = () => {
        if (!email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email address';
        if (!role) return 'Please select a role';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }
        setError('');
        setSubmitting(true);

        try {
            // POST /team/invitations — backend calls create_team_invitation() RPC
            // (checks active subscription + seat limit), then sends Resend email.
            const { data } = await axiosInstance.post('/team/invitations', {
                email: email.trim(),
                role,
                personal_message: message.trim() || undefined,
            }, { suppressErrorToast: true });

            setSubmitting(false);

            // If the backend reported the row was created but the email
            // couldn't be sent (Resend down / no API key in dev), surface
            // that so the admin can share the link manually.
            if (data?.emailSent === false) {
                setError(`Invitation created but email delivery failed: ${data.emailReason ?? 'unknown'}. The invitee can still be reached via the audit log.`);
                // Still close after a beat so the table refreshes.
                setTimeout(() => onSent(email.trim()), 1500);
                return;
            }

            onSent(email.trim());
        } catch (err) {
            setSubmitting(false);
            const msg = err?.userMessage || err?.response?.data?.message || 'Failed to send invitation';
            setError(msg);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <div className="modal-title">Invite Team Member</div>
                        <div className="modal-subtitle">Send an invitation email to join your company workspace.</div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label" htmlFor="invite-email">
                                Email Address<span className="required">*</span>
                            </label>
                            <input
                                id="invite-email"
                                type="email"
                                className="form-input"
                                placeholder="teammate@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                            <div className="form-hint">They'll receive an invitation link valid for 7 days.</div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Role<span className="required">*</span>
                            </label>
                            <div className="role-picker">
                                {ROLE_OPTIONS.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`role-option ${role === opt.value ? 'selected' : ''}`}
                                        onClick={() => setRole(opt.value)}
                                    >
                                        <div className="role-option-name">{opt.label}</div>
                                        <div className="role-option-desc">{opt.desc}</div>
                                        <span className="role-option-check" aria-hidden="true">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="invite-message">Personal Message (optional)</label>
                            <textarea
                                id="invite-message"
                                className="form-textarea"
                                placeholder="Add a short note to include in the email..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={300}
                            />
                            <div className="form-hint">{message.length}/300 characters</div>
                        </div>

                        {error && <div className="form-error">{error}</div>}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =========================================================================
// Roles & Permissions Editor  (per-role defaults — click cells to toggle)
// =========================================================================
const RolesPermissionsEditor = ({ onSave }) => {
    const ROLES = ['admin', 'estimator', 'field', 'office', 'client'];
    const ROLE_LABELS = { admin: 'Admin', estimator: 'Estimator', field: 'Field', office: 'Office', client: 'Client' };

    // Live matrix loaded from /team/role-permissions (per-company stored JSONB).
    const [matrix, setMatrix] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axiosInstance.get('/team/role-permissions');
                const m = {};
                for (const r of ROLES) m[r] = { ...ROLE_DEFAULT_PERMS[r] };
                for (const row of data ?? []) {
                    m[row.role] = { ...(row.permissions ?? {}) };
                }
                setMatrix(m);
            } catch {
                // Fallback to in-code defaults so the editor is still usable.
                const m = {};
                for (const r of ROLES) m[r] = { ...ROLE_DEFAULT_PERMS[r] };
                setMatrix(m);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const togglePerm = (role, key) => {
        if (role === 'admin') return; // admin always full access
        setMatrix((prev) => {
            const next = { ...prev, [role]: { ...prev[role] } };
            if (next[role][key]) delete next[role][key];
            else next[role][key] = true;
            return next;
        });
        setDirty(true);
    };

    const handleSave = async () => {
        if (!matrix) return;
        setSaving(true);
        try {
            // Persist one role at a time — backend has PUT /team/role-permissions/:role
            // which updates JSONB + sets is_custom=true + writes team_audit_log.
            await Promise.all(
                ROLES.map((r) =>
                    axiosInstance.put(`/team/role-permissions/${r}`, {
                        permissions: matrix[r],
                    }),
                ),
            );
            setDirty(false);
            onSave?.();
        } catch {
            // axios interceptor surfaces a toast
        } finally {
            setSaving(false);
        }
    };

    const resetDefaults = () => {
        const m = {};
        for (const r of ROLES) m[r] = { ...ROLE_DEFAULT_PERMS[r] };
        setMatrix(m);
        setDirty(true);
    };

    const renderCell = (role, key) => {
        if (!matrix) return <td className="perm-cell perm-cross">…</td>;
        const v = matrix[role][key];
        if (v === undefined || v === false) {
            return <td className="perm-cell perm-cross" onClick={() => togglePerm(role, key)}>—</td>;
        }
        if (v === true) {
            return <td className="perm-cell perm-check" onClick={() => togglePerm(role, key)}>✓</td>;
        }
        return <td className="perm-cell" onClick={() => togglePerm(role, key)}><span className="perm-scope">{v}</span></td>;
    };

    if (loading || !matrix) {
        return (
            <div className="perms-card">
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    Loading role permissions…
                </div>
            </div>
        );
    }

    return (
        <div className="perms-card">
            <div className="perms-header">
                <div>
                    <div className="perms-title">Role Permissions</div>
                    <div className="perms-subtitle">Click any cell to toggle. Admin always has full access.</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {dirty && <span className="perms-dirty-badge">Unsaved changes</span>}
                    <button className="btn-secondary" onClick={resetDefaults}>Reset to Defaults</button>
                    <button className="btn-primary" onClick={handleSave} disabled={!dirty || saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
            <table className="perms-table">
                <thead>
                    <tr>
                        <th>Permission</th>
                        {ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {PERMISSION_CATALOG.map((group) => (
                        <React.Fragment key={group.group}>
                            <tr className="perms-section-row">
                                <td colSpan={ROLES.length + 1}>{group.group}</td>
                            </tr>
                            {group.items.map((item) => (
                                <tr key={item.key}>
                                    <td>{item.label}</td>
                                    {ROLES.map((r) => (
                                        <React.Fragment key={r}>{renderCell(r, item.key)}</React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// =========================================================================
// User Permissions Modal  (per-user override of role defaults)
// =========================================================================
// For each permission, the admin picks one of:
//   "role"  → use role default (no override)
//   "grant" → explicit allow (override role's false)
//   "deny"  → explicit deny  (override role's true)
const UserPermissionsModal = ({ member, onClose, onSaved }) => {
    // Normalize member shape — caller may pass either a raw profile row or
    // a memberRowsForTable entry (which keeps the raw profile under .raw).
    const memberId = member.id;
    const memberRole = member.role;
    const memberName = displayName(member);
    const memberRoleLabel = ROLE_LABEL[memberRole] ?? memberRole;

    // overrides shape: { permission_key: 'grant' | 'deny' }
    const [overrides, setOverrides] = useState({});
    // role defaults loaded from the backend (per-company stored matrix).
    const [roleDefaults, setRoleDefaults] = useState(
        ROLE_DEFAULT_PERMS[memberRole] || {},
    );
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    // Track which permission groups are collapsed. With many fine-grained
    // groups, default to collapsed so the admin scans an index first and
    // expands only the feature areas they care about.
    const [collapsed, setCollapsed] = useState(() =>
        Object.fromEntries(PERMISSION_CATALOG.map((g) => [g.group, true])),
    );

    const toggleGroup = (g) => setCollapsed((p) => ({ ...p, [g]: !p[g] }));
    const collapseAll = () =>
        setCollapsed(Object.fromEntries(PERMISSION_CATALOG.map((g) => [g.group, true])));
    const expandAll = () => setCollapsed({});

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    // Load existing per-user overrides + this company's role defaults so the
    // "Role default" pill reflects the company's actual configured matrix
    // (not the in-code seed) — admins might have edited the role-perm matrix.
    useEffect(() => {
        (async () => {
            try {
                const [permRes, rolePermsRes] = await Promise.all([
                    axiosInstance.get(`/team/users/${memberId}/permissions`),
                    axiosInstance.get('/team/role-permissions'),
                ]);
                // permRes.data = { user_id, role, override: { allow, deny, notes }, effective }
                const allow = permRes.data?.override?.allow ?? {};
                const deny = permRes.data?.override?.deny ?? {};
                const ovr = {};
                for (const k of Object.keys(allow)) ovr[k] = 'grant';
                for (const k of Object.keys(deny)) ovr[k] = 'deny';
                setOverrides(ovr);

                const rolesList = rolePermsRes.data ?? [];
                const myRoleRow = rolesList.find((r) => r.role === memberRole);
                if (myRoleRow?.permissions) {
                    setRoleDefaults(myRoleRow.permissions);
                }
            } catch {
                /* keep in-code defaults */
            } finally {
                setLoading(false);
            }
        })();
    }, [memberId, memberRole]);

    const setOverride = (key, value) => {
        setOverrides((prev) => {
            const next = { ...prev };
            if (value === 'role') delete next[key];
            else next[key] = value;
            return next;
        });
    };

    const effective = (key) => {
        if (overrides[key] === 'grant') return 'grant';
        if (overrides[key] === 'deny') return 'deny';
        return roleDefaults[key] ? 'grant' : 'deny';
    };

    // Bulk-apply Grant or Deny to every item in a group. Items whose target
    // value matches the role default get their override cleared (so we never
    // store redundant overrides).
    const applyGroup = (group, target) => {
        setOverrides((prev) => {
            const next = { ...prev };
            for (const item of group.items) {
                const roleVal = !!roleDefaults[item.key];
                const matchesDefault =
                    (target === 'grant' && roleVal) ||
                    (target === 'deny' && !roleVal);
                if (matchesDefault) delete next[item.key];
                else next[item.key] = target;
            }
            return next;
        });
    };

    // Stats for a group header: how many are effectively granted vs total,
    // plus how many have explicit overrides in this group.
    const groupStats = (group) => {
        let granted = 0;
        let overridden = 0;
        for (const item of group.items) {
            if (effective(item.key) === 'grant') granted++;
            if (overrides[item.key]) overridden++;
        }
        return { granted, overridden, total: group.items.length };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        // Split overrides → allow / deny JSONB shapes the backend expects.
        const allow = {};
        const deny = {};
        for (const [k, v] of Object.entries(overrides)) {
            if (v === 'grant') allow[k] = true;
            else if (v === 'deny') deny[k] = true;
        }

        try {
            await axiosInstance.put(`/team/users/${memberId}/permissions`, {
                allow,
                deny,
            }, { suppressErrorToast: true });
            setSubmitting(false);
            onSaved({ id: memberId, full_name: memberName, email: member.email });
        } catch (err) {
            setSubmitting(false);
            setError(err?.userMessage || err?.response?.data?.message || 'Failed to save');
        }
    };

    const overrideCount = Object.keys(overrides).length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <div className="modal-title">Edit Permissions — {memberName}</div>
                        <div className="modal-subtitle">
                            Role: <strong>{memberRoleLabel}</strong>. Override individual permissions below; unchanged ones inherit the role.
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {!loading && (
                        <div className="user-perm-toolbar">
                            <input
                                type="text"
                                className="user-perm-search"
                                placeholder="Search permissions…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className="user-perm-toolbar-actions">
                                <button type="button" className="btn-secondary btn-xs" onClick={expandAll}>Expand all</button>
                                <button type="button" className="btn-secondary btn-xs" onClick={collapseAll}>Collapse all</button>
                            </div>
                        </div>
                    )}
                    <div className="modal-body">
                        {loading && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                Loading permissions…
                            </div>
                        )}
                        {error && (
                            <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>
                        )}
                        {!loading && PERMISSION_CATALOG.map((group) => {
                            const q = search.trim().toLowerCase();
                            const visibleItems = q
                                ? group.items.filter(
                                      (i) =>
                                          i.label.toLowerCase().includes(q) ||
                                          i.key.toLowerCase().includes(q),
                                  )
                                : group.items;
                            if (visibleItems.length === 0) return null;
                            // If user is searching, force-expand so they see matches.
                            const isCollapsed = q ? false : !!collapsed[group.group];
                            const { granted, overridden, total } = groupStats(group);

                            return (
                                <div key={group.group} className="user-perm-group">
                                    <div
                                        className="user-perm-group-header"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => !q && toggleGroup(group.group)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Enter' || e.key === ' ') && !q) {
                                                e.preventDefault();
                                                toggleGroup(group.group);
                                            }
                                        }}
                                    >
                                        <span className={`user-perm-chevron ${isCollapsed ? 'collapsed' : ''}`} aria-hidden="true">▾</span>
                                        <span className="user-perm-group-title">{group.group}</span>
                                        <span className="user-perm-group-count">
                                            {granted}/{total} granted
                                            {overridden > 0 && (
                                                <span className="user-perm-group-overrides"> · {overridden} override{overridden > 1 ? 's' : ''}</span>
                                            )}
                                        </span>
                                        <span className="user-perm-group-bulk" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="btn-xs grant"
                                                onClick={() => applyGroup(group, 'grant')}
                                                title="Grant all in this group"
                                            >Grant all</button>
                                            <button
                                                type="button"
                                                className="btn-xs deny"
                                                onClick={() => applyGroup(group, 'deny')}
                                                title="Deny all in this group"
                                            >Deny all</button>
                                        </span>
                                    </div>

                                    {!isCollapsed && visibleItems.map((item) => {
                                        const roleVal = roleDefaults[item.key];
                                        const ovr = overrides[item.key];
                                        const eff = effective(item.key);
                                        const roleDefaultIsGrant = !!roleVal;
                                        const handleClick = (target) => {
                                            const matchesDefault =
                                                (target === 'grant' && roleDefaultIsGrant) ||
                                                (target === 'deny' && !roleDefaultIsGrant);
                                            setOverride(item.key, matchesDefault ? 'role' : target);
                                        };
                                        return (
                                            <div key={item.key} className="user-perm-row">
                                                <div className="user-perm-label">{item.label}</div>
                                                <span className={`perm-source ${ovr ? 'override' : ''}`}>
                                                    {ovr ? 'Override' : 'Role default'}
                                                </span>
                                                <div className="seg">
                                                    <button
                                                        type="button"
                                                        className={`seg-btn ${eff === 'grant' ? 'active grant' : ''}`}
                                                        onClick={() => handleClick('grant')}
                                                    >Grant</button>
                                                    <button
                                                        type="button"
                                                        className={`seg-btn ${eff === 'deny' ? 'active deny' : ''}`}
                                                        onClick={() => handleClick('deny')}
                                                    >Deny</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    <div className="modal-footer">
                        <div style={{ marginRight: 'auto', fontSize: '0.8rem', color: '#6b7280' }}>
                            {overrideCount === 0 ? 'No overrides — using role defaults' : `${overrideCount} override${overrideCount > 1 ? 's' : ''}`}
                        </div>
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Permissions'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default Team;
