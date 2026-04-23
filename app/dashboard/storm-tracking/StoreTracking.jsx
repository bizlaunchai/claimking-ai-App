'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import './storm-tracking.css';
import 'leaflet/dist/leaflet.css';

const DEFAULT_EVENT_TYPES = [
    'Tornado Warning',
    'Severe Thunderstorm Warning',
    'High Wind Warning',
    'Wind Advisory',
    'Flood Warning',
    'Flood Watch',
    'Winter Storm Warning',
];

const severityColor = (event, severity) => {
    if (/Tornado/i.test(event)) return '#dc2626';            // red
    if (/Severe/i.test(severity || '')) return '#dc2626';
    if (/Thunderstorm|Hail|High Wind Warning/i.test(event)) return '#f97316'; // orange
    if (/Wind Advisory|Flood Watch|Winter Storm/i.test(event)) return '#eab308'; // yellow
    return '#3b82f6'; // blue — other
};

const severityBucket = (event, severity) => {
    const c = severityColor(event, severity);
    if (c === '#dc2626') return 'severe';
    if (c === '#f97316') return 'moderate';
    if (c === '#eab308') return 'watch';
    return 'other';
};

const formatTime = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const StormTracking = () => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [center, setCenter] = useState(null);
    const [loadingAlerts, setLoadingAlerts] = useState(true);
    const [severityFilter, setSeverityFilter] = useState('all');
    const [showSnowOverlay, setShowSnowOverlay] = useState(false);

    const [settings, setSettings] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [notifOpen, setNotifOpen] = useState(false);

    const mapRef = useRef(null);
    const layersRef = useRef({ markers: [], polygons: [], snow: null });
    const LRef = useRef(null);

    // -----------------------------------------------------------
    // Data fetch
    // -----------------------------------------------------------
    const loadSettings = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/weather-settings');
            setSettings(data);
        } catch { /* handled by axios interceptor */ }
    }, []);

    const loadAlerts = useCallback(async () => {
        setLoadingAlerts(true);
        try {
            const { data } = await axiosInstance.get('/weather/user-alerts');
            setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
            if (data?.center) setCenter(data.center);
        } catch {
            setAlerts([]);
        } finally {
            setLoadingAlerts(false);
        }
    }, []);

    const loadNotifications = useCallback(async () => {
        try {
            const { data } = await axiosInstance.get('/weather/notifications');
            setNotifications(Array.isArray(data) ? data : []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        loadSettings();
        loadAlerts();
        loadNotifications();
        const t = setInterval(() => {
            loadAlerts();
            loadNotifications();
        }, 120000); // refresh every 2 min in-tab
        return () => clearInterval(t);
    }, [loadSettings, loadAlerts, loadNotifications]);

    // -----------------------------------------------------------
    // Map init
    // -----------------------------------------------------------
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let cancelled = false;

        (async () => {
            const L = (await import('leaflet')).default || (await import('leaflet'));
            if (cancelled) return;
            LRef.current = L;

            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            const el = document.getElementById('stormMap');
            if (!el || el._leaflet_id) { setMapLoaded(true); return; }

            const map = L.map('stormMap').setView([39.8283, -98.5795], 4); // US center
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            setMapLoaded(true);
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch { /* noop */ }
                mapRef.current = null;
            }
        };
    }, []);

    // Re-center when user center arrives
    useEffect(() => {
        if (!mapRef.current || !center) return;
        mapRef.current.setView([center.latitude, center.longitude], 7);
    }, [center]);

    // Toggle NOHRSC snow depth overlay
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        if (showSnowOverlay) {
            if (!layersRef.current.snow) {
                // NOHRSC public snow depth WMS (raster overlay)
                const snow = L.tileLayer.wms(
                    'https://mapservices.weather.noaa.gov/raster/services/obs/nohrsc_snow_analysis/MapServer/WMSServer',
                    {
                        layers: '1',
                        format: 'image/png',
                        transparent: true,
                        opacity: 0.55,
                        attribution: 'NOAA NOHRSC',
                    }
                );
                layersRef.current.snow = snow;
                snow.addTo(map);
            } else {
                layersRef.current.snow.addTo(map);
            }
        } else if (layersRef.current.snow) {
            layersRef.current.snow.remove();
        }
    }, [showSnowOverlay]);

    // Render alert markers + polygons on map
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        layersRef.current.markers.forEach((m) => m.remove());
        layersRef.current.polygons.forEach((p) => p.remove());
        layersRef.current.markers = [];
        layersRef.current.polygons = [];

        const filtered = alerts.filter((a) => {
            if (severityFilter === 'all') return true;
            return severityBucket(a.event, a.severity) === severityFilter;
        });

        filtered.forEach((a) => {
            const color = severityColor(a.event, a.severity);

            if (a.geometry) {
                try {
                    const poly = L.geoJSON(a.geometry, {
                        style: { color, weight: 2, fillColor: color, fillOpacity: 0.15 },
                    });
                    poly.addTo(map);
                    layersRef.current.polygons.push(poly);
                } catch { /* skip invalid geometry */ }
            }

            if (a.centroid_lat != null && a.centroid_lon != null) {
                const marker = L.circleMarker([a.centroid_lat, a.centroid_lon], {
                    radius: 10,
                    fillColor: color,
                    color,
                    weight: 2,
                    opacity: 0.9,
                    fillOpacity: 0.6,
                });
                marker.bindPopup(`
                    <div style="min-width:240px">
                        <h4 style="margin:0 0 6px;color:#1a1f3a">${a.event}</h4>
                        <div style="font-size:12px;color:#6b7280">
                            <div><strong>Severity:</strong> ${a.severity || 'Unknown'}</div>
                            <div><strong>Area:</strong> ${a.area_desc || '—'}</div>
                            <div><strong>Effective:</strong> ${formatTime(a.effective)}</div>
                            <div><strong>Expires:</strong> ${formatTime(a.expires)}</div>
                            ${a.distance_miles != null ? `<div><strong>Distance:</strong> ${a.distance_miles} mi</div>` : ''}
                        </div>
                    </div>
                `);
                marker.addTo(map);
                layersRef.current.markers.push(marker);
            }
        });
    }, [alerts, severityFilter]);

    // -----------------------------------------------------------
    // Derived UI state
    // -----------------------------------------------------------
    const filteredAlerts = useMemo(() => {
        return alerts
            .slice()
            .sort((a, b) => new Date(b.effective || 0) - new Date(a.effective || 0))
            .filter((a) => severityFilter === 'all'
                ? true
                : severityBucket(a.event, a.severity) === severityFilter);
    }, [alerts, severityFilter]);

    const stats = useMemo(() => {
        const severe = alerts.filter((a) => severityBucket(a.event, a.severity) === 'severe').length;
        const warnings = alerts.filter((a) => /Warning/i.test(a.event)).length;
        const zones = settings ? (settings.service_area_zips ? settings.service_area_zips.split(/[,\s]+/).filter(Boolean).length : 0) + 1 : 0;
        const unread = notifications.filter((n) => !n.read_at).length;
        return { severe, warnings, zones, unread };
    }, [alerts, settings, notifications]);

    // -----------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------
    const handleMarkRead = async (id) => {
        try {
            await axiosInstance.patch(`/weather/notifications/${id}/read`);
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        try {
            await axiosInstance.patch('/weather/notifications/read-all');
            const now = new Date().toISOString();
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
        } catch { /* silent */ }
    };

    const handleSaveSettings = async (form) => {
        try {
            await axiosInstance.post('/weather-settings-save', form);
            toast.success('Weather settings saved');
            setSettingsOpen(false);
            await loadSettings();
            await loadAlerts();
        } catch { /* handled by interceptor */ }
    };

    // -----------------------------------------------------------
    // Render
    // -----------------------------------------------------------
    return (
        <div className="storm-tracking-container">
            <div className="page-header">
                <h1 className="page-title">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8z" />
                    </svg>
                    Storm Tracking Center
                </h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setNotifOpen(true)}>
                        Notifications {stats.unread > 0 && <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 12 }}>{stats.unread}</span>}
                    </button>
                    <button className="btn btn-primary" onClick={() => setSettingsOpen(true)}>
                        Alert Settings
                    </button>
                </div>
            </div>

            <div className="alert-banner">
                <div className="alert-icon">
                    <svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                </div>
                <div className="alert-content">
                    <div className="alert-title">
                        {stats.severe > 0 ? 'Severe Weather Alert Active' : 'No severe alerts in your service area'}
                    </div>
                    <div className="alert-description">
                        {alerts.length} matching alert{alerts.length === 1 ? '' : 's'} within {settings?.alert_radius_miles ?? 50} miles of your coverage area.
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <StatCard label="Severe Alerts" value={stats.severe} tone="severe" />
                <StatCard label="Active Warnings" value={stats.warnings} tone="active" />
                <StatCard label="Monitored Zones" value={stats.zones} tone="monitored" />
                <StatCard label="Unread Notifications" value={stats.unread} tone="affected" />
            </div>

            <div className="map-section">
                <div className="map-header">
                    <div className="map-title">Live Weather Alerts — NWS / NOAA</div>
                    <div className="map-controls">
                        <button
                            className={`control-btn ${!showSnowOverlay ? 'active' : ''}`}
                            onClick={() => setShowSnowOverlay(false)}
                        >Alerts Only</button>
                        <button
                            className={`control-btn ${showSnowOverlay ? 'active' : ''}`}
                            onClick={() => setShowSnowOverlay(true)}
                        >+ NOHRSC Snow</button>
                        <button
                            className="control-btn"
                            onClick={loadAlerts}
                            disabled={loadingAlerts}
                        >{loadingAlerts ? 'Refreshing…' : 'Refresh'}</button>
                    </div>
                </div>
                <div id="stormMap" style={{ height: 500, width: '100%' }}>
                    {!mapLoaded && (
                        <div className="map-loading">
                            <div className="loading-spinner"></div>
                            <div className="loading-text">Loading NOAA weather data…</div>
                        </div>
                    )}
                    <div className="map-legend">
                        <div className="legend-title">Alert Severity</div>
                        <div className="legend-item"><span className="legend-marker severe"></span><span>Tornado / Severe</span></div>
                        <div className="legend-item"><span className="legend-marker moderate" style={{ background: '#f97316' }}></span><span>Thunderstorm / Hail / Wind Warning</span></div>
                        <div className="legend-item"><span className="legend-marker watch" style={{ background: '#eab308' }}></span><span>Advisory / Watch / Winter</span></div>
                        <div className="legend-item"><span className="legend-marker clear"></span><span>Clear</span></div>
                    </div>
                </div>
            </div>

            <div className="storm-list-section">
                <div className="list-header">
                    <div className="list-title">Active Storm Alerts ({filteredAlerts.length})</div>
                    <div className="filter-controls">
                        <select className="filter-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                            <option value="all">All Severities</option>
                            <option value="severe">Tornado / Severe</option>
                            <option value="moderate">Thunderstorm / Hail / Wind</option>
                            <option value="watch">Advisory / Watch / Winter</option>
                        </select>
                    </div>
                </div>
                <div className="storm-data-container">
                    {loadingAlerts ? (
                        <div className="api-placeholder">
                            <div className="loading-spinner"></div>
                            <p className="api-description">Loading alerts from NOAA…</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="api-placeholder">
                            <h3 className="api-title">No active alerts in your area</h3>
                            <p className="api-description">
                                We&apos;re monitoring {settings?.alert_radius_miles ?? 50} miles around your business address.
                            </p>
                        </div>
                    ) : (
                        <div className="storm-list">
                            {filteredAlerts.map((a) => (
                                <div key={a.id} className="storm-item">
                                    <div className={`storm-severity ${severityBucket(a.event, a.severity)}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24">
                                            <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8z" />
                                        </svg>
                                    </div>
                                    <div className="storm-info">
                                        <div className="storm-name">{a.event}{a.severity ? ` — ${a.severity}` : ''}</div>
                                        <div className="storm-details">
                                            <span>Area: {a.area_desc || '—'}</span>
                                            <span>Effective: {formatTime(a.effective)}</span>
                                            <span>Expires: {formatTime(a.expires)}</span>
                                        </div>
                                    </div>
                                    <div className="storm-action">
                                        {a.distance_miles != null && (
                                            <span className="affected-claims">{a.distance_miles} mi away</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {settingsOpen && settings && (
                <SettingsModal
                    initial={settings}
                    onClose={() => setSettingsOpen(false)}
                    onSave={handleSaveSettings}
                />
            )}

            {notifOpen && (
                <NotificationsPanel
                    items={notifications}
                    onClose={() => setNotifOpen(false)}
                    onMarkRead={handleMarkRead}
                    onMarkAllRead={handleMarkAllRead}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------
const StatCard = ({ label, value, tone }) => (
    <div className="stat-card">
        <div className="stat-header">
            <div className={`stat-icon ${tone}`}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
    </div>
);

const SettingsModal = ({ initial, onClose, onSave }) => {
    const [zips, setZips] = useState(initial.service_area_zips || '');
    const [radius, setRadius] = useState(initial.alert_radius_miles || 50);
    const [emailEnabled, setEmailEnabled] = useState(!!initial.email_alerts_enabled);
    const [email, setEmail] = useState(initial.alert_email || '');
    const [events, setEvents] = useState(
        Array.isArray(initial.enabled_event_types) && initial.enabled_event_types.length
            ? initial.enabled_event_types
            : DEFAULT_EVENT_TYPES
    );

    const toggleEvent = (ev) => {
        setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
    };

    const submit = (e) => {
        e.preventDefault();
        onSave({
            serviceAreaZips: zips,
            alertRadiusMiles: Number(radius),
            emailAlertsEnabled: emailEnabled,
            alertEmail: email || undefined,
            enabledEventTypes: events,
        });
    };

    return (
        <div style={modalBackdrop} onClick={onClose}>
            <div style={modalPanel} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 20, color: '#1a1f3a' }}>Storm Alert Settings</h2>
                    <button onClick={onClose} style={closeBtn}>&times;</button>
                </div>
                <form onSubmit={submit}>
                    <label style={lbl}>Service area ZIP codes (comma-separated, optional)</label>
                    <input
                        type="text"
                        value={zips}
                        onChange={(e) => setZips(e.target.value)}
                        placeholder="e.g. 75201, 75202, 75203"
                        style={inp}
                    />

                    <label style={lbl}>Alert radius from business address (miles)</label>
                    <input
                        type="number"
                        min="1"
                        max="500"
                        value={radius}
                        onChange={(e) => setRadius(e.target.value)}
                        style={inp}
                    />

                    <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
                        Email me when a matching alert is issued
                    </label>
                    {emailEnabled && (
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="alerts@yourcompany.com"
                            style={inp}
                        />
                    )}

                    <label style={lbl}>Notify me about:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        {DEFAULT_EVENT_TYPES.map((ev) => (
                            <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                                <input
                                    type="checkbox"
                                    checked={events.includes(ev)}
                                    onChange={() => toggleEvent(ev)}
                                />
                                {ev}
                            </label>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const NotificationsPanel = ({ items, onClose, onMarkRead, onMarkAllRead }) => (
    <div style={modalBackdrop} onClick={onClose}>
        <div style={{ ...modalPanel, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, color: '#1a1f3a' }}>Storm Notifications</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onMarkAllRead} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Mark all read</button>
                    <button onClick={onClose} style={closeBtn}>&times;</button>
                </div>
            </div>
            {items.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No notifications yet.</p>
            ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                    {items.map((n) => {
                        const a = n.storm_alert || {};
                        const unread = !n.read_at;
                        return (
                            <div
                                key={n.id}
                                onClick={() => unread && onMarkRead(n.id)}
                                style={{
                                    padding: 12,
                                    borderLeft: `4px solid ${severityColor(a.event, a.severity)}`,
                                    background: unread ? '#fff7ed' : '#f9fafb',
                                    marginBottom: 8,
                                    borderRadius: 6,
                                    cursor: unread ? 'pointer' : 'default',
                                }}
                            >
                                <div style={{ fontWeight: 600, color: '#1a1f3a' }}>{a.event || 'Alert'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                    {a.area_desc || ''}
                                    {n.distance_miles != null && ` • ${n.distance_miles} mi away`}
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                    {formatTime(n.sent_at)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
);

const modalBackdrop = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
};
const modalPanel = {
    background: '#fff', padding: 24, borderRadius: 12, width: '90%',
    maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
};
const closeBtn = {
    border: 'none', background: 'transparent', fontSize: 28, lineHeight: 1, cursor: 'pointer', color: '#6b7280',
};
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', margin: '12px 0 6px' };
const inp = {
    width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14,
};

export default StormTracking;
