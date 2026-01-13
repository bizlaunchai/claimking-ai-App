'use client'
import React, { useState, useEffect, useRef } from 'react';
import "./ai-call-center.css"

const AICallCenter = () => {
    const [expandedNotes, setExpandedNotes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [selectedCall, setSelectedCall] = useState(null);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const stats = [
        { 
            icon: '📞', 
            label: 'Total Calls Today', 
            value: '47', 
            change: { text: '15% from yesterday', type: 'positive' }
        },
        { 
            icon: '🎯', 
            label: 'New Leads Generated', 
            value: '12', 
            change: { text: '3 more than yesterday', type: 'positive' }
        },
        { 
            icon: '⏱️', 
            label: 'Average Call Duration', 
            value: '3:45', 
            change: { text: 'minutes', type: 'neutral' }
        },
        { 
            icon: '📊', 
            label: 'Calls This Week', 
            value: '238', 
            change: { text: '22% from last week', type: 'positive' }
        }
    ];

    const calls = [
        {
            id: 1,
            time: 'Today, 10:45 AM',
            caller: 'Sarah Johnson',
            phone: '(555) 123-4567',
            duration: '4:23',
            notes: {
                leadType: 'New Lead - Hail Damage Claim',
                status: 'Inspection scheduled for tomorrow at 2:00 PM',
                property: '789 Elm Street, Dallas, TX 75201',
                aiSummary: "Caller reported significant hail damage from last week's storm. Very interested in immediate inspection. High conversion probability (9/10 lead score)."
            }
        },
        {
            id: 2,
            time: 'Today, 9:30 AM',
            caller: 'Michael Williams',
            phone: '(555) 987-6543',
            duration: '2:15',
            notes: {
                leadType: 'Existing Client',
                status: 'Question about claim status - Resolved',
                aiSummary: 'Client called to check on claim #CK-2024-0892 status. Informed that adjuster approved supplemental items. Work scheduled to begin Monday.'
            }
        },
        {
            id: 3,
            time: 'Today, 8:15 AM',
            caller: 'Unknown Caller',
            phone: '(555) 456-7890',
            duration: '1:02',
            notes: {
                leadType: 'General Inquiry',
                status: 'Follow-up needed',
                aiSummary: 'Caller asked about service areas and pricing. Seemed interested but ended call before scheduling. Recommend follow-up call.'
            }
        },
        {
            id: 4,
            time: 'Yesterday, 4:22 PM',
            caller: 'Emily Davis',
            phone: '(555) 234-5678',
            duration: '5:18',
            notes: {
                leadType: 'New Lead - Wind Damage',
                status: 'Converted - Contract Signed',
                property: '456 Oak Avenue, Plano, TX 75023',
                aiSummary: 'Wind damage to north side of roof. Insurance claim already filed. Scheduled inspection, customer signed agreement during initial visit. Project value: $12,500'
            }
        },
        {
            id: 5,
            time: 'Yesterday, 2:10 PM',
            caller: 'Robert Martinez',
            phone: '(555) 345-6789',
            duration: '3:42',
            notes: {
                leadType: 'Vendor/Supplier Call',
                status: 'Information provided',
                aiSummary: 'ABC Supply calling about material delivery for Johnson project. Confirmed delivery window for Thursday 8-10 AM. Order #SUP-45678'
            }
        }
    ];

    const trendData = [
        { day: 'Mon', value: 31, height: 65 },
        { day: 'Tue', value: 38, height: 80 },
        { day: 'Wed', value: 47, height: 100 },
        { day: 'Thu', value: 35, height: 75 },
        { day: 'Fri', value: 42, height: 90 },
        { day: 'Sat', value: 19, height: 40 },
        { day: 'Sun', value: 14, height: 30 }
    ];

    const toggleNotes = (callId) => {
        setExpandedNotes(prev => 
            prev.includes(callId) 
                ? prev.filter(id => id !== callId)
                : [...prev, callId]
        );
    };

    const openCallDetails = (call) => {
        setSelectedCall(call);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedCall(null);
    };

    const goToPage = (page) => {
        setCurrentPage(page);
    };

    const nextPage = () => {
        if (currentPage < 50) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const previousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Initialize Chart.js pie chart
    useEffect(() => {
        if (typeof window !== 'undefined' && chartRef.current) {
            import('chart.js/auto').then((ChartModule) => {
                const Chart = ChartModule.default || ChartModule.Chart || ChartModule;
                
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                const ctx = chartRef.current.getContext('2d');
                chartInstance.current = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['Google Ads', 'Website', 'Facebook', 'Referrals', 'Direct Calls'],
                        datasets: [{
                            data: [42, 28, 15, 10, 5],
                            backgroundColor: [
                                '#FDB813',
                                '#1a1f3a',
                                '#3b82f6',
                                '#16a34a',
                                '#dc2626'
                            ],
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.label + ': ' + context.parsed + '%';
                                    }
                                }
                            }
                        }
                    }
                });
            }).catch(err => {
                console.error('Error loading Chart.js:', err);
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, []);

    const totalPages = 50;
    const itemsPerPage = 5;
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, 247);

    return (
        <div className="container">
            {/* Page Header */}
            <div className="page-header">
                <div className="header-left">
                    <div className="crown-logo">
                        <svg viewBox="0 0 24 24">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                        </svg>
                    </div>
                    <div>
                        <h1 className="page-title">AI Call Center</h1>
                        <span className="page-subtitle">Powered by Call Tracking Metrics</span>
                    </div>
                </div>
            </div>

            {/* Alert Banner */}
            <div className="alert-banner">
                <div className="alert-icon">📞</div>
                <div className="alert-content">
                    <div className="alert-text">Your AI receptionist is actively handling calls 24/7</div>
                    <div className="alert-subtext">To update AI scripts or call settings, please contact ClaimKing.AI support team</div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-value">{stat.value}</div>
                        <div className={`stat-change ${stat.change.type}`}>
                            {stat.change.type === 'positive' && <span>↑</span>}
                            <span>{stat.change.text}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Call Source Analytics */}
            <div className="analytics-grid">
                <div className="card chart-card">
                    <div className="card-header">
                        <h2 className="card-title">Call Sources</h2>
                        <p className="card-subtitle">Where your leads are coming from</p>
                    </div>
                    <div className="card-body">
                        <div className="chart-container">
                            <canvas id="sourceChart" ref={chartRef}></canvas>
                        </div>
                        <div className="source-legend">
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: '#FDB813' }}></span>
                                <span className="legend-label">Google Ads</span>
                                <span className="legend-value">42%</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: '#1a1f3a' }}></span>
                                <span className="legend-label">Website</span>
                                <span className="legend-value">28%</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: '#3b82f6' }}></span>
                                <span className="legend-label">Facebook</span>
                                <span className="legend-value">15%</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: '#16a34a' }}></span>
                                <span className="legend-label">Referrals</span>
                                <span className="legend-value">10%</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-color" style={{ background: '#dc2626' }}></span>
                                <span className="legend-label">Direct Calls</span>
                                <span className="legend-value">5%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card chart-card">
                    <div className="card-header">
                        <h2 className="card-title">Call Trends</h2>
                        <p className="card-subtitle">Daily call volume over the past week</p>
                    </div>
                    <div className="card-body">
                        <div className="trend-chart">
                            <div className="trend-bars">
                                {trendData.map((item, index) => (
                                    <div key={index} className="trend-bar-container">
                                        <div className="trend-bar" style={{ height: `${item.height}%` }}>
                                            <span className="trend-value">{item.value}</span>
                                        </div>
                                        <span className="trend-label">{item.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call History */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Recent Call History</h2>
                    <p className="card-subtitle">View all AI-handled calls and their details</p>
                </div>
                <div className="call-table">
                    <div className="call-header">
                        <div>DATE & TIME</div>
                        <div>CALLER INFORMATION</div>
                        <div>DURATION</div>
                        <div>NOTES</div>
                    </div>
                    
                    {calls.map((call) => (
                        <React.Fragment key={call.id}>
                            <div 
                                className={`call-row ${expandedNotes.includes(call.id) ? 'expanded' : ''}`}
                                onClick={() => toggleNotes(call.id)}
                            >
                                <div className="call-time">{call.time}</div>
                                <div className="caller-info">
                                    <div className="caller-name">{call.caller}</div>
                                    <div className="caller-phone">{call.phone}</div>
                                </div>
                                <div className="call-duration">{call.duration}</div>
                                <div>
                                    <span className="notes-preview">View Notes</span>
                                </div>
                            </div>
                            {expandedNotes.includes(call.id) && (
                                <div className="notes-expanded active">
                                    <div className="notes-content">
                                        <div className="note-item">
                                            <div className="note-label">Lead Type:</div>
                                            <div className="note-value">{call.notes.leadType}</div>
                                        </div>
                                        <div className="note-item">
                                            <div className="note-label">Status:</div>
                                            <div className="note-value">{call.notes.status}</div>
                                        </div>
                                        {call.notes.property && (
                                            <div className="note-item">
                                                <div className="note-label">Property:</div>
                                                <div className="note-value">{call.notes.property}</div>
                                            </div>
                                        )}
                                        <div className="note-item">
                                            <div className="note-label">AI Summary:</div>
                                            <div className="note-value">{call.notes.aiSummary}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                
                {/* Pagination */}
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing {startItem}-{endItem} of 247 calls
                    </div>
                    <div className="pagination-controls">
                        <button 
                            className="pagination-btn" 
                            disabled={currentPage === 1}
                            onClick={() => goToPage(1)}
                        >
                            First
                        </button>
                        <button 
                            className="pagination-btn" 
                            disabled={currentPage === 1}
                            onClick={previousPage}
                        >
                            Previous
                        </button>
                        {currentPage <= 3 && (
                            <>
                                {[1, 2, 3, 4, 5].map(page => (
                                    <button
                                        key={page}
                                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </>
                        )}
                        {currentPage > 3 && currentPage < totalPages - 2 && (
                            <>
                                <button className="pagination-btn" onClick={() => goToPage(1)}>1</button>
                                <span className="pagination-dots">...</span>
                                {[currentPage - 1, currentPage, currentPage + 1].map(page => (
                                    <button
                                        key={page}
                                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <span className="pagination-dots">...</span>
                            </>
                        )}
                        {currentPage >= totalPages - 2 && (
                            <>
                                <button className="pagination-btn" onClick={() => goToPage(1)}>1</button>
                                <span className="pagination-dots">...</span>
                                {[totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map(page => (
                                    <button
                                        key={page}
                                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </>
                        )}
                        <button 
                            className="pagination-btn" 
                            disabled={currentPage >= totalPages}
                            onClick={nextPage}
                        >
                            Next
                        </button>
                        <button 
                            className="pagination-btn" 
                            disabled={currentPage >= totalPages}
                            onClick={() => goToPage(totalPages)}
                        >
                            Last
                        </button>
                    </div>
                </div>
            </div>

            {/* Call Details Modal */}
            {showModal && selectedCall && (
                <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && closeModal()}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Call Details</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Caller Information */}
                            <div className="detail-section">
                                <div className="detail-label">Caller Information</div>
                                <div className="detail-content">
                                    <div className="detail-row">
                                        <div className="detail-key">Name:</div>
                                        <div className="detail-value">{selectedCall.caller}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-key">Phone:</div>
                                        <div className="detail-value">{selectedCall.phone}</div>
                                    </div>
                                    {selectedCall.notes.property && (
                                        <div className="detail-row">
                                            <div className="detail-key">Address:</div>
                                            <div className="detail-value">{selectedCall.notes.property}</div>
                                        </div>
                                    )}
                                    <div className="detail-row">
                                        <div className="detail-key">Damage Type:</div>
                                        <div className="detail-value">{selectedCall.notes.leadType}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Call Recording */}
                            <div className="detail-section">
                                <div className="detail-label">Call Recording</div>
                                <div className="recording-player">
                                    <button className="play-button">
                                        <svg viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    </button>
                                    <div className="audio-timeline">
                                        <div className="audio-progress"></div>
                                    </div>
                                    <div className="audio-time">1:32 / {selectedCall.duration}</div>
                                </div>
                            </div>

                            {/* AI Transcript */}
                            <div className="detail-section">
                                <div className="detail-label">AI-Generated Transcript</div>
                                <div className="transcript-box">
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">Good morning! Thank you for calling ClaimKing.AI. How can I help you today?</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">Caller:</div>
                                        <div className="transcript-text">Hi, I need help with roof damage from the hail storm last week.</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">I'm sorry to hear about your roof damage. I can definitely help schedule a free inspection for you. May I have your name, please?</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">Caller:</div>
                                        <div className="transcript-text">{selectedCall.caller}</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">Thank you. And what's the address of the property with damage?</div>
                                    </div>
                                    {selectedCall.notes.property && (
                                        <div className="transcript-line">
                                            <div className="transcript-speaker">Caller:</div>
                                            <div className="transcript-text">{selectedCall.notes.property}</div>
                                        </div>
                                    )}
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">Perfect. I have availability for an inspection tomorrow at 10 AM or 2 PM. Which time works better for you?</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">Caller:</div>
                                        <div className="transcript-text">2 PM would be great</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">Excellent! I've scheduled your free roof inspection for tomorrow at 2 PM. You'll receive a confirmation text shortly. Is there anything else I can help you with?</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">Caller:</div>
                                        <div className="transcript-text">No, that's all. Thank you!</div>
                                    </div>
                                    <div className="transcript-line">
                                        <div className="transcript-speaker">AI Assistant:</div>
                                        <div className="transcript-text">You're welcome! We'll see you tomorrow at 2 PM. Have a great day!</div>
                                    </div>
                                </div>
                            </div>

                            {/* Call Summary */}
                            <div className="detail-section">
                                <div className="detail-label">Call Summary & Analysis</div>
                                <div className="call-summary">
                                    <div className="summary-text">
                                        {selectedCall.notes.aiSummary}
                                    </div>
                                    <div className="lead-score">
                                        <span className="score-label">Lead Score:</span>
                                        <span className="score-value">9/10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Support Note */}
                            <div className="support-note">
                                <div className="support-icon">💡</div>
                                <div>
                                    <div className="support-text">
                                        To modify AI scripts, call handling rules, or appointment scheduling settings, please contact our support team:
                                    </div>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <a href="mailto:support@claimking.ai" className="support-link">support@claimking.ai</a> or call <a href="tel:18885338394" className="support-link">(888) 533-8394</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AICallCenter;
