// FILE: C:\Users\user\Desktop\roomify\lib\ai.action.ts

import puter from "@heyputer/puter.js";
import { getStylePromptWithPreset, type DesignStyle } from "./constants";
import type { PresetCategory } from "./presets";

export const compressImage = async (dataUrl: string, maxSizeMB: number = 5): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            const maxDimension = 1024;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height * maxDimension) / width;
                    width = maxDimension;
                } else {
                    width = (width * maxDimension) / height;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            let quality = 0.8;
            const tryCompression = (currentQuality: number) => {
                const compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
                const sizeInMB = (compressedDataUrl.length * 0.75) / (1024 * 1024);
                
                if (sizeInMB <= maxSizeMB || currentQuality <= 0.3) {
                    resolve(compressedDataUrl);
                } else {
                    tryCompression(currentQuality - 0.1);
                }
            };
            
            tryCompression(quality);
        };
        
        img.onerror = reject;
        img.src = dataUrl;
    });
};

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    try {
        if (url.includes('.puter.site')) {
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        throw error;
    }
};

export const generate3DView = async ({ 
    sourceImage, 
    style = 'modern',
    preset = 'budget'
}: Generate3DViewParams & { style?: DesignStyle; preset?: PresetCategory }) => {
    try {
        let dataUrl = sourceImage;
        
        if (!sourceImage.startsWith('data:')) {
            console.log('Converting image to data URL...');
            dataUrl = await fetchAsDataUrl(sourceImage);
        }
        
        console.log('Compressing image...');
        const compressedDataUrl = await compressImage(dataUrl, 4);
        console.log('Image compressed successfully');
        
        const base64Data = compressedDataUrl.split(',')[1];
        
        if (!base64Data) {
            throw new Error('Invalid source image payload');
        }
        
        const stylePrompt = getStylePromptWithPreset(style, preset);
        console.log(`Generating with ${style} style and ${preset} preset...`);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AI generation timeout after 60 seconds')), 60000);
        });
        
        const aiPromise = puter.ai.txt2img(stylePrompt, {
            model: "gpt-image-1-mini",
            input_image: base64Data,
            input_image_mime_type: "image/jpeg",
            ratio: { w: 1024, h: 1024 },
        });
        
        const response = await Promise.race([aiPromise, timeoutPromise]);
        
        console.log('AI Response received');
        
        let rawImageUrl: string | null = null;
        
        if (typeof response === 'string') {
            rawImageUrl = response;
        } else if (response instanceof HTMLImageElement) {
            rawImageUrl = response.src;
        } else if (response && typeof response === 'object') {
            rawImageUrl = (response as any).src || 
                         (response as any).image || 
                         (response as any).url ||
                         (response as any).output;
            
            if (!rawImageUrl && (response as any).blob instanceof Blob) {
                const blob = (response as any).blob;
                rawImageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }
        }
        
        if (!rawImageUrl) {
            console.error('No image URL in response:', response);
            throw new Error('No image generated by AI');
        }
        
        const renderedImage = rawImageUrl.startsWith('data:') 
            ? rawImageUrl 
            : await fetchAsDataUrl(rawImageUrl);
        
        return { renderedImage, renderedPath: undefined, style, preset };
    } catch (error) {
        console.error('AI generation error:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                throw new Error('AI generation timed out. Please try again.');
            } else if (error.message.includes('funding') || error.message.includes('balance')) {
                throw new Error('API requires payment. Please check your Puter.ai account balance.');
            }
        }
        
        throw error;
    }
};