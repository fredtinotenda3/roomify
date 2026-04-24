// FILE: app/routes/payment-success.tsx

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { CheckCircle, Crown, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [countdown, setCountdown] = useState(2);
    const confettiFired = useRef(false);

    const sessionId = searchParams.get('session_id');
    const WORKER_URL = import.meta.env.VITE_PUTER_WORKER_URL;

    // Fire confetti celebration
    const fireConfetti = () => {
        if (confettiFired.current) return;
        confettiFired.current = true;

        // Main burst
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#ea580c', '#fbbf24', '#22c55e', '#3b82f6']
        });

        // Side bursts
        setTimeout(() => {
            confetti({
                particleCount: 80,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.5 },
                colors: ['#f97316', '#fbbf24']
            });
            confetti({
                particleCount: 80,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.5 },
                colors: ['#ea580c', '#fbbf24']
            });
        }, 150);

        // Second burst
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 100,
                origin: { y: 0.6 },
                startVelocity: 25,
                colors: ['#22c55e', '#3b82f6', '#f97316']
            });
        }, 400);
    };

    useEffect(() => {
        const verifyPayment = async () => {
            if (!sessionId) {
                setStatus('error');
                return;
            }

            try {
                const response = await fetch(`${WORKER_URL}/api/verify-payment?session_id=${sessionId}`);
                const data = await response.json();

                if (data.verified) {
                    setStatus('success');
                    
                    // Fire confetti celebration
                    fireConfetti();
                    
                    // Store premium status in localStorage
                    localStorage.setItem('roomify_is_premium', 'true');
                    localStorage.setItem('roomify_premium_since', new Date().toISOString());
                    
                    // Auto-redirect after 2 seconds
                    const timer = setInterval(() => {
                        setCountdown(prev => {
                            if (prev <= 1) {
                                clearInterval(timer);
                                navigate('/');
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                    
                    return () => clearInterval(timer);
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Payment verification failed:', error);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [sessionId, navigate, WORKER_URL]);

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="text-center max-w-md w-full">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-black mb-2">
                        Verifying your payment...
                    </h2>
                    <p className="text-zinc-500 text-sm">
                        Please wait while we confirm your subscription.
                    </p>
                </div>
            </div>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="text-center max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-xl">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-black mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-zinc-500 text-sm mb-6">
                        We couldn't verify your payment. Please contact support.
                    </p>
                    <Button 
                        onClick={() => navigate('/')} 
                        variant="outline"
                        className="w-full"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }

    // Success state
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="text-center max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-xl animate-in fade-in zoom-in duration-500">
                {/* Animated Checkmark */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle size={48} className="text-white" />
                    </div>
                </div>

                {/* Success Title */}
                <h2 className="text-2xl font-serif font-bold text-black mb-2">
                    Payment Successful! 🎉
                </h2>
                <p className="text-zinc-600 text-sm mb-4">
                    Your Roomify Pro subscription is now active.
                </p>

                {/* Premium Badge */}
                <div className="inline-flex items-center gap-2 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full px-4 py-1.5 mb-6">
                    <Crown size={14} className="text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700">PRO ACTIVE</span>
                    <Sparkles size={12} className="text-amber-400" />
                </div>

                {/* Benefits List */}
                <div className="bg-zinc-50 rounded-xl p-4 mb-6 text-left border border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-3">
                        You now have access to:
                    </p>
                    <ul className="space-y-2">
                        {[
                            'Unlimited AI renders',
                            'Unlimited exports (PNG/PDF)',
                            'No watermark',
                            'All premium styles and presets'
                        ].map((benefit, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-zinc-700">
                                <CheckCircle size={16} className="text-green-500 shrink-0" />
                                <span>{benefit}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Redirect Info */}
                <div className="mb-6">
                    <p className="text-sm text-zinc-500">
                        Redirecting to dashboard in{' '}
                        <span className="font-bold text-primary text-lg">{countdown}</span>{' '}
                        second{countdown !== 1 ? 's' : ''}...
                    </p>
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div 
                            className="bg-primary h-full rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${((2 - countdown) / 2) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Button 
                        onClick={() => navigate('/')} 
                        className="w-full bg-linear-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                    >
                        Continue to Dashboard
                        <ArrowRight size={16} className="ml-2" />
                    </Button>
                    
                    <button
                        onClick={() => navigate('/')}
                        className="text-xs text-zinc-400 hover:text-primary transition-colors"
                    >
                        Go now
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-zinc-400 mt-6">
                    Need help? Contact us at{' '}
                    <a href="mailto:support@roomify.app" className="text-primary hover:underline">
                        support@roomify.app
                    </a>
                </p>
            </div>
        </div>
    );
}