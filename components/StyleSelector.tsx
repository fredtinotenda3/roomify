// FILE: C:\Users\user\Desktop\roomify\components\StyleSelector.tsx

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { STYLE_OPTIONS, type DesignStyle } from '../lib/constants';
import Button from './ui/Button';

interface StyleSelectorProps {
    selectedStyle: DesignStyle;
    onStyleChange: (style: DesignStyle) => void;
    isGenerating?: boolean;
}

const StyleSelector = ({ selectedStyle, onStyleChange, isGenerating = false }: StyleSelectorProps) => {
    const [isHovered, setIsHovered] = useState<string | null>(null);

    return (
        <div className="style-selector">
            <div className="style-selector-header">
                <div className="header-content">
                    <Sparkles className="sparkle-icon" />
                    <h3>Design Style</h3>
                    <p className="style-hint">Choose an aesthetic for your 3D render</p>
                </div>
            </div>

            <div className="style-grid">
                {STYLE_OPTIONS.map((style) => (
                    <button
                        key={style.id}
                        className={`style-card ${selectedStyle === style.id ? 'selected' : ''} ${isGenerating ? 'disabled' : ''}`}
                        onClick={() => !isGenerating && onStyleChange(style.id)}
                        onMouseEnter={() => setIsHovered(style.id)}
                        onMouseLeave={() => setIsHovered(null)}
                        disabled={isGenerating}
                    >
                        <div className="style-icon">
                            <span className="style-emoji">{style.icon}</span>
                        </div>
                        
                        <div className="style-info">
                            <h4>{style.name}</h4>
                            <p className="style-description">{style.description}</p>
                        </div>

                        {selectedStyle === style.id && (
                            <div className="selected-badge">
                                <Check size={14} />
                            </div>
                        )}

                        {isHovered === style.id && selectedStyle !== style.id && !isGenerating && (
                            <div className="hover-overlay">
                                <span>Select</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <style>{`
                .style-selector {
                    width: 100%;
                    margin-bottom: 1.5rem;
                }

                .style-selector-header {
                    margin-bottom: 1rem;
                    text-align: center;
                }

                .header-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }

                .sparkle-icon {
                    width: 24px;
                    height: 24px;
                    color: #f97316;
                }

                .style-selector-header h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0;
                }

                .style-hint {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin: 0;
                }

                .style-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 0.75rem;
                }

                .style-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    width: 100%;
                }

                .style-card:hover:not(.disabled) {
                    border-color: #f97316;
                    background: #fff7ed;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .style-card.selected {
                    border-color: #f97316;
                    background: #fff7ed;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                }

                .style-card.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .style-icon {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f3f4f6;
                    border-radius: 0.5rem;
                    transition: all 0.2s ease;
                }

                .style-card:hover:not(.disabled) .style-icon {
                    background: #f97316;
                    transform: scale(1.05);
                }

                .style-emoji {
                    font-size: 1.5rem;
                }

                .style-info {
                    flex: 1;
                }

                .style-info h4 {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0 0 0.25rem 0;
                }

                .style-description {
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin: 0;
                    line-height: 1.3;
                }

                .selected-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 22px;
                    height: 22px;
                    background: #f97316;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    border: 2px solid white;
                }

                .hover-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(249, 115, 22, 0.9);
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    backdrop-filter: blur(2px);
                }

                @media (max-width: 640px) {
                    .style-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .style-card {
                        padding: 0.5rem 0.75rem;
                    }
                    
                    .style-icon {
                        width: 32px;
                        height: 32px;
                    }
                    
                    .style-emoji {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default StyleSelector;