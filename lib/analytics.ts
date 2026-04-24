// FILE: C:\Users\user\Desktop\roomify\lib\analytics.ts

import { sendEventToBackend, sendBatchEventsToBackend, type AnalyticsEvent } from './analytics.storage';

type EventProperties = Record<string, string | number | boolean | undefined>;

class Analytics {
    private sessionId: string;
    private userId: string | null = null;
    private isEnabled: boolean = true;
    private eventQueue: AnalyticsEvent[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private isBrowser: boolean;
    private pendingFlush: boolean = false;

    constructor() {
        // Check if we're in browser environment
        this.isBrowser = typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
        
        if (this.isBrowser) {
            // Generate or retrieve session ID
            let sessionId = sessionStorage.getItem('roomify_session_id');
            if (!sessionId) {
                sessionId = this.generateId();
                sessionStorage.setItem('roomify_session_id', sessionId);
            }
            this.sessionId = sessionId;
            
            // Set up periodic flushing
            this.flushInterval = setInterval(() => this.flush(), 30000); // Flush every 30 seconds
            
            // Flush on page unload
            window.addEventListener('beforeunload', () => this.flush());
            window.addEventListener('pagehide', () => this.flush());
            
            // Track page referrer
            const referrer = document.referrer;
            if (referrer) {
                this.track('page_referrer', { referrer });
            }
            
            // Check if tracking is enabled
            const trackingEnabled = localStorage.getItem('roomify_tracking_enabled');
            if (trackingEnabled === 'false') {
                this.isEnabled = false;
            }
        } else {
            // SSR fallback
            this.sessionId = 'server-side';
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    private getCurrentPath(): string {
        if (!this.isBrowser) return '';
        return window.location.pathname;
    }

    private getUserAgent(): string {
        if (!this.isBrowser) return '';
        return navigator.userAgent;
    }

    public setUserId(userId: string | null) {
        this.userId = userId;
        if (userId && this.isBrowser) {
            this.track('user_identified', { userId });
        }
    }

    public enable() {
        if (!this.isBrowser) return;
        this.isEnabled = true;
        localStorage.setItem('roomify_tracking_enabled', 'true');
        this.track('tracking_enabled');
    }

    public disable() {
        if (!this.isBrowser) return;
        this.isEnabled = false;
        localStorage.setItem('roomify_tracking_enabled', 'false');
        this.track('tracking_disabled');
        this.flush();
    }

    public track(eventName: string, properties?: EventProperties) {
        if (!this.isBrowser || !this.isEnabled) return;
        
        const event: AnalyticsEvent = {
            id: this.generateId(),
            name: eventName,
            properties,
            timestamp: new Date().toISOString(),
            userId: this.userId || undefined,
            sessionId: this.sessionId,
            userAgent: this.getUserAgent(),
            referrer: document.referrer || undefined,
            path: this.getCurrentPath()
        };
        
        this.eventQueue.push(event);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', eventName, properties);
        }
        
        // Flush immediately for important events
        if (this.shouldFlushImmediately(eventName)) {
            this.flush();
        }
        
        // Limit queue size
        if (this.eventQueue.length > 100) {
            this.flush();
        }
    }

    private shouldFlushImmediately(eventName: string): boolean {
        const importantEvents = [
            'sign_up', 'sign_in', 'sign_out',
            'upgrade_click', 'upgrade_complete',
            'purchase', 'payment_success',
            'render_generation', 'render_complete',
            'export_png', 'export_pdf',
            'error', 'user_identified'
        ];
        return importantEvents.includes(eventName);
    }

    private async flush() {
        if (!this.isBrowser || this.pendingFlush) return;
        
        if (this.eventQueue.length === 0) return;
        
        this.pendingFlush = true;
        
        const events = [...this.eventQueue];
        this.eventQueue = [];
        
        // Send to backend
        try {
            if (events.length === 1) {
                await sendEventToBackend(events[0]);
            } else {
                await sendBatchEventsToBackend(events);
            }
            
            // Also store locally as backup
            this.storeLocally(events);
        } catch (error) {
            console.error('Failed to send analytics events:', error);
            // Re-add events to queue if failed
            this.eventQueue = [...events, ...this.eventQueue];
        } finally {
            this.pendingFlush = false;
        }
    }

    private storeLocally(events: AnalyticsEvent[]) {
        if (!this.isBrowser) return;
        
        const stored = localStorage.getItem('roomify_analytics_events');
        let allEvents: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
        allEvents = [...allEvents, ...events];
        
        // Keep only last 1000 events
        if (allEvents.length > 1000) {
            allEvents = allEvents.slice(-1000);
        }
        
        localStorage.setItem('roomify_analytics_events', JSON.stringify(allEvents));
    }

    public getLocalEvents(): AnalyticsEvent[] {
        if (!this.isBrowser) return [];
        
        const stored = localStorage.getItem('roomify_analytics_events');
        return stored ? JSON.parse(stored) : [];
    }

    public clearLocalEvents() {
        if (!this.isBrowser) return;
        localStorage.removeItem('roomify_analytics_events');
        this.track('analytics_cleared');
    }

    // Page tracking
    public pageView(page: string, properties?: EventProperties) {
        this.track('page_view', { page, ...properties });
    }

    // User actions
    public click(element: string, properties?: EventProperties) {
        this.track('click', { element, ...properties });
    }

    // Feature usage
    public featureUsed(feature: string, properties?: EventProperties) {
        this.track('feature_used', { feature, ...properties });
    }

    // Errors
    public error(error: string, properties?: EventProperties) {
        this.track('error', { error, ...properties });
    }

    // Conversion events
    public conversion(step: string, properties?: EventProperties) {
        this.track('conversion', { step, ...properties });
    }

    // Drop-off tracking
    public dropOff(point: string, properties?: EventProperties) {
        this.track('drop_off', { point, ...properties });
    }

    // Payment events
    public paymentStarted(plan: string) {
        this.track('payment_started', { plan });
    }

    public paymentCompleted(plan: string) {
        this.track('payment_completed', { plan });
    }

    public paymentFailed(plan: string, error: string) {
        this.track('payment_failed', { plan, error });
    }
}

// Singleton instance - only create in browser environment
export const analytics = (() => {
    if (typeof window !== 'undefined') {
        return new Analytics();
    }
    // Return a dummy instance for SSR
    return {
        setUserId: () => {},
        enable: () => {},
        disable: () => {},
        track: () => {},
        pageView: () => {},
        click: () => {},
        featureUsed: () => {},
        error: () => {},
        conversion: () => {},
        dropOff: () => {},
        paymentStarted: () => {},
        paymentCompleted: () => {},
        paymentFailed: () => {},
        getLocalEvents: () => [],
        clearLocalEvents: () => {}
    } as any;
})();

// Helper to track page views with React Router
export const trackPageView = (pathname: string) => {
    if (typeof window !== 'undefined') {
        analytics.pageView(pathname);
    }
};

// Helper to track time on page
export const trackTimeOnPage = () => {
    if (typeof window === 'undefined') return () => {};
    
    const startTime = Date.now();
    return () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        analytics.track('time_on_page', { seconds: timeSpent });
    };
};