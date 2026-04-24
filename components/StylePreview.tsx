// FILE: C:\Users\user\Desktop\roomify\components\StylePreview.tsx

import { useState } from 'react';
import { STYLE_OPTIONS, type DesignStyle } from '../lib/constants';
import { Check, Loader2 } from 'lucide-react';

interface StylePreviewProps {
    projectId: string;
    sourceImage: string;
    onStyleGenerated: (style: DesignStyle, imageUrl: string) => void;
    existingStyles?: Record<DesignStyle, string>;
}

const StylePreview = ({ projectId, sourceImage, onStyleGenerated, existingStyles = {
    modern: '',
    rustic: '',
    industrial: '',
    scandinavian: '',
    bohemian: ''
} }: StylePreviewProps) => {
    const [generatingStyles, setGeneratingStyles] = useState<Set<DesignStyle>>(new Set());
    const [previewImages, setPreviewImages] = useState<Record<DesignStyle, string>>(existingStyles);

    const generateStyle = async (style: DesignStyle) => {
        if (generatingStyles.has(style) || previewImages[style]) return;
        
        setGeneratingStyles(prev => new Set(prev).add(style));
        
        try {
            // This would call your existing generate3DView function
            // For now, we'll simulate or you can integrate the actual API
            console.log(`Generating ${style} style for project ${projectId}`);
            
            // Simulate API call (replace with actual)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Mock result - in production, this would be the actual generated image
            const mockImage = sourceImage; // Replace with actual generated image
            
            setPreviewImages(prev => ({ ...prev, [style]: mockImage }));
            onStyleGenerated(style, mockImage);
        } catch (error) {
            console.error(`Failed to generate ${style}:`, error);
        } finally {
            setGeneratingStyles(prev => {
                const next = new Set(prev);
                next.delete(style);
                return next;
            });
        }
    };

    return (
        <div className="style-preview-grid">
            {STYLE_OPTIONS.map((style) => {
                const isGenerated = !!previewImages[style.id];
                const isGenerating = generatingStyles.has(style.id);
                
                return (
                    <button
                        key={style.id}
                        className={`style-preview-card ${isGenerated ? 'generated' : ''} ${isGenerating ? 'generating' : ''}`}
                        onClick={() => !isGenerated && !isGenerating && generateStyle(style.id)}
                        disabled={isGenerating}
                    >
                        <div className="preview-icon">{style.icon}</div>
                        <div className="preview-info">
                            <h4>{style.name}</h4>
                            <p>{style.description}</p>
                        </div>
                        {isGenerated && (
                            <div className="generated-badge">
                                <Check size={14} />
                            </div>
                        )}
                        {isGenerating && (
                            <div className="generating-spinner">
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        )}
                    </button>
                );
            })}
            
            <style>{`
                .style-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 0.75rem;
                    margin-top: 1rem;
                }
                
                .style-preview-card {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                
                .style-preview-card:hover:not(.generated) {
                    border-color: #f97316;
                    background: #fff7ed;
                    transform: translateY(-1px);
                }
                
                .style-preview-card.generated {
                    background: #f0fdf4;
                    border-color: #22c55e;
                    cursor: default;
                }
                
                .style-preview-card.generating {
                    opacity: 0.6;
                    cursor: wait;
                }
                
                .preview-icon {
                    font-size: 1.5rem;
                }
                
                .preview-info {
                    flex: 1;
                }
                
                .preview-info h4 {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                }
                
                .preview-info p {
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin: 0;
                }
                
                .generated-badge {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    width: 20px;
                    height: 20px;
                    background: #22c55e;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    border: 2px solid white;
                }
                
                .generating-spinner {
                    position: absolute;
                    top: 50%;
                    right: 0.75rem;
                    transform: translateY(-50%);
                    color: #f97316;
                }
            `}</style>
        </div>
    );
};

export default StylePreview;