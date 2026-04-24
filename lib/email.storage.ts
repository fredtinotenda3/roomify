// FILE: C:\Users\user\Desktop\roomify\lib\email.storage.ts

import puter from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

export interface EmailSubscriber {
    email: string;
    userId?: string;
    name?: string;
    source: 'gallery' | 'upload' | 'generation' | 'dashboard' | 'signup';
    status: 'active' | 'unsubscribed' | 'bounced';
    subscribedAt: string;
    lastActivity?: string;
    metadata?: Record<string, any>;
}

export interface EmailCampaign {
    id: string;
    name: string;
    subject: string;
    content: string;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
    scheduledFor?: string;
    sentAt?: string;
    recipientCount?: number;
    openCount?: number;
    clickCount?: number;
    createdAt: string;
}

export interface EmailEvent {
    id: string;
    campaignId: string;
    email: string;
    eventType: 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'bounced';
    timestamp: string;
    metadata?: Record<string, any>;
}

export const subscribeEmail = async (
    email: string, 
    source: EmailSubscriber['source'],
    name?: string,
    metadata?: Record<string, any>
): Promise<{ success: boolean; message?: string }> => {
    if (!email || !email.includes('@')) {
        return { success: false, message: 'Invalid email address' };
    }

    if (!PUTER_WORKER_URL) {
        // Local fallback
        console.log('Email captured (local):', email, source);
        const subscribers = JSON.parse(localStorage.getItem('roomify_emails') || '[]');
        if (!subscribers.find((s: any) => s.email === email)) {
            subscribers.push({
                email,
                source,
                name,
                metadata,
                subscribedAt: new Date().toISOString(),
                status: 'active'
            });
            localStorage.setItem('roomify_emails', JSON.stringify(subscribers));
        }
        return { success: true };
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/subscribe`, {
            method: 'POST',
            body: JSON.stringify({ email, source, name, metadata })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, message: error.error || 'Failed to subscribe' };
        }

        return { success: true };
    } catch (e) {
        console.error('Failed to subscribe email:', e);
        return { success: false, message: 'Network error' };
    }
};

export const unsubscribeEmail = async (email: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) return false;

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/unsubscribe`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        return response.ok;
    } catch (e) {
        console.error('Failed to unsubscribe:', e);
        return false;
    }
};

export const getAllSubscribers = async (): Promise<EmailSubscriber[]> => {
    if (!PUTER_WORKER_URL) {
        const subscribers = JSON.parse(localStorage.getItem('roomify_emails') || '[]');
        return subscribers;
    }

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/subscribers`, {
            method: 'GET'
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.subscribers || [];
    } catch (e) {
        console.error('Failed to get subscribers:', e);
        return [];
    }
};

export const getSubscriberCount = async (): Promise<number> => {
    const subscribers = await getAllSubscribers();
    return subscribers.filter(s => s.status === 'active').length;
};

export const createCampaign = async (campaign: Omit<EmailCampaign, 'id' | 'createdAt'>): Promise<EmailCampaign | null> => {
    if (!PUTER_WORKER_URL) return null;

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/campaigns/create`, {
            method: 'POST',
            body: JSON.stringify(campaign)
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.campaign;
    } catch (e) {
        console.error('Failed to create campaign:', e);
        return null;
    }
};

export const getCampaigns = async (): Promise<EmailCampaign[]> => {
    if (!PUTER_WORKER_URL) return [];

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/campaigns`, {
            method: 'GET'
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.campaigns || [];
    } catch (e) {
        console.error('Failed to get campaigns:', e);
        return [];
    }
};

export const sendCampaign = async (campaignId: string): Promise<boolean> => {
    if (!PUTER_WORKER_URL) return false;

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/campaigns/send`, {
            method: 'POST',
            body: JSON.stringify({ campaignId })
        });

        return response.ok;
    } catch (e) {
        console.error('Failed to send campaign:', e);
        return false;
    }
};

export const trackEmailEvent = async (
    campaignId: string,
    email: string,
    eventType: EmailEvent['eventType'],
    metadata?: Record<string, any>
): Promise<boolean> => {
    if (!PUTER_WORKER_URL) return false;

    try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/email/track`, {
            method: 'POST',
            body: JSON.stringify({ campaignId, email, eventType, metadata })
        });

        return response.ok;
    } catch (e) {
        console.error('Failed to track email event:', e);
        return false;
    }
};