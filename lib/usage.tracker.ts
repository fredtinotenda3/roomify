// FILE: C:\Users\user\Desktop\roomify\lib\usage.tracker.ts

import puter from "@heyputer/puter.js";
import { PLANS, getUserPlan } from './plans';

// HARD LIMITS - FREE PLAN
export const USAGE_LIMITS = {
    FREE_RENDERS: 3,        // MAX 3 renders per month
    FREE_EXPORTS: 5,        // MAX 5 exports per month
    FREE_PDF_EXPORTS: 2,    // MAX 2 PDF exports per month
    FREE_HIGH_RES: false,    // No high-res for free
    PREMIUM_STYLES: ['industrial', 'scandinavian'], // Locked for free
    PREMIUM_PRESETS: ['luxury', 'traditional']      // Locked for free
};

// Pro Pricing
export const PRO_PRICE = {
    monthly: 19,
    yearly: 159,
    currency: 'USD',
    monthlyInterval: 'month',
    yearlyInterval: 'year'
};

export interface UsageStats {
    renderCount: number;
    exportCount: number;
    pdfExportCount: number;
    lastResetDate: string;
    isPremium: boolean;
    subscriptionType?: 'monthly' | 'yearly';
    subscriptionEndDate?: string;
    upgradeTriggerShown?: {
        renderLimit?: boolean;
        exportLimit?: boolean;
        pdfLimit?: boolean;
        premiumStyle?: boolean;
        premiumPreset?: boolean;
        watermark?: boolean;
    };
}

const USAGE_KEY_PREFIX = 'roomify_usage_';

export const getUserUsageKey = (userId: string): string => {
    return `${USAGE_KEY_PREFIX}${userId}`;
};

export const getCurrentUser = async (): Promise<any> => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
};

export const getUsageStats = async (userId: string): Promise<UsageStats> => {
    try {
        const key = getUserUsageKey(userId);
        const stats = await puter.kv.get(key) as UsageStats | null;
        
        if (!stats) {
            const newStats: UsageStats = {
                renderCount: 0,
                exportCount: 0,
                pdfExportCount: 0,
                lastResetDate: new Date().toISOString(),
                isPremium: false,
                upgradeTriggerShown: {}
            };
            await puter.kv.set(key, newStats);
            return newStats;
        }
        
        // Check if premium subscription has expired
        if (stats.isPremium && stats.subscriptionEndDate) {
            const endDate = new Date(stats.subscriptionEndDate);
            const now = new Date();
            if (now > endDate) {
                const expiredStats: UsageStats = {
                    ...stats,
                    isPremium: false,
                    subscriptionType: undefined,
                    subscriptionEndDate: undefined,
                    renderCount: 0,
                    exportCount: 0,
                    pdfExportCount: 0,
                    lastResetDate: now.toISOString(),
                    upgradeTriggerShown: {}
                };
                await puter.kv.set(key, expiredStats);
                return expiredStats;
            }
        }
        
        // Monthly reset for free users
        const lastReset = new Date(stats.lastResetDate);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
        
        if (monthsDiff >= 1 && !stats.isPremium) {
            const resetStats: UsageStats = {
                ...stats,
                renderCount: 0,
                exportCount: 0,
                pdfExportCount: 0,
                lastResetDate: now.toISOString(),
                isPremium: false,
                upgradeTriggerShown: {}
            };
            await puter.kv.set(key, resetStats);
            return resetStats;
        }
        
        return stats;
    } catch (error) {
        console.error('Failed to get usage stats:', error);
        return {
            renderCount: USAGE_LIMITS.FREE_RENDERS,
            exportCount: USAGE_LIMITS.FREE_EXPORTS,
            pdfExportCount: USAGE_LIMITS.FREE_PDF_EXPORTS,
            lastResetDate: new Date().toISOString(),
            isPremium: false,
            upgradeTriggerShown: {}
        };
    }
};

export const incrementRenderCount = async (userId: string): Promise<UsageStats> => {
    const stats = await getUsageStats(userId);
    if (!stats.isPremium) {
        stats.renderCount++;
    }
    await puter.kv.set(getUserUsageKey(userId), stats);
    return stats;
};

