'use client'
import React, { useState, useRef, useEffect } from 'react';
import "./crm-sync.css"

const CRMSync = () => {
    const [selectedCRM, setSelectedCRM] = useState(null);
    const [showCustomCRM, setShowCustomCRM] = useState(false);
    const [customCRMName, setCustomCRMName] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [openFAQs, setOpenFAQs] = useState({});
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { type: 'bot', text: "Hi! I'm your ClaimKing AI assistant. I can help you connect any CRM to ClaimKing.AI. What CRM are you using?" }
    ]);
    const [chatInput, setChatInput] = useState('');
    const chatMessagesRef = useRef(null);

    const integrations = {
        salesforce: {
            icon: '☁️',
            name: 'Salesforce',
            subtitle: 'Follow these steps to connect Salesforce with ClaimKing.AI',
            steps: [
                {
                    title: 'Login to Salesforce',
                    description: 'Navigate to Setup > Apps > App Manager in your Salesforce account.',
                    code: null
                },
                {
                    title: 'Create Connected App',
                    description: 'Click "New Connected App" and fill in the following details:\n• App Name: ClaimKing Integration\n• Contact Email: Your email\n• Enable OAuth Settings: Checked',
                    code: 'Callback URL: https://app.claimking.ai/auth/salesforce/callback'
                },
                {
                    title: 'Configure OAuth Scopes',
                    description: 'Select the following OAuth scopes:\n• Access and manage your data (api)\n• Perform requests on your behalf (refresh_token)',
                    code: null
                },
                {
                    title: 'Copy Credentials',
                    description: 'After saving, copy your Consumer Key and Consumer Secret.',
                    code: 'Consumer Key: YOUR_KEY_HERE\nConsumer Secret: YOUR_SECRET_HERE'
                },
                {
                    title: 'Enter in ClaimKing',
                    description: 'Go to ClaimKing Settings > Integrations > Salesforce and paste your credentials. Click "Connect" to complete the integration.',
                    code: null
                }
            ]
        },
        hubspot: {
            icon: '🔶',
            name: 'HubSpot',
            subtitle: 'Connect HubSpot CRM with ClaimKing.AI in minutes',
            steps: [
                {
                    title: 'Access HubSpot Settings',
                    description: 'Log in to HubSpot and navigate to Settings > Integrations > Private Apps.',
                    code: null
                },
                {
                    title: 'Create Private App',
                    description: 'Click "Create a private app" and name it "ClaimKing Integration".',
                    code: null
                },
                {
                    title: 'Set Scopes',
                    description: 'Enable these scopes:\n• CRM: Contacts, Companies, Deals\n• Timeline: Read/Write access',
                    code: null
                },
                {
                    title: 'Generate Access Token',
                    description: 'Click "Create app" and copy your Access Token.',
                    code: 'Access Token: pk_live_xxxxxxxxxxxxx'
                },
                {
                    title: 'Complete Integration',
                    description: 'In ClaimKing, go to Settings > Integrations > HubSpot, paste your token, and click "Connect".',
                    code: null
                }
            ]
        },
        zoho: {
            icon: '📊',
            name: 'Zoho CRM',
            subtitle: 'Set up Zoho CRM integration with ClaimKing.AI',
            steps: [
                {
                    title: 'Zoho Developer Console',
                    description: 'Go to Zoho Developer Console at api-console.zoho.com',
                    code: null
                },
                {
                    title: 'Register Client',
                    description: 'Click "Add Client" and select "Server-based Applications".',
                    code: 'Redirect URI: https://app.claimking.ai/auth/zoho/callback'
                },
                {
                    title: 'Configure Scopes',
                    description: 'Add these scopes:\n• ZohoCRM.modules.ALL\n• ZohoCRM.settings.ALL',
                    code: null
                },
                {
                    title: 'Get Credentials',
                    description: 'Copy your Client ID and Client Secret.',
                    code: 'Client ID: YOUR_CLIENT_ID\nClient Secret: YOUR_CLIENT_SECRET'
                },
                {
                    title: 'Authorize in ClaimKing',
                    description: 'Enter credentials in ClaimKing Settings > Integrations > Zoho and authorize.',
                    code: null
                }
            ]
        },
        pipedrive: {
            icon: '🎯',
            name: 'Pipedrive',
            subtitle: 'Connect Pipedrive to ClaimKing.AI',
            steps: [
                {
                    title: 'Get API Token',
                    description: 'In Pipedrive, go to Settings > Personal Preferences > API.',
                    code: null
                },
                {
                    title: 'Copy Your Token',
                    description: 'Your personal API token is displayed. Copy it securely.',
                    code: 'API Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                },
                {
                    title: 'Configure Webhooks',
                    description: 'Go to Tools > Webhooks and add ClaimKing webhook URL.',
                    code: 'Webhook URL: https://app.claimking.ai/webhooks/pipedrive'
                },
                {
                    title: 'Connect in ClaimKing',
                    description: 'Enter your API token in ClaimKing Settings > Integrations > Pipedrive.',
                    code: null
                }
            ]
        },
        monday: {
            icon: '📅',
            name: 'Monday.com',
            subtitle: 'Integrate Monday.com with ClaimKing.AI',
            steps: [
                {
                    title: 'Access Admin Settings',
                    description: 'Click your profile picture > Admin > API.',
                    code: null
                },
                {
                    title: 'Generate API Token',
                    description: 'Click "Generate" to create a new API v2 token.',
                    code: 'API Token: eyJhbGciOiJIUzI1NiJ9.xxxxx'
                },
                {
                    title: 'Set Permissions',
                    description: 'Ensure the token has read/write access to boards and items.',
                    code: null
                },
                {
                    title: 'Add to ClaimKing',
                    description: 'Paste token in ClaimKing Settings > Integrations > Monday.com.',
                    code: null
                }
            ]
        },
        clickup: {
            icon: '🚀',
            name: 'ClickUp',
            subtitle: 'Connect ClickUp to ClaimKing.AI',
            steps: [
                {
                    title: 'Get Personal Token',
                    description: 'Go to Settings > Apps > Generate Personal Token.',
                    code: null
                },
                {
                    title: 'Copy Token',
                    description: 'Copy your personal API token.',
                    code: 'Personal Token: pk_xxxxxxxxxx_xxxxxxxxxxxxxxxxxx'
                },
                {
                    title: 'Find Workspace ID',
                    description: 'Your Workspace ID is in the URL when viewing ClickUp.',
                    code: 'Workspace ID: 1234567'
                },
                {
                    title: 'Configure ClaimKing',
                    description: 'Add token and workspace ID in ClaimKing Settings > Integrations > ClickUp.',
                    code: null
                }
            ]
        },
        freshsales: {
            icon: '🌿',
            name: 'Freshsales',
            subtitle: 'Set up Freshsales CRM integration',
            steps: [
                {
                    title: 'Access API Settings',
                    description: 'Go to Settings > API Settings in your Freshsales account.',
                    code: null
                },
                {
                    title: 'Copy API Key',
                    description: 'Your API key is displayed in the settings.',
                    code: 'API Key: xxxxxxxxxxxxxxxxxx'
                },
                {
                    title: 'Note Your Domain',
                    description: 'Your Freshsales domain is needed for connection.',
                    code: 'Domain: yourcompany.freshsales.io'
                },
                {
                    title: 'Connect to ClaimKing',
                    description: 'Enter API key and domain in ClaimKing Settings > Integrations > Freshsales.',
                    code: null
                }
            ]
        },
        jobber: {
            icon: '🔨',
            name: 'Jobber',
            subtitle: 'Connect Jobber to ClaimKing.AI',
            steps: [
                {
                    title: 'Request API Access',
                    description: 'Contact Jobber support to enable API access for your account.',
                    code: null
                },
                {
                    title: 'Create App in Developer Portal',
                    description: 'Once approved, create a new app in developer.getjobber.com',
                    code: 'Redirect URL: https://app.claimking.ai/auth/jobber/callback'
                },
                {
                    title: 'Get OAuth Credentials',
                    description: 'Copy your Client ID and Client Secret from the app settings.',
                    code: 'Client ID: xxxxx\nClient Secret: xxxxx'
                },
                {
                    title: 'Authorize in ClaimKing',
                    description: 'Enter credentials in ClaimKing Settings > Integrations > Jobber and complete OAuth flow.',
                    code: null
                }
            ]
        },
        acculynx: {
            icon: '🏠',
            name: 'AccuLynx',
            subtitle: 'Integrate AccuLynx with ClaimKing.AI',
            steps: [
                {
                    title: 'Enable API Access',
                    description: 'Contact AccuLynx support to enable API access for your account.',
                    code: null
                },
                {
                    title: 'Get API Credentials',
                    description: 'AccuLynx will provide your API key and subdomain.',
                    code: 'API Key: xxxxxxxxxx\nSubdomain: yourcompany'
                },
                {
                    title: 'Configure Webhooks',
                    description: 'Set up webhooks in AccuLynx for real-time updates.',
                    code: 'Webhook URL: https://app.claimking.ai/webhooks/acculynx'
                },
                {
                    title: 'Complete Setup',
                    description: 'Enter credentials in ClaimKing Settings > Integrations > AccuLynx.',
                    code: null
                }
            ]
        },
        jobprogress: {
            icon: '📈',
            name: 'JobProgress',
            subtitle: 'Connect JobProgress to ClaimKing.AI',
            steps: [
                {
                    title: 'Access Developer Settings',
                    description: 'Go to Settings > Developer > API Keys in JobProgress.',
                    code: null
                },
                {
                    title: 'Create API Key',
                    description: 'Click "Create New Key" and name it "ClaimKing Integration".',
                    code: 'API Key: JP_xxxxxxxxxxxxxxxxxx'
                },
                {
                    title: 'Set Permissions',
                    description: 'Enable permissions for Jobs, Customers, and Financial data.',
                    code: null
                },
                {
                    title: 'Add to ClaimKing',
                    description: 'Enter API key in ClaimKing Settings > Integrations > JobProgress.',
                    code: null
                }
            ]
        }
    };

    const crms = [
        { key: 'salesforce', icon: '☁️', name: 'Salesforce', tag: 'Popular' },
        { key: 'hubspot', icon: '🔶', name: 'HubSpot', tag: 'Easy Setup' },
        { key: 'zoho', icon: '📊', name: 'Zoho CRM', tag: 'Affordable' },
        { key: 'pipedrive', icon: '🎯', name: 'Pipedrive', tag: 'Sales Focus' },
        { key: 'monday', icon: '📅', name: 'Monday.com', tag: 'Visual' },
        { key: 'clickup', icon: '🚀', name: 'ClickUp', tag: 'All-in-One' },
        { key: 'freshsales', icon: '🌿', name: 'Freshsales', tag: 'AI Powered' },
        { key: 'jobber', icon: '🔨', name: 'Jobber', tag: 'Field Service' },
        { key: 'acculynx', icon: '🏠', name: 'AccuLynx', tag: 'Roofing' },
        { key: 'jobprogress', icon: '📈', name: 'JobProgress', tag: 'Contractors' },
    ];

    const faqs = [
        {
            question: 'How long does the integration process take?',
            answer: 'Most CRM integrations can be completed in 10-15 minutes. Simply follow our step-by-step guide and enter your API credentials. Our support team is available if you need assistance.'
        },
        {
            question: 'Is my data secure during integration?',
            answer: 'Absolutely. We use enterprise-grade encryption and OAuth 2.0 authentication for all CRM connections. Your data is transmitted securely and we never store your CRM passwords. All integrations comply with SOC 2 and industry standards.'
        },
        {
            question: 'Can I connect multiple CRMs?',
            answer: 'Yes! ClaimKing.AI supports multi-CRM integration. You can connect different CRMs for different teams or workflows. Each connection is managed separately in your settings.'
        },
        {
            question: 'What data syncs between ClaimKing and my CRM?',
            answer: 'ClaimKing.AI syncs client information, project details, estimates, communications, and documents. You can customize which data types to sync in your integration settings. All syncing happens in real-time or on your preferred schedule.'
        },
        {
            question: 'What if my CRM isn\'t listed?',
            answer: 'No problem! Use our AI assistant below or contact our support team. We can help you set up a custom integration using webhooks, Zapier, or our REST API. Most CRMs can be connected even if they\'re not in our pre-configured list.'
        }
    ];

    const handleCRMClick = (crmKey) => {
        setSelectedCRM(crmKey);
        setShowCustomCRM(false);
        setAiResponse(null);
    };

    const handleGetAIHelp = () => {
        if (!customCRMName.trim()) {
            alert('Please enter your CRM name');
            return;
        }
        
        const crmNameLower = customCRMName.toLowerCase().replace(/\s+/g, '');
        setAiResponse({
            name: customCRMName,
            steps: [
                {
                    title: 'Locate API Settings',
                    description: `In ${customCRMName}, navigate to Settings or Administration panel. Look for "API", "Integrations", or "Developer" section.`,
                    code: null
                },
                {
                    title: 'Generate API Credentials',
                    description: 'Create a new API key or OAuth application. You\'ll need read/write access to contacts, companies, and deals.',
                    code: `API Endpoint: https://api.${crmNameLower}.com/v1/`
                },
                {
                    title: 'Configure Webhooks',
                    description: 'Set up webhooks for real-time data sync. Use this URL for webhook callbacks:',
                    code: 'https://app.claimking.ai/webhooks/custom'
                },
                {
                    title: 'Test & Connect',
                    description: 'Use our API testing tool in ClaimKing Settings > Integrations > Custom CRM to verify your connection.',
                    code: null
                }
            ]
        });
    };

    const toggleFAQ = (index) => {
        setOpenFAQs(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;

        const userMessage = { type: 'user', text: chatInput };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');

        setTimeout(() => {
            let response = "I can help you with that! ";
            
            if (chatInput.toLowerCase().includes('api')) {
                response += "To find your API key, check the Settings or Developer section of your CRM. Most CRMs have it under 'Integrations' or 'API Access'.";
            } else if (chatInput.toLowerCase().includes('webhook')) {
                response += "For webhooks, you'll need to add this URL to your CRM: https://app.claimking.ai/webhooks/custom. This allows real-time data syncing.";
            } else if (chatInput.toLowerCase().includes('error') || chatInput.toLowerCase().includes('problem')) {
                response += "Let me help troubleshoot. What error message are you seeing? Common issues include incorrect API keys or insufficient permissions.";
            } else {
                response += "Could you tell me which CRM you're using and what specific help you need with the integration?";
            }
            
            setChatMessages(prev => [...prev, { type: 'bot', text: response }]);
        }, 1000);
    };

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const currentIntegration = selectedCRM ? integrations[selectedCRM] : null;

    return (
        <div>
            {/* Top Header */}
            <div className="crm-sync-header">
                <div className="crm-sync-header-container">
                    <div className="crm-sync-logo-section">
                        <div className="crm-sync-logo">
                            <svg viewBox="0 0 24 24">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                            </svg>
                        </div>
                        <div className="crm-sync-logo-text">ClaimKing.AI</div>
                    </div>
                    <div className="crm-sync-support-info">
                        <div className="crm-sync-support-item">
                            <svg stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            <strong>Support:</strong> 1-800-CLAIMKING
                        </div>
                        <div className="crm-sync-support-item">
                            <svg stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <strong>Email:</strong> support@claimking.ai
                        </div>
                    </div>
                </div>
            </div>

            <div className="main-container">
            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-badge">Easy Setup</div>
                <h1 className="hero-title">Connect Your CRM to ClaimKing.AI</h1>
                <p className="hero-subtitle">
                    Seamlessly integrate ClaimKing.AI with your existing CRM system. Choose from our pre-configured integrations or use our AI assistant to help set up any CRM.
                </p>
            </div>

            {/* CRM Selection */}
            <div className="crm-selection">
                <div className="section-header">
                    <h2 className="section-title">Select Your CRM System</h2>
                    <p className="section-description">Choose from our top 10 supported CRMs or select "Other" for custom integration help</p>
                </div>

                <div className="crm-grid">
                    {crms.map((crm) => (
                        <div 
                            key={crm.key}
                            className={`crm-card ${selectedCRM === crm.key ? 'selected' : ''}`}
                            onClick={() => handleCRMClick(crm.key)}
                        >
                            <div className="crm-icon">{crm.icon}</div>
                            <div className="crm-name">{crm.name}</div>
                            <div className="crm-tag">{crm.tag}</div>
                        </div>
                    ))}
                    <div className="other-crm-btn" onClick={() => {
                        setShowCustomCRM(true);
                        setSelectedCRM(null);
                        setAiResponse(null);
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Other CRM System
                    </div>
                </div>
            </div>

            {/* Integration Instructions */}
            {currentIntegration && (
                <div className="integration-section active">
                    <div className="integration-header">
                        <div className="integration-icon">{currentIntegration.icon}</div>
                        <div className="integration-title">
                            <h3>{currentIntegration.name} Integration</h3>
                            <p>{currentIntegration.subtitle}</p>
                        </div>
                    </div>
                    <div className="steps-container">
                        {currentIntegration.steps.map((step, index) => (
                            <div key={index} className="step">
                                <div className="step-number">{index + 1}</div>
                                <div className="step-content">
                                    <div className="step-title">{step.title}</div>
                                    <div className="step-description">{step.description}</div>
                                    {step.code && <div className="code-snippet">{step.code}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom CRM Section */}
            {showCustomCRM && (
                <div className="custom-crm-section active">
                    <div className="section-header">
                        <h2 className="section-title">Tell Us About Your CRM</h2>
                        <p className="section-description">Enter your CRM name and our AI will provide custom integration instructions</p>
                    </div>

                    <div className="custom-crm-input-group">
                        <input 
                            type="text" 
                            className="custom-crm-input" 
                            placeholder="Enter your CRM name (e.g., Microsoft Dynamics, SugarCRM)"
                            value={customCRMName}
                            onChange={(e) => setCustomCRMName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleGetAIHelp()}
                        />
                        <button className="submit-btn" onClick={handleGetAIHelp}>Get AI Help</button>
                    </div>

                    {aiResponse && (
                        <div className="integration-section active" style={{ marginTop: '2rem' }}>
                            <div className="integration-header">
                                <div className="integration-icon">🤖</div>
                                <div className="integration-title">
                                    <h3>{aiResponse.name} Integration Guide</h3>
                                    <p>AI-generated instructions for connecting {aiResponse.name}</p>
                                </div>
                            </div>
                            <div className="steps-container">
                                {aiResponse.steps.map((step, index) => (
                                    <div key={index} className="step">
                                        <div className="step-number">{index + 1}</div>
                                        <div className="step-content">
                                            <div className="step-title">{step.title}</div>
                                            <div className="step-description">{step.description}</div>
                                            {step.code && <div className="code-snippet">{step.code}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                                <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Need more help? Our AI assistant can provide specific configuration details.</p>
                                <button className="chat-btn" onClick={() => setShowChat(true)} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                    </svg>
                                    Chat with AI Assistant
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FAQ Section */}
            <div className="faq-section">
                <div className="section-header">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                </div>

                {faqs.map((faq, index) => (
                    <div key={index} className={`faq-item ${openFAQs[index] ? 'active' : ''}`} onClick={() => toggleFAQ(index)}>
                        <div className="faq-question">
                            {faq.question}
                            <span className="faq-toggle">+</span>
                        </div>
                        <div className="faq-answer">{faq.answer}</div>
                    </div>
                ))}
            </div>

            {/* AI Chat Section */}
            <div className="ai-chat-section">
                <div className="ai-chat-content">
                    <div className="ai-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005.001 5.995H5z"/>
                            <ellipse cx="8.5" cy="12" rx="1.5" ry="2"/>
                            <ellipse cx="15.5" cy="12" rx="1.5" ry="2"/>
                            <path d="M8 16h8v2H8z"/>
                        </svg>
                        AI Powered Support
                    </div>
                    <h2 className="ai-chat-title">Need Help Connecting Your CRM?</h2>
                    <p className="ai-chat-description">
                        Our AI assistant can guide you through any CRM integration, provide custom API configurations, and troubleshoot connection issues.
                    </p>
                    <button className="chat-btn" onClick={() => setShowChat(true)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Click Here to Ask AI How to Connect
                    </button>
                </div>
            </div>

            {/* Chat Modal */}
            {showChat && (
                <div className="chat-modal active">
                    <div className="chat-header">
                        <div className="chat-title">ClaimKing AI Assistant</div>
                        <button className="close-chat" onClick={() => setShowChat(false)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div className="chat-messages" ref={chatMessagesRef}>
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={`message ${msg.type}`}>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                    <div className="chat-input-container">
                        <div className="chat-input-wrapper">
                            <input 
                                type="text" 
                                className="chat-input" 
                                placeholder="Type your message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            />
                            <button className="send-btn" onClick={sendChatMessage}>Send</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default CRMSync;

