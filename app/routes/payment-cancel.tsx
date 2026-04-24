// FILE: C:\Users\user\Desktop\roomify\app\routes\payment-cancel.tsx

import { useNavigate } from 'react-router';
import { XCircle, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function PaymentCancel() {
    const navigate = useNavigate();

    return (
        <div className="payment-cancel">
            <div className="cancel-card">
                <div className="cancel-icon">
                    <XCircle size={64} />
                </div>
                <h2>Payment Cancelled</h2>
                <p>Your subscription was not completed. You can try again anytime.</p>
                <div className="actions">
                    <Button onClick={() => navigate('/')} variant="outline">
                        <ArrowLeft size={16} />
                        Return Home
                    </Button>
                    <Button onClick={() => navigate('/')} className="retry-btn">
                        Try Again
                    </Button>
                </div>
                <p className="help">Need help? Contact us at support@roomify.app</p>
            </div>

            <style>{`
                .payment-cancel {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #fdfbf7, #f3f4f6);
                    padding: 2rem;
                }

                .cancel-card {
                    background: white;
                    border-radius: 2rem;
                    padding: 3rem;
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                }

                .cancel-icon {
                    color: #ef4444;
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

                .actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }

                .retry-btn {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                }

                .help {
                    font-size: 0.75rem;
                    margin-bottom: 0;
                }

                @media (max-width: 640px) {
                    .cancel-card {
                        padding: 2rem;
                    }
                    
                    h2 {
                        font-size: 1.5rem;
                    }
                    
                    .actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}