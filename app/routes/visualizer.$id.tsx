// FILE: C:\Users\user\Desktop\roomify\app\routes\visualizer.$id.tsx

import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";
import { useEffect, useRef, useState } from "react";
import { generate3DView } from "../../lib/ai.action";
import { AlertCircle, Box, Download, FileText, RefreshCcw, Share2, X, Crown, Lock, Globe } from "lucide-react";
import Button from "../../components/ui/Button";
import StyleSelector from "../../components/StyleSelector";
import PresetSelector from "../../components/PresetSelector";
import UpgradeModal from "../../components/UpgradeModal";
import UpgradeToast from "../../components/UpgradeToast";
import ShareModal from "../../components/ShareModal";
import EmailCaptureModal from "../../components/EmailCaptureModal";
import { createProject, getProjectById, shareProject, incrementProjectView, getPublicProject } from "../../lib/puter.action";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import type { DesignStyle, DesignItem } from "../../lib/types";
import type { PresetCategory } from "../../lib/presets";
import { STYLE_OPTIONS } from "../../lib/constants";
import { exportToPDF } from "../../lib/pdf.export";
import { addWatermark } from "../../lib/watermark";
import { 
    checkRenderLimit, 
    checkExportLimit, 
    checkPDFExportLimit,
    checkPremiumStyle,
    checkPremiumPreset,
    incrementRenderCount,
    incrementExportCount,
    incrementPDFExportCount,
    getRemainingUsage
} from "../../lib/usage.tracker";

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId, signIn } = useOutletContext<AuthContext>();
    const [searchParams] = useSearchParams();

    const hasInitialGenerated = useRef(false);
    const generationAttempts = useRef(0);
    const MAX_RETRIES = 2;

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<DesignStyle>('modern');
    const [selectedPreset, setSelectedPreset] = useState<PresetCategory>('budget');
    const [isGeneratingNewStyle, setIsGeneratingNewStyle] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState<string>('');
    const [upgradeTriggerContext, setUpgradeTriggerContext] = useState<'render_limit' | 'export_limit' | 'pdf_limit' | 'premium_style' | 'premium_preset' | 'watermark'>();
    const [usageInfo, setUsageInfo] = useState<{
        rendersRemaining: number;
        exportsRemaining: number;
        pdfExportsRemaining: number;
        isPremium: boolean;
    } | null>(null);
    
    // Toast states
    const [showUpgradeToast, setShowUpgradeToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    // Share states
    const [showShareModal, setShowShareModal] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [isPublicView, setIsPublicView] = useState(false);
    const [ownerName, setOwnerName] = useState<string | null>(null);

    // Email capture states
    const [showEmailCapture, setShowEmailCapture] = useState(false);
    const [pendingGeneration, setPendingGeneration] = useState<{ style: DesignStyle; preset: PresetCategory } | null>(null);

    const handleBack = () => navigate('/');

    const showUpgradeTrigger = (message: string, context?: typeof upgradeTriggerContext, feature?: string) => {
        setToastMessage(message);
        setShowUpgradeToast(true);
        if (context) {
            setUpgradeTriggerContext(context);
            setUpgradeFeature(feature || '');
        }
    };

    const loadUsageInfo = async () => {
        if (userId) {
            const usage = await getRemainingUsage(userId);
            setUsageInfo(usage);
        }
    };

    useEffect(() => {
        loadUsageInfo();
    }, [userId]);

    useEffect(() => {
        const shareToken = searchParams.get('share');
        
        if (shareToken && id) {
            setIsPublicView(true);
            const loadPublicProject = async () => {
                const publicProject = await getPublicProject(id, shareToken);
                if (publicProject) {
                    setProject(publicProject);
                    setCurrentImage(publicProject.renderedImage || null);
                    setSelectedStyle(publicProject.style || 'modern');
                    setSelectedPreset(publicProject.preset || 'budget');
                    setOwnerName(publicProject.sharedBy || 'Anonymous');
                    setIsProjectLoading(false);
                    await incrementProjectView(id);
                } else {
                    setGenerationError('Project not found or share link invalid');
                    setIsProjectLoading(false);
                }
            };
            loadPublicProject();
        }
    }, [id, searchParams]);

    const handleExport = async () => {
        if (!currentImage) return;

        if (userId) {
            const limitCheck = await checkExportLimit(userId);
            
            if (limitCheck.showUpgrade) {
                showUpgradeTrigger(limitCheck.message || '⚠️ You\'re about to hit your export limit. Upgrade to Pro for unlimited exports!', 'export_limit');
            }
            
            if (!limitCheck.allowed) {
                setUpgradeFeature('exports');
                setUpgradeTriggerContext('export_limit');
                setShowUpgradeModal(true);
                return;
            }
            
            await incrementExportCount(userId);
            await loadUsageInfo();
        }

        const finalImage = await addWatermark(currentImage, usageInfo?.isPremium || false);
        
        const link = document.createElement('a');
        link.href = finalImage;
        link.download = `roomify-${id || 'design'}-${selectedStyle}-${selectedPreset}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    const handlePDFExport = async () => {
        if (!project?.sourceImage || !currentImage) {
            alert('Both original and rendered images are required for PDF export');
            return;
        }
        
        if (userId) {
            const limitCheck = await checkPDFExportLimit(userId);
            
            if (limitCheck.showUpgrade) {
                showUpgradeTrigger(limitCheck.message || '⚠️ You\'re about to hit your PDF export limit. Upgrade to Pro for unlimited PDF exports!', 'pdf_limit');
            }
            
            if (!limitCheck.allowed) {
                setUpgradeFeature('PDF exports');
                setUpgradeTriggerContext('pdf_limit');
                setShowUpgradeModal(true);
                return;
            }
            
            await incrementPDFExportCount(userId);
            await loadUsageInfo();
        }
        
        try {
            const styleName = STYLE_OPTIONS.find(s => s.id === selectedStyle)?.name || selectedStyle;
            const presetName = getPresetName(selectedPreset);
            const date = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const watermarkedImage = await addWatermark(currentImage, usageInfo?.isPremium || false);
            
            await exportToPDF({
                title: project?.name || `Residence ${id}`,
                beforeImage: project.sourceImage,
                afterImage: watermarkedImage,
                styleName: `${styleName} - ${presetName}`,
                date: date,
                projectId: id || 'unknown'
            });
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('Failed to generate PDF. Please make sure images are loaded and try again.');
        }
    };
    
    const getPresetName = (presetId: PresetCategory): string => {
        const presetNames: Record<PresetCategory, string> = {
            luxury: 'Luxury Estate',
            budget: 'Budget Friendly',
            minimalist: 'Minimalist Zen',
            eclectic: 'Eclectic Boho',
            traditional: 'Classic Traditional'
        };
        return presetNames[presetId] || presetId;
    };
    
    const handleRetryGeneration = async () => {
        if (!project) return;
        generationAttempts.current = 0;
        setGenerationError(null);
        await runGeneration(project, selectedStyle, selectedPreset);
    }

    const handleStyleChange = async (style: DesignStyle) => {
        if (!project || !project.sourceImage) return;
        
        const styleCheck = checkPremiumStyle(style);
        
        if (!styleCheck.isFree) {
            showUpgradeTrigger(styleCheck.message || `✨ ${style} style is a Pro feature. Upgrade to unlock all premium styles!`, 'premium_style', style);
            setUpgradeFeature(`${style} style`);
            setUpgradeTriggerContext('premium_style');
            setShowUpgradeModal(true);
            return;
        }
        
        setSelectedStyle(style);
        
        const cacheKey = `${style}-${selectedPreset}`;
        if (project.renderedPresets && project.renderedPresets[cacheKey]) {
            const watermarked = await addWatermark(project.renderedPresets[cacheKey], usageInfo?.isPremium || false);
            setCurrentImage(watermarked);
            return;
        }
        
        setIsGeneratingNewStyle(true);
        setGenerationError(null);
        setGenerationProgress(0);
        
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 500);
        
        try {
            const result = await generate3DView({ 
                sourceImage: project.sourceImage, 
                style: style,
                preset: selectedPreset
            });
            
            if (result.renderedImage) {
                const watermarkedImage = await addWatermark(result.renderedImage, usageInfo?.isPremium || false);
                setCurrentImage(watermarkedImage);
                setGenerationProgress(100);
                
                const updatedItem = {
                    ...project,
                    renderedStyles: {
                        ...(project.renderedStyles || {}),
                        [style]: result.renderedImage
                    },
                    renderedPresets: {
                        ...(project.renderedPresets || {}),
                        [`${style}-${selectedPreset}`]: result.renderedImage
                    },
                    renderedImage: result.renderedImage,
                    style: style,
                    preset: selectedPreset,
                    timestamp: Date.now(),
                };
                
                const saved = await createProject({ item: updatedItem, visibility: "private" });
                if (saved) {
                    setProject(saved);
                }
            }
        } catch (error) {
            console.error('Style generation failed:', error);
            setGenerationError(error instanceof Error ? error.message : 'Failed to generate this style');
        } finally {
            clearInterval(progressInterval);
            setIsGeneratingNewStyle(false);
            setTimeout(() => setGenerationProgress(0), 1000);
        }
    };

    const handlePresetChange = async (preset: PresetCategory) => {
        if (!project || !project.sourceImage) return;
        
        const presetCheck = checkPremiumPreset(preset);
        
        if (!presetCheck.isFree) {
            showUpgradeTrigger(presetCheck.message || `💎 ${preset} preset is a Pro feature. Upgrade to unlock all premium presets!`, 'premium_preset', preset);
            setUpgradeFeature(`${preset} preset`);
            setUpgradeTriggerContext('premium_preset');
            setShowUpgradeModal(true);
            return;
        }
        
        setSelectedPreset(preset);
        
        const cacheKey = `${selectedStyle}-${preset}`;
        if (project.renderedPresets && project.renderedPresets[cacheKey]) {
            const watermarked = await addWatermark(project.renderedPresets[cacheKey], usageInfo?.isPremium || false);
            setCurrentImage(watermarked);
            return;
        }
        
        setIsGeneratingNewStyle(true);
        setGenerationError(null);
        setGenerationProgress(0);
        
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 500);
        
        try {
            const result = await generate3DView({ 
                sourceImage: project.sourceImage, 
                style: selectedStyle,
                preset: preset
            });
            
            if (result.renderedImage) {
                const watermarkedImage = await addWatermark(result.renderedImage, usageInfo?.isPremium || false);
                setCurrentImage(watermarkedImage);
                setGenerationProgress(100);
                
                const updatedItem = {
                    ...project,
                    renderedPresets: {
                        ...(project.renderedPresets || {}),
                        [`${selectedStyle}-${preset}`]: result.renderedImage
                    },
                    renderedImage: result.renderedImage,
                    preset: preset,
                    timestamp: Date.now(),
                };
                
                const saved = await createProject({ item: updatedItem, visibility: "private" });
                if (saved) {
                    setProject(saved);
                }
            }
        } catch (error) {
            console.error('Preset generation failed:', error);
            setGenerationError(error instanceof Error ? error.message : 'Failed to generate with this preset');
        } finally {
            clearInterval(progressInterval);
            setIsGeneratingNewStyle(false);
            setTimeout(() => setGenerationProgress(0), 1000);
        }
    };

    const runGeneration = async (item: DesignItem, style: DesignStyle = selectedStyle, preset: PresetCategory = selectedPreset) => {
        if(!id || !item.sourceImage) return;

        // Check for email capture - if no email and not signed in, show capture modal
        const hasEmail = localStorage.getItem('roomify_captured_email');
        
        if (!hasEmail && !userId) {
            setPendingGeneration({ style, preset });
            setShowEmailCapture(true);
            return;
        }

        if (userId) {
            const limitCheck = await checkRenderLimit(userId);
            
            if (limitCheck.showUpgrade) {
                showUpgradeTrigger(limitCheck.message || '⚠️ You\'re about to hit your render limit. Upgrade to Pro for unlimited renders!', 'render_limit');
            }
            
            if (!limitCheck.allowed) {
                setUpgradeFeature('renders');
                setUpgradeTriggerContext('render_limit');
                setShowUpgradeModal(true);
                return;
            }
        }

        try {
            setIsProcessing(true);
            setGenerationError(null);
            setGenerationProgress(0);
            
            const progressInterval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 500);
            
            console.log(`Starting generation for project: ${id} with ${style} style and ${preset} preset (Attempt ${generationAttempts.current + 1})`);
            
            const result = await generate3DView({ sourceImage: item.sourceImage, style, preset });

            if(result.renderedImage) {
                console.log('Generation successful, saving result...');
                
                const watermarkedImage = await addWatermark(result.renderedImage, usageInfo?.isPremium || false);
                setCurrentImage(watermarkedImage);
                setGenerationProgress(100);

                if (userId) {
                    await incrementRenderCount(userId);
                    await loadUsageInfo();
                }

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    style: style,
                    preset: preset,
                    renderedStyles: {
                        ...(item.renderedStyles || {}),
                        [style]: result.renderedImage
                    },
                    renderedPresets: {
                        ...(item.renderedPresets || {}),
                        [`${style}-${preset}`]: result.renderedImage
                    },
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                };

                const saved = await createProject({ item: updatedItem, visibility: "private" });

                if(saved) {
                    setProject(saved);
                }
            } else {
                throw new Error('No rendered image in response');
            }
            
            clearInterval(progressInterval);
        } catch (error) {
            console.error('Generation failed: ', error);
            
            if (generationAttempts.current < MAX_RETRIES) {
                generationAttempts.current++;
                console.log(`Auto-retrying... (${generationAttempts.current}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await runGeneration(item, style, preset);
            } else {
                generationAttempts.current = 0;
                const errorMessage = error instanceof Error ? error.message : 'Failed to generate 3D view';
                setGenerationError(errorMessage);
                setIsProcessing(false);
            }
        } finally {
            if (generationAttempts.current === 0) {
                setIsProcessing(false);
                setTimeout(() => setGenerationProgress(0), 1000);
            }
        }
    };

    const handleEmailCaptureSuccess = (email: string) => {
        console.log('Email captured:', email);
        setShowEmailCapture(false);
        
        // Retry generation if pending
        if (pendingGeneration && project) {
            runGeneration(project, pendingGeneration.style, pendingGeneration.preset);
            setPendingGeneration(null);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);
            setGenerationError(null);
            generationAttempts.current = 0;

            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            setProject(fetchedProject);
            
            if (fetchedProject?.style) {
                setSelectedStyle(fetchedProject.style);
            }
            
            if (fetchedProject?.preset) {
                setSelectedPreset(fetchedProject.preset);
            }
            
            if (fetchedProject?.renderedImage) {
                const watermarked = await addWatermark(fetchedProject.renderedImage, usageInfo?.isPremium || false);
                setCurrentImage(watermarked);
            }
            
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (project && !isPublicView) {
            setIsPublic(project.isPublic || false);
            if (project.shareToken) {
                const baseUrl = window.location.origin;
                setShareUrl(`${baseUrl}/visualizer/${project.id}?share=${project.shareToken}`);
            }
        }
    }, [project]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage ||
            isPublicView
        )
            return;

        if (project.renderedImage) {
            const applyWatermarkToExisting = async () => {
                const watermarked = await addWatermark(project.renderedImage!, usageInfo?.isPremium || false);
                setCurrentImage(watermarked);
            };
            applyWatermarkToExisting();
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    const handleShareToggle = async () => {
        if (!project) return;
        
        const newPublicState = !isPublic;
        const result = await shareProject(project.id, newPublicState);
        
        if (result.success) {
            setIsPublic(newPublicState);
            if (result.shareUrl) {
                setShareUrl(result.shareUrl);
            }
            
            // Create updated project with proper typing
            const updatedProject: DesignItem = {
                ...project,
                isPublic: newPublicState,
                shareToken: result.shareToken
            };
            
            setProject(updatedProject);
        } else {
            alert('Failed to update share settings. Please try again.');
        }
    };

    const handleWatermarkClick = () => {
        if (!usageInfo?.isPremium) {
            showUpgradeTrigger('🚫 Remove watermark and get unlimited everything with Pro!', 'watermark');
            setShowUpgradeModal(true);
        }
    };

    if (isProjectLoading) {
        return (
            <div className="visualizer-route loading">
                <div className="text-center">
                    <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p>Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project && !isProjectLoading) {
        return (
            <div className="visualizer-route loading">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-semibold mb-2">Project not found</p>
                    <p className="text-zinc-600 text-sm mb-4">The requested project could not be found.</p>
                    <Button onClick={handleBack} className="bg-primary hover:bg-orange-600">
                        Go Back Home
                    </Button>
                </div>
            </div>
        );
    }

    const isAnyProcessing = isProcessing || isGeneratingNewStyle;
    const currentStyleName = STYLE_OPTIONS.find(s => s.id === selectedStyle)?.name || selectedStyle;
    const currentPresetName = getPresetName(selectedPreset);
    
    const isStylePremium = !checkPremiumStyle(selectedStyle).isFree;
    const isPresetPremium = !checkPremiumPreset(selectedPreset).isFree;
    const showPremiumBadge = (isStylePremium || isPresetPremium) && usageInfo && !usageInfo.isPremium;
    const hasWatermark = !usageInfo?.isPremium && currentImage;

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />
                    <span className="name">Roomify</span>
                </div>
                <div className="right-actions">
                    {usageInfo && !usageInfo.isPremium && (
                        <button 
                            className="premium-badge-btn"
                            onClick={() => {
                                showUpgradeTrigger('Unlock unlimited renders, no watermark, and all premium features!', 'watermark');
                                setShowUpgradeModal(true);
                            }}
                        >
                            <Crown size={16} />
                            <span>Upgrade to Pro - $19/mo</span>
                        </button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                        <X className="icon" /> Exit Editor
                    </Button>
                </div>
            </nav>

            {isPublicView && (
                <div className="public-view-banner">
                    <Globe size={16} />
                    <span>You're viewing a shared design by {ownerName || 'a Roomify user'}</span>
                    {!userId && (
                        <Button size="sm" variant="primary" onClick={() => signIn()}>
                            Sign in to create your own designs
                        </Button>
                    )}
                </div>
            )}

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">
                                Created by You • Style: {currentStyleName} • Preset: {currentPresetName}
                                {showPremiumBadge && (
                                    <span className="premium-badge-text">
                                        <Lock size={12} /> Premium
                                    </span>
                                )}
                                {hasWatermark && (
                                    <span 
                                        className="watermark-badge clickable" 
                                        onClick={handleWatermarkClick}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Watermark • Click to remove with Pro
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage || isAnyProcessing}
                            >
                                <Download className="w-4 h-4 mr-2" /> PNG
                            </Button>
                            <Button
                                size="sm"
                                onClick={handlePDFExport}
                                variant="secondary"
                                disabled={!currentImage || !project?.sourceImage || isAnyProcessing}
                            >
                                <FileText className="w-4 h-4 mr-2" /> PDF
                            </Button>
                            {!isPublicView && (
                                <Button 
                                    size="sm" 
                                    onClick={() => setShowShareModal(true)} 
                                    className="share"
                                    disabled={isAnyProcessing}
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                            )}
                        </div>
                    </div>

                    {usageInfo && !usageInfo.isPremium && !isPublicView && (
                        <div className="usage-info-bar">
                            <div className="usage-stats">
                                <span>🎨 {usageInfo.rendersRemaining === Infinity ? '∞' : usageInfo.rendersRemaining} renders left</span>
                                <span>📄 {usageInfo.exportsRemaining === Infinity ? '∞' : usageInfo.exportsRemaining} exports left</span>
                                <span>📑 {usageInfo.pdfExportsRemaining === Infinity ? '∞' : usageInfo.pdfExportsRemaining} PDFs left</span>
                            </div>
                            <button 
                                className="upgrade-link-bar"
                                onClick={() => {
                                    showUpgradeTrigger('Get unlimited everything with Pro!', 'watermark');
                                    setShowUpgradeModal(true);
                                }}
                            >
                                Upgrade to Pro - $19/mo <Crown size={14} />
                            </button>
                        </div>
                    )}

                    <div className="style-section">
                        <StyleSelector 
                            selectedStyle={selectedStyle}
                            onStyleChange={handleStyleChange}
                            isGenerating={isAnyProcessing}
                        />
                    </div>

                    <div className="preset-section">
                        <PresetSelector 
                            selectedPreset={selectedPreset}
                            onPresetChange={handlePresetChange}
                            isGenerating={isAnyProcessing}
                        />
                    </div>

                    <div className={`render-area ${isAnyProcessing ? 'is-processing': ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt={`AI Render - ${currentStyleName} - ${currentPresetName}`} className="render-img" />
                        ) : generationError ? (
                            <div className="render-placeholder flex flex-col items-center justify-center min-h-[400px]">
                                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                                <p className="text-red-600 mb-2 font-semibold">Generation Failed</p>
                                <p className="text-zinc-600 text-sm mb-4 text-center max-w-md">{generationError}</p>
                                <Button onClick={handleRetryGeneration} className="bg-primary hover:bg-orange-600">
                                    <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
                                </Button>
                            </div>
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                    <p className="text-zinc-500">Select a style and preset, then generate</p>
                                </div>
                            </div>
                        )}

                        {isAnyProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">
                                        {isGeneratingNewStyle 
                                            ? `Generating ${currentStyleName} with ${currentPresetName}...` 
                                            : 'Rendering...'}
                                    </span>
                                    <span className="subtitle">
                                        {isGeneratingNewStyle 
                                            ? `Creating ${currentStyleName} style with ${currentPresetName} furnishings` 
                                            : 'Generating your 3D visualization'}
                                    </span>
                                    {generationProgress > 0 && (
                                        <div className="generation-progress">
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ width: `${generationProgress}%` }}
                                                />
                                            </div>
                                            <p className="progress-text">{generationProgress}% complete</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                            <p className="note">Original floor plan vs {currentStyleName} - {currentPresetName}</p>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage && !generationError ? (
                            <ReactCompareSlider
                                defaultValue={50}
                                style={{ width: '100%', height: 'auto' }}
                                itemOne={
                                    <ReactCompareSliderImage src={project?.sourceImage} alt="before" className="compare-img" />
                                }
                                itemTwo={
                                    <ReactCompareSliderImage src={currentImage} alt="after" className="compare-img" />
                                }
                            />
                        ) : (
                            <div className="compare-fallback relative">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                                {generationError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                        <p className="text-zinc-500">Generation failed - cannot compare</p>
                                    </div>
                                )}
                                {!generationError && !currentImage && !isAnyProcessing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                        <p className="text-zinc-500">Select a style and preset above to generate</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <UpgradeModal 
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName={upgradeFeature}
                remaining={usageInfo?.rendersRemaining === Infinity ? undefined : usageInfo?.rendersRemaining}
                triggerContext={upgradeTriggerContext}
            />

            <ShareModal 
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                projectId={project?.id || id || ''}
                projectName={project?.name || `Residence ${id}`}
                isPublic={isPublic}
                shareUrl={shareUrl}
                onTogglePublic={handleShareToggle}
            />

            <EmailCaptureModal 
                isOpen={showEmailCapture}
                onClose={() => {
                    setShowEmailCapture(false);
                    setPendingGeneration(null);
                }}
                onSuccess={handleEmailCaptureSuccess}
                triggerReason="create_project"
            />

            {showUpgradeToast && (
                <UpgradeToast
                    message={toastMessage}
                    onClose={() => setShowUpgradeToast(false)}
                    onUpgrade={() => {
                        setShowUpgradeToast(false);
                        setShowUpgradeModal(true);
                    }}
                />
            )}

            <style>{`
                .right-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .premium-badge-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.75rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .premium-badge-btn:hover {
                    transform: scale(1.05);
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                }
                
                .premium-badge-text {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: #fef3c7;
                    color: #d97706;
                    padding: 0.125rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.7rem;
                    font-weight: 500;
                    margin-left: 0.5rem;
                }
                
                .watermark-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: #e0e7ff;
                    color: #4f46e5;
                    padding: 0.125rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.7rem;
                    font-weight: 500;
                    margin-left: 0.5rem;
                }
                
                .watermark-badge.clickable {
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .watermark-badge.clickable:hover {
                    background: #fef3c7;
                    color: #f97316;
                    transform: scale(1.02);
                }
                
                .usage-info-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1.5rem;
                    background: #fef3c7;
                    border-bottom: 1px solid #fde68a;
                    font-size: 0.75rem;
                }
                
                .usage-stats {
                    display: flex;
                    gap: 1.5rem;
                    color: #92400e;
                }
                
                .usage-stats span {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                
                .upgrade-link-bar {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #f97316;
                    color: white;
                    border: none;
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.7rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .upgrade-link-bar:hover {
                    background: #ea580c;
                }
                
                .public-view-banner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    padding: 0.75rem;
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    border-bottom: 1px solid #fbbf24;
                    font-size: 0.875rem;
                    flex-wrap: wrap;
                }
                
                .style-section {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #f3f4f6;
                    background: #fafafa;
                }
                
                .preset-section {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #f3f4f6;
                    background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
                }
                
                .generation-progress {
                    width: 100%;
                    max-width: 300px;
                    margin-top: 1rem;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background: #e5e7eb;
                    border-radius: 2px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: #f97316;
                    transition: width 0.3s ease;
                }
                
                .progress-text {
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin-top: 0.5rem;
                    text-align: center;
                }
                
                @media (max-width: 640px) {
                    .style-section, .preset-section {
                        padding: 0.75rem 1rem;
                    }
                    
                    .usage-info-bar {
                        flex-direction: column;
                        gap: 0.5rem;
                        text-align: center;
                    }
                    
                    .usage-stats {
                        flex-wrap: wrap;
                        justify-content: center;
                        gap: 0.75rem;
                    }
                    
                    .right-actions {
                        gap: 0.5rem;
                    }
                    
                    .public-view-banner {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    )
}

export default VisualizerId;