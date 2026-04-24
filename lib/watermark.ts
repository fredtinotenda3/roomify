// FILE: C:\Users\user\Desktop\roomify\lib\watermark.ts

export const addWatermark = async (
    imageDataUrl: string, 
    isPremium: boolean
): Promise<string> => {
    // No watermark for premium users
    if (isPremium) return imageDataUrl;
    
    // If it's already a data URL, we can process it directly
    if (imageDataUrl.startsWith('data:')) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    resolve(imageDataUrl);
                    return;
                }
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Add semi-transparent overlay at bottom
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
                
                // Add watermark text
                const fontSize = Math.max(12, canvas.width / 45);
                ctx.font = `${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'Generated with Roomify (Free Plan)', 
                    canvas.width / 2, 
                    canvas.height - 35
                );
                
                // Add upgrade CTA in smaller font with correct pricing
                const ctaFontSize = Math.max(10, canvas.width / 55);
                ctx.font = `${ctaFontSize}px "Inter", system-ui, -apple-system, sans-serif`;
                ctx.fillStyle = 'rgba(249, 115, 22, 0.95)';
                ctx.fillText(
                    'Upgrade to Pro - $19/mo • No Watermark', 
                    canvas.width / 2, 
                    canvas.height - 15
                );
                
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => {
                console.warn('Failed to load image for watermark, returning original');
                resolve(imageDataUrl);
            };
            img.src = imageDataUrl;
        });
    }
    
    // For external URLs, fetch and convert to data URL first
    try {
        const response = await fetch(imageDataUrl, {
            mode: 'cors',
            credentials: 'omit'
        });
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
        
        // Recursively call with data URL
        return await addWatermark(dataUrl, isPremium);
    } catch (error) {
        console.error('Failed to fetch image for watermark:', error);
        return imageDataUrl;
    }
};

// Alternative: Simpler watermark that doesn't require canvas manipulation
export const addSimpleWatermark = async (
    imageDataUrl: string,
    isPremium: boolean
): Promise<string> => {
    if (isPremium) return imageDataUrl;
    
    // For data URLs, we can process directly
    if (imageDataUrl.startsWith('data:')) {
        return addWatermark(imageDataUrl, isPremium);
    }
    
    // For external URLs that might have CORS issues,
    // we'll return as-is with a note in console
    console.warn('Cannot add watermark to external URL due to CORS, returning original');
    return imageDataUrl;
};