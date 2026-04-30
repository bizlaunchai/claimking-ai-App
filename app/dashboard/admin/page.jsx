'use client';
import Link from 'next/link';
import { Package, Users, Coins } from 'lucide-react';

export default function AdminHome() {
    const links = [
        {
            href: '/dashboard/admin/plans',
            title: 'Plans',
            desc: 'Create, edit, activate or archive subscription plans.',
            Icon: Package,
            color: '#4f46e5',
        },
        {
            href: '/dashboard/admin/users',
            title: 'Users & Credits',
            desc: 'View users, adjust credits, manage subscriptions.',
            Icon: Users,
            color: '#0d9488',
        },
    ];

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px' }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827' }}>Admin</h1>
            <p style={{ margin: '6px 0 24px', color: '#6b7280', fontSize: 14 }}>
                Manage plans, users and credits.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {links.map(({ href, title, desc, Icon, color }) => (
                    <Link
                        key={href}
                        href={href}
                        style={{
                            display: 'flex', gap: 14, padding: 20, background: '#fff', textDecoration: 'none',
                            border: '1px solid #e5e7eb', borderRadius: 14, color: '#111827',
                            transition: 'border-color 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = color}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                        <div style={{ width: 40, height: 40, background: `${color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{title}</div>
                            <div style={{ fontSize: 13, color: '#6b7280' }}>{desc}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
