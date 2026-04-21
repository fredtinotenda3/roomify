// FILE: C:\Users\user\Desktop\roomify\app\routes\visualizer.$id.tsx

import { useNavigate, useOutletContext, useParams} from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../lib/ai.action";
import {AlertCircle, Box, Download, RefreshCcw, Share2, X} from "lucide-react";
import Button from "../../components/ui/Button";
import {createProject, getProjectById} from "../../lib/puter.action";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId } = useOutletContext<AuthContext>()

    const hasInitialGenerated = useRef(false);
    const generationAttempts = useRef(0);
    const MAX_RETRIES = 2;

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [currentImage, setCurrentImage] = useState<string | null>(null);

    const handleBack = () => navigate('/');
    
    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `roomify-${id || 'design'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    const handleRetryGeneration = async () => {
        if (!project) return;
        generationAttempts.current = 0;
        setGenerationError(null);
        await runGeneration(project);
    }

    const runGeneration = async (item: DesignItem) => {
        if(!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            setGenerationError(null);
            
            console.log(`Starting generation for project: ${id} (Attempt ${generationAttempts.current + 1})`);
            
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if(result.renderedImage) {
                console.log('Generation successful, saving result...');
                setCurrentImage(result.renderedImage);
                generationAttempts.current = 0; // Reset attempts on success

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if(saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            } else {
                throw new Error('No rendered image in response');
            }
        } catch (error) {
            console.error('Generation failed: ', error);
            
            // Auto-retry logic
            if (generationAttempts.current < MAX_RETRIES) {
                generationAttempts.current++;
                console.log(`Auto-retrying... (${generationAttempts.current}/${MAX_RETRIES})`);
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                await runGeneration(item);
            } else {
                generationAttempts.current = 0;
                const errorMessage = error instanceof Error ? error.message : 'Failed to generate 3D view';
                setGenerationError(errorMessage);
                setIsProcessing(false);
            }
        } finally {
            if (generationAttempts.current === 0) {
                setIsProcessing(false);
            }
        }
    }

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
            setCurrentImage(fetchedProject?.renderedImage || null);
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

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

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />

                    <span className="name">Roomify</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage || isProcessing}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={() => {
                                    // Share functionality can be implemented here
                                    navigator.clipboard?.writeText(window.location.href);
                                    alert('Link copied to clipboard!');
                                }} 
                                className="share" 
                                disabled={isProcessing}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing': ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : generationError ? (
                            <div className="render-placeholder flex flex-col items-center justify-center min-h-100">
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
                                    <p className="text-zinc-500">Ready to generate</p>
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization</span>
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
                                {!generationError && !currentImage && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                        <p className="text-zinc-500">AI render will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}

export default VisualizerId