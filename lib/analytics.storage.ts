// FILE: C:\Users\user\Desktop\roomify\lib\analytics.storage.ts

import puter from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

export interface AnalyticsEvent {
    id: string;
    name: string;
    properties?: Record<string, string | number | boolean | undefined>;
    timestamp: string;
    userId?: string;
    sessionId: string;
    userAgent?: string;
    referrer?: string;
    path?: string;
}

export interface AnalyticsSession {
    sessionId: string;
    userId?: string;
    startTime: string;
    endTime?: string;
    events: string[]; // Array of event IDs
    eventCount: number;
}

export const sendEventToBackend = async (event: AnalyticsEvent): Promise<boolean> => {
    if (!PUTER_WORKER_URL) {
        console.warn('Missing VITE_PUTER_WORKER_URL; skipping analytics send');
        return false;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/analytics/track`, {
            method: 'POST',
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            console.error('Failed to send analytics event', await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error('Failed to send analytics event:', e);
        return false;
    }
};

export const sendBatchEventsToBackend = async (events: AnalyticsEvent[]): Promise<boolean> => {
    if (!PUTER_WORKER_URL || events.length === 0) {
        return false;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/analytics/batch`, {
            method: 'POST',
            body: JSON.stringify({ events })
        });

        if (!response.ok) {
            console.error('Failed to send batch analytics events', await response.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error('Failed to send batch analytics events:', e);
        return false;
    }
};

export const getUserAnalytics = async (userId: string, limit?: number): Promise<AnalyticsEvent[]> => {
    if (!PUTER_WORKER_URL) {
        return [];
    }

    try {
        const url = `${PUTER_WORKER_URL}/api/analytics/user?userId=${encodeURIComponent(userId)}${limit ? `&limit=${limit}` : ''}`;
        const response = await puter.workers.exec(url, { method: 'GET' });

        if (!response.ok) {
            console.error('Failed to get user analytics', await response.text());
            return [];
        }

        const data = await response.json();
        return data.events || [];
    } catch (e) {
        console.error('Failed to get user analytics:', e);
        return [];
    }
};

export const getSessionAnalytics = async (sessionId: string): Promise<AnalyticsEvent[]> => {
    if (!PUTER_WORKER_URL) {
        return [];
    }

    try {
        const url = `${PUTER_WORKER_URL}/api/analytics/session?sessionId=${encodeURIComponent(sessionId)}`;
        const response = await puter.workers.exec(url, { method: 'GET' });

        if (!response.ok) {
            console.error('Failed to get session analytics', await response.text());
            return [];
        }

        const data = await response.json();
        return data.events || [];
    } catch (e) {
        console.error('Failed to get session analytics:', e);
        return [];
    }
};

export const getAnalyticsStats = async (): Promise<{
    totalEvents: number;
    totalUsers: number;
    totalSessions: number;
    eventsByType: Record<string, number>;
    usersByPlan: Record<string, number>;
    topFeatures: Array<{ feature: string; count: number }>;
    conversionRates: Record<string, number>;
} | null> => {
    if (!PUTER_WORKER_URL) {
        return null;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/analytics/stats`, {
            method: 'GET'
        });

        if (!response.ok) {
            console.error('Failed to get analytics stats', await response.text());
            return null;
        }

        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Failed to get analytics stats:', e);
        return null;
    }
};