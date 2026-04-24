// FILE: components/StripeCheckout.tsx

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_PRICES } from '../lib/stripe.config';
import Button from './ui/Button';
import { Crown, CreditCard, Shield, Zap, Check, TrendingDown, Mail } from 'lucide-react';
import { PLANS } from '../lib/plans';

interface StripeCheckoutProps {
    userId: string;
    email: string;
    onSuccess: () => void;
    onCancel: () => void;
    onError: (error: string) => void;
    onEmailUpdate?: (email: string) => void;
}

const StripeCheckout = ({ userId, email: initialEmail, onSuccess, onCancel, onError, onEmailUpdate }: StripeCheckoutProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [stripe, setStripe] = useState<any>(null);
    const [email, setEmail] = useState(initialEmail);
    const [showEmailInput, setShowEmailInput] = useState(!initialEmail || !initialEmail.includes('@'));
    const [isValidEmail, setIsValidEmail] = useState(false);

    const WORKER_URL = import.meta.env.VITE_PUTER_WORKER_URL;

    useEffect(() => {
        const initStripe = async () => {
            if (STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== '') {
                try {
                    const stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
                    setStripe(stripeInstance);
                    console.log('Stripe loaded successfully');
                } catch (error) {
                    console.error('Failed to load Stripe:', error);
                    onError('Payment system is temporarily unavailable. Please try again later.');
                }
            }
        };
        initStripe();
    }, []);

    // Validate email format
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setIsValidEmail(emailRegex.test(email));
    }, [email]);

    const monthlyPlan = PLANS.pro_monthly;
    const yearlyPlan = PLANS.pro_yearly;
    const yearlySavings = (monthlyPlan.price * 12) - yearlyPlan.price;

    const handleEmailSubmit = () => {
        if (!isValidEmail) {
            onError('Please enter a valid email address');
            return;
        }
        if (onEmailUpdate) {
            onEmailUpdate(email);
        }
        setShowEmailInput(false);
    };

    const handleCheckout = async () => {
        if (!isValidEmail) {
            setShowEmailInput(true);
            onError('Please enter a valid email address to continue');
            return;
        }

        setIsLoading(true);
        
        try {
            const priceId = selectedPlan === 'monthly' ? STRIPE_PRICES.monthly : STRIPE_PRICES.yearly;
            
            // For development/test - use mock checkout directly without calling the worker
            if (import.meta.env.DEV && (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY === 'pk_test_placeholder')) {
                console.log('Development mode: Using mock checkout');
                const mockSessionId = `mock_cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
                const mockCheckoutUrl = `/payment-success?session_id=${mockSessionId}&mock=true`;
                window.location.href = mockCheckoutUrl;
                return;
            }
            
            console.log('Creating real Stripe checkout session...', { 
                priceId, 
                userId, 
                email, 
                selectedPlan,
                workerUrl: WORKER_URL 
            });
            
            const response = await fetch(`${WORKER_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    userId,
                    email,
                    planType: selectedPlan === 'monthly' ? 'pro_monthly' : 'pro_yearly',
                    successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Server returned error:', errorData);
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const data = await response.json();
            console.log('Checkout response:', data);
            
            if (data.checkoutUrl) {
                // Redirect to Stripe Checkout page
                console.log('Redirecting to Stripe checkout:', data.checkoutUrl);
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error('No checkout URL received from server');
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            onError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // If we need to show email input first
    if (showEmailInput) {
        return (
            <div className="stripe-checkout">
                <div className="checkout-header">
                    <div className="icon-wrapper">
                        <Mail size={32} />
                    </div>
                    <h2>Enter Your Email</h2>
                    <p>We need your email to process the subscription</p>
                </div>

                <div className="email-input-section">
                    <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="email-input"
                        autoFocus
                    />
                    {email && !isValidEmail && (
                        <p className="email-error">Please enter a valid email address</p>
                    )}
                    <Button onClick={handleEmailSubmit} className="continue-btn" fullWidth>
                        Continue to Payment
                    </Button>
                </div>

                <style>{`
                    .email-input-section {
                        padding: 1rem 0;
                    }
                    
                    .email-input {
                        width: 100%;
                        padding: 0.875rem;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.75rem;
                        font-size: 1rem;
                        margin-bottom: 1rem;
                    }
                    
                    .email-input:focus {
                        outline: none;
                        border-color: #f97316;
                        box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                    }
                    
                    .email-error {
                        color: #ef4444;
                        font-size: 0.75rem;
                        margin-bottom: 1rem;
                    }
                    
                    .continue-btn {
                        background: linear-gradient(135deg, #f97316, #ea580c);
                        color: white;
                        border: none;
                        padding: 0.875rem;
                        font-weight: 600;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="stripe-checkout">
            <div className="checkout-header">
                <div className="icon-wrapper">
                    <Crown size={32} />
                </div>
                <h2>Upgrade to Roomify Pro</h2>
                <p>Get unlimited access to all features</p>
                <div className="user-email">
                    <Mail size={14} />
                    <span>{email}</span>
                    <button onClick={() => setShowEmailInput(true)} className="change-email">
                        Change
                    </button>
                </div>
            </div>

            <div className="plan-selector">
                <button
                    className={`plan-option ${selectedPlan === 'monthly' ? 'active' : ''}`}
                    onClick={() => setSelectedPlan('monthly')}
                >
                    <div className="plan-name">{monthlyPlan.name}</div>
                    <div className="plan-price">${monthlyPlan.price}<span>/month</span></div>
                </button>
                <button
                    className={`plan-option ${selectedPlan === 'yearly' ? 'active' : ''}`}
                    onClick={() => setSelectedPlan('yearly')}
                >
                    <div className="plan-name">{yearlyPlan.name}</div>
                    <div className="plan-price">${yearlyPlan.price}<span>/year</span></div>
                    <div className="plan-savings">Save ${yearlySavings}</div>
                </button>
            </div>

            <div className="savings-banner">
                <TrendingDown size={16} />
                <span>Yearly plan saves you ${yearlySavings} compared to monthly</span>
            </div>

            <div className="features-list">
                {monthlyPlan.features.map((feature, index) => (
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
                            Pay ${selectedPlan === 'monthly' ? monthlyPlan.price : yearlyPlan.price}/{selectedPlan === 'monthly' ? 'month' : 'year'}
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
                }

                .checkout-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .icon-wrapper {
                    width: 56px;
                    height: 56px;
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

                .user-email {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #f3f4f6;
                    padding: 0.375rem 0.75rem;
                    border-radius: 2rem;
                    font-size: 0.75rem;
                    margin-top: 0.75rem;
                }

                .change-email {
                    background: none;
                    border: none;
                    color: #f97316;
                    cursor: pointer;
                    font-size: 0.7rem;
                    margin-left: 0.25rem;
                }

                .change-email:hover {
                    text-decoration: underline;
                }

                .plan-selector {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
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
                    margin-bottom: 1.5rem;
                }

                .features-list {
                    margin-bottom: 1.5rem;
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
                    margin-bottom: 1rem;
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

                .checkout-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
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