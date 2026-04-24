// FILE: components/UpgradeModal.tsx

import { useState, useEffect } from 'react';
import { Crown, X, Check, Sparkles, Zap, Shield, TrendingDown } from 'lucide-react';
import Button from './ui/Button';
import StripeCheckout from './StripeCheckout';
import { getPremiumFeatures, PRO_PRICE } from '../lib/usage.tracker';
import { useOutletContext } from 'react-router';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
    remaining?: number;
    triggerContext?: 'render_limit' | 'export_limit' | 'pdf_limit' | 'premium_style' | 'premium_preset' | 'watermark';
}

const UpgradeModal = ({ isOpen, onClose, featureName, remaining, triggerContext }: UpgradeModalProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
    const [showStripeCheckout, setShowStripeCheckout] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');
    const premiumFeatures = getPremiumFeatures();
    const { userId, userName } = useOutletContext<AuthContext>();

    const monthlyPrice = PRO_PRICE.monthly;
    const yearlyPrice = PRO_PRICE.yearly;
    const monthlyEquivalent = Math.round(yearlyPrice / 12);
    const yearlySavings = (monthlyPrice * 12) - yearlyPrice;

    // Try to get user email from localStorage or ask for it
    useEffect(() => {
        const storedEmail = localStorage.getItem('roomify_user_email');
        if (storedEmail && storedEmail.includes('@')) {
            setUserEmail(storedEmail);
        } else if (userName && userName.includes('@')) {
            setUserEmail(userName);
        }
    }, [userName]);

    const handleEmailUpdate = (email: string) => {
        setUserEmail(email);
        localStorage.setItem('roomify_user_email', email);
    };

    const getContextualTitle = (): string => {
        switch(triggerContext) {
            case 'render_limit':
                return 'You\'ve Reached Your Render Limit';
            case 'export_limit':
                return 'You\'ve Reached Your Export Limit';
            case 'pdf_limit':
                return 'You\'ve Reached Your PDF Export Limit';
            case 'premium_style':
                return `${featureName || 'Premium'} Style is a Pro Feature`;
            case 'premium_preset':
                return `${featureName || 'Premium'} Preset is a Pro Feature`;
            case 'watermark':
                return 'Remove Watermark & Go Pro';
            default:
                return 'Upgrade to Roomify Pro';
        }
    };

    const getContextualMessage = (): string => {
        switch(triggerContext) {
            case 'render_limit':
                return `You've used all ${remaining !== undefined ? remaining : 0} free renders this month. Upgrade to Pro for unlimited renders!`;
            case 'export_limit':
                return `You've used all ${remaining !== undefined ? remaining : 0} free exports this month. Upgrade to Pro for unlimited exports!`;
            case 'pdf_limit':
                return `You've used all ${remaining !== undefined ? remaining : 0} free PDF exports this month. Upgrade to Pro for unlimited PDF exports!`;
            case 'premium_style':
                return `${featureName} styles are a Pro feature. Upgrade to unlock all 5 premium styles!`;
            case 'premium_preset':
                return `${featureName} presets are a Pro feature. Upgrade to unlock all 5 premium presets!`;
            case 'watermark':
                return 'Remove the watermark and get unlimited everything with Pro. Upgrade today!';
            default:
                return 'Get unlimited renders, no watermark, all premium styles, and more!';
        }
    };

    const handleUpgrade = () => {
        setShowStripeCheckout(true);
    };

    const handleStripeSuccess = () => {
        setShowStripeCheckout(false);
        onClose();
        // Refresh page to update user status
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <div className="upgrade-modal-overlay" onClick={onClose}>
            <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                {showStripeCheckout ? (
                    <StripeCheckout
                        userId={userId || ''}
                        email={userEmail}
                        onSuccess={handleStripeSuccess}
                        onCancel={() => setShowStripeCheckout(false)}
                        onError={(error) => alert(error)}
                        onEmailUpdate={handleEmailUpdate}
                    />
                ) : (
                    <>
                        <div className="modal-header">
                            <div className="crown-icon">
                                <Crown size={32} />
                            </div>
                            <h2>{getContextualTitle()}</h2>
                            <p className="context-message">{getContextualMessage()}</p>
                            {featureName && remaining !== undefined && remaining === 0 && (
                                <p className="warning">
                                    You've used all free {featureName} for this month
                                </p>
                            )}
                            {featureName && remaining !== undefined && remaining > 0 && remaining < 3 && (
                                <p className="warning">
                                    Only {remaining} free {featureName} remaining
                                </p>
                            )}
                        </div>

                        <div className="billing-toggle">
                            <button
                                className={`toggle-option ${billingInterval === 'monthly' ? 'active' : ''}`}
                                onClick={() => setBillingInterval('monthly')}
                            >
                                Monthly
                                <span className="price-tag">${monthlyPrice}/mo</span>
                            </button>
                            <button
                                className={`toggle-option ${billingInterval === 'yearly' ? 'active' : ''}`}
                                onClick={() => setBillingInterval('yearly')}
                            >
                                Yearly
                                <span className="price-tag">${yearlyPrice}/yr</span>
                                <span className="save-badge">Save ${yearlySavings}</span>
                            </button>
                        </div>

                        <div className="savings-banner">
                            <TrendingDown size={16} />
                            <span>Yearly plan saves you ${yearlySavings} compared to monthly</span>
                        </div>

                        <div className="pricing-card">
                            <div className="price">
                                <span className="currency">$</span>
                                <span className="amount">
                                    {billingInterval === 'monthly' ? monthlyPrice : monthlyEquivalent}
                                </span>
                                <span className="period">/month</span>
                            </div>
                            {billingInterval === 'yearly' && (
                                <p className="billed-as">Billed as ${yearlyPrice}/year (${monthlyEquivalent}/mo)</p>
                            )}
                            <p className="price-note">Cancel anytime • No commitment • 14-day money-back</p>
                        </div>

                        <div className="features">
                            <h3>Pro Includes:</h3>
                            <ul>
                                {premiumFeatures.map((feature, index) => (
                                    <li key={index}>
                                        <Check size={16} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                                <li>
                                    <Zap size={16} />
                                    <span>Priority processing (faster renders)</span>
                                </li>
                                <li>
                                    <Shield size={16} />
                                    <span>Priority email support</span>
                                </li>
                            </ul>
                        </div>

                        <div className="modal-actions">
                            <Button
                                onClick={handleUpgrade}
                                className="upgrade-btn"
                                disabled={isProcessing}
                                fullWidth
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="spinner-small" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Crown size={18} />
                                        Upgrade to Pro - ${billingInterval === 'monthly' ? monthlyPrice : yearlyPrice}/{billingInterval === 'monthly' ? 'month' : 'year'}
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                fullWidth
                            >
                                Maybe later
                            </Button>
                        </div>

                        <p className="guarantee">
                            🔒 14-day money-back guarantee • Secure payment via Stripe
                        </p>
                    </>
                )}
            </div>

            <style>{`
                .upgrade-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .upgrade-modal {
                    background: white;
                    border-radius: 1.5rem;
                    max-width: 550px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 2rem;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }

                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                }

                .close-btn:hover {
                    color: #1a1a1a;
                }

                .modal-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .crown-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                    color: white;
                }

                .modal-header h2 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin: 0 0 0.5rem 0;
                    color: #1a1a1a;
                }

                .context-message {
                    color: #4b5563;
                    font-size: 0.875rem;
                    margin: 0.5rem 0;
                }

                .warning {
                    color: #f97316;
                    font-size: 0.875rem;
                    margin: 0.5rem 0 0 0;
                }

                .billing-toggle {
                    display: flex;
                    background: #f3f4f6;
                    border-radius: 2rem;
                    padding: 0.25rem;
                    margin-bottom: 1rem;
                }

                .toggle-option {
                    flex: 1;
                    padding: 0.75rem 1rem;
                    border: none;
                    background: transparent;
                    border-radius: 1.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                }

                .toggle-option.active {
                    background: white;
                    color: #f97316;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .price-tag {
                    font-size: 0.7rem;
                    font-weight: normal;
                    color: #6b7280;
                }

                .toggle-option.active .price-tag {
                    color: #f97316;
                }

                .save-badge {
                    position: absolute;
                    top: -10px;
                    right: -5px;
                    background: #22c55e;
                    color: white;
                    font-size: 0.6rem;
                    font-weight: 600;
                    padding: 0.125rem 0.375rem;
                    border-radius: 1rem;
                    white-space: nowrap;
                }

                .savings-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    background: #dcfce7;
                    color: #166534;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    font-size: 0.75rem;
                    margin-bottom: 1rem;
                }

                .pricing-card {
                    background: linear-gradient(135deg, #fff7ed, #ffedd5);
                    border-radius: 1rem;
                    padding: 1.5rem;
                    text-align: center;
                    margin-bottom: 1.5rem;
                    border: 1px solid #fed7aa;
                }

                .price {
                    display: flex;
                    align-items: baseline;
                    justify-content: center;
                    gap: 0.25rem;
                }

                .currency {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #f97316;
                }

                .amount {
                    font-size: 3rem;
                    font-weight: bold;
                    color: #f97316;
                }

                .period {
                    font-size: 1rem;
                    color: #6b7280;
                }

                .billed-as {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin-top: 0.25rem;
                }

                .price-note {
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin-top: 0.5rem;
                }

                .features {
                    margin-bottom: 1.5rem;
                }

                .features h3 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                    color: #1a1a1a;
                }

                .features ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .features li {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0;
                    color: #4b5563;
                    font-size: 0.875rem;
                }

                .features li svg {
                    color: #22c55e;
                    flex-shrink: 0;
                }

                .modal-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .upgrade-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    border: none;
                    padding: 0.75rem;
                    font-weight: bold;
                }

                .upgrade-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #ea580c, #c2410c);
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    display: inline-block;
                    margin-right: 0.5rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .guarantee {
                    text-align: center;
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin: 0;
                }

                @media (max-width: 640px) {
                    .upgrade-modal {
                        padding: 1.5rem;
                    }
                    
                    .modal-header h2 {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default UpgradeModal;