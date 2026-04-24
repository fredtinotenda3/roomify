// FILE: C:\Users\user\Desktop\roomify\components\ShareModal.tsx

import { useState } from 'react';
import { X, Copy, Check, Twitter, Facebook, Linkedin, Mail, Globe, Lock, Share2 } from 'lucide-react';
import Button from './ui/Button';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    isPublic: boolean;
    shareUrl: string | null;
    onTogglePublic: () => Promise<void>;
}

const ShareModal = ({ isOpen, onClose, projectId, projectName, isPublic, shareUrl, onTogglePublic }: ShareModalProps) => {
    const [copied, setCopied] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        if (shareUrl) {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleTogglePublic = async () => {
        setIsToggling(true);
        await onTogglePublic();
        setIsToggling(false);
    };

    const shareUrls = {
        twitter: shareUrl ? `https://twitter.com/intent/tweet?text=Check out my ${projectName} design on Roomify!&url=${encodeURIComponent(shareUrl)}` : '',
        facebook: shareUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` : '',
        linkedin: shareUrl ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` : '',
        email: shareUrl ? `mailto:?subject=Check out my Roomify design&body=I created this ${projectName} design using Roomify AI. Check it out: ${shareUrl}` : ''
    };

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="share-modal-header">
                    <div className="share-icon">
                        <Share2 size={28} />
                    </div>
                    <h2>Share Project</h2>
                    <p>Share your {projectName} design with the world</p>
                </div>

                <div className="share-visibility">
                    <div className="visibility-info">
                        {isPublic ? (
                            <>
                                <Globe size={18} />
                                <div>
                                    <h4>Public</h4>
                                    <p>Anyone with the link can view this project</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Lock size={18} />
                                <div>
                                    <h4>Private</h4>
                                    <p>Only you can view this project</p>
                                </div>
                            </>
                        )}
                    </div>
                    <Button 
                        size="sm" 
                        variant={isPublic ? 'secondary' : 'primary'}
                        onClick={handleTogglePublic}
                        disabled={isToggling}
                    >
                        {isToggling ? 'Updating...' : (isPublic ? 'Make Private' : 'Make Public')}
                    </Button>
                </div>

                {isPublic && shareUrl && (
                    <>
                        <div className="share-link-section">
                            <label>Shareable Link</label>
                            <div className="share-link-box">
                                <input type="text" readOnly value={shareUrl} />
                                <button onClick={handleCopyLink} className="copy-btn">
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="social-share">
                            <p>Or share on social media</p>
                            <div className="social-buttons">
                                <a href={shareUrls.twitter} target="_blank" rel="noopener noreferrer" className="social-btn twitter">
                                    <Twitter size={20} />
                                </a>
                                <a href={shareUrls.facebook} target="_blank" rel="noopener noreferrer" className="social-btn facebook">
                                    <Facebook size={20} />
                                </a>
                                <a href={shareUrls.linkedin} target="_blank" rel="noopener noreferrer" className="social-btn linkedin">
                                    <Linkedin size={20} />
                                </a>
                                <a href={shareUrls.email} className="social-btn email">
                                    <Mail size={20} />
                                </a>
                            </div>
                        </div>

                        <div className="embed-section">
                            <p>Embed this project</p>
                            <div className="embed-code">
                                <code>{`<iframe src="${shareUrl}&embed=true" width="800" height="600" frameborder="0"></iframe>`}</code>
                                <button onClick={() => {
                                    navigator.clipboard.writeText(`<iframe src="${shareUrl}&embed=true" width="800" height="600" frameborder="0"></iframe>`);
                                    alert('Embed code copied!');
                                }} className="copy-embed">
                                    <Copy size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <style>{`
                    .share-modal-overlay {
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

                    .share-modal {
                        background: white;
                        border-radius: 1.5rem;
                        max-width: 500px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        padding: 2rem;
                        position: relative;
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

                    .share-modal-header {
                        text-align: center;
                        margin-bottom: 1.5rem;
                    }

                    .share-icon {
                        width: 56px;
                        height: 56px;
                        background: linear-gradient(135deg, #f97316, #ea580c);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 1rem;
                        color: white;
                    }

                    .share-modal-header h2 {
                        font-size: 1.5rem;
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                    }

                    .share-modal-header p {
                        color: #6b7280;
                        font-size: 0.875rem;
                    }

                    .share-visibility {
                        background: #f9fafb;
                        border-radius: 1rem;
                        padding: 1rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1.5rem;
                    }

                    .visibility-info {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .visibility-info h4 {
                        font-size: 0.875rem;
                        font-weight: 600;
                        margin: 0 0 0.25rem 0;
                    }

                    .visibility-info p {
                        font-size: 0.7rem;
                        color: #6b7280;
                        margin: 0;
                    }

                    .share-link-section {
                        margin-bottom: 1.5rem;
                    }

                    .share-link-section label {
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin-bottom: 0.5rem;
                        display: block;
                    }

                    .share-link-box {
                        display: flex;
                        gap: 0.5rem;
                    }

                    .share-link-box input {
                        flex: 1;
                        padding: 0.5rem 0.75rem;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        font-size: 0.75rem;
                        background: #f9fafb;
                    }

                    .copy-btn {
                        padding: 0.5rem;
                        background: #f3f4f6;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        cursor: pointer;
                    }

                    .social-share {
                        text-align: center;
                        margin-bottom: 1.5rem;
                    }

                    .social-share p {
                        font-size: 0.75rem;
                        color: #6b7280;
                        margin-bottom: 0.75rem;
                    }

                    .social-buttons {
                        display: flex;
                        gap: 0.75rem;
                        justify-content: center;
                    }

                    .social-btn {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        transition: transform 0.2s;
                    }

                    .social-btn:hover {
                        transform: scale(1.1);
                    }

                    .social-btn.twitter { background: #1DA1F2; }
                    .social-btn.facebook { background: #4267B2; }
                    .social-btn.linkedin { background: #0077B5; }
                    .social-btn.email { background: #6b7280; }

                    .embed-section {
                        border-top: 1px solid #e5e7eb;
                        padding-top: 1rem;
                    }

                    .embed-section p {
                        font-size: 0.75rem;
                        color: #6b7280;
                        margin-bottom: 0.5rem;
                    }

                    .embed-code {
                        display: flex;
                        gap: 0.5rem;
                        align-items: center;
                    }

                    .embed-code code {
                        flex: 1;
                        font-size: 0.7rem;
                        background: #f3f4f6;
                        padding: 0.5rem;
                        border-radius: 0.5rem;
                        overflow-x: auto;
                        white-space: nowrap;
                    }

                    .copy-embed {
                        padding: 0.5rem;
                        background: #f3f4f6;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        cursor: pointer;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default ShareModal;