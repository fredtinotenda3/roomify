// FILE: C:\Users\user\Desktop\roomify\components\StripeCheckout.tsx

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_PRICES } from '../lib/stripe.config';
import Button from './ui/Button';
import { Crown, CreditCard, Shield, Zap, Check, ArrowRight } from 'lucide-react';

interface StripeCheckoutProps {
    userId: string;
    email: string;
    onSuccess: () => void;
    onCancel: () => void;
    onError: (error: string) => void;
}

const StripeCheckout = ({ userId, email, onSuccess, onCancel, onError }: StripeCheckoutProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [stripe, setStripe] = useState<any>(null);

    useEffect(() => {
        const initStripe = async () => {
            if (STRIPE_PUBLISHABLE_KEY) {
                const stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
                setStripe(stripeInstance);
            }
        };
        initStripe();
    }, []);

    const handleCheckout = async () => {
        setIsLoading(true);
        
        try {
            const priceId = selectedPlan === 'monthly' ? STRIPE_PRICES.monthly : STRIPE_PRICES.yearly;
            
            // Call your backend to create checkout session
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    userId,
                    email,
                    successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                }),
            });

            const data = await response.json();
            
            if (data.sessionId && stripe) {
                const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
                if (error) {
                    onError(error.message);
                }
            } else {
                onError('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            onError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const plans = {
        monthly: {
            name: 'Monthly Pro',
            price: '$19',
            period: '/month',
            features: [
                'Unlimited AI renders',
                'Unlimited PNG exports',
                'Unlimited PDF exports',
                'No watermark',
                'All 5 design styles',
                'All 5 design presets',
                'Priority processing',
                'Email support'
            ]
        },
        yearly: {
            name: 'Yearly Pro',
            price: '$159',
            period: '/year',
            savings: 'Save $69',
            features: [
                'Everything in Monthly',
                '2 months free',
                'Priority support',
                'Early access to new features'
            ]
        }
    };

    return (
        <div className="stripe-checkout">
            <div className="checkout-header">
                <div className="icon-wrapper">
                    <Crown size={32} />
                </div>
                <h2>Upgrade to Roomify Pro</h2>
                <p>Get unlimited access to all features</p>
            </div>

            <div className="plan-selector">
                <button
                    className={`plan-option ${selectedPlan === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedPlan('monthly')}
                >
                    <div className="plan-name">Monthly</div>
                    <div className="plan-price">$19<span>/month</span></div>
                </button>
                <button
                    className={`plan-option ${selectedPlan === 'yearly' ? 'active' : ''}`}
                    onClick={() => setSelectedPlan('yearly')}
                >
                    <div className="plan-name">Yearly</div>
                    <div className="plan-price">$159<span>/year</span></div>
                    <div className="plan-savings">Save $69</div>
                </button>
            </div>

            <div className="features-list">
                {plans[selectedPlan].features.map((feature, index) => (
                    <div key={index} className="feature-item">
                        <Check size={16} />
                        <span>{feature}</span>
                    </div>
                ))}
            </div>

            <div className="payment-actions">
                <Button
                    onClick={handleCheckout}
                    className="checkout-btn"
                    disabled={isLoading}
                    fullWidth
                >
                    {isLoading ? (
                        <>
                            <div className="spinner-small" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard size={18} />
                            Pay {plans[selectedPlan].price}{plans[selectedPlan].period}
                        </>
                    )}
                </Button>
                <Button onClick={onCancel} variant="ghost" fullWidth>
                    Cancel
                </Button>
            </div>

            <div className="security-badges">
                <div className="badge">
                    <Shield size={14} />
                    <span>Secure payment</span>
                </div>
                <div className="badge">
                    <Zap size={14} />
                    <span>Instant access</span>
                </div>
            </div>

            <style>{`
                .stripe-checkout {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 2rem;
                    background: white;
                    border-radius: 1.5rem;
                }

                .checkout-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .icon-wrapper {
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

                .checkout-header h2 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }

                .checkout-header p {
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                .plan-selector {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .plan-option {
                    flex: 1;
                    padding: 1rem;
                    background: #f9fafb;
                    border: 2px solid #e5e7eb;
                    border-radius: 1rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                    position: relative;
                }

                .plan-option.active {
                    border-color: #f97316;
                    background: #fff7ed;
                }

                .plan-name {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }

                .plan-price {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #f97316;
                }

                .plan-price span {
                    font-size: 0.875rem;
                    font-weight: normal;
                    color: #6b7280;
                }

                .plan-savings {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    background: #22c55e;
                    color: white;
                    font-size: 0.7rem;
                    padding: 0.125rem 0.5rem;
                    border-radius: 1rem;
                }

                .features-list {
                    margin-bottom: 2rem;
                }

                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                    color: #4b5563;
                    font-size: 0.875rem;
                }

                .feature-item svg {
                    color: #22c55e;
                    flex-shrink: 0;
                }

                .payment-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .checkout-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    border: none;
                    padding: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .checkout-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #ea580c, #c2410c);
                }

                .spinner-small {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .security-badges {
                    display: flex;
                    justify-content: center;
                    gap: 1.5rem;
                }

                .badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: #6b7280;
                }
            `}</style>
        </div>
    );
};

export default StripeCheckout;