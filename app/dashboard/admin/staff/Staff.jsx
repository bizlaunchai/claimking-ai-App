'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';

// Mirror of backend SuperadminService.STAFF_PERMISSION_KEYS with human labels.
const PERMISSION_CATALOG = [
    { key: 'manage_plans', label: 'Manage Plans', desc: 'Create, edit, activate, archive plans' },
    { key: 'manage_coupons', label: 'Manage Coupons', desc: 'Create discount codes + view redemptions' },
    { key: 'manage_feature_costs', label: 'Manage Feature Costs', desc: 'Edit credit cost per AI feature' },
    { key: 'manage_api_keys', label: 'Manage API Keys', desc: 'Configure global provider API keys (OpenAI, Gemini, etc.)' },
    { key: 'view_orders', label: 'View Orders', desc: 'See all subscriptions across the platform' },
    { key: 'view_audit_log', label: 'View Audit Log', desc: 'Read platform-level admin action history' },
    { key: 'manage_email_settings', label: 'Manage Email Settings', desc: 'Edit globally monitored insurance email domains' },
    { key: 'manage_companies', label: 'Manage Companies', desc: 'View all tenants, inspect team/billing/credits, suspend or unsuspend accounts' },
];

export default function Staff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState(null); // {id, email, permissions, notes}

    const load = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/admin/staff');
            setStaff(data ?? []);
        } catch (e) {
            // axios interceptor toasts
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleRemove = async (s) => {
        if (!confirm(`Remove ${s.email} from platform staff? They'll go back to a regular user.`)) return;
        try {
            await axiosInstance.delete(`/admin/staff/${s.id}`);
            toast.success('Staff removed');
            load();
        } catch {/* toasted */}
    };

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.h1}>Platform Staff</h1>
                    <p style={styles.subtitle}>
                        Sub-admins with granular permissions. They can help manage the platform without full superadmin access.
                    </p>
                </div>
                <button onClick={() => setAddOpen(true)} style={styles.btnPrimary}>
                    <UserPlus size={16} /> Add Staff
                </button>
            </header>

            <div style={styles.card}>
                {loading ? (
                    <div style={styles.empty}>
                        <Loader2 size={20} className="animate-spin" /> Loading…
                    </div>
                ) : staff.length === 0 ? (
                    <div style={styles.empty}>
                        No platform staff yet. Click "Add Staff" to grant a user platform access.
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tr}>
                                <th style={styles.th}>Email / Name</th>
                                <th style={styles.th}>Permissions Granted</th>
                                <th style={styles.th}>Added</th>
                                <th style={styles.th} />
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((s) => (
                                <tr key={s.id} style={styles.tr}>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>{s.full_name || '—'}</div>
                                        <div style={{ fontSize: 12, color: '#6b7280' }}>{s.email}</div>
                                    </td>
                                    <td style={styles.td}>
                                        <PermissionBadges perms={s.permissions} />
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                                        </span>
                                    </td>
                                    <td style={{ ...styles.td, textAlign: 'right' }}>
                                        <button onClick={() => setEditing(s)} style={styles.btnGhost} title="Edit permissions">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleRemove(s)} style={{ ...styles.btnGhost, color: '#dc2626' }} title="Remove">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {addOpen && (
                <AddStaffModal
                    onClose={() => setAddOpen(false)}
                    onAdded={() => {
                        setAddOpen(false);
                        load();
                    }}
                />
            )}

            {editing && (
                <EditPermissionsModal
                    staff={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

const PermissionBadges = ({ perms }) => {
    const enabled = Object.keys(perms || {}).filter((k) => perms[k] === true);
    if (enabled.length === 0) {
        return <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>No permissions granted</span>;
    }
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {enabled.map((k) => {
                const def = PERMISSION_CATALOG.find((p) => p.key === k);
                return (
                    <span key={k} style={styles.badge}>
                        <ShieldCheck size={10} /> {def?.label ?? k}
                    </span>
                );
            })}
        </div>
    );
};

// ============================================================
// Add Staff Modal — search user by email + set initial permissions
// ============================================================
const AddStaffModal = ({ onClose, onAdded }) => {
    const [email, setEmail] = useState('');
    const [targetUserId, setTargetUserId] = useState(null);
    const [lookupBusy, setLookupBusy] = useState(false);
    const [lookupErr, setLookupErr] = useState('');
    const [permissions, setPermissions] = useState({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const findUser = async () => {
        setLookupErr('');
        setTargetUserId(null);
        if (!email.trim()) return;
        setLookupBusy(true);
        try {
            // We use the admin/users endpoint to find by email
            const { data } = await axiosInstance.get(
                `/credits/admin/users?search=${encodeURIComponent(email.trim())}&limit=5`,
            );
            const list = data?.users ?? [];
            const match = list.find(
                (u) => (u.email ?? '').toLowerCase() === email.trim().toLowerCase(),
            );
            if (!match) {
                setLookupErr('No user found with that email. They must sign up first.');
                return;
            }
            if (match.role === 'superadmin') {
                setLookupErr('That user is already a superadmin. Cannot demote to staff this way.');
                return;
            }
            if (match.role === 'platform_staff') {
                setLookupErr('That user is already platform staff. Edit their permissions instead.');
                return;
            }
            setTargetUserId(match.id);
        } catch (e) {
            setLookupErr('Lookup failed.');
        } finally {
            setLookupBusy(false);
        }
    };

    const togglePerm = (key) => {
        setPermissions((p) => ({ ...p, [key]: !p[key] }));
    };

    const submit = async () => {
        if (!targetUserId) {
            setLookupErr('Find the user first.');
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.post('/admin/staff', {
                targetUserId,
                permissions,
                notes: notes || undefined,
            });
            toast.success('Staff added');
            onAdded();
        } catch {
            // toasted
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell title="Add Platform Staff" onClose={onClose}>
            <div style={{ display: 'grid', gap: 16 }}>
                <div>
                    <label style={styles.label}>User Email</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            style={{ ...styles.input, flex: 1 }}
                        />
                        <button onClick={findUser} disabled={lookupBusy || !email.trim()} style={styles.btnSecondary}>
                            {lookupBusy ? 'Looking…' : 'Find user'}
                        </button>
                    </div>
                    {lookupErr && <div style={styles.err}>{lookupErr}</div>}
                    {targetUserId && <div style={styles.success}>✓ User found. Set permissions below.</div>}
                </div>

                <div>
                    <label style={styles.label}>Permissions to grant</label>
                    <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                        {PERMISSION_CATALOG.map((p) => (
                            <PermissionRow
                                key={p.key}
                                def={p}
                                checked={!!permissions[p.key]}
                                onToggle={() => togglePerm(p.key)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label style={styles.label}>Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Why does this user need staff access?"
                        style={{ ...styles.input, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
                    <button
                        onClick={submit}
                        disabled={submitting || !targetUserId}
                        style={styles.btnPrimary}
                    >
                        {submitting ? 'Adding…' : 'Add as Staff'}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

// ============================================================
// Edit Permissions Modal
// ============================================================
const EditPermissionsModal = ({ staff, onClose, onSaved }) => {
    const [permissions, setPermissions] = useState(staff.permissions ?? {});
    const [notes, setNotes] = useState(staff.notes ?? '');
    const [submitting, setSubmitting] = useState(false);

    const togglePerm = (key) => {
        setPermissions((p) => ({ ...p, [key]: !p[key] }));
    };

    const submit = async () => {
        setSubmitting(true);
        try {
            await axiosInstance.put(`/admin/staff/${staff.id}/permissions`, {
                permissions,
                notes: notes || undefined,
            });
            toast.success('Permissions updated');
            onSaved();
        } catch {
            // toasted
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ModalShell title={`Edit Permissions — ${staff.email}`} onClose={onClose}>
            <div style={{ display: 'grid', gap: 16 }}>
                <div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {PERMISSION_CATALOG.map((p) => (
                            <PermissionRow
                                key={p.key}
                                def={p}
                                checked={!!permissions[p.key]}
                                onToggle={() => togglePerm(p.key)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label style={styles.label}>Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        style={{ ...styles.input, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={styles.btnSecondary}>Cancel</button>
                    <button onClick={submit} disabled={submitting} style={styles.btnPrimary}>
                        {submitting ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
};

const PermissionRow = ({ def, checked, onToggle }) => (
    <label
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            border: `1.5px solid ${checked ? '#FDB813' : '#e5e7eb'}`,
            borderRadius: 8,
            background: checked ? '#fef9e6' : 'white',
            cursor: 'pointer',
            transition: 'all 0.12s ease',
        }}
    >
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ width: 16, height: 16 }} />
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3a' }}>{def.label}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{def.desc}</div>
        </div>
    </label>
);

const ModalShell = ({ title, children, onClose }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, zIndex: 10000,
        }}
    >
        <div
            onClick={(e) => e.stopPropagation()}
            style={{
                background: 'white', borderRadius: 12, width: '100%', maxWidth: 600,
                maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
        >
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
            }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                    <X size={20} />
                </button>
            </div>
            <div style={{ padding: 20 }}>{children}</div>
        </div>
    </div>
);

const styles = {
    page: { padding: 24, maxWidth: 1100, margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 },
    h1: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1f3a' },
    subtitle: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 },
    btnPrimary: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '0.5rem 1rem',
        background: 'linear-gradient(135deg, #FDB813, #d4a000)', color: '#1a1f3a',
        border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
    },
    btnSecondary: {
        padding: '0.5rem 1rem', background: 'white', color: '#1a1f3a',
        border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
    },
    btnGhost: {
        background: 'transparent', border: 'none', padding: 6, marginLeft: 4,
        color: '#6b7280', cursor: 'pointer', borderRadius: 4,
    },
    card: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tr: { borderBottom: '1px solid #f3f4f6' },
    th: { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, background: '#f9fafb' },
    td: { padding: '12px 16px', fontSize: 14, color: '#1f2937' },
    empty: { padding: '3rem', textAlign: 'center', color: '#6b7280' },
    badge: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', background: '#fef3c7', color: '#92400e',
        borderRadius: 4, fontSize: 11, fontWeight: 600,
    },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1f3a', marginBottom: 6 },
    input: {
        width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e5e7eb',
        borderRadius: 6, fontSize: 14, color: '#1a1f3a', background: 'white',
        boxSizing: 'border-box', fontFamily: 'inherit',
    },
    err: { marginTop: 6, fontSize: 12, color: '#dc2626' },
    success: { marginTop: 6, fontSize: 12, color: '#16a34a' },
};
