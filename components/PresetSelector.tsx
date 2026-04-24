// FILE: C:\Users\user\Desktop\roomify\components\PresetSelector.tsx

import { useState } from 'react';
import { Crown, Sparkles, Palette } from 'lucide-react';
import { DESIGN_PRESETS, type PresetCategory, type DesignPreset } from '../lib/presets';

interface PresetSelectorProps {
    selectedPreset: PresetCategory;
    onPresetChange: (preset: PresetCategory) => void;
    isGenerating?: boolean;
}

const PresetSelector = ({ selectedPreset, onPresetChange, isGenerating = false }: PresetSelectorProps) => {
    const [isHovered, setIsHovered] = useState<string | null>(null);

    const getPresetIcon = (preset: DesignPreset) => {
        if (preset.priceTier === 'premium') {
            return <Crown size={16} className="text-yellow-500" />;
        }
        return <Palette size={16} />;
    };

    return (
        <div className="preset-selector">
            <div className="preset-selector-header">
                <div className="header-content">
                    <Sparkles className="sparkle-icon" />
                    <h3>Design Preset</h3>
                    <p className="preset-hint">Choose a furniture and color theme for your space</p>
                </div>
            </div>

            <div className="preset-grid">
                {DESIGN_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''} ${preset.priceTier === 'premium' ? 'premium' : ''} ${isGenerating ? 'disabled' : ''}`}
                        onClick={() => !isGenerating && onPresetChange(preset.id)}
                        onMouseEnter={() => setIsHovered(preset.id)}
                        onMouseLeave={() => setIsHovered(null)}
                        disabled={isGenerating}
                    >
                        <div className="preset-header">
                            <div className="preset-icon">
                                <span className="preset-emoji">{preset.icon}</span>
                                {getPresetIcon(preset)}
                            </div>
                            {preset.priceTier === 'premium' && (
                                <div className="premium-badge">
                                    <Crown size={12} />
                                    <span>Premium</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="preset-info">
                            <h4>{preset.name}</h4>
                            <p className="preset-description">{preset.description}</p>
                        </div>

                        <div className="preset-colors">
                            <div 
                                className="color-dot" 
                                style={{ backgroundColor: preset.colors.primary }}
                                title="Primary Color"
                            />
                            <div 
                                className="color-dot" 
                                style={{ backgroundColor: preset.colors.secondary }}
                                title="Secondary Color"
                            />
                            <div 
                                className="color-dot" 
                                style={{ backgroundColor: preset.colors.accent }}
                                title="Accent Color"
                            />
                            <div 
                                className="color-dot" 
                                style={{ backgroundColor: preset.colors.walls }}
                                title="Wall Color"
                            />
                            <div 
                                className="color-dot" 
                                style={{ backgroundColor: preset.colors.floor }}
                                title="Floor Color"
                            />
                        </div>

                        {selectedPreset === preset.id && (
                            <div className="selected-badge">
                                <Sparkles size={14} />
                            </div>
                        )}

                        {isHovered === preset.id && selectedPreset !== preset.id && !isGenerating && (
                            <div className="hover-overlay">
                                <span>Select Preset</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <style>{`
                .preset-selector {
                    width: 100%;
                    margin-bottom: 1.5rem;
                }

                .preset-selector-header {
                    margin-bottom: 1rem;
                    text-align: center;
                }

                .preset-selector-header .header-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }

                .preset-selector-header .sparkle-icon {
                    width: 24px;
                    height: 24px;
                    color: #f97316;
                }

                .preset-selector-header h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 0;
                }

                .preset-selector-header .preset-hint {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin: 0;
                }

                .preset-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1rem;
                }

                .preset-card {
                    position: relative;
                    padding: 1rem;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }

                .preset-card:hover:not(.disabled) {
                    border-color: #f97316;
                    background: #fff7ed;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }

                .preset-card.selected {
                    border-color: #f97316;
                    background: #fff7ed;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
                }

                .preset-card.premium {
                    background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
                }

                .preset-card.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .preset-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .preset-icon {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .preset-emoji {
                    font-size: 1.5rem;
                }

                .premium-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.5rem;
                    font-size: 0.7rem;
                    font-weight: bold;
                }

                .preset-info h4 {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                    color: #1a1a1a;
                }

                .preset-description {
                    font-size: 0.75rem;
                    color: #6b7280;
                    margin: 0 0 0.75rem 0;
                    line-height: 1.3;
                }

                .preset-colors {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    flex-wrap: wrap;
                }

                .color-dot {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    border: 2px solid white;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .color-dot:hover {
                    transform: scale(1.1);
                }

                .selected-badge {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 24px;
                    height: 24px;
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
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    backdrop-filter: blur(2px);
                }

                @media (max-width: 768px) {
                    .preset-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .preset-card {
                        padding: 0.75rem;
                    }
                    
                    .preset-emoji {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PresetSelector;