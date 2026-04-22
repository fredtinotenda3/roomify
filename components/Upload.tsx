// FILE: C:\Users\user\Desktop\roomify\components\Upload.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from "react-router";
import { CheckCircle2, ImageIcon, UploadIcon, Lock } from "lucide-react";
import { PROGRESS_INCREMENT, REDIRECT_DELAY_MS, PROGRESS_INTERVAL_MS } from "../lib/constants";
import { checkRenderLimit, incrementRenderCount, getRemainingUsage } from "../lib/usage.tracker";
import UpgradeModal from './UpgradeModal';

interface UploadProps {
    onComplete?: (base64Data: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [usageInfo, setUsageInfo] = useState<{ remaining: number; isPremium: boolean } | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { isSignedIn, userId } = useOutletContext<AuthContext>();

    // Load usage info on mount and when user signs in
    useEffect(() => {
        const loadUsageInfo = async () => {
            if (isSignedIn && userId) {
                const usage = await getRemainingUsage(userId);
                setUsageInfo({
                    remaining: usage.rendersRemaining === Infinity ? -1 : usage.rendersRemaining,
                    isPremium: usage.isPremium
                });
            }
        };
        loadUsageInfo();
    }, [isSignedIn, userId]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const processFile = useCallback(async (file: File) => {
        if (!isSignedIn) {
            alert('Please sign in to upload floor plans');
            return;
        }

        if (!userId) return;

        // Check render limit before processing
        const limitCheck = await checkRenderLimit(userId);
        
        if (!limitCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        setFile(file);
        setProgress(0);

        const reader = new FileReader();
        reader.onerror = () => {
            setFile(null);
            setProgress(0);
        };
        reader.onloadend = async () => {
            const base64Data = reader.result as string;

            // Increment render count
            await incrementRenderCount(userId);
            
            // Update usage info
            const usage = await getRemainingUsage(userId);
            setUsageInfo({
                remaining: usage.rendersRemaining === Infinity ? -1 : usage.rendersRemaining,
                isPremium: usage.isPremium
            });

            intervalRef.current = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + PROGRESS_INCREMENT;
                    if (next >= 100) {
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        timeoutRef.current = setTimeout(() => {
                            onComplete?.(base64Data);
                            timeoutRef.current = null;
                        }, REDIRECT_DELAY_MS);
                        return 100;
                    }
                    return next;
                });
            }, PROGRESS_INTERVAL_MS);
        };
        reader.readAsDataURL(file);
    }, [isSignedIn, userId, onComplete]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isSignedIn) return;
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (!isSignedIn) return;

        const droppedFile = e.dataTransfer.files[0];
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (droppedFile && allowedTypes.includes(droppedFile.type)) {
            processFile(droppedFile);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSignedIn) return;

        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    return (
        <>
            <div className="upload">
                {!file ? (
                    <div
                        className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            className="drop-input"
                            accept=".jpg,.jpeg,.png,.webp"
                            disabled={!isSignedIn}
                            onChange={handleChange}
                        />

                        <div className="drop-content">
                            <div className="drop-icon">
                                <UploadIcon size={20} />
                            </div>
                            <p>
                                {isSignedIn ? (
                                    usageInfo && usageInfo.remaining === 0 ? (
                                        <>You've used all free renders. <button onClick={() => setShowUpgradeModal(true)} className="upgrade-link">Upgrade to continue</button></>
                                    ) : (
                                        "Click to upload or just drag and drop"
                                    )
                                ) : (
                                    "Sign in or sign up with Puter to upload"
                                )}
                            </p>
                            <p className="help">
                                Maximum file size 50 MB.
                                {isSignedIn && usageInfo && usageInfo.remaining > 0 && (
                                    <span className="usage-info">
                                        {" "}• {usageInfo.remaining === -1 ? 'Unlimited' : `${usageInfo.remaining}`} render{usageInfo.remaining !== 1 ? 's' : ''} remaining this month
                                    </span>
                                )}
                                {isSignedIn && usageInfo && usageInfo.remaining === 0 && !usageInfo.isPremium && (
                                    <span className="usage-warning">
                                        {" "}• <Lock size={12} /> Upgrade for unlimited
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="upload-status">
                        <div className="status-content">
                            <div className="status-icon">
                                {progress === 100 ? (
                                    <CheckCircle2 className="check" />
                                ) : (
                                    <ImageIcon className="image" />
                                )}
                            </div>

                            <h3>{file.name}</h3>

                            <div className='progress'>
                                <div className="bar" style={{ width: `${progress}%` }} />

                                <p className="status-text">
                                    {progress < 100 ? 'Analyzing Floor Plan...' : 'Redirecting...'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <UpgradeModal 
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="renders"
                remaining={usageInfo?.remaining === -1 ? undefined : usageInfo?.remaining}
            />

            <style>{`
                .upgrade-link {
                    color: #f97316;
                    text-decoration: underline;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .upgrade-link:hover {
                    color: #ea580c;
                }
                
                .usage-info {
                    color: #22c55e;
                    font-weight: 500;
                }
                
                .usage-warning {
                    color: #f97316;
                    display: inline-flex;
                    align-items: center;
                    gap: 2px;
                }
            `}</style>
        </>
    )
}

export default Upload