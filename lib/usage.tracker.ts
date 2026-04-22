// FILE: C:\Users\user\Desktop\roomify\lib\usage.tracker.ts

import puter from "@heyputer/puter.js";

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
                isPremium: false
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
                    lastResetDate: now.toISOString()
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
                isPremium: false
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
            isPremium: false
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

// HARD CHECK: Render limit - NO EXCEPTIONS
export const checkRenderLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited renders' };
    }
    
    const remaining = USAGE_LIMITS.FREE_RENDERS - stats.renderCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `You've used all ${USAGE_LIMITS.FREE_RENDERS} free renders. Upgrade to Pro ($19/mo) for unlimited renders!`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free render${remaining !== 1 ? 's' : ''} remaining this month`
    };
};

// HARD CHECK: Export limit
export const checkExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_EXPORTS - stats.exportCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `You've used all ${USAGE_LIMITS.FREE_EXPORTS} free exports. Upgrade to Pro ($19/mo) for unlimited exports!`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free export${remaining !== 1 ? 's' : ''} remaining this month`
    };
};

// HARD CHECK: PDF Export limit
export const checkPDFExportLimit = async (userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> => {
    const stats = await getUsageStats(userId);
    
    if (stats.isPremium) {
        return { allowed: true, remaining: Infinity, message: 'Pro user - unlimited PDF exports' };
    }
    
    const remaining = USAGE_LIMITS.FREE_PDF_EXPORTS - stats.pdfExportCount;
    
    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            message: `You've used all ${USAGE_LIMITS.FREE_PDF_EXPORTS} free PDF exports. Upgrade to Pro ($19/mo) for unlimited PDF exports!`
        };
    }
    
    return {
        allowed: true,
        remaining,
        message: `You have ${remaining} free PDF export${remaining !== 1 ? 's' : ''} remaining this month`
    };
};

export const checkHighResAccess = async (userId: string): Promise<boolean> => {
    const stats = await getUsageStats(userId);
    return stats.isPremium;
};

// HARD CHECK: Premium styles (returns TRUE if free, FALSE if premium/locked)
export const checkPremiumStyle = (styleId: string): boolean => {
    return !USAGE_LIMITS.PREMIUM_STYLES.includes(styleId as any);
};

// HARD CHECK: Premium presets (returns TRUE if free, FALSE if premium/locked)
export const checkPremiumPreset = (presetId: string): boolean => {
    return !USAGE_LIMITS.PREMIUM_PRESETS.includes(presetId as any);
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