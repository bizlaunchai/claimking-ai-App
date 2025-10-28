'use client';
import React, { useState } from 'react';

// JSON data for tabs and features
const featureData = [
    {
        id: 'ai-tools',
        label: '🤖 AI Tools',
        cards: [
            {
                icon: '🎯',
                title: 'AI Material Estimation',
                description:
                    'Upload any measurement report (EagleView, Xactimate, etc.) and get instant, accurate material calculations.',
                benefits: ['95% accuracy rate', '60-second processing', 'Saves 2+ hours per claim'],
            },
            {
                icon: '🏠',
                title: '3D Property Mockups',
                description:
                    'Show clients exactly how their property will look with AI-generated visualizations of different materials and colors.',
                benefits: ['Photorealistic renders', 'Close 40% more deals', 'Unlimited variations'],
            },
            {
                icon: '📋',
                title: 'Smart Supplementing',
                description:
                    'AI identifies missing line items and generates supplements that increase claim values by an average of 34%.',
                benefits: ['+$15K average per claim', 'Code-compliant items', 'Auto-justification'],
            },
            {
                icon: '📄',
                title: 'Policy Analyzer',
                description:
                    'Upload any insurance policy and instantly understand coverage details, deductibles, and claim opportunities.',
                benefits: ['Instant analysis', 'Coverage maximization', 'Never miss coverage'],
            },
            {
                icon: '✉️',
                title: 'AI Email Responder',
                description:
                    'Professional responses to adjusters and clients in seconds, with perfect tone and building code references.',
                benefits: ['4 tone options', 'Code citations included', '10-second generation'],
            },
            {
                icon: '📞',
                title: 'AI Call Center',
                description:
                    '24/7 AI receptionist that answers calls, schedules appointments, and never misses a lead.',
                benefits: ['Never miss a call', 'Auto-scheduling', 'Lead qualification'],
            },
        ],
    },
    {
        id: 'estimation',
        label: '📊 Estimation',
        cards: [
            {
                icon: '📊',
                title: 'Quick Estimates',
                description: 'Generate fast and accurate project estimates in seconds.',
                benefits: ['✅ High accuracy', '⏱ Less than 1 min processing', '💰 Cost-effective'],
            },
            {
                icon: '📝',
                title: 'Estimate Reports',
                description: 'Automatically generate professional reports for clients and adjusters.',
                benefits: ['📄 Ready-to-send PDFs', '🎨 Customizable templates', '✔️ Easy approvals'],
            },
            {
                icon: '🔧',
                title: 'Material Calculator',
                description: 'Quickly calculate material needs for any project using AI-powered estimations.',
                benefits: ['📏 Accurate measurements', '⚡ Fast calculations', '💡 Suggests optimizations'],
            },
            {
                icon: '🏗️',
                title: 'Roof & Siding Estimator',
                description: 'AI-powered calculations for roofing, siding, and exterior materials.',
                benefits: ['🏠 Exact material counts', '⏱ Quick processing', '💰 Cost-saving suggestions'],
            },
            {
                icon: '📐',
                title: 'Custom Project Templates',
                description: 'Create reusable estimation templates for recurring project types.',
                benefits: ['📋 Pre-filled forms', '🖊 Editable fields', '⚡ Faster future estimates'],
            },
        ],
    },
    {
        id: 'communication',
        label: '📞 Communication',
        cards: [
            {
                icon: '📧',
                title: 'AI Email Responder',
                description: 'Send professional responses to clients and adjusters automatically.',
                benefits: ['✅ Fast replies', '🖊 Perfect tone', '📚 Code references included'],
            },
            {
                icon: '📞',
                title: 'AI Call Center',
                description:
                    '24/7 AI receptionist handles calls and schedules appointments automatically.',
                benefits: ['📅 Auto-scheduling', '☎️ Never miss a call', '💡 Lead qualification'],
            },
            {
                icon: '💬',
                title: 'Client Chatbot',
                description: 'Answer client questions instantly with AI-powered chat.',
                benefits: ['⚡ Instant replies', '🤖 Smart suggestions', '✅ 24/7 availability'],
            },
            {
                icon: '📲',
                title: 'SMS Notifications',
                description:
                    'Keep clients updated with automated SMS notifications for every claim status.',
                benefits: ['📨 Instant updates', '🔔 Alerts and reminders', '💬 Two-way messaging'],
            },
            {
                icon: '📋',
                title: 'Team Collaboration',
                description:
                    'Communicate internally with your team seamlessly in one platform.',
                benefits: ['👥 Team chat', '📌 Task assignments', '✅ Status tracking'],
            },
        ],
    },

    // Management Tab
    {
        id: 'management',
        label: '📁 Management',
        cards: [
            {
                icon: '👥',
                title: 'Team Management',
                description: 'Assign roles, track performance, and manage your team efficiently.',
                benefits: ['Role-based access', 'Performance tracking', 'Task assignments'],
            },
            {
                icon: '🗂',
                title: 'Project Organization',
                description: 'Keep all projects organized with folders, tags, and timelines.',
                benefits: ['Folder structure', 'Tagging system', 'Timeline visualization'],
            },
            {
                icon: '📌',
                title: 'Task Tracking',
                description: 'Monitor tasks from creation to completion with automated reminders.',
                benefits: ['Progress tracking', 'Deadlines & reminders', 'Priority labels'],
            },
            {
                icon: '🔔',
                title: 'Notifications & Alerts',
                description: 'Stay informed about important updates and deadlines instantly.',
                benefits: ['Real-time alerts', 'Custom notifications', 'Email & SMS options'],
            },
            {
                icon: '📑',
                title: 'Document Management',
                description: 'Store, share, and collaborate on documents securely in one place.',
                benefits: ['Secure storage', 'Version control', 'Easy sharing'],
            },
        ],
    },

// Analytics Tab
    {
        id: 'analytics',
        label: '📈 Analytics',
        cards: [
            {
                icon: '📊',
                title: 'Claim Performance',
                description: 'Track claim status, approval rates, and processing times.',
                benefits: ['Visual dashboards', 'KPI tracking', 'Automated reports'],
            },
            {
                icon: '💰',
                title: 'Revenue Insights',
                description: 'Analyze revenue generated per claim and per client.',
                benefits: ['Profit analysis', 'Trend tracking', 'Custom metrics'],
            },
            {
                icon: '⚙️',
                title: 'Operational Metrics',
                description: 'Monitor internal processes and identify bottlenecks quickly.',
                benefits: ['Efficiency monitoring', 'Workflow optimization', 'Alerts for delays'],
            },
            {
                icon: '🧩',
                title: 'Custom Reports',
                description: 'Create personalized reports for clients, management, or investors.',
                benefits: ['Flexible templates', 'Export options', 'Automated scheduling'],
            },
            {
                icon: '🔍',
                title: 'Data Insights',
                description: 'Dive deep into data to uncover trends, opportunities, and risks.',
                benefits: ['Trend analysis', 'Predictive analytics', 'Visual charts'],
            },
        ],
    },

];



const Features = () => {
    const [activeTab, setActiveTab] = useState(featureData[0].id);

    return (
        <section className="features" id="features">
            <div className="section-header">
                <h2 className="section-title">
                    Every Tool You Need to <span className="hero-highlight">Dominate</span> Insurance Claims
                </h2>
                <p className="section-subtitle">
                    One platform that replaces 10+ different tools and saves you $2,000+ per month
                </p>
            </div>

            {/* Tabs */}
            <div className="feature-tabs">
                {featureData.map((tab) => (
                    <button
                        key={tab.id}
                        className={`feature-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            {featureData.map((tab) => (
                <div
                    key={tab.id}
                    className={`feature-content ${activeTab === tab.id ? 'active' : ''}`}
                    id={tab.id}
                >
                    <div className="feature-grid">
                        {tab.cards.map((card, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon">{card.icon}</div>
                                <h3 className="feature-title">{card.title}</h3>
                                <p className="feature-description">{card.description}</p>
                                <div className="feature-benefits">
                                    {card.benefits.map((benefit, idx) => (
                                        <div key={idx} className="benefit-item">
                                            <svg viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                            </svg>
                                            {benefit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
};

export default Features;
