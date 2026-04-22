// FILE: C:\Users\user\Desktop\roomify\components\EmailCaptureModal.tsx

import { useState } from 'react';
import { X, Mail, ArrowRight, Sparkles, Crown } from 'lucide-react';
import Button from './ui/Button';

interface EmailCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (email: string) => void;
    triggerReason?: 'gallery_view' | 'save_project' | 'create_project' | 'view_count';
}

const EmailCaptureModal = ({ isOpen, onClose, onSuccess, triggerReason = 'gallery_view' }: EmailCaptureModalProps) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const getTitle = () => {
        switch(triggerReason) {
            case 'save_project':
                return 'Save Your Design';
            case 'create_project':
                return 'Start Creating';
            case 'view_count':
                return 'Love This Design?';
            default:
                return 'Join Roomify Community';
        }
    };

    const getMessage = () => {
        switch(triggerReason) {
            case 'save_project':
                return 'Sign up to save this design to your gallery and access it anytime.';
            case 'create_project':
                return 'Create your own stunning 3D architectural renders in seconds.';
            case 'view_count':
                return 'Like and save designs you love. Get inspired by the community.';
            default:
                return 'Get early access, design tips, and exclusive features.';
        }
    };

    const getBenefits = () => {
        return [
            'Save unlimited designs',
            'Create your own AI renders',
            'Get 3 free renders to start',
            'Join the community gallery'
        ];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        // Simulate API call - in production, save to your database
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Store email in localStorage to remember user
        localStorage.setItem('roomify_captured_email', email);
        localStorage.setItem('roomify_capture_date', new Date().toISOString());
        
        onSuccess(email);
        setIsLoading(false);
    };

    return (
        <div className="email-capture-overlay" onClick={onClose}>
            <div className="email-capture-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-content">
                    <div className="icon-wrapper">
                        <Sparkles size={32} />
                    </div>
                    
                    <h2>{getTitle()}</h2>
                    <p className="message">{getMessage()}</p>

                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <Mail size={18} />
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                        
                        {error && <p className="error">{error}</p>}
                        
                        <Button 
                            type="submit" 
                            className="submit-btn" 
                            disabled={isLoading}
                            fullWidth
                        >
                            {isLoading ? (
                                'Creating account...'
                            ) : (
                                <>
                                    Get Started Free
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="benefits">
                        <p className="benefits-title">What you get:</p>
                        <ul>
                            {getBenefits().map((benefit, index) => (
                                <li key={index}>
                                    <Crown size={14} />
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="terms">
                        By signing up, you agree to our Terms of Service and Privacy Policy.
                        No credit card required. Cancel anytime.
                    </p>
                </div>

                <style>{`
                    .email-capture-overlay {
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
                        z-index: 1001;
                        padding: 1rem;
                    }

                    .email-capture-modal {
                        background: white;
                        border-radius: 1.5rem;
                        max-width: 480px;
                        width: 100%;
                        position: relative;
                        overflow: hidden;
                        animation: slideUp 0.3s ease-out;
                    }

                    @keyframes slideUp {
                        from {
                            transform: translateY(20px);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }

                    .close-btn {
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: #6b7280;
                        z-index: 1;
                    }

                    .close-btn:hover {
                        color: #1a1a1a;
                    }

                    .modal-content {
                        padding: 2rem;
                        text-align: center;
                    }

                    .icon-wrapper {
                        width: 64px;
                        height: 64px;
                        background: linear-gradient(135deg, #f97316, #ea580c);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1rem;
                        color: white;
                    }

                    .modal-content h2 {
                        font-size: 1.75rem;
                        font-weight: bold;
                        margin-bottom: 0.75rem;
                        color: #1a1a1a;
                    }

                    .message {
                        color: #6b7280;
                        font-size: 0.95rem;
                        margin-bottom: 1.5rem;
                        line-height: 1.5;
                    }

                    .input-group {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.75rem;
                        padding: 0.75rem 1rem;
                        margin-bottom: 1rem;
                        transition: all 0.2s;
                    }

                    .input-group:focus-within {
                        border-color: #f97316;
                        box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                    }

                    .input-group input {
                        flex: 1;
                        border: none;
                        outline: none;
                        font-size: 0.95rem;
                    }

                    .error {
                        color: #ef4444;
                        font-size: 0.75rem;
                        margin-bottom: 1rem;
                        text-align: left;
                    }

                    .submit-btn {
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

                    .submit-btn:hover:not(:disabled) {
                        background: linear-gradient(135deg, #ea580c, #c2410c);
                    }

                    .benefits {
                        margin-top: 1.5rem;
                        padding-top: 1.5rem;
                        border-top: 1px solid #f3f4f6;
                        text-align: left;
                    }

                    .benefits-title {
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: #6b7280;
                        margin-bottom: 0.75rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .benefits ul {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                    }

                    .benefits li {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.375rem 0;
                        font-size: 0.875rem;
                        color: #4b5563;
                    }

                    .benefits li svg {
                        color: #22c55e;
                    }

                    .terms {
                        font-size: 0.7rem;
                        color: #9ca3af;
                        margin-top: 1.5rem;
                        line-height: 1.4;
                    }

                    @media (max-width: 640px) {
                        .modal-content {
                            padding: 1.5rem;
                        }
                        
                        .modal-content h2 {
                            font-size: 1.5rem;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default EmailCaptureModal;