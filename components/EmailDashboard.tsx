// FILE: C:\Users\user\Desktop\roomify\components\EmailDashboard.tsx

import { useState, useEffect } from 'react';
import { Mail, Users, Send, Eye, MousePointer, TrendingUp, X, RefreshCw, Plus, Calendar } from 'lucide-react';
import Button from './ui/Button';
import { getAllSubscribers, getSubscriberCount, createCampaign, getCampaigns, sendCampaign, type EmailSubscriber, type EmailCampaign } from '../lib/email.storage';

interface EmailDashboardProps {
    isAdmin?: boolean;
}

const EmailDashboard = ({ isAdmin = false }: EmailDashboardProps) => {
    const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [show, setShow] = useState(false);
    const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('subscribers');
    const [showCreateCampaign, setShowCreateCampaign] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        subject: '',
        content: ''
    });

    const loadData = async () => {
        setLoading(true);
        const allSubscribers = await getAllSubscribers();
        const allCampaigns = await getCampaigns();
        setSubscribers(allSubscribers);
        setCampaigns(allCampaigns);
        setLoading(false);
    };

    useEffect(() => {
        if (show && isAdmin) {
            loadData();
        }
    }, [show, isAdmin]);

    const handleCreateCampaign = async () => {
        if (!newCampaign.name || !newCampaign.subject || !newCampaign.content) {
            alert('Please fill in all fields');
            return;
        }

        const campaign = await createCampaign({
            name: newCampaign.name,
            subject: newCampaign.subject,
            content: newCampaign.content,
            status: 'draft'
        });

        if (campaign) {
            setCampaigns([campaign, ...campaigns]);
            setShowCreateCampaign(false);
            setNewCampaign({ name: '', subject: '', content: '' });
        } else {
            alert('Failed to create campaign');
        }
    };

    const handleSendCampaign = async (campaignId: string) => {
        if (confirm('Are you sure you want to send this campaign?')) {
            const result = await sendCampaign(campaignId);
            if (result) {
                await loadData();
                alert('Campaign sent successfully!');
            } else {
                alert('Failed to send campaign');
            }
        }
    };

    if (!isAdmin) return null;

    if (!show) {
        return (
            <button 
                className="email-dashboard-toggle"
                onClick={() => setShow(true)}
            >
                <Mail size={20} />
                <span>Email List</span>
                <style>{`
                    .email-dashboard-toggle {
                        position: fixed;
                        bottom: 20px;
                        left: 20px;
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
                    .email-dashboard-toggle:hover {
                        transform: scale(1.05);
                        background: linear-gradient(135deg, #f97316, #ea580c);
                    }
                `}</style>
            </button>
        );
    }

    return (
        <div className="email-dashboard">
            <div className="email-dashboard-header">
                <h3>
                    <Mail size={20} />
                    Email Marketing Dashboard
                </h3>
                <div className="email-dashboard-header-actions">
                    <button onClick={() => loadData()} className="refresh-btn" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => setShow(false)} className="close-email-dashboard">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="email-stats-grid">
                <div className="stat-card">
                    <Users size={24} />
                    <div>
                        <div className="stat-value">{subscribers.filter(s => s.status === 'active').length}</div>
                        <div className="stat-label">Active Subscribers</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Send size={24} />
                    <div>
                        <div className="stat-value">{campaigns.length}</div>
                        <div className="stat-label">Total Campaigns</div>
                    </div>
                </div>
                <div className="stat-card">
                    <Eye size={24} />
                    <div>
                        <div className="stat-value">{campaigns.reduce((sum, c) => sum + (c.openCount || 0), 0)}</div>
                        <div className="stat-label">Total Opens</div>
                    </div>
                </div>
                <div className="stat-card">
                    <MousePointer size={24} />
                    <div>
                        <div className="stat-value">{campaigns.reduce((sum, c) => sum + (c.clickCount || 0), 0)}</div>
                        <div className="stat-label">Total Clicks</div>
                    </div>
                </div>
            </div>

            <div className="email-tabs">
                <button
                    className={`tab ${activeTab === 'subscribers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('subscribers')}
                >
                    Subscribers ({subscribers.filter(s => s.status === 'active').length})
                </button>
                <button
                    className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
                    onClick={() => setActiveTab('campaigns')}
                >
                    Campaigns ({campaigns.length})
                </button>
            </div>

            {loading ? (
                <div className="email-loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'subscribers' && (
                        <div className="subscribers-list">
                            {subscribers.length === 0 ? (
                                <div className="no-subscribers">
                                    <Mail size={48} />
                                    <p>No subscribers yet</p>
                                </div>
                            ) : (
                                <table className="subscribers-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Source</th>
                                            <th>Subscribed At</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subscribers.map((subscriber) => (
                                            <tr key={subscriber.email}>
                                                <td>{subscriber.email}</td>
                                                <td>{subscriber.source}</td>
                                                <td>{new Date(subscriber.subscribedAt).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`status-badge ${subscriber.status}`}>
                                                        {subscriber.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <div className="campaigns-list">
                            <div className="campaigns-header">
                                <Button size="sm" onClick={() => setShowCreateCampaign(true)} className="create-campaign-btn">
                                    <Plus size={14} />
                                    New Campaign
                                </Button>
                            </div>

                            {campaigns.length === 0 ? (
                                <div className="no-campaigns">
                                    <Send size={48} />
                                    <p>No campaigns yet</p>
                                </div>
                            ) : (
                                <div className="campaigns-grid">
                                    {campaigns.map((campaign) => (
                                        <div key={campaign.id} className="campaign-card">
                                            <div className="campaign-header">
                                                <h4>{campaign.name}</h4>
                                                <span className={`campaign-status ${campaign.status}`}>
                                                    {campaign.status}
                                                </span>
                                            </div>
                                            <div className="campaign-subject">{campaign.subject}</div>
                                            <div className="campaign-preview">{campaign.content.substring(0, 100)}...</div>
                                            <div className="campaign-stats">
                                                <span><Send size={12} /> {campaign.recipientCount || 0} sent</span>
                                                <span><Eye size={12} /> {campaign.openCount || 0} opens</span>
                                                <span><MousePointer size={12} /> {campaign.clickCount || 0} clicks</span>
                                            </div>
                                            <div className="campaign-footer">
                                                <span className="campaign-date">
                                                    <Calendar size={12} />
                                                    {new Date(campaign.createdAt).toLocaleDateString()}
                                                </span>
                                                {campaign.status === 'draft' && (
                                                    <Button size="sm" onClick={() => handleSendCampaign(campaign.id)}>
                                                        Send Now
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Create Campaign Modal */}
            {showCreateCampaign && (
                <div className="campaign-modal-overlay" onClick={() => setShowCreateCampaign(false)}>
                    <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Campaign</h3>
                        <input
                            type="text"
                            placeholder="Campaign Name"
                            value={newCampaign.name}
                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Email Subject"
                            value={newCampaign.subject}
                            onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                        />
                        <textarea
                            placeholder="Email Content (HTML supported)"
                            rows={6}
                            value={newCampaign.content}
                            onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                        />
                        <div className="modal-actions">
                            <Button onClick={() => setShowCreateCampaign(false)} variant="ghost">
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCampaign}>
                                Create Campaign
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .email-dashboard {
                    position: fixed;
                    bottom: 80px;
                    left: 20px;
                    width: 600px;
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

                .email-dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                    color: white;
                }

                .email-dashboard-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                    font-size: 16px;
                }

                .email-dashboard-header-actions {
                    display: flex;
                    gap: 8px;
                }

                .refresh-btn, .close-email-dashboard {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 4px;
                }

                .email-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
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
                    font-size: 20px;
                    font-weight: bold;
                    color: #1a1a1a;
                }

                .stat-label {
                    font-size: 11px;
                    color: #6b7280;
                }

                .email-tabs {
                    display: flex;
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
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
                }

                .tab.active {
                    color: #f97316;
                    border-bottom: 2px solid #f97316;
                }

                .subscribers-list, .campaigns-list {
                    overflow-y: auto;
                    flex: 1;
                    padding: 16px;
                }

                .subscribers-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .subscribers-table th, .subscribers-table td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }

                .subscribers-table th {
                    font-weight: 600;
                    font-size: 12px;
                    color: #6b7280;
                }

                .subscribers-table td {
                    font-size: 13px;
                }

                .status-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .status-badge.active {
                    background: #dcfce7;
                    color: #166534;
                }

                .status-badge.unsubscribed {
                    background: #fee2e2;
                    color: #991b1b;
                }

                .campaigns-header {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 16px;
                }

                .create-campaign-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .campaigns-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .campaign-card {
                    background: #f9fafb;
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid #e5e7eb;
                }

                .campaign-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .campaign-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }

                .campaign-status {
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-weight: 500;
                }

                .campaign-status.draft {
                    background: #fef3c7;
                    color: #92400e;
                }

                .campaign-status.sent {
                    background: #dcfce7;
                    color: #166534;
                }

                .campaign-subject {
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #1a1a1a;
                }

                .campaign-preview {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 12px;
                }

                .campaign-stats {
                    display: flex;
                    gap: 16px;
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 12px;
                }

                .campaign-stats span {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .campaign-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .campaign-date {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    color: #9ca3af;
                }

                .campaign-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1001;
                }

                .campaign-modal {
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    width: 500px;
                    max-width: 90%;
                }

                .campaign-modal h3 {
                    margin: 0 0 16px 0;
                }

                .campaign-modal input, .campaign-modal textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    font-size: 14px;
                }

                .campaign-modal textarea {
                    resize: vertical;
                }

                .modal-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 16px;
                }

                .email-loading, .no-subscribers, .no-campaigns {
                    text-align: center;
                    padding: 40px;
                    color: #9ca3af;
                }

                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f4f6;
                    border-top-color: #f97316;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin: 0 auto 12px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default EmailDashboard;