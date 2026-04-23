// FILE: C:\Users\user\Desktop\roomify\app\routes\payment-success.tsx

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { CheckCircle, Crown, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId) {
                setStatus('error');
                return;
            }

            try {
                const response = await fetch(`/api/verify-payment?session_id=${sessionId}`);
                const data = await response.json();

                if (data.verified) {
                    setStatus('success');
                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Payment verification failed:', error);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [sessionId, navigate]);

    return (
        <div className="payment-success">
            <div className="success-card">
                {status === 'loading' && (
                    <>
                        <div className="spinner"></div>
                        <h2>Verifying your payment...</h2>
                        <p>Please wait while we confirm your subscription.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2>Payment Successful! 🎉</h2>
                        <p>Your Roomify Pro subscription is now active.</p>
                        <div className="benefits">
                            <p>You now have access to:</p>
                            <ul>
                                <li>✓ Unlimited AI renders</li>
                                <li>✓ Unlimited exports (PNG/PDF)</li>
                                <li>✓ No watermark</li>
                                <li>✓ All premium styles and presets</li>
                            </ul>
                        </div>
                        <Button onClick={() => navigate('/')} className="continue-btn">
                            Continue to Dashboard <ArrowRight size={16} />
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="error-icon">⚠️</div>
                        <h2>Something went wrong</h2>
                        <p>We couldn't verify your payment. Please contact support.</p>
                        <Button onClick={() => navigate('/')} variant="outline">
                            Return Home
                        </Button>
                    </>
                )}
            </div>

            <style>{`
                .payment-success {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #fdfbf7, #f3f4f6);
                    padding: 2rem;
                }

                .success-card {
                    background: white;
                    border-radius: 2rem;
                    padding: 3rem;
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid #f3f4f6;
                    border-top-color: #f97316;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                    margin: 0 auto 1rem;
                }

                .success-icon {
                    color: #22c55e;
                    margin-bottom: 1rem;
                }

                .error-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                h2 {
                    font-size: 1.75rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }

                p {
                    color: #6b7280;
                    margin-bottom: 1.5rem;
                }

                .benefits {
                    text-align: left;
                    background: #f9fafb;
                    padding: 1rem;
                    border-radius: 1rem;
                    margin: 1.5rem 0;
                }

                .benefits p {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #1a1a1a;
                }

                .benefits ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .benefits li {
                    padding: 0.25rem 0;
                    color: #4b5563;
                }

                .continue-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    border: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .success-card {
                        padding: 2rem;
                    }
                    
                    h2 {
                        font-size: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
}