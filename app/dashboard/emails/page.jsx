'use client'
import React, { useState, useEffect } from 'react';
import "./emails.css"

const Emails = () => {
    const [activeTab, setActiveTab] = useState('connect');
    const [connectedProviders, setConnectedProviders] = useState([]);
    const [scannedCount, setScannedCount] = useState(0);
    const [claimsFound, setClaimsFound] = useState(0);
    const [lastSync, setLastSync] = useState('Never');
    const [isSyncing, setIsSyncing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [monitoredCompanies, setMonitoredCompanies] = useState({
        statefarm: true,
        geico: true,
        allstate: true,
        usaa: true,
        progressive: true,
        farmers: true
    });
    const [syncFrequency, setSyncFrequency] = useState('30 minutes');
    const [scanHistory, setScanHistory] = useState('30 days');

    const forwardEmail = 'claims@intake.claimking.ai';

    const providers = [
        { id: 'gmail', name: 'Gmail', logo: 'gmail' },
        { id: 'outlook', name: 'Outlook', logo: 'outlook' },
        { id: 'yahoo', name: 'Yahoo Mail', logo: 'yahoo' },
        { id: 'imap', name: 'Other/IMAP', logo: 'imap' }
    ];

    const keywords = ['claim', 'estimate', 'supplement', 'adjuster', 'policy', 'damage'];

    const handleConnectProvider = (providerId) => {
        if (connectedProviders.includes(providerId)) {
            if (confirm(`Disconnect ${providers.find(p => p.id === providerId)?.name}?`)) {
                setConnectedProviders(prev => prev.filter(id => id !== providerId));
            }
        } else {
            alert(`Opening ${providers.find(p => p.id === providerId)?.name} authorization window...`);
            setTimeout(() => {
                setConnectedProviders(prev => [...prev, providerId]);
            }, 1000);
        }
    };

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(forwardEmail);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleSyncAll = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            setLastSync(new Date().toLocaleTimeString());
            setScannedCount(prev => prev + Math.floor(Math.random() * 50) + 10);
            setClaimsFound(prev => prev + Math.floor(Math.random() * 5));
        }, 2000);
    };

    const handleSaveSettings = () => {
        alert('Settings saved successfully!');
    };

    const handleCompanyToggle = (companyId) => {
        setMonitoredCompanies(prev => ({
            ...prev,
            [companyId]: !prev[companyId]
        }));
    };

    const connectedCount = connectedProviders.length;

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="header-left">
                    <div className="email-icon">✉</div>
                    <div className="header-content">
                        <h1>Email AI Assistant</h1>
                        <p>Connect your email to automatically import insurance claims</p>
                    </div>
                </div>
                <button 
                    className="sync-btn"
                    onClick={handleSyncAll}
                    disabled={isSyncing || connectedCount === 0}
                >
                    {isSyncing ? '⏳ Syncing...' : '🔄 Sync All'}
                </button>
            </div>

            <div className="container">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Connected</div>
                        <div className="stat-value">
                            {connectedCount}/4
                            <span className="stat-icon">🔗</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Scanned Today</div>
                        <div className="stat-value">
                            {scannedCount}
                            <span className="stat-icon">📧</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Claims Found</div>
                        <div className="stat-value">
                            {claimsFound}
                            <span className="stat-icon">📋</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Last Sync</div>
                        <div className="stat-value">
                            {lastSync}
                            <span className="stat-icon">🔄</span>
                        </div>
                    </div>
                </div>

                {/* Tabs Container */}
                <div className="tabs-container">
                    <div className="tab-buttons">
                        <button 
                            className={`tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
                            onClick={() => setActiveTab('connect')}
                        >
                            Connect Accounts
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                            onClick={() => setActiveTab('activity')}
                        >
                            Email Activity
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Settings
                        </button>
                    </div>

                    {/* Connect Accounts Tab */}
                    {activeTab === 'connect' && (
                        <div className="tab-content active">
                            <div className="email-providers">
                                {providers.map((provider) => (
                                    <div key={provider.id} className="provider-card">
                                        <div className="provider-logo">
                                            {provider.logo === 'gmail' && (
                                                <div className="gmail-logo">
                                                    <span style={{ color: '#ea4335' }}>G</span>
                                                    <span style={{ color: '#fbbc05' }}>m</span>
                                                    <span style={{ color: '#34a853' }}>a</span>
                                                    <span style={{ color: '#4285f4' }}>i</span>
                                                    <span style={{ color: '#ea4335' }}>l</span>
                                                </div>
                                            )}
                                            {provider.logo === 'outlook' && (
                                                <div className="outlook-logo">Outlo</div>
                                            )}
                                            {provider.logo === 'yahoo' && (
                                                <div className="yahoo-logo">Yahoo</div>
                                            )}
                                            {provider.logo === 'imap' && (
                                                <div className="imap-logo">✉</div>
                                            )}
                                        </div>
                                        <div className="provider-name">{provider.name}</div>
                                        <button 
                                            className={`connect-provider-btn ${connectedProviders.includes(provider.id) ? 'connected' : ''}`}
                                            onClick={() => handleConnectProvider(provider.id)}
                                        >
                                            {connectedProviders.includes(provider.id) ? 'Disconnect' : 'Connect'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="forward-box">
                                <div className="forward-box-icon">✉</div>
                                <div className="forward-content">
                                    <div className="forward-label">Or forward emails directly</div>
                                    <div className="forward-label">Set up automatic forwarding or BCC insurance emails to:</div>
                                    <span className="forward-email">{forwardEmail}</span>
                                </div>
                                <button 
                                    className="copy-btn"
                                    onClick={handleCopyEmail}
                                    style={copied ? {
                                        background: '#dcfce7',
                                        borderColor: '#86efac'
                                    } : {}}
                                >
                                    {copied ? '✅ Copied!' : '📋 Copy'}
                                </button>
                            </div>

                            <div className="benefits-grid">
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Never miss a claim</strong><br/>
                                        Automatic 24/7 email monitoring
                                    </div>
                                </div>
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Save 10+ hours/week</strong><br/>
                                        No manual data entry required
                                    </div>
                                </div>
                                <div className="benefit-card">
                                    <span className="benefit-icon">✓</span>
                                    <div className="benefit-text">
                                        <strong>Smart AI detection</strong><br/>
                                        Finds claim numbers and dates automatically
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email Activity Tab */}
                    {activeTab === 'activity' && (
                        <div className="tab-content active">
                            <div className="empty-state">
                                <div className="empty-icon">📥</div>
                                <div className="empty-title">No emails scanned yet</div>
                                <div className="empty-text">Connect an email account to start monitoring insurance emails</div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="tab-content active">
                            <div className="settings-section">
                                <h3 className="settings-title">Insurance Companies to Monitor</h3>
                                <p className="settings-description">
                                    Select which insurance companies you work with. Emails from these companies will be prioritized.
                                </p>
                                <div className="checkbox-grid">
                                    {Object.entries(monitoredCompanies).map(([companyId, checked]) => (
                                        <div key={companyId} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id={companyId}
                                                checked={checked}
                                                onChange={() => handleCompanyToggle(companyId)}
                                            />
                                            <label htmlFor={companyId}>
                                                {companyId.charAt(0).toUpperCase() + companyId.slice(1)}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3 className="settings-title">Detection Keywords</h3>
                                <p className="settings-description">
                                    Emails containing these keywords will be flagged as claim-related.
                                </p>
                                <div className="keyword-tags">
                                    {keywords.map((keyword, index) => (
                                        <span key={index} className="keyword-tag">{keyword}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="settings-section">
                                <h3 className="settings-title">Sync Settings</h3>
                                <div className="settings-dropdowns">
                                    <div className="dropdown-group">
                                        <label className="dropdown-label">Sync Frequency</label>
                                        <select 
                                            className="dropdown-select"
                                            value={syncFrequency}
                                            onChange={(e) => setSyncFrequency(e.target.value)}
                                        >
                                            <option>Every 5 minutes</option>
                                            <option>Every 15 minutes</option>
                                            <option>Every 30 minutes</option>
                                            <option>Every hour</option>
                                        </select>
                                    </div>
                                    <div className="dropdown-group">
                                        <label className="dropdown-label">Scan History</label>
                                        <select 
                                            className="dropdown-select"
                                            value={scanHistory}
                                            onChange={(e) => setScanHistory(e.target.value)}
                                        >
                                            <option>Last 7 days</option>
                                            <option>Last 30 days</option>
                                            <option>Last 90 days</option>
                                            <option>All emails</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button className="save-settings-btn" onClick={handleSaveSettings}>
                                <span>💾</span>
                                Save Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Emails;

