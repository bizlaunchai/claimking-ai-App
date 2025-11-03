"use client"
import React, { useEffect, useRef, useState, useCallback } from 'react';

// NOTE: You would typically import CSS styles separately (e.g., import './Sidebar.css';)
// The HTML/CSS structure is preserved here using className attributes.
import "../../app/styles/sidebar.css"
import {LogoutButton} from "@/components/logout-button";
import Link from "next/link";
import {usePathname} from "next/navigation";

function Sidebar() {
    const sidebarRef = useRef(null);
    const resizeHandleRef = useRef(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const pathname = usePathname();

    // Function to expand the sidebar if it's collapsed
    const expandSidebarIfCollapsed = useCallback(() => {
        if (isCollapsed && sidebarRef.current) {
            setIsCollapsed(false);
            // Wait for state update to ensure sidebar.offsetWidth is correct
            setTimeout(() => {
                const sidebarWidth = sidebarRef.current.offsetWidth;
                if (resizeHandleRef.current) {
                    resizeHandleRef.current.style.left = `${sidebarWidth - 8}px`;
                }
            }, 0);
        }
    }, [isCollapsed]);

    // Function to toggle the sidebar collapse state
    const toggleSidebar = useCallback(() => {
        setIsCollapsed(prev => !prev);
    }, []);

    // Effect to handle the resize handle's position when collapse state changes
    useEffect(() => {
        if (sidebarRef.current && resizeHandleRef.current) {
            if (isCollapsed) {
                resizeHandleRef.current.style.left = '62px';
                sidebarRef.current.style.width = '62px'; // Or handle width via CSS class
            } else {
                // Read the CSS variable or last width
                const currentWidth = sidebarRef.current.style.width || '250px'; // Default/current width
                resizeHandleRef.current.style.left = `${parseInt(currentWidth, 10) - 8}px`;
            }
        }
    }, [isCollapsed]);


    // --- RESIZE LOGIC ---

    const stopResize = useCallback(() => {
        setIsResizing(false);
        if (resizeHandleRef.current) {
            resizeHandleRef.current.classList.remove('dragging');
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing || !sidebarRef.current || !resizeHandleRef.current) return;

        const newWidth = e.clientX;
        const minWidth = 70;
        const maxWidth = 400;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebarRef.current.style.width = `${newWidth}px`;
            resizeHandleRef.current.style.left = `${newWidth - 8}px`;
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);

            // Auto-collapse logic
            if (newWidth < 200) {
                sidebarRef.current.classList.add('collapsed');
                // Don't change isCollapsed state here to allow manual override
            } else {
                sidebarRef.current.classList.remove('collapsed');
            }
        }
    }, [isResizing]);

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
        if (resizeHandleRef.current) {
            resizeHandleRef.current.classList.add('dragging');
        }
        // e.preventDefault();
    }, []);

    // Global listeners for resize events
    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);

        // Cleanup
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResize);
        };
    }, [handleMouseMove, stopResize]);


    return (
        <>
            <div
                className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
                id="sidebar"
                ref={sidebarRef}
                // Optional: set initial width if not handled by CSS
                style={{ width: isCollapsed ? '62px' : '250px', height: '100$' }}
            >

                <div style={{borderBottom: '1px solid var(--border-color)'}} className='pb-2'>
                    {/* Header */}

                       <div className="sidebar-header">
                           <Link href="/">
                           <div className="logo-container" onClick={expandSidebarIfCollapsed}>
                               <div className="logo-icon">
                                   {/* ClaimKing Crown Logo */}
                                   <svg viewBox="0 0 32 32" className="crown-logo">
                                       <path d="M16 4L11 10L6 8L8 16L10 14L13 18L16 14L19 18L22 14L24 16L26 8L21 10L16 4Z" />
                                       <rect x="8" y="20" width="16" height="4" rx="1" />
                                       <circle cx="12" cy="8" r="1.5" />
                                       <circle cx="16" cy="6" r="1.5" />
                                       <circle cx="20" cy="8" r="1.5" />
                                   </svg>
                               </div>
                               <span className="logo-text">ClaimKing.AI</span>
                           </div>
                           </Link>
                           <button className="collapse-toggle" onClick={toggleSidebar}>
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                   <polyline points="15 18 9 12 15 6"></polyline>
                               </svg>
                           </button>
                       </div>
                </div>


                {/* Navigation */}
                <nav className="sidebar-nav">
                    {/* DASHBOARD */}
                    <div className="nav-category">
                        <div className="nav-category-header">Dashboard</div>

                        <div className="nav-item">
                            <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`} data-tooltip="Overview">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Overview</span>
                            </Link>
                        </div>
                    </div>

                    {/* CLAIMS MANAGEMENT */}
                    <div className="nav-category">
                        <div className="nav-category-header">Claims Management</div>

                        {/* Active Claims - No Dropdown */}
                        <div className="nav-item">
                            <Link href="/dashboard/claims" className={`nav-link ${pathname === '/dashboard/claims' ? 'active' : ''}`} data-tooltip="Active Claims">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Active Claims</span>
                                <span className="nav-badge count">127</span>
                            </Link>
                        </div>

                        <div className="nav-item">
                            <Link href="/dashboard/supplements" className={`nav-link ${pathname === '/dashboard/supplements' ? 'active' : ''}`} data-tooltip="Supplements">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Supplements</span>
                                <span className="nav-badge count">18</span>
                            </Link>
                        </div>

                        <div className="nav-item">
                            <Link href="/dashboard/client-portal" className={`nav-link ${pathname === '/dashboard/client-portal' ? 'active' : ''}`} data-tooltip="Client Portal">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Client Portal</span>
                            </Link>
                        </div>

                        <div className="nav-item">
                            <Link href="/dashboard/purchase-credits" className={`nav-link ${pathname === '/dashboard/purchase-credits' ? 'active' : ''}`} data-tooltip="Purchase Claim Credits">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.81.45 1.61 1.67 1.61 1.16 0 1.6-.64 1.6-1.46 0-.84-.36-1.41-1.81-1.96-2.15-.82-3.42-1.64-3.42-3.59 0-1.67 1.16-2.85 2.83-3.18V4.23h2.67v1.85c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.63-1.63-1.63-1.01 0-1.46.54-1.46 1.34 0 .77.39 1.31 1.85 1.86 2.17.8 3.37 1.65 3.37 3.73 0 1.74-1.25 3.01-3.02 3.32z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Purchase Claim Credits</span>
                                <span className="nav-badge storm">$</span>
                            </Link>
                        </div>
                    </div>

                    {/* AI TOOLS */}
                    <div className="nav-category">
                        <div className="nav-category-header">AI Tools</div>

                        <div className="nav-item">
                            <Link href="/dashboard/measurement" className={`nav-link ${pathname === '/dashboard/measurement' ? 'active' : ''}`} data-tooltip="Measurement Reports">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Measurement Reports</span>
                            </Link>
                        </div>

                        {/* Estimation - No Dropdown */}
                        <div className="nav-item">
                            <a href="/ai/estimation" className="nav-link" data-tooltip="Estimation">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Estimation</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/3d-mockups" className="nav-link" data-tooltip="3D Mockups">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M21 8.5c0-.8-.7-1.5-1.5-1.5H16v6h1.5l2 2.5V8.5zm-5 2V7h-1.5c-.8 0-1.5.7-1.5 1.5v2l-3 3V5H3v14h5v-3l5 5h1.5c.8 0 1.5-.7 1.5-1.5V16l-3-3v-2.5z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">3D Mockups</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/policy-analysis" className="nav-link" data-tooltip="Policy Analysis">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Policy Analysis</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/document-generator" className="nav-link" data-tooltip="Document Generator">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-5.5-2l-4-4 1.41-1.41 2.59 2.58L16.09 11l1.41 1.41L12.5 18z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Document Generator</span>
                                <span className="nav-badge count">SOP</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/email-assistant" className="nav-link" data-tooltip="Email Assistant">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Email Assistant</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/call-center" className="nav-link" data-tooltip="Call Center AI">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Call Center AI</span>
                                <span className="nav-badge pro">PRO</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/ai/storm-tracking" className="nav-link" data-tooltip="Storm Tracking">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M17.66 8L12 2.35 6.34 8A8.02 8.02 0 0 0 4 13.64c0 2 .78 4.11 2.34 5.67a7.99 7.99 0 0 0 11.32 0c1.56-1.56 2.34-3.67 2.34-5.67S19.22 9.56 17.66 8zM6 14c.01-2 .62-3.27 1.76-4.4L12 5.27l4.24 4.38C17.38 10.77 17.99 12 18 14H6z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Storm Tracking</span>
                                <span className="nav-badge storm">LIVE</span>
                            </a>
                        </div>
                    </div>

                    {/* INTEGRATIONS */}
                    <div className="nav-category">
                        <div className="nav-category-header">Integrations</div>

                        <div className="nav-item">
                            <a href="/integrations/crm-sync" className="nav-link" data-tooltip="CRM Sync">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M8.5 5l-2.5 2.5 2.5 2.5 1.5-1.5L9 7.5l1-1zM12 2l-2 2 2 2 2-2zM15.5 5l1 1L15.5 7.5 17 9l2.5-2.5zM5 8.5L2.5 11 5 13.5 6.5 12 5 10.5 3.5 9zM19 8.5L17.5 10l1.5 1.5L20.5 13 23 10.5zM8.5 19l-1-1 1-1.5L7 15l-2.5 2.5zM12 22l2-2-2-2-2 2zM15.5 19L14 17.5l1.5-1.5-1.5-1.5-2.5 2.5z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">CRM Sync</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/integrations/email-sms" className="nav-link" data-tooltip="Email & SMS">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Email & SMS</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/integrations/google-my-business" className="nav-link" data-tooltip="Google My Business">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Google My Business</span>
                            </a>
                        </div>

                        {/* Social Media - Single Link (No Dropdown) */}
                        <div className="nav-item">
                            <a href="/integrations/social-media" className="nav-link" data-tooltip="Social Media">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Social Media</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/integrations/api-settings" className="nav-link" data-tooltip="API Settings">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">API Settings</span>
                            </a>
                        </div>
                    </div>

                    {/* REPORTS */}
                    <div className="nav-category">
                        <div className="nav-category-header">Reports</div>

                        <div className="nav-item">
                            <a href="/reports/analytics" className="nav-link" data-tooltip="Analytics">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Analytics</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/reports/payments" className="nav-link" data-tooltip="Payments">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Payments</span>
                            </a>
                        </div>
                    </div>

                    {/* SETTINGS */}
                    <div className="nav-category">
                        <div className="nav-category-header">Settings</div>

                        <div className="nav-item">
                            <a href="/settings/general" className="nav-link" data-tooltip="General Settings">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">General</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/settings/account" className="nav-link" data-tooltip="Account Settings">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Account</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/settings/team" className="nav-link" data-tooltip="Team Management">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Team</span>
                            </a>
                        </div>

                        <div className="nav-item">
                            <a href="/settings/billing" className="nav-link" data-tooltip="Billing">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Billing</span>
                            </a>
                        </div>
                    </div>

                    {/* REFERRALS - Only Referral Program */}
                    <div className="nav-category">
                        <div className="nav-category-header">Referrals</div>

                        <div className="nav-item">
                            <a href="/referrals/program" className="nav-link" data-tooltip="Referral Program">
                                <span className="nav-icon">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                </span>
                                <span className="nav-text">Referral Program</span>
                            </a>
                        </div>
                    </div>

                    <div className='nav-item' style={{width: '100%', padding: '5px 1rem'}}>
                        <LogoutButton />
                    </div>

                    {/* Support Section at bottom */}
                    <div className="support-section">
                        <div className="support-divider"></div>
                        <a href="mailto:support@claimking.ai" className="support-link">
                            <span className="support-icon">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
                                </svg>
                            </span>
                            <span className="support-text">support@claimking.ai</span>
                        </a>
                        <a href="sms:+18885338394" className="support-link">
                            <span className="support-icon">
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 14H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm7 6h-5v-2h5v2zm3-3h-8V9h8v2zm0-3h-8V6h8v2z" fill="currentColor"/>
                                </svg>
                            </span>
                            <span className="support-text">(888) 533-8394</span>
                        </a>
                    </div>
                </nav>

            </div>

            {/* Resize Handle */}
            <div
                className={`resize-handle ${isResizing ? 'dragging' : ''}`}
                id="resizeHandle"
                ref={resizeHandleRef}
                onMouseDown={handleMouseDown}
            />
        </>
    );
}

export default Sidebar;




