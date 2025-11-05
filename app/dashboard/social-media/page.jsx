'use client'
import React, { useState } from 'react';
import "./social-media.css"

const SocialMedia = () => {
    const [connectedPlatforms, setConnectedPlatforms] = useState(['facebook', 'instagram']);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState({
        facebook: true,
        instagram: true,
        linkedin: false,
        twitter: false
    });

    const platforms = [
        {
            id: 'facebook',
            name: 'Facebook',
            icon: 'f',
            iconClass: 'facebook-icon',
            connected: true,
            stats: {
                pageLikes: '12,345',
                followers: '12,890',
                weeklyReach: '45.2K'
            }
        },
        {
            id: 'instagram',
            name: 'Instagram',
            icon: '📷',
            iconClass: 'instagram-icon',
            connected: true,
            stats: {
                followers: '8,765',
                following: '234',
                posts: '456'
            }
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            icon: 'in',
            iconClass: 'linkedin-icon',
            connected: false,
            stats: {
                connections: '-',
                followers: '-',
                views: '-'
            }
        },
        {
            id: 'twitter',
            name: 'X (Twitter)',
            icon: 'X',
            iconClass: 'twitter-icon',
            connected: false,
            stats: {
                followers: '-',
                following: '-',
                tweets: '-'
            }
        }
    ];

    const projects = [
        { id: 'johnson', name: 'Johnson Property - Roof Replacement' },
        { id: 'smith', name: 'Smith Residence - Complete Exterior' },
        { id: 'davis', name: 'Davis Complex - Storm Repair' },
        { id: 'wilson', name: 'Wilson Estate - Siding & Trim' }
    ];

    const projectDescriptions = {
        johnson: "🏠 Just completed another stunning transformation at the Johnson Property! \n\n✨ What we did:\n• Full roof replacement with GAF Timberline HDZ shingles in Charcoal\n• New gutters and downspouts\n• Complete ridge vent system\n\nThis project improved both the home's protection and curb appeal. Our team completed the entire job in just 2 days with minimal disruption to the homeowners.\n\nReady to upgrade your home? Contact us for a free estimate!\n\n#RoofingExperts #HomeImprovement #QualityWork #CustomerSatisfaction",
        smith: "🔨 Complete exterior makeover at the Smith Residence! \n\n📋 Project details:\n• New architectural shingles\n• Premium vinyl siding installation\n• Custom trim work\n• Energy-efficient windows\n\nThe transformation is incredible! This home is now protected from the elements and looks absolutely beautiful.\n\n#ExteriorRemodeling #HomeRenovation #BeforeAndAfter",
        davis: "⛈️ Storm damage? We've got you covered! \n\n✅ Emergency repairs completed at Davis Complex:\n• Hail damage assessment and repair\n• Insurance claim assistance\n• Quick turnaround time\n\nDon't let storm damage compromise your home's safety. We work directly with insurance companies!\n\n#StormDamage #RoofRepair #InsuranceClaims",
        wilson: "🎨 Beautiful siding and trim upgrade at the Wilson Estate! \n\n🏡 Project highlights:\n• CertainTeed vinyl siding in Arctic White\n• Custom color-matched trim\n• Maintenance-free materials\n\nIncreased home value and curb appeal with this stunning transformation!\n\n#SidingInstallation #HomeValue #CurbAppeal"
    };

    const handleConnectPlatform = (platformId) => {
        if (connectedPlatforms.includes(platformId)) {
            if (confirm(`Are you sure you want to disconnect ${platforms.find(p => p.id === platformId)?.name}?`)) {
                setConnectedPlatforms(prev => prev.filter(id => id !== platformId));
                setSelectedPlatforms(prev => ({
                    ...prev,
                    [platformId]: false
                }));
            }
        } else {
            if (confirm(`Connect to ${platforms.find(p => p.id === platformId)?.name}?`)) {
                alert(`Opening ${platforms.find(p => p.id === platformId)?.name} authorization window...`);
                setTimeout(() => {
                    setConnectedPlatforms(prev => [...prev, platformId]);
                }, 1000);
            }
        }
    };

    const handleProjectSelect = (projectId) => {
        setSelectedProject(projectId);
    };

    const handlePlatformToggle = (platformId) => {
        if (!connectedPlatforms.includes(platformId)) {
            alert(`Please connect ${platforms.find(p => p.id === platformId)?.name} first`);
            return;
        }
        setSelectedPlatforms(prev => ({
            ...prev,
            [platformId]: !prev[platformId]
        }));
    };

    const handleRegenerateDescription = () => {
        const content = document.getElementById('postContent');
        if (content) {
            content.style.opacity = '0.5';
            setTimeout(() => {
                content.textContent = "🚧 New project showcase! \n\n" +
                    "We're proud to share this recent transformation that demonstrates our commitment to quality and customer satisfaction.\n\n" +
                    "✔️ Professional installation\n" +
                    "✔️ Premium materials\n" +
                    "✔️ Exceptional results\n\n" +
                    "Contact us today to discuss your home improvement needs!\n\n" +
                    "#QualityConstruction #HomeImprovement #CustomerFirst";
                content.style.opacity = '1';
                alert('Description regenerated with AI!');
            }, 1000);
        }
    };

    const handlePostToSocial = () => {
        const selected = Object.entries(selectedPlatforms)
            .filter(([_, selected]) => selected)
            .map(([platformId, _]) => platforms.find(p => p.id === platformId)?.name)
            .filter(Boolean);

        if (selected.length > 0) {
            alert(`Posting to: ${selected.join(', ')}\n\nYour project has been shared successfully!`);
        } else {
            alert('Please select at least one platform to post to.');
        }
    };

    const currentDescription = selectedProject ? projectDescriptions[selectedProject] || '' : '';

    return (
        <div>
            {/* Header Section */}
            <div className="header-section">
                <div className="header-content">
                    <div className="page-title">
                        <div className="crown-logo">
                            <svg viewBox="0 0 24 24" fill="#1a1f3a" width="24" height="24">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                            </svg>
                        </div>
                        Social Media
                    </div>
                    <p className="page-subtitle">Connect your accounts and share your projects</p>
                </div>
            </div>

            {/* Main Container */}
            <div className="main-container">
                {/* Platform Connection Grid */}
                <div className="platforms-grid">
                    {platforms.map((platform) => (
                        <div key={platform.id} className="platform-card">
                            <div className="platform-header">
                                <div className={`platform-icon ${platform.iconClass}`}>{platform.icon}</div>
                                <div className="platform-info">
                                    <div className="platform-name">{platform.name}</div>
                                    <span className={`platform-status ${platform.connected ? 'status-connected' : 'status-disconnected'}`}>
                                        {platform.connected ? 'Connected' : 'Not Connected'}
                                    </span>
                                </div>
                            </div>
                            <div className="platform-stats">
                                {platform.id === 'facebook' && (
                                    <>
                                        <div className="stat-item">
                                            <span className="stat-label">Page Likes:</span>
                                            <span className="stat-value">{platform.stats.pageLikes}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Followers:</span>
                                            <span className="stat-value">{platform.stats.followers}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Weekly Reach:</span>
                                            <span className="stat-value">{platform.stats.weeklyReach}</span>
                                        </div>
                                    </>
                                )}
                                {platform.id === 'instagram' && (
                                    <>
                                        <div className="stat-item">
                                            <span className="stat-label">Followers:</span>
                                            <span className="stat-value">{platform.stats.followers}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Following:</span>
                                            <span className="stat-value">{platform.stats.following}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Posts:</span>
                                            <span className="stat-value">{platform.stats.posts}</span>
                                        </div>
                                    </>
                                )}
                                {platform.id === 'linkedin' && (
                                    <>
                                        <div className="stat-item">
                                            <span className="stat-label">Connections:</span>
                                            <span className="stat-value">{platform.stats.connections}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Followers:</span>
                                            <span className="stat-value">{platform.stats.followers}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Views:</span>
                                            <span className="stat-value">{platform.stats.views}</span>
                                        </div>
                                    </>
                                )}
                                {platform.id === 'twitter' && (
                                    <>
                                        <div className="stat-item">
                                            <span className="stat-label">Followers:</span>
                                            <span className="stat-value">{platform.stats.followers}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Following:</span>
                                            <span className="stat-value">{platform.stats.following}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Tweets:</span>
                                            <span className="stat-value">{platform.stats.tweets}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button 
                                className={`connect-btn ${connectedPlatforms.includes(platform.id) ? 'danger' : 'primary'}`}
                                onClick={() => handleConnectPlatform(platform.id)}
                            >
                                {connectedPlatforms.includes(platform.id) ? 'Disconnect' : `Connect ${platform.name}`}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Analytics Section */}
                <div className="analytics-section">
                    <h2 className="section-title">Analytics Overview</h2>
                    <div className="analytics-grid">
                        <div className="metric-card">
                            <div className="metric-value">98.5K</div>
                            <div className="metric-label">Total Views</div>
                            <div className="metric-change change-positive">↑ 12% from last week</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">4,567</div>
                            <div className="metric-label">Engagements</div>
                            <div className="metric-change change-positive">↑ 8% from last week</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">234</div>
                            <div className="metric-label">New Followers</div>
                            <div className="metric-change change-negative">↓ 3% from last week</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">89</div>
                            <div className="metric-label">Posts Shared</div>
                            <div className="metric-change change-positive">↑ 15% from last week</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">1.2K</div>
                            <div className="metric-label">Profile Visits</div>
                            <div className="metric-change change-positive">↑ 5% from last week</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-value">4.5%</div>
                            <div className="metric-label">Engagement Rate</div>
                            <div className="metric-change change-positive">↑ 0.3% from last week</div>
                        </div>
                    </div>
                </div>

                {/* Post Project Section */}
                <div className="post-section">
                    <div className="post-header">
                        <h2 className="section-title">Share Project</h2>
                        <span className="ai-badge">AI-Powered Descriptions</span>
                    </div>
                    
                    <div className="project-selector">
                        <div className="select-label">Select a Project to Share</div>
                        <select 
                            className="project-select"
                            value={selectedProject}
                            onChange={(e) => handleProjectSelect(e.target.value)}
                        >
                            <option value="">Choose a project...</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedProject && (
                        <>
                            <div className="preview-section">
                                <div className="preview-label">AI-Generated Post Description</div>
                                <div className="preview-content" id="postContent">
                                    {currentDescription}
                                </div>
                                
                                <div className="preview-photos">
                                    <div className="preview-photo">Before Photo</div>
                                    <div className="preview-photo">After Photo</div>
                                    <div className="preview-photo">Detail Shot</div>
                                    <div className="preview-photo">Team Photo</div>
                                </div>
                            </div>

                            <div className="platform-selector">
                                <div className="select-label">Select Platforms to Post</div>
                                <div className="platform-checkboxes">
                                    {platforms.map((platform) => (
                                        <div key={platform.id} className="platform-checkbox">
                                            <input
                                                type="checkbox"
                                                id={`post${platform.id.charAt(0).toUpperCase() + platform.id.slice(1)}`}
                                                checked={selectedPlatforms[platform.id]}
                                                disabled={!connectedPlatforms.includes(platform.id)}
                                                onChange={() => handlePlatformToggle(platform.id)}
                                            />
                                            <label htmlFor={`post${platform.id.charAt(0).toUpperCase() + platform.id.slice(1)}`}>
                                                {platform.name}{!connectedPlatforms.includes(platform.id) && ' (Not Connected)'}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="post-actions">
                                <button className="btn btn-primary" onClick={handlePostToSocial}>
                                    Post to Selected Platforms
                                </button>
                                <button className="btn btn-outline" onClick={handleRegenerateDescription}>
                                    Regenerate Description
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SocialMedia;

