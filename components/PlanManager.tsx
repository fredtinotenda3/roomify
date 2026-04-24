// FILE: C:\Users\user\Desktop\roomify\components\PlanManager.tsx

import { useState, useEffect } from 'react';
import { Crown, Check, X, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import { getUserPlan, PLANS, type PlanType, type Plan } from '../lib/plans';
import { getRemainingUsage, upgradeToPro } from '../lib/usage.tracker';

interface PlanManagerProps {
    userId: string;
    onUpgrade: () => void;
}

const PlanManager = ({ userId, onUpgrade }: PlanManagerProps) => {
    const [currentPlan, setCurrentPlan] = useState<PlanType>('free');
    const [usage, setUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const usageData = await getRemainingUsage(userId);
        setUsage(usageData);
        const plan = getUserPlan(usageData.isPremium, usageData.subscriptionType as any);
        setCurrentPlan(plan);
        setLoading(false);
    };

    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId]);

    const currentPlanData = PLANS[currentPlan];
    const monthlyPlan = PLANS.pro_monthly;
    const yearlyPlan = PLANS.pro_yearly;

    if (loading) {
        return (
            <div className="plan-manager-loading">
                <RefreshCcw className="spinner" size={24} />
                <p>Loading plan information...</p>
            </div>
        );
    }

    return (
        <div className="plan-manager">
            <div className="current-plan">
                <div className="plan-header">
                    <Crown size={24} />
                    <h3>Current Plan: {currentPlanData.name}</h3>
                </div>
                <div className="plan-limits">
                    <div className="limit-item">
                        <span>AI Renders:</span>
                        <strong>
                            {currentPlan === 'free' 
                                ? `${usage?.rendersUsed || 0}/${currentPlanData.limits.renders} used`
                                : 'Unlimited'}
                        </strong>
                    </div>
                    <div className="limit-item">
                        <span>PNG Exports:</span>
                        <strong>
                            {currentPlan === 'free'
                                ? `${usage?.exportsUsed || 0}/${currentPlanData.limits.exports} used`
                                : 'Unlimited'}
                        </strong>
                    </div>
                    <div className="limit-item">
                        <span>PDF Exports:</span>
                        <strong>
                            {currentPlan === 'free'
                                ? `${usage?.pdfsUsed || 0}/${currentPlanData.limits.pdfExports} used`
                                : 'Unlimited'}
                        </strong>
                    </div>
                    <div className="limit-item">
                        <span>Watermark:</span>
                        <strong>{currentPlanData.limits.watermark ? 'Yes' : 'No'}</strong>
                    </div>
                </div>
            </div>

            {currentPlan === 'free' && (
                <div className="upgrade-section">
                    <h4>Upgrade to Pro</h4>
                    <div className="plan-comparison">
                        <div className="plan-card free">
                            <h5>Free</h5>
                            <div className="plan-price">$0</div>
                            <ul>
                                <li>✓ 3 renders/month</li>
                                <li>✓ 5 PNG exports/month</li>
                                <li>✓ 2 PDF exports/month</li>
                                <li>✗ Watermark on exports</li>
                                <li>✗ Premium styles</li>
                                <li>✗ Premium presets</li>
                            </ul>
                        </div>
                        <div className="plan-card pro">
                            <h5>Pro Monthly</h5>
                            <div className="plan-price">${monthlyPlan.price}<span>/month</span></div>
                            <ul>
                                <li>✓ Unlimited renders</li>
                                <li>✓ Unlimited exports</li>
                                <li>✓ No watermark</li>
                                <li>✓ All premium styles</li>
                                <li>✓ All premium presets</li>
                                <li>✓ Priority support</li>
                            </ul>
                            <Button size="sm" onClick={onUpgrade} className="upgrade-plan-btn">
                                Upgrade
                            </Button>
                        </div>
                        <div className="plan-card pro">
                            <h5>Pro Yearly</h5>
                            <div className="plan-price">${yearlyPlan.price}<span>/year</span></div>
                            <div className="plan-savings">Save ${(monthlyPlan.price * 12) - yearlyPlan.price}</div>
                            <ul>
                                <li>✓ Everything in Monthly</li>
                                <li>✓ Save $69/year</li>
                                <li>✓ Priority support</li>
                                <li>✓ Early access</li>
                            </ul>
                            <Button size="sm" onClick={onUpgrade} className="upgrade-plan-btn">
                                Upgrade
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .plan-manager {
                    background: white;
                    border-radius: 1rem;
                    padding: 1.5rem;
                    border: 1px solid #e5e7eb;
                }

                .plan-manager-loading {
                    text-align: center;
                    padding: 2rem;
                }

                .spinner {
                    animation: spin 0.6s linear infinite;
                    margin-bottom: 1rem;
                }

                .current-plan {
                    margin-bottom: 2rem;
                }

                .plan-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .plan-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                }

                .plan-limits {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                }

                .limit-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem;
                    background: #f9fafb;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                }

                .upgrade-section h4 {
                    margin: 0 0 1rem 0;
                    font-size: 1rem;
                }

                .plan-comparison {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1rem;
                }

                .plan-card {
                    background: #f9fafb;
                    border-radius: 1rem;
                    padding: 1.25rem;
                    border: 1px solid #e5e7eb;
                    position: relative;
                }

                .plan-card.pro {
                    border-color: #f97316;
                    background: linear-gradient(135deg, #fff7ed, #ffffff);
                }

                .plan-card h5 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0 0 0.5rem 0;
                }

                .plan-price {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #f97316;
                    margin-bottom: 1rem;
                }

                .plan-price span {
                    font-size: 0.75rem;
                    font-weight: normal;
                    color: #6b7280;
                }

                .plan-savings {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    background: #22c55e;
                    color: white;
                    font-size: 0.7rem;
                    padding: 0.125rem 0.5rem;
                    border-radius: 1rem;
                }

                .plan-card ul {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 1rem 0;
                }

                .plan-card li {
                    font-size: 0.75rem;
                    padding: 0.25rem 0;
                    color: #4b5563;
                }

                .upgrade-plan-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    font-size: 0.75rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .plan-comparison {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default PlanManager;