export const incrementExportCount = async (userId: string): Promise<UsageStats> => {
    const stats = await getUsageStats(userId);
    if (!stats.isPremium) {
        stats.exportCount++;
    }
    await puter.kv.set(getUserUsageKey(userId), stats);
    return stats;
};

export const incrementPDFExportCount = async (userId: string): Promise<UsageStats> => {
    const stats = await getUsageStats(userId);
    if (!stats.isPremium) {
        stats.pdfExportCount++;
    }
    await puter.kv.set(getUserUsageKey(userId), stats);
    return stats;
};

// SERVER-SIDE VALIDATION - HARD CHECKS
export const validateRenderLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited renders' };
    }
    
    const remaining = USAGE_LIMITS.FREE_RENDERS - stats.renderCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `RENDER_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_RENDERS} free renders. Upgrade to Pro.`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `${remaining} renders remaining`
    };
};

export const validateExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_EXPORTS - stats.exportCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `EXPORT_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_EXPORTS} free exports. Upgrade to Pro.`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `${remaining} exports remaining`
    };
};

export const validatePDFExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited PDF exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `PDF_LIMIT_EXCEEDED: You've used all ${USAGE_LIMITS.FREE_PDF_EXPORTS} free PDF exports. Upgrade to Pro.`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `${remaining} PDF exports remaining`
    };
};

export const validatePremiumStyle = (styleId: string, isPremiumUser: boolean): { allowed: boolean; message?: string } => {
    const isPremiumStyle = USAGE_LIMITS.PREMIUM_STYLES.includes(styleId as any);
    
    if (isPremiumStyle && !isPremiumUser) {
        return {
            allowed: false,
            message: `PREMIUM_FEATURE: ${styleId} style requires Pro subscription. Upgrade to access.`
        };
    }
    
    return { allowed: true };
};

export const validatePremiumPreset = (presetId: string, isPremiumUser: boolean): { allowed: boolean; message?: string } => {
    const isPremiumPreset = USAGE_LIMITS.PREMIUM_PRESETS.includes(presetId as any);
    
    if (isPremiumPreset && !isPremiumUser) {
        return {
            allowed: false,
            message: `PREMIUM_FEATURE: ${presetId} preset requires Pro subscription. Upgrade to access.`
        };
    }
    
    return { allowed: true };
};

// Server-side endpoint validation (for worker)
export const validateRequest = async (userId: string, action: 'render' | 'export' | 'pdf'): Promise<{ valid: boolean; error?: string }> => {
    let validation;
    switch (action) {
        case 'render':
            validation = await validateRenderLimit(userId);
            break;
        case 'export':
            validation = await validateExportLimit(userId);
            break;
        case 'pdf':
            validation = await validatePDFExportLimit(userId);
            break;
        default:
            return { valid: false, error: 'Unknown action' };
    }
    
    if (!validation.allowed) {
        return { valid: false, error: validation.message };
    }
    
    return { valid: true };
};


export const checkExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string; showUpgrade?: boolean }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_EXPORTS - stats.exportCount;
    const showUpgrade = remaining <= 1 || stats.exportCount >= USAGE_LIMITS.FREE_EXPORTS - 1;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `⚠️ You've reached your free limit of ${USAGE_LIMITS.FREE_EXPORTS} exports. Upgrade to Pro for unlimited exports!`,
            showUpgrade: true
        };
    }
    
    if (remaining === 1) {
        return {
            allowed: true,
            remaining,
            message: `⚠️ Last free export! After this, upgrade to Pro for unlimited exports.`,
            showUpgrade: true
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free export${remaining !== 1 ? 's' : ''} remaining this month`,
        showUpgrade: false
    };
};

export const checkPDFExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string; showUpgrade?: boolean }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited PDF exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount;
    const showUpgrade = remaining <= 1 || stats.pdfExportCount >= USAGE_LIMITS.FREE_PDF_EXPORTS - 1;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `⚠️ You've reached your free limit of ${USAGE_LIMITS.FREE_PDF_EXPORTS} PDF exports. Upgrade to Pro for unlimited PDF exports!`,
            showUpgrade: true
        };
    }
    
    if (remaining === 1) {
        return {
            allowed: true,
            remaining,
            message: `⚠️ Last free PDF export! After this, upgrade to Pro for unlimited PDF exports.`,
            showUpgrade: true
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free PDF export${remaining !== 1 ? 's' : ''} remaining this month`,
        showUpgrade: false
    };
};

export const checkHighResAccess = async (userId: string): Promise<boolean> => {
    const stats = await getUsageStats(userId);
    return stats.isPremium;
};

export const checkPremiumStyle = (styleId: string): { isFree: boolean; showUpgrade: boolean; message?: string } => {
    const isPremium = USAGE_LIMITS.PREMIUM_STYLES.includes(styleId as any);
    
    if (isPremium) {
        return {
            isFree: false,
            showUpgrade: true,
            message: `✨ ${styleId.charAt(0).toUpperCase() + styleId.slice(1)} style is a Pro feature. Upgrade to unlock all premium styles!`
        };
    }
    
    return {
        isFree: true,
        showUpgrade: false
    };
};

export const checkPremiumPreset = (presetId: string): { isFree: boolean; showUpgrade: boolean; message?: string } => {
    const isPremium = USAGE_LIMITS.PREMIUM_PRESETS.includes(presetId as any);
    
    if (isPremium) {
        return {
            isFree: false,
            showUpgrade: true,
            message: `💎 ${presetId.charAt(0).toUpperCase() + presetId.slice(1)} preset is a Pro feature. Upgrade to unlock all premium presets!`
        };
    }
    
    return {
        isFree: true,
        showUpgrade: false
    };
};

export const getPremiumFeatures = (): string[] => {
    return [
        'Unlimited renders',
        'Unlimited exports (PNG/PDF)',
        'No watermark on exports',
        'All premium styles: ' + USAGE_LIMITS.PREMIUM_STYLES.join(', '),
        'All premium presets: ' + USAGE_LIMITS.PREMIUM_PRESETS.join(', '),
        'Priority processing',
        'Email support'
    ];
};

export const upgradeToPro = async (userId: string, subscriptionType: 'monthly' | 'yearly' = 'monthly'): Promise<void> => {
    const stats = await getUsageStats(userId);
    stats.isPremium = true;
    stats.subscriptionType = subscriptionType;
    
    const endDate = new Date();
    if (subscriptionType === 'yearly') {
        endDate.setDate(endDate.getDate() + 365);
    } else {
        endDate.setDate(endDate.getDate() + 30);
    }
    stats.subscriptionEndDate = endDate.toISOString();
    
    await puter.kv.set(getUserUsageKey(userId), stats);
};

export const getRemainingUsage = async (userId: string): Promise<{
    rendersRemaining: number;
    exportsRemaining: number;
    pdfExportsRemaining: number;
    isPremium: boolean;
    subscriptionType?: string;
}> => {
    const stats = await getUsageStats(userId);
    
    return {
        rendersRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_RENDERS - stats.renderCount),
        exportsRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_EXPORTS - stats.exportCount),
        pdfExportsRemaining: stats.isPremium ? Infinity : Math.max(0, USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount),
        isPremium: stats.isPremium,
        subscriptionType: stats.subscriptionType
    };
};

// Add to usage.tracker.ts - update limit checking to use plan system

export const checkRenderLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string; showUpgrade?: boolean }> => {
    const stats = await getUsageStats(userId);
    const plan = getUserPlan(stats.isPremium, stats.subscriptionType);
    const planLimits = PLANS[plan].limits;
    
    if (plan !== 'free') {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited renders' };
    }
    
    const remaining = planLimits.renders - stats.renderCount;
    const showUpgrade = remaining <= 1;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `⚠️ You've reached your free limit of ${planLimits.renders} renders. Upgrade to Pro for unlimited renders!`,
            showUpgrade: true
        };
    }
    
    if (remaining === 1) {
        return {
            allowed: true,
            remaining,
            message: `⚠️ Last free render! After this, upgrade to Pro for unlimited renders.`,
            showUpgrade: true
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free render${remaining !== 1 ? 's' : ''} remaining this month`,
        showUpgrade: false
    };
};