'use client'
import React, { useState, useEffect, useRef } from 'react';
import "./storm-tracking.css"

const StormTracking = () => {
    const [mapLoaded, setMapLoaded] = useState(false);
    const [showStorms, setShowStorms] = useState(false);
    const [activeLayer, setActiveLayer] = useState('radar');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('24hours');
    const [regionFilter, setRegionFilter] = useState('all');
    
    const mapRef = useRef(null);

    const storms = [
        { lat: 32.7767, lng: -96.7970, severity: 'severe', name: 'Dallas Storm System', wind: '75 mph', hail: '1.5"', movement: 'NE 25 mph', claims: 12 },
        { lat: 29.7604, lng: -95.3698, severity: 'moderate', name: 'Houston Weather Front', wind: '45 mph', hail: '0.5"', movement: 'E 18 mph', claims: 8 },
        { lat: 30.2672, lng: -97.7431, severity: 'watch', name: 'Austin Storm Watch', wind: '35 mph', hail: '0.25"', movement: 'SE 15 mph', claims: 5 },
        { lat: 33.4484, lng: -112.0740, severity: 'moderate', name: 'Phoenix Heat Storm', wind: '50 mph', hail: '0.75"', movement: 'SW 20 mph', claims: 3 },
    ];

    const getMarkerColor = (severity) => {
        switch (severity) {
            case 'severe': return '#dc2626';
            case 'moderate': return '#FDB813';
            case 'watch': return '#3b82f6';
            default: return '#16a34a';
        }
    };

    useEffect(() => {
        // Simulate map loading
        const mapTimer = setTimeout(() => {
            setMapLoaded(true);
        }, 1500);

        // Simulate storm data loading
        const stormTimer = setTimeout(() => {
            setShowStorms(true);
        }, 3000);

        return () => {
            clearTimeout(mapTimer);
            clearTimeout(stormTimer);
        };
    }, []);

    // Initialize Leaflet map when mapLoaded becomes true
    useEffect(() => {
        if (typeof window !== 'undefined' && mapLoaded) {
            const initializeMap = async () => {
                try {
                    const L = await import('leaflet');
                    const mapElement = document.getElementById('stormMap');
                    if (mapElement && !mapElement._leaflet_id) {
                        const map = L.default.map('stormMap').setView([32.7767, -96.7970], 6);
                        
                        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap contributors'
                        }).addTo(map);
                        
                        // Add storm markers
                        storms.forEach(storm => {
                            const markerColor = getMarkerColor(storm.severity);
                            const marker = L.default.circleMarker([storm.lat, storm.lng], {
                                radius: 15,
                                fillColor: markerColor,
                                color: markerColor,
                                weight: 2,
                                opacity: 0.8,
                                fillOpacity: 0.4
                            }).addTo(map);
                            
                            marker.bindPopup(`
                                <div style="padding: 10px;">
                                    <h4 style="margin: 0 0 5px 0; color: #1a1f3a;">${storm.name}</h4>
                                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                        Severity: <strong>${storm.severity.charAt(0).toUpperCase() + storm.severity.slice(1)}</strong><br/>
                                        Wind: ${storm.wind}<br/>
                                        Affected Properties: ${storm.claims}
                                    </p>
                                </div>
                            `);
                        });
                    }
                } catch (error) {
                    console.log('Leaflet not available, using placeholder map');
                }
            };
            
            initializeMap();
        }
    }, [mapLoaded]);

    const handleToggleLayer = (layer) => {
        setActiveLayer(layer);
    };

    const filteredStorms = storms.filter(storm => {
        if (severityFilter !== 'all' && storm.severity !== severityFilter) {
            return false;
        }
        return true;
    });

    return (
        <div className="storm-tracking-container">
            {/* Page Header */}
            <div className="page-header">
                <h1 className="page-title">
                    <svg viewBox="0 0 24 24">
                        <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8zM6 14c.01-2 .62-3.27 1.76-4.4L12 5.27l4.24 4.38C17.38 10.77 17.99 12 18 14H6z"/>
                    </svg>
                    Storm Tracking Center
                </h1>
                <div className="header-actions">
                    <button className="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                        </svg>
                        Export Report
                    </button>
                    <button className="btn btn-primary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                        </svg>
                        Add Alert Zone
                    </button>
                </div>
            </div>

            {/* Alert Banner */}
            <div className="alert-banner">
                <div className="alert-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                </div>
                <div className="alert-content">
                    <div className="alert-title">Severe Weather Alert Active</div>
                    <div className="alert-description">
                        3 active storm systems detected in your service areas. 47 client properties may be affected. Click to view detailed tracking.
                    </div>
                </div>
            </div>

            {/* Storm Statistics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon severe">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8z"/>
                            </svg>
                        </div>
                        <span className="stat-badge">LIVE</span>
                    </div>
                    <div className="stat-value">3</div>
                    <div className="stat-label">Severe Storms</div>
                    <div className="stat-change up">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14l5-5 5 5H7z"/>
                        </svg>
                        2 new in last hour
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon active">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">12</div>
                    <div className="stat-label">Active Warnings</div>
                    <div className="stat-change down">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 10l5 5 5-5H7z"/>
                        </svg>
                        3 less than yesterday
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon monitored">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">284</div>
                    <div className="stat-label">Monitored Zones</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <div className="stat-icon affected">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-value">47</div>
                    <div className="stat-label">Properties at Risk</div>
                    <div className="stat-change up">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14l5-5 5 5H7z"/>
                        </svg>
                        18 new alerts sent
                    </div>
                </div>
            </div>

            {/* Main Map Section */}
            <div className="map-section">
                <div className="map-header">
                    <div className="map-title">Live Weather Radar & Storm Tracking</div>
                    <div className="map-controls">
                        <button 
                            className={`control-btn ${activeLayer === 'radar' ? 'active' : ''}`}
                            onClick={() => handleToggleLayer('radar')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9z"/>
                            </svg>
                            Radar
                        </button>
                        <button 
                            className={`control-btn ${activeLayer === 'satellite' ? 'active' : ''}`}
                            onClick={() => handleToggleLayer('satellite')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                            Satellite
                        </button>
                        <button 
                            className={`control-btn ${activeLayer === 'hail' ? 'active' : ''}`}
                            onClick={() => handleToggleLayer('hail')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            </svg>
                            Hail
                        </button>
                        <button 
                            className={`control-btn ${activeLayer === 'wind' ? 'active' : ''}`}
                            onClick={() => handleToggleLayer('wind')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5z"/>
                            </svg>
                            Wind
                        </button>
                    </div>
                </div>
                <div className="storm-map" style={{ position: 'relative' }}>
                    {!mapLoaded ? (
                        <div className="map-loading">
                            <div className="loading-spinner"></div>
                            <div className="loading-text">Loading storm data from NOAA API...</div>
                        </div>
                    ) : (
                        <>
                            <div id="stormMap" style={{ height: '100%', width: '100%' }} ref={mapRef}>
                                {/* Map will be initialized via useEffect */}
                            </div>
                            <div className="map-legend">
                                <div className="legend-title">Storm Severity</div>
                                <div className="legend-item">
                                    <span className="legend-marker severe"></span>
                                    <span>Severe Storm</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-marker moderate"></span>
                                    <span>Moderate Storm</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-marker watch"></span>
                                    <span>Storm Watch</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-marker clear"></span>
                                    <span>Clear</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Storm List Section */}
            <div className="storm-list-section">
                <div className="list-header">
                    <div className="list-title">Active Storm Events</div>
                    <div className="filter-controls">
                        <select 
                            className="filter-select"
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                        >
                            <option value="all">All Severities</option>
                            <option value="severe">Severe Only</option>
                            <option value="moderate">Moderate</option>
                            <option value="watch">Watches</option>
                        </select>
                        <select 
                            className="filter-select"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="24hours">Last 24 Hours</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                        </select>
                        <select 
                            className="filter-select"
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                        >
                            <option value="all">All Regions</option>
                            <option value="north">North Texas</option>
                            <option value="south">South Texas</option>
                            <option value="ok">Oklahoma</option>
                        </select>
                    </div>
                </div>
                <div className="storm-data-container">
                    {!showStorms ? (
                        <div className="api-placeholder">
                            <div className="api-icon">
                                <svg viewBox="0 0 24 24">
                                    <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15z"/>
                                </svg>
                            </div>
                            <h3 className="api-title">Storm Data Integration Ready</h3>
                            <p className="api-description">
                                This section will display real-time storm data from NOAA Weather API.
                                Data includes wind speeds, hail probability, storm paths, and affected areas.
                            </p>
                            <div className="api-status">
                                <span className="status-indicator"></span>
                                Waiting for API Connection
                            </div>
                        </div>
                    ) : (
                        <div className="storm-list">
                            {filteredStorms.map((storm, index) => (
                                <div key={index} className="storm-item">
                                    <div className={`storm-severity ${storm.severity}`}>
                                        <svg width="24" height="24" viewBox="0 0 24 24">
                                            <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8z"/>
                                        </svg>
                                    </div>
                                    <div className="storm-info">
                                        <div className="storm-name">{storm.name}</div>
                                        <div className="storm-details">
                                            <span>Wind: {storm.wind}</span>
                                            <span>Hail: {storm.hail}</span>
                                            <span>Moving: {storm.movement}</span>
                                        </div>
                                    </div>
                                    <div className="storm-action">
                                        <span className="affected-claims">{storm.claims} Claims</span>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#6b7280">
                                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StormTracking;

