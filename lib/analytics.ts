// FILE: C:\Users\user\Desktop\roomify\lib\analytics.ts

type EventProperties = Record<string, string | number | boolean | undefined>;

interface EventData {
    name: string;
    properties?: EventProperties;
    timestamp: string;
    userId?: string;
    sessionId: string;
}

class Analytics {
    private sessionId: string;
    private userId: string | null = null;
    private isEnabled: boolean = true;
    private eventQueue: EventData[] = [];
    private flushInterval: NodeJS.Timeout | null = null;
    private isBrowser: boolean;

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
        
        const eventData: EventData = {
            name: eventName,
            properties,
            timestamp: new Date().toISOString(),
            userId: this.userId || undefined,
            sessionId: this.sessionId
        };
        
        this.eventQueue.push(eventData);
        
        // Flush immediately for important events
        if (this.shouldFlushImmediately(eventName)) {
            this.flush();
        }
        
        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', eventName, properties);
        }
    }

    private shouldFlushImmediately(eventName: string): boolean {
        const importantEvents = [
            'sign_up',
            'upgrade_click',
            'purchase',
            'error',
            'render_generation',
            'export_png',
            'export_pdf'
        ];
        return importantEvents.includes(eventName);
    }

    private async flush() {
        if (!this.isBrowser || this.eventQueue.length === 0) return;
        
        const events = [...this.eventQueue];
        this.eventQueue = [];
        
        // Store locally
        this.storeLocally(events);
        
        // If you have a backend endpoint, uncomment this:
        // try {
        //     await fetch('/api/analytics/track', {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ events })
        //     });
        // } catch (error) {
        //     console.error('Failed to send analytics:', error);
        //     this.eventQueue = [...events, ...this.eventQueue];
        // }
    }

    private storeLocally(events: EventData[]) {
        if (!this.isBrowser) return;
        
        const stored = localStorage.getItem('roomify_analytics_events');
        let allEvents: EventData[] = stored ? JSON.parse(stored) : [];
        allEvents = [...allEvents, ...events];
        
        // Keep only last 1000 events
        if (allEvents.length > 1000) {
            allEvents = allEvents.slice(-1000);
        }
        
        localStorage.setItem('roomify_analytics_events', JSON.stringify(allEvents));
    }

    public getEvents(): EventData[] {
        if (!this.isBrowser) return [];
        
        const stored = localStorage.getItem('roomify_analytics_events');
        return stored ? JSON.parse(stored) : [];
    }

    public clearEvents() {
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
}

// Singleton instance - only create in browser environment
export const analytics = new Analytics();

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