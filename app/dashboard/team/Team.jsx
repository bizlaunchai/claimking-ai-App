'use client';
import React, { useState } from 'react';
import './team.css';

const members = [
    { initials: 'ND', name: 'Nate Davis', email: 'nate@claimking.ai', role: 'admin', roleLabel: 'Admin (Owner)', status: 'active', lastLogin: 'Just now', joined: 'Jan 15, 2025', owner: true },
    { initials: 'MJ', name: 'Mike Johnson', email: 'mike@nathanielroofing.com', role: 'admin', roleLabel: 'Admin', status: 'active', lastLogin: '2 hours ago', joined: 'Feb 3, 2025' },
    { initials: 'SR', name: 'Sarah Reed', email: 'sarah@nathanielroofing.com', role: 'estimator', roleLabel: 'Estimator', status: 'active', lastLogin: 'Yesterday', joined: 'Mar 11, 2025' },
    { initials: 'TG', name: 'Tom Garcia', email: 'tom@nathanielroofing.com', role: 'field', roleLabel: 'Field Worker', status: 'active', lastLogin: '30 min ago', joined: 'Apr 2, 2025' },
    { initials: 'LP', name: 'Lisa Park', email: 'lisa@nathanielroofing.com', role: 'office', roleLabel: 'Office Staff', status: 'active', lastLogin: '1 hour ago', joined: 'Apr 18, 2025' },
    { initials: 'JB', name: 'James Brown', email: 'james@nathanielroofing.com', role: 'field', roleLabel: 'Field Worker', status: 'pending', lastLogin: 'Never', joined: '—' },
    { initials: 'AK', name: 'Ann Kelley', email: 'ann@nathanielroofing.com', role: 'estimator', roleLabel: 'Estimator', status: 'pending', lastLogin: 'Never', joined: '—' },
];

const invites = [
    { email: 'james@nathanielroofing.com', role: 'field', roleLabel: 'Field Worker', invitedBy: 'Nate Davis', sent: '2 days ago', expires: 'In 5 days' },
    { email: 'ann@nathanielroofing.com', role: 'estimator', roleLabel: 'Estimator', invitedBy: 'Mike Johnson', sent: '4 hours ago', expires: 'In 7 days' },
];

const auditLog = [
    { when: '2 hours ago', who: 'Nate Davis', action: 'Changed role', target: 'Sarah Reed → Estimator', ip: '192.168.1.42' },
    { when: '4 hours ago', who: 'Mike Johnson', action: 'Sent invite', target: 'ann@nathanielroofing.com', ip: '192.168.1.55' },
    { when: 'Yesterday', who: 'Nate Davis', action: 'Suspended user', target: 'former.employee@email.com', ip: '192.168.1.42' },
    { when: '2 days ago', who: 'Nate Davis', action: 'Sent invite', target: 'james@nathanielroofing.com', ip: '192.168.1.42' },
    { when: '3 days ago', who: 'Mike Johnson', action: 'Updated permissions', target: 'Estimator role', ip: '192.168.1.55' },
];

const permissionGroups = [
    {
        title: 'Dashboard',
        rows: [
            ['View Overview / Dashboard', '✓', '✓', '✓', '✓', 'Own'],
        ],
    },
    {
        title: 'Claims Management',
        rows: [
            ['View New Leads', '✓', '✓', '—', '✓', '—'],
            ['Convert Lead to Job', '✓', '✓', '—', '✓', '—'],
            ['View Jobs Ready', '✓', '✓', 'Assigned', '✓', '—'],
            ['Convert Job to Claim', '✓', '✓', '—', '✓', '—'],
            ['View Active Claims', '✓', '✓', 'Assigned', '✓', 'Own'],
            ['Create Active Claim', '✓', '✓', '—', '✓', '—'],
            ['Edit Active Claim', '✓', '✓', 'Notes only', '✓', '—'],
            ['Delete / Archive Claim', '✓', '—', '—', '—', '—'],
            ['Move Claim Between Stages', '✓', '✓', '—', '✓', '—'],
            ['Create Supplements', '✓', '✓', '—', '—', '—'],
            ['Send Supplement to Adjuster', '✓', '✓', '—', '—', '—'],
            ['Manage Client Portal Links', '✓', '✓', '—', '✓', '—'],
            ['Revoke Portal Access', '✓', '—', '—', '—', '—'],
            ['View Billing & Plans', '✓', '—', '—', '—', '—'],
            ['Change Subscription Plan', '✓', '—', '—', '—', '—'],
            ['Purchase Credits', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'AI Tools',
        rows: [
            ['Use Measurement Reports', '✓', '✓', '✓', '✓', '—'],
            ['Generate Estimates', '✓', '✓', '—', '✓', '—'],
            ['Edit / Approve Estimates', '✓', '✓', '—', '—', '—'],
            ['Generate 3D Mockups', '✓', '✓', '✓', '✓', '—'],
            ['Run Policy Analysis', '✓', '✓', '—', '✓', '—'],
            ['Use Document Generator (SOP)', '✓', '✓', '—', '✓', '—'],
            ['Use Email Assistant (AI replies)', '✓', '✓', '—', '✓', '—'],
            ['Use AI Call Center (PRO)', '✓', '—', '—', '✓', '—'],
            ['Configure AI Call Center', '✓', '—', '—', '—', '—'],
            ['View Storm Tracking (LIVE)', '✓', '✓', '✓', '✓', '—'],
            ['Configure Storm Alert Zones', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'Integrations',
        rows: [
            ['View CRM Sync Status', '✓', '✓', '—', '✓', '—'],
            ['Connect / Disconnect CRMs', '✓', '—', '—', '—', '—'],
            ['Configure CRM Field Mapping', '✓', '—', '—', '—', '—'],
            ['View Email & SMS Activity', '✓', '✓', '—', '✓', '—'],
            ['Send Emails (Resend)', '✓', '✓', '—', '✓', '—'],
            ['Send SMS (Twilio)', '✓', '✓', '—', '✓', '—'],
            ['Connect Email Accounts (OAuth)', '✓', '—', '—', '—', '—'],
            ['Provision Twilio Numbers', '✓', '—', '—', '—', '—'],
            ['Configure Email Campaigns', '✓', '✓', '—', '—', '—'],
            ['View Google My Business', '✓', '✓', '—', '✓', '—'],
            ['Reply to GMB Reviews', '✓', '✓', '—', '✓', '—'],
            ['Post to GMB', '✓', '✓', '—', '✓', '—'],
            ['Configure GMB Auto-Posting', '✓', '—', '—', '—', '—'],
            ['Manage Social Media', '✓', '✓', '—', '✓', '—'],
            ['View / Edit API Settings', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'Reports',
        rows: [
            ['View Analytics Dashboard', '✓', '✓', '—', '✓', '—'],
            ['Export Analytics Data', '✓', '✓', '—', '—', '—'],
            ['View Payments', '✓', '✓', '—', '—', '—'],
            ['Record Payments', '✓', '—', '—', '✓', '—'],
            ['Issue Refunds', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'Settings',
        rows: [
            ['View General Settings', '✓', '✓', '✓', '✓', '✓'],
            ['Edit Company Settings', '✓', '—', '—', '—', '—'],
            ['Edit Own Account', '✓', '✓', '✓', '✓', '✓'],
            ['View Team', '✓', '—', '—', '—', '—'],
            ['Invite Team Members', '✓', '—', '—', '—', '—'],
            ['Change Team Member Roles', '✓', '—', '—', '—', '—'],
            ['Suspend / Remove Members', '✓', '—', '—', '—', '—'],
            ['Edit Role Permissions', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'Referrals',
        rows: [
            ['View Referral Program', '✓', '✓', '✓', '✓', '—'],
            ['Send Referral Invites', '✓', '✓', '✓', '✓', '—'],
            ['View / Withdraw Earnings', '✓', '—', '—', '—', '—'],
        ],
    },
    {
        title: 'Admin-Only',
        rows: [
            ['Insurance Monitoring Settings', '✓', '—', '—', '—', '—'],
            ['View Audit Log', '✓', '—', '—', '—', '—'],
            ['Export Audit Log', '✓', '—', '—', '—', '—'],
        ],
    },
];

const PermCell = ({ value }) => {
    if (value === '✓') return <td className="perm-check">✓</td>;
    if (value === '—') return <td className="perm-cross">—</td>;
    return <td className="perm-cross">{value}</td>;
};

const Team = () => {
    const [activeTab, setActiveTab] = useState('members');

    return (
        <div className="team-page">
            <div className="page-header">
                <div>
                    <div className="page-title">Team Management</div>
                    <div className="page-subtitle">Invite teammates, assign roles, and control access</div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => alert('Invite modal — to be implemented')}
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
                        <div className="stat-value">7</div>
                        <div className="stat-meta">5 active, 2 pending</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Admins</div>
                        <div className="stat-value">2</div>
                        <div className="stat-meta">Full system access</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Invites</div>
                        <div className="stat-value">2</div>
                        <div className="stat-meta">Awaiting acceptance</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Available Seats</div>
                        <div className="stat-value">3</div>
                        <div className="stat-meta">On Pro plan (10 seats)</div>
                    </div>
                </div>

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
                                {members.map((m) => (
                                    <tr key={m.email}>
                                        <td>
                                            <div className="member-cell">
                                                <div className="avatar">{m.initials}</div>
                                                <div className="member-info">
                                                    <span className="member-name">{m.name}</span>
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
                                                {m.status === 'pending' ? (
                                                    <>
                                                        <button className="btn-secondary">Resend Invite</button>
                                                        <button className="btn-danger">Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn-secondary">Edit</button>
                                                        {!m.owner && <button className="btn-danger">Suspend</button>}
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
                            <button className="btn-primary">Send New Invite</button>
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
                                {invites.map((i) => (
                                    <tr key={i.email}>
                                        <td>{i.email}</td>
                                        <td><span className={`badge ${i.role}`}>{i.roleLabel}</span></td>
                                        <td>{i.invitedBy}</td>
                                        <td>{i.sent}</td>
                                        <td>{i.expires}</td>
                                        <td>
                                            <div className="action-cell">
                                                <button className="btn-secondary">Resend</button>
                                                <button className="btn-danger">Cancel</button>
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
                    <div className="perms-card">
                        <div className="perms-header">
                            <div>
                                <div className="perms-title">Role Permissions</div>
                                <div className="perms-subtitle">Default permissions per role. Admin can customize for this company.</div>
                            </div>
                            <button className="btn-secondary">Reset to Defaults</button>
                        </div>
                        <table className="perms-table">
                            <thead>
                                <tr>
                                    <th>Permission</th>
                                    <th>Admin</th>
                                    <th>Estimator</th>
                                    <th>Field</th>
                                    <th>Office</th>
                                    <th>Client</th>
                                </tr>
                            </thead>
                            <tbody>
                                {permissionGroups.map((group) => (
                                    <React.Fragment key={group.title}>
                                        <tr className="perms-section-row">
                                            <td colSpan="6">{group.title}</td>
                                        </tr>
                                        {group.rows.map((row, idx) => (
                                            <tr key={`${group.title}-${idx}`}>
                                                <td>{row[0]}</td>
                                                <PermCell value={row[1]} />
                                                <PermCell value={row[2]} />
                                                <PermCell value={row[3]} />
                                                <PermCell value={row[4]} />
                                                <PermCell value={row[5]} />
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                {auditLog.map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.when}</td>
                                        <td>{row.who}</td>
                                        <td>{row.action}</td>
                                        <td>{row.target}</td>
                                        <td>{row.ip}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Team;
