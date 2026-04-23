// FILE: C:\Users\user\Desktop\roomify\components\AnalyticsDashboard.tsx

import { useState, useEffect } from 'react';
import { analytics } from '../lib/analytics';
import { BarChart3, Eye, MousePointer, Users, TrendingUp, AlertCircle, X } from 'lucide-react';
import Button from './ui/Button';

interface AnalyticsDashboardProps {
    isAdmin?: boolean;
}

const AnalyticsDashboard = ({ isAdmin = false }: AnalyticsDashboardProps) => {
    const [events, setEvents] = useState<any[]>([]);
    const [stats, setStats] = useState({
        pageViews: 0,
        clicks: 0,
        features: {} as Record<string, number>,
        conversions: {} as Record<string, number>,
        dropOffs: {} as Record<string, number>,
        errors: 0,
        uniqueSessions: new Set<string>().size
    });
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        
        const loadEvents = () => {
            const allEvents = analytics.getEvents();
            setEvents(allEvents);
            
            // Calculate stats
            const pageViews = allEvents.filter(e => e.name === 'page_view').length;
            const clicks = allEvents.filter(e => e.name === 'click').length;
            const errors = allEvents.filter(e => e.name === 'error').length;
            
            const features: Record<string, number> = {};
            const conversions: Record<string, number> = {};
            const dropOffs: Record<string, number> = {};
            
            allEvents.forEach(event => {
                if (event.name === 'feature_used' && event.properties?.feature) {
                    const feature = event.properties.feature as string;
                    features[feature] = (features[feature] || 0) + 1;
                }
                if (event.name === 'conversion' && event.properties?.step) {
                    const step = event.properties.step as string;
                    conversions[step] = (conversions[step] || 0) + 1;
                }
                if (event.name === 'drop_off' && event.properties?.point) {
                    const point = event.properties.point as string;
                    dropOffs[point] = (dropOffs[point] || 0) + 1;
                }
            });
            
            const uniqueSessions = new Set(allEvents.map(e => e.sessionId)).size;
            
            setStats({
                pageViews,
                clicks,
                features,
                conversions,
                dropOffs,
                errors,
                uniqueSessions
            });
        };
        
        loadEvents();
        const interval = setInterval(loadEvents, 5000);
        return () => clearInterval(interval);
    }, [isAdmin]);

    if (!isAdmin) return null;
    if (!show) {
        return (
            <button 
                className="analytics-toggle"
                onClick={() => setShow(true)}
            >
                <BarChart3 size={20} />
                <span>Analytics</span>
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
                <button onClick={() => setShow(false)} className="close-analytics">
                    <X size={18} />
                </button>
            </div>

            <div className="analytics-stats-grid">
                <div className="stat-card">
                    <Eye size={24} />
                    <div>
                        <div className="stat-value">{stats.pageViews}</div>
                        <div className="stat-label">Page Views</div>
                    </div>
                </div>
                <div className="stat-card">
                    <MousePointer size={24} />
                    <div>
                        <div className="stat-value">{stats.clicks}</div>
                        <div className="stat-label">Clicks</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Users size={24} />
                    <div>
                        <div className="stat-value">{stats.uniqueSessions}</div>
                        <div className="stat-label">Unique Sessions</div>
                    </div>
                </div>
                <div className="stat-card">
                    <AlertCircle size={24} />
                    <div>
                        <div className="stat-value">{stats.errors}</div>
                        <div className="stat-label">Errors</div>
                    </div>
                </div>
            </div>

            <div className="analytics-section">
                <h4>Feature Usage</h4>
                <div className="feature-list">
                    {Object.entries(stats.features).map(([feature, count]) => (
                        <div key={feature} className="feature-item">
                            <span>{feature}</span>
                            <div className="feature-bar">
                                <div className="feature-fill" style={{ width: `${Math.min(100, (count / Math.max(1, stats.pageViews)) * 100)}%` }} />
                            </div>
                            <span className="feature-count">{count}</span>
                        </div>
                    ))}
                    {Object.keys(stats.features).length === 0 && (
                        <p className="no-data">No feature usage data yet</p>
                    )}
                </div>
            </div>

            <div className="analytics-section">
                <h4>Conversion Funnel</h4>
                <div className="conversion-funnel">
                    {Object.entries(stats.conversions).map(([step, count]) => (
                        <div key={step} className="funnel-step">
                            <div className="funnel-label">{step}</div>
                            <div className="funnel-bar">
                                <div className="funnel-fill" style={{ width: `${Math.min(100, (count / Math.max(1, stats.uniqueSessions)) * 100)}%` }} />
                            </div>
                            <div className="funnel-count">{count}</div>
                        </div>
                    ))}
                    {Object.keys(stats.conversions).length === 0 && (
                        <p className="no-data">No conversion data yet</p>
                    )}
                </div>
            </div>

            <div className="analytics-section">
                <h4>Drop-off Points</h4>
                <div className="dropoff-list">
                    {Object.entries(stats.dropOffs).map(([point, count]) => (
                        <div key={point} className="dropoff-item">
                            <span>{point}</span>
                            <span className="dropoff-count">{count}</span>
                        </div>
                    ))}
                    {Object.keys(stats.dropOffs).length === 0 && (
                        <p className="no-data">No drop-off data yet</p>
                    )}
                </div>
            </div>

            <div className="analytics-actions">
                <Button size="sm" variant="ghost" onClick={() => analytics.clearEvents()}>
                    Clear Events
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                    Refresh
                </Button>
            </div>

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

                .analytics-dashboard {
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    width: 400px;
                    max-width: calc(100vw - 40px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    z-index: 1000;
                    overflow: hidden;
                    animation: slideUp 0.3s ease;
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
                }

                .analytics-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                    font-size: 16px;
                }

                .close-analytics {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                }

                .analytics-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    padding: 16px;
                    background: #f9fafb;
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
                    font-size: 24px;
                    font-weight: bold;
                    color: #1a1a1a;
                }

                .stat-label {
                    font-size: 12px;
                    color: #6b7280;
                }

                .analytics-section {
                    padding: 16px;
                    border-top: 1px solid #e5e7eb;
                }

                .analytics-section h4 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    font-weight: 600;
                }

                .feature-list, .dropoff-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .feature-item, .dropoff-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 13px;
                }

                .feature-item span:first-child, .dropoff-item span:first-child {
                    width: 100px;
                    color: #4b5563;
                }

                .feature-bar, .funnel-bar {
                    flex: 1;
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                }

                .feature-fill, .funnel-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #f97316, #ea580c);
                    border-radius: 4px;
                    transition: width 0.3s;
                }

                .feature-count, .funnel-count {
                    width: 40px;
                    text-align: right;
                    color: #6b7280;
                }

                .dropoff-count {
                    color: #ef4444;
                    font-weight: 600;
                }

                .conversion-funnel {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .funnel-step {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .funnel-label {
                    width: 100px;
                    font-size: 13px;
                    color: #4b5563;
                }

                .no-data {
                    text-align: center;
                    color: #9ca3af;
                    font-size: 13px;
                    padding: 20px;
                }

                .analytics-actions {
                    display: flex;
                    gap: 8px;
                    padding: 12px 16px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;