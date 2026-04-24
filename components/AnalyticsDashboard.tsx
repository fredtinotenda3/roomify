// FILE: C:\Users\user\Desktop\roomify\components\AnalyticsDashboard.tsx

import { useState, useEffect } from 'react';
import { getAnalyticsStats, getUserAnalytics, type AnalyticsEvent } from '../lib/analytics.storage';
import { analytics as localAnalytics } from '../lib/analytics';
import { BarChart3, Eye, MousePointer, Users, TrendingUp, AlertCircle, X, RefreshCw, Download } from 'lucide-react';
import Button from './ui/Button';

interface AnalyticsDashboardProps {
    isAdmin?: boolean;
    userId?: string;
}

const AnalyticsDashboard = ({ isAdmin = false, userId }: AnalyticsDashboardProps) => {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [activeTab, setActiveTab] = useState<'stats' | 'events'>('stats');

    const loadData = async () => {
        setLoading(true);
        
        if (isAdmin) {
            // Admin gets global stats
            const globalStats = await getAnalyticsStats();
            setStats(globalStats);
        }
        
        // Get user's own events if userId provided (even for admin)
        if (userId) {
            const userEvents = await getUserAnalytics(userId);
            setEvents(userEvents);
        }
        
        setLoading(false);
    };

    useEffect(() => {
        if (show && (isAdmin || userId)) {
            loadData();
        }
    }, [show, isAdmin, userId]);

    const exportEvents = () => {
        const dataStr = JSON.stringify(events, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `roomify-analytics-${new Date().toISOString()}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    if (!show) {
        return (
            <button 
                className="analytics-toggle"
                onClick={() => setShow(true)}
            >
                <BarChart3 size={20} />
                <span>Analytics</span>
                <style>{`
                    .analytics-toggle {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                        color: white;
                        border: none;
                        border-radius: 50px;
                        padding: 10px 20px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        cursor: pointer;
                        z-index: 999;
                        font-size: 14px;
                        font-weight: 500;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transition: all 0.2s;
                    }
                    .analytics-toggle:hover {
                        transform: scale(1.05);
                        background: linear-gradient(135deg, #f97316, #ea580c);
                    }
                `}</style>
            </button>
        );
    }

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h3>
                    <BarChart3 size={20} />
                    Analytics Dashboard
                </h3>
                <div className="analytics-header-actions">
                    <button onClick={() => loadData()} className="refresh-btn" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    {events.length > 0 && (
                        <button onClick={exportEvents} className="export-btn" title="Export">
                            <Download size={16} />
                        </button>
                    )}
                    <button onClick={() => setShow(false)} className="close-analytics">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="analytics-tabs">
                <button
                    className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    Statistics
                </button>
                <button
                    className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    Events ({events.length})
                </button>
            </div>

            {loading ? (
                <div className="analytics-loading">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'stats' && stats && (
                        <>
                            <div className="analytics-stats-grid">
                                <div className="stat-card">
                                    <Eye size={24} />
                                    <div>
                                        <div className="stat-value">{stats.totalEvents?.toLocaleString() || 0}</div>
                                        <div className="stat-label">Total Events</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <Users size={24} />
                                    <div>
                                        <div className="stat-value">{stats.totalUsers?.toLocaleString() || 0}</div>
                                        <div className="stat-label">Unique Users</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <MousePointer size={24} />
                                    <div>
                                        <div className="stat-value">{stats.totalSessions?.toLocaleString() || 0}</div>
                                        <div className="stat-label">Total Sessions</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <TrendingUp size={24} />
                                    <div>
                                        <div className="stat-value">
                                            {stats.usersByPlan?.pro || 0} / {stats.usersByPlan?.free || 0}
                                        </div>
                                        <div className="stat-label">Pro / Free Users</div>
                                    </div>
                                </div>
                            </div>

                            {stats.eventsByType && Object.keys(stats.eventsByType).length > 0 && (
                                <div className="analytics-section">
                                    <h4>Events by Type</h4>
                                    <div className="events-type-list">
                                        {Object.entries(stats.eventsByType)
                                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                                            .slice(0, 10)
                                            .map(([type, count]) => (
                                                <div key={type} className="event-type-item">
                                                    <span>{type}</span>
                                                    <div className="event-bar">
                                                        <div 
                                                            className="event-fill" 
                                                            style={{ width: `${Math.min(100, ((count as number) / stats.totalEvents) * 100)}%` }} 
                                                        />
                                                    </div>
                                                    <span className="event-count">{(count as number).toLocaleString()}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {stats.topFeatures && stats.topFeatures.length > 0 && (
                                <div className="analytics-section">
                                    <h4>Top Features Used</h4>
                                    <div className="features-list">
                                        {stats.topFeatures.map((feature: any, index: number) => (
                                            <div key={index} className="feature-item">
                                                <span>{feature.feature}</span>
                                                <div className="feature-bar">
                                                    <div 
                                                        className="feature-fill" 
                                                        style={{ width: `${Math.min(100, (feature.count / stats.topFeatures[0]?.count) * 100)}%` }} 
                                                    />
                                                </div>
                                                <span className="feature-count">{feature.count.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {stats.conversionRates && Object.keys(stats.conversionRates).length > 0 && (
                                <div className="analytics-section">
                                    <h4>Conversion Funnel</h4>
                                    <div className="conversion-funnel">
                                        {Object.entries(stats.conversionRates).map(([step, count]) => (
                                            <div key={step} className="funnel-step">
                                                <div className="funnel-label">{step}</div>
                                                <div className="funnel-bar">
                                                    <div 
                                                        className="funnel-fill" 
                                                        style={{ width: `${Math.min(100, (count as number) / (stats.totalUsers || 1) * 100)}%` }} 
                                                    />
                                                </div>
                                                <div className="funnel-count">{(count as number).toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'events' && (
                        <div className="analytics-events-list">
                            {events.length === 0 ? (
                                <div className="no-events">
                                    <AlertCircle size={32} />
                                    <p>No events recorded yet</p>
                                </div>
                            ) : (
                                events.slice().reverse().map((event) => (
                                    <div key={event.id} className="event-item">
                                        <div className="event-header">
                                            <span className="event-name">{event.name}</span>
                                            <span className="event-time">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        {event.properties && Object.keys(event.properties).length > 0 && (
                                            <div className="event-properties">
                                                {Object.entries(event.properties).map(([key, value]) => (
                                                    <span key={key} className="event-prop">
                                                        {key}: {JSON.stringify(value)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {event.path && (
                                            <div className="event-path">Path: {event.path}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            <style>{`
                .analytics-dashboard {
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    width: 500px;
                    max-width: calc(100vw - 40px);
                    max-height: 70vh;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    z-index: 1000;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                    color: white;
                    flex-shrink: 0;
                }

                .analytics-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                    font-size: 16px;
                }

                .analytics-header-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .refresh-btn, .export-btn, .close-analytics {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .refresh-btn:hover, .export-btn:hover, .close-analytics:hover {
                    background: rgba(255,255,255,0.1);
                }

                .analytics-tabs {
                    display: flex;
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
                    flex-shrink: 0;
                }

                .tab {
                    flex: 1;
                    padding: 10px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .tab.active {
                    color: #f97316;
                    border-bottom: 2px solid #f97316;
                }

                .analytics-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    gap: 12px;
                }

                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f4f6;
                    border-top-color: #f97316;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .analytics-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    padding: 16px;
                    background: #f9fafb;
                    flex-shrink: 0;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e5e7eb;
                }

                .stat-card svg {
                    color: #f97316;
                }

                .stat-value {
                    font-size: 20px;
                    font-weight: bold;
                    color: #1a1a1a;
                }

                .stat-label {
                    font-size: 11px;
                    color: #6b7280;
                }

                .analytics-section {
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                    overflow-y: auto;
                    flex-shrink: 0;
                }

                .analytics-section h4 {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    font-weight: 600;
                }

                .events-type-list, .features-list, .conversion-funnel {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .event-type-item, .feature-item, .funnel-step {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 12px;
                }

                .event-type-item span:first-child, .feature-item span:first-child, .funnel-label {
                    width: 100px;
                    color: #4b5563;
                    font-size: 12px;
                }

                .event-bar, .feature-bar, .funnel-bar {
                    flex: 1;
                    height: 6px;
                    background: #e5e7eb;
                    border-radius: 3px;
                    overflow: hidden;
                }

                .event-fill, .feature-fill, .funnel-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #f97316, #ea580c);
                    border-radius: 3px;
                    transition: width 0.3s;
                }

                .event-count, .feature-count, .funnel-count {
                    width: 60px;
                    text-align: right;
                    color: #6b7280;
                    font-size: 12px;
                }

                .analytics-events-list {
                    overflow-y: auto;
                    flex: 1;
                    padding: 12px;
                }

                .event-item {
                    padding: 10px;
                    border-bottom: 1px solid #f3f4f6;
                    font-size: 12px;
                }

                .event-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                }

                .event-name {
                    font-weight: 600;
                    color: #1a1a1a;
                }

                .event-time {
                    color: #9ca3af;
                    font-size: 10px;
                }

                .event-properties {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .event-prop {
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    color: #4b5563;
                }

                .event-path {
                    color: #9ca3af;
                    font-size: 10px;
                }

                .no-events {
                    text-align: center;
                    padding: 40px;
                    color: #9ca3af;
                }

                .no-events svg {
                    margin-bottom: 12px;
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;