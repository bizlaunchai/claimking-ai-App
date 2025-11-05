"use client";
import React, { useState } from 'react';
import "./payments.css";

const PaymentsPage = () => {
    const [activeTab, setActiveTab] = useState('transactions');
    const [processors, setProcessors] = useState({
        stripe: { connected: true },
        square: { connected: false },
        paypal: { connected: false },
        other: { connected: false, name: 'Other' }
    });
    const [lineItems, setLineItems] = useState([
        { description: 'Roof Replacement - GAF Timberline HDZ', qty: 1, rate: 10000, amount: 10000 },
        { description: 'Gutter Installation', qty: 1, rate: 2450, amount: 2450 }
    ]);
    const [settings, setSettings] = useState({
        autoReminders: true,
        partialPayments: false,
        requireDeposit: true
    });

    const transactions = [
        { client: 'Johnson Property', project: 'Roof Replacement', invoice: '#INV-2024-089', amount: 12450, status: 'paid', date: 'Oct 19, 2024' },
        { client: 'Smith Residence', project: 'Complete Exterior', invoice: '#INV-2024-088', amount: 28900, status: 'pending', date: 'Oct 18, 2024' },
        { client: 'Davis Complex', project: 'Storm Repair', invoice: '#INV-2024-087', amount: 8750, status: 'overdue', date: 'Oct 10, 2024' },
        { client: 'Wilson Estate', project: 'Siding & Trim', invoice: '#INV-2024-086', amount: 15200, status: 'paid', date: 'Oct 15, 2024' },
        { client: 'Anderson Home', project: 'Gutter Installation', invoice: '#INV-2024-085', amount: 3200, status: 'draft', date: 'Oct 20, 2024' }
    ];

    const invoices = [
        { invoice: '#INV-2024-089', client: 'Johnson Property', amount: 12450, dueDate: 'Oct 25, 2024', status: 'paid' },
        { invoice: '#INV-2024-088', client: 'Smith Residence', amount: 28900, dueDate: 'Oct 28, 2024', status: 'pending' }
    ];

    const connectProcessor = (processor) => {
        if (confirm(`Connect to ${processor}?\n\nYou'll be redirected to ${processor} to authorize the connection.`)) {
            setProcessors(prev => ({
                ...prev,
                [processor]: { ...prev[processor], connected: true }
            }));
            setTimeout(() => {
                alert(`Successfully connected to ${processor}!`);
            }, 2000);
        }
    };

    const connectOtherProcessor = () => {
        const processorName = prompt('Enter payment processor name:');
        if (processorName) {
            setProcessors(prev => ({
                ...prev,
                other: { connected: true, name: processorName }
            }));
            alert(`Setting up ${processorName}...`);
        }
    };

    const configureProcessor = (processor) => {
        alert(`Opening ${processor} configuration...`);
    };

    const handleAction = (action, client) => {
        switch(action) {
            case 'View':
                alert(`Viewing invoice for ${client}...`);
                break;
            case 'Receipt':
                alert(`Downloading receipt for ${client}...`);
                break;
            case 'Send':
                alert(`Sending invoice to ${client}...`);
                break;
            case 'Edit':
                alert(`Editing invoice for ${client}...`);
                break;
            case 'Remind':
                alert(`Sending payment reminder to ${client}...`);
                break;
            case 'Call':
                alert(`Opening phone dialer for ${client}...`);
                break;
            case 'Download':
                alert('Downloading invoice PDF...');
                break;
            case 'Duplicate':
                alert('Creating duplicate invoice...');
                break;
            case '×':
                const index = parseInt(client);
                setLineItems(prev => prev.filter((_, i) => i !== index));
                break;
        }
    };

    const addLineItem = () => {
        setLineItems(prev => [...prev, { description: '', qty: 1, rate: 0, amount: 0 }]);
    };

    const updateLineItem = (index, field, value) => {
        setLineItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === 'qty' || field === 'rate') {
                updated[index].amount = (updated[index].qty || 0) * (updated[index].rate || 0);
            }
            return updated;
        });
    };

    const exportTransactions = () => {
        const format = confirm('Export as:\n\nOK = PDF\nCancel = Excel') ? 'PDF' : 'Excel';
        alert(`Exporting transactions as ${format}...`);
    };

    const quickActions = {
        createFromEstimate: () => alert('Select an estimate to convert to invoice...'),
        sendReminders: () => {
            if (confirm('Send payment reminders to all overdue invoices?\n\n8 reminders will be sent.')) {
                alert('Payment reminders sent successfully!');
            }
        },
        recordPayment: () => {
            const payment = prompt('Enter payment amount:');
            if (payment) {
                alert(`Payment of $${payment} recorded successfully!`);
            }
        },
        viewReports: () => alert('Opening payment reports...')
    };

    const getStatusBadgeClass = (status) => {
        return `status-badge status-${status}`;
    };

    return (
        <div>
            {/* Header */}
            <div className="header">
                <div className="header-left">
                    <div className="crown-logo">
                        <svg viewBox="0 0 24 24" fill="#1a1f3a">
                            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.86-2h8.28l.5-2.02l-2.87-1.73L12 13l-1.77-2.75l-2.87 1.73L7.86 14z"/>
                        </svg>
                    </div>
                    <h1>Payments</h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-outline" onClick={exportTransactions}>Export</button>
                    <button className="btn btn-primary" onClick={() => setActiveTab('create')}>+ Create Invoice</button>
                </div>
            </div>

            <div className="container">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Revenue</div>
                        <div className="stat-value">$487,290</div>
                        <div className="stat-change positive">↑ 12% this month</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Pending Payments</div>
                        <div className="stat-value">$45,600</div>
                        <div className="stat-change negative">↑ 8 overdue</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Paid This Month</div>
                        <div className="stat-value">$127,430</div>
                        <div className="stat-change positive">↑ 18% vs last month</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg Invoice</div>
                        <div className="stat-value">$10,350</div>
                        <div className="stat-change positive">↑ $1,200</div>
                    </div>
                </div>

                {/* Payment Processor Section */}
                <div className="processor-section">
                    <div className="section-header">
                        <div>
                            <h2 className="section-title">Payment Processors</h2>
                            <p className="section-subtitle">Connect your payment processor to accept payments - supports 15+ processors</p>
                        </div>
                    </div>
                    <div className="processor-grid">
                        <div 
                            className={`processor-card ${processors.stripe.connected ? 'connected' : ''}`}
                            onClick={() => processors.stripe.connected ? configureProcessor('stripe') : connectProcessor('stripe')}
                        >
                            <div className="processor-logo stripe-logo">Stripe</div>
                            <div className="processor-name">Stripe</div>
                            <div className={`processor-status ${processors.stripe.connected ? 'connected' : ''}`}>
                                {processors.stripe.connected ? '✓ Connected' : 'Click to Connect'}
                            </div>
                        </div>
                        <div 
                            className={`processor-card ${processors.square.connected ? 'connected' : ''}`}
                            onClick={() => connectProcessor('square')}
                        >
                            <div className="processor-logo square-logo">Square</div>
                            <div className="processor-name">Square</div>
                            <div className={`processor-status ${processors.square.connected ? 'connected' : ''}`}>
                                {processors.square.connected ? '✓ Connected' : 'Click to Connect'}
                            </div>
                        </div>
                        <div 
                            className={`processor-card ${processors.paypal.connected ? 'connected' : ''}`}
                            onClick={() => connectProcessor('paypal')}
                        >
                            <div className="processor-logo paypal-logo">PayPal</div>
                            <div className="processor-name">PayPal</div>
                            <div className={`processor-status ${processors.paypal.connected ? 'connected' : ''}`}>
                                {processors.paypal.connected ? '✓ Connected' : 'Click to Connect'}
                            </div>
                        </div>
                        <div 
                            className={`processor-card other-processor ${processors.other.connected ? 'connected' : ''}`}
                            onClick={connectOtherProcessor}
                        >
                            <div className="processor-logo other-logo">{processors.other.connected ? processors.other.name.charAt(0).toUpperCase() : '+'}</div>
                            <div className="processor-name">{processors.other.name}</div>
                            <div className={`processor-status ${processors.other.connected ? 'connected' : ''}`}>
                                {processors.other.connected ? '✓ Connected' : 'Add Custom'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button className="quick-action-btn" onClick={quickActions.createFromEstimate}>📄 Create from Estimate</button>
                    <button className="quick-action-btn" onClick={quickActions.sendReminders}>🔔 Send Payment Reminders</button>
                    <button className="quick-action-btn" onClick={quickActions.recordPayment}>💵 Record Manual Payment</button>
                    <button className="quick-action-btn" onClick={quickActions.viewReports}>📊 Payment Reports</button>
                </div>

                {/* Tabs Container */}
                <div className="tabs-container">
                    <div className="tab-nav">
                        <button 
                            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('transactions')}
                        >
                            Recent Transactions
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
                            onClick={() => setActiveTab('invoices')}
                        >
                            Invoices
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => setActiveTab('create')}
                        >
                            Create Invoice
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Settings
                        </button>
                    </div>

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                        <div className="tab-content active">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>Invoice #</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="client-name">{tx.client}</div>
                                                <div className="invoice-number">{tx.project}</div>
                                            </td>
                                            <td>{tx.invoice}</td>
                                            <td className="amount">${tx.amount.toLocaleString()}</td>
                                            <td><span className={getStatusBadgeClass(tx.status)}>{tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</span></td>
                                            <td>{tx.date}</td>
                                            <td className="actions-cell">
                                                {tx.status === 'paid' && (
                                                    <>
                                                        <button className="action-btn" onClick={() => handleAction('View', tx.client)}>View</button>
                                                        <button className="action-btn" onClick={() => handleAction('Receipt', tx.client)}>Receipt</button>
                                                    </>
                                                )}
                                                {tx.status === 'pending' && (
                                                    <>
                                                        <button className="action-btn" onClick={() => handleAction('Send', tx.client)}>Send</button>
                                                        <button className="action-btn" onClick={() => handleAction('Edit', tx.client)}>Edit</button>
                                                    </>
                                                )}
                                                {tx.status === 'overdue' && (
                                                    <>
                                                        <button className="action-btn" onClick={() => handleAction('Remind', tx.client)}>Remind</button>
                                                        <button className="action-btn" onClick={() => handleAction('Call', tx.client)}>Call</button>
                                                    </>
                                                )}
                                                {tx.status === 'draft' && (
                                                    <>
                                                        <button className="action-btn" onClick={() => handleAction('Edit', tx.client)}>Edit</button>
                                                        <button className="action-btn" onClick={() => handleAction('Send', tx.client)}>Send</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Invoices Tab */}
                    {activeTab === 'invoices' && (
                        <div className="tab-content active">
                            <table className="transactions-table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Due Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv, idx) => (
                                        <tr key={idx}>
                                            <td>{inv.invoice}</td>
                                            <td>{inv.client}</td>
                                            <td className="amount">${inv.amount.toLocaleString()}</td>
                                            <td>{inv.dueDate}</td>
                                            <td><span className={getStatusBadgeClass(inv.status)}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
                                            <td className="actions-cell">
                                                <button className="action-btn" onClick={() => handleAction('Download', inv.client)}>Download</button>
                                                <button className="action-btn" onClick={() => handleAction('Duplicate', inv.client)}>Duplicate</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Create Invoice Tab */}
                    {activeTab === 'create' && (
                        <div className="tab-content active">
                            <div className="invoice-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Client</label>
                                        <select className="form-select">
                                            <option>Select a client...</option>
                                            <option>Johnson Property</option>
                                            <option>Smith Residence</option>
                                            <option>Davis Complex</option>
                                            <option>Wilson Estate</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Invoice Date</label>
                                        <input type="date" className="form-input" defaultValue="2024-10-20" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input type="date" className="form-input" defaultValue="2024-11-04" />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Line Items</label>
                                    <div className="line-items">
                                        {lineItems.map((item, idx) => (
                                            <div key={idx} className="line-item">
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    placeholder="Description" 
                                                    value={item.description}
                                                    onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                                                />
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    placeholder="Qty" 
                                                    value={item.qty}
                                                    onChange={(e) => updateLineItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                                                />
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    placeholder="Rate" 
                                                    value={item.rate}
                                                    onChange={(e) => updateLineItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                                                />
                                                <input 
                                                    type="number" 
                                                    className="form-input" 
                                                    placeholder="Amount" 
                                                    value={item.amount.toFixed(2)}
                                                    readOnly
                                                />
                                                <button className="action-btn" onClick={() => handleAction('×', idx)}>×</button>
                                            </div>
                                        ))}
                                        <button className="add-line-btn" onClick={addLineItem}>+ Add Line Item</button>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Payment Terms</label>
                                        <select className="form-select">
                                            <option>Net 15</option>
                                            <option>Net 30</option>
                                            <option>Due on Receipt</option>
                                            <option>50% Deposit, 50% on Completion</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Accept Payment Via</label>
                                        <select className="form-select">
                                            <option>Credit Card & ACH</option>
                                            <option>Credit Card Only</option>
                                            <option>ACH Only</option>
                                            <option>Check Only</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-textarea" placeholder="Add any notes or special instructions..."></textarea>
                                </div>

                                <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
                                    <button className="btn btn-outline">Save as Draft</button>
                                    <button className="btn btn-secondary">Preview</button>
                                    <button className="btn btn-primary">Send Invoice</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="tab-content active">
                            <div className="settings-grid">
                                <div className="setting-card">
                                    <div className="setting-header">Automatic Payment Reminders</div>
                                    <div className="setting-description">Send automatic reminders for overdue invoices</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.autoReminders}
                                            onChange={(e) => setSettings(prev => ({...prev, autoReminders: e.target.checked}))}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-header">Accept Partial Payments</div>
                                    <div className="setting-description">Allow clients to make partial payments on invoices</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.partialPayments}
                                            onChange={(e) => setSettings(prev => ({...prev, partialPayments: e.target.checked}))}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-header">Require Deposit</div>
                                    <div className="setting-description">Request 50% deposit before starting work</div>
                                    <label className="toggle-switch">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.requireDeposit}
                                            onChange={(e) => setSettings(prev => ({...prev, requireDeposit: e.target.checked}))}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-header">QuickBooks Integration</div>
                                    <div className="setting-description">Sync invoices and payments with QuickBooks</div>
                                    <button className="btn btn-outline">Connect QuickBooks</button>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-header">Invoice Branding</div>
                                    <div className="setting-description">Customize invoice template with your logo and colors</div>
                                    <button className="btn btn-outline">Customize Template</button>
                                </div>

                                <div className="setting-card">
                                    <div className="setting-header">Payment Success Page</div>
                                    <div className="setting-description">Customize the message clients see after paying</div>
                                    <button className="btn btn-outline">Edit Message</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;

