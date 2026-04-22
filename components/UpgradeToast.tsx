// FILE: C:\Users\user\Desktop\roomify\components\UpgradeToast.tsx

import { useEffect, useState } from 'react';
import { Crown, X, Sparkles } from 'lucide-react';
import Button from './ui/Button';

interface UpgradeToastProps {
    message: string;
    onClose: () => void;
    onUpgrade: () => void;
    duration?: number;
}

const UpgradeToast = ({ message, onClose, onUpgrade, duration = 8000 }: UpgradeToastProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, duration);
        
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className="upgrade-toast">
            <div className="toast-content">
                <div className="toast-icon">
                    <Sparkles size={20} />
                </div>
                <div className="toast-message">
                    <p>{message}</p>
                </div>
                <Button size="sm" onClick={onUpgrade} className="toast-upgrade-btn">
                    <Crown size={14} />
                    Upgrade Now
                </Button>
                <button className="toast-close" onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}>
                    <X size={16} />
                </button>
            </div>

            <style>{`
                .upgrade-toast {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 1000;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }

                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
                    border-radius: 1rem;
                    padding: 0.75rem 1rem;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
                    border-left: 4px solid #f97316;
                    max-width: 450px;
                }

                .toast-icon {
                    width: 32px;
                    height: 32px;
                    background: rgba(249, 115, 22, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #f97316;
                }

                .toast-message {
                    flex: 1;
                }

                .toast-message p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: white;
                    line-height: 1.4;
                }

                .toast-upgrade-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    border: none;
                    white-space: nowrap;
                    font-size: 0.75rem;
                    padding: 0.375rem 0.75rem;
                }

                .toast-upgrade-btn:hover {
                    background: linear-gradient(135deg, #ea580c, #c2410c);
                }

                .toast-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #9ca3af;
                    padding: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .toast-close:hover {
                    color: white;
                }

                @media (max-width: 640px) {
                    .upgrade-toast {
                        bottom: 1rem;
                        right: 1rem;
                        left: 1rem;
                    }
                    
                    .toast-content {
                        max-width: none;
                    }
                    
                    .toast-message p {
                        font-size: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default UpgradeToast;