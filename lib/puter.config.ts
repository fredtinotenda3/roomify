// FILE: C:\Users\user\Desktop\roomify\lib\puter.config.ts

import puter from "@heyputer/puter.js";

export const checkPuterConfig = async () => {
    try {
        // Check if puter is initialized
        if (!puter) {
            console.error('Puter not initialized');
            return false;
        }
        
        // Check if AI is available
        if (!puter.ai || typeof puter.ai.txt2img !== 'function') {
            console.error('Puter AI not available');
            return false;
        }
        
        // Check authentication
        const user = await puter.auth.getUser();
        if (!user) {
            console.error('User not authenticated');
            return false;
        }
        
        console.log('Puter configuration check passed');
        console.log('User:', user.username);
        console.log('AI available:', !!puter.ai.txt2img);
        
        return true;
    } catch (error) {
        console.error('Puter configuration check failed:', error);
        return false;
    }
};