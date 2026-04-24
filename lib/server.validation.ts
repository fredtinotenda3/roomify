// FILE: C:\Users\user\Desktop\roomify\lib\server.validation.ts

import puter from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

export interface ServerValidationResult {
    allowed: boolean;
    remaining?: number;
    isPremium?: boolean;
    error?: string;
}

export const validateRenderLimitOnServer = async (userId: string): Promise<ServerValidationResult> => {
    if (!PUTER_WORKER_URL) {
        return { allowed: true, error: 'Worker URL not configured' };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/validate/render`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { allowed: false, error: error.error || 'Validation failed' };
        }

        const data = await response.json();
        return {
            allowed: data.allowed,
            remaining: data.remaining,
            isPremium: data.isPremium
        };
    } catch (error) {
        console.error('Server validation failed:', error);
        return { allowed: false, error: 'Failed to validate with server' };
    }
};

export const incrementRenderCountOnServer = async (userId: string): Promise<ServerValidationResult> => {
    if (!PUTER_WORKER_URL) {
        return { allowed: true, error: 'Worker URL not configured' };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/usage/increment/render`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { allowed: false, error: error.error || 'Failed to increment' };
        }

        const data = await response.json();
        return {
            allowed: true,
            remaining: data.remaining,
            isPremium: data.isPremium
        };
    } catch (error) {
        console.error('Failed to increment render count:', error);
        return { allowed: false, error: 'Failed to increment render count' };
    }
};

export const incrementExportCountOnServer = async (userId: string): Promise<ServerValidationResult> => {
    if (!PUTER_WORKER_URL) {
        return { allowed: true, error: 'Worker URL not configured' };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/usage/increment/export`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { allowed: false, error: error.error || 'Failed to increment' };
        }

        const data = await response.json();
        return {
            allowed: true,
            remaining: data.remaining,
            isPremium: data.isPremium
        };
    } catch (error) {
        console.error('Failed to increment export count:', error);
        return { allowed: false, error: 'Failed to increment export count' };
    }
};

export const incrementPDFExportCountOnServer = async (userId: string): Promise<ServerValidationResult> => {
    if (!PUTER_WORKER_URL) {
        return { allowed: true, error: 'Worker URL not configured' };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/usage/increment/pdf`, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { allowed: false, error: error.error || 'Failed to increment' };
        }

        const data = await response.json();
        return {
            allowed: true,
            remaining: data.remaining,
            isPremium: data.isPremium
        };
    } catch (error) {
        console.error('Failed to increment PDF export count:', error);
        return { allowed: false, error: 'Failed to increment PDF export count' };
    }
};

export const getServerUsageStats = async (userId: string): Promise<{
    rendersUsed: number;
    rendersRemaining: number;
    exportsUsed: number;
    exportsRemaining: number;
    pdfsUsed: number;
    pdfsRemaining: number;
    isPremium: boolean;
    subscriptionType?: string;
    subscriptionEndDate?: string;
} | null> => {
    if (!PUTER_WORKER_URL) {
        return null;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/usage/stats`, {
            method: 'GET'
        });

        if (!response.ok) {
            console.error('Failed to get usage stats');
            return null;
        }

        const data = await response.json();
        return {
            rendersUsed: data.rendersUsed,
            rendersRemaining: data.rendersRemaining,
            exportsUsed: data.exportsUsed,
            exportsRemaining: data.exportsRemaining,
            pdfsUsed: data.pdfsUsed,
            pdfsRemaining: data.pdfsRemaining,
            isPremium: data.isPremium,
            subscriptionType: data.subscriptionType,
            subscriptionEndDate: data.subscriptionEndDate
        };
    } catch (error) {
        console.error('Failed to get usage stats:', error);
        return null;
    }
};