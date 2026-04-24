// FILE: C:\Users\user\Desktop\roomify\lib\plans.ts

export type PlanType = 'free' | 'pro_monthly' | 'pro_yearly';

export interface Plan {
    id: PlanType;
    name: string;
    price: number;
    interval: 'month' | 'year' | null;
    stripePriceId: string;
    features: string[];
    limits: {
        renders: number;
        exports: number;
        pdfExports: number;
        highRes: boolean;
        watermark: boolean;
        premiumStyles: boolean;
        premiumPresets: boolean;
        prioritySupport: boolean;
    };
}

export const PLANS: Record<PlanType, Plan> = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: null,
        stripePriceId: '',
        features: [
            '3 AI renders per month',
            '5 PNG exports per month',
            '2 PDF exports per month',
            'Basic styles',
            'Basic presets',
            'Watermark included'
        ],
        limits: {
            renders: 3,
            exports: 5,
            pdfExports: 2,
            highRes: false,
            watermark: true,
            premiumStyles: false,
            premiumPresets: false,
            prioritySupport: false
        }
    },
    pro_monthly: {
        id: 'pro_monthly',
        name: 'Pro Monthly',
        price: 19,
        interval: 'month',
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_monthly',
        features: [
            'Unlimited AI renders',
            'Unlimited PNG exports',
            'Unlimited PDF exports',
            'No watermark',
            'All premium styles',
            'All premium presets',
            'Priority processing',
            'Email support'
        ],
        limits: {
            renders: Infinity,
            exports: Infinity,
            pdfExports: Infinity,
            highRes: true,
            watermark: false,
            premiumStyles: true,
            premiumPresets: true,
            prioritySupport: true
        }
    },
    pro_yearly: {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 159,
        interval: 'year',
        stripePriceId: import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_yearly',
        features: [
            'Everything in Pro Monthly',
            'Save $69 compared to monthly',
            'Priority support',
            'Early access to new features'
        ],
        limits: {
            renders: Infinity,
            exports: Infinity,
            pdfExports: Infinity,
            highRes: true,
            watermark: false,
            premiumStyles: true,
            premiumPresets: true,
            prioritySupport: true
        }
    }
};

export const getPlanById = (planId: PlanType): Plan | undefined => {
    return PLANS[planId];
};

export const getPlanByPriceId = (priceId: string): Plan | undefined => {
    return Object.values(PLANS).find(plan => plan.stripePriceId === priceId);
};

export const getUserPlan = (isPremium: boolean, subscriptionType?: 'monthly' | 'yearly'): PlanType => {
    if (!isPremium) return 'free';
    if (subscriptionType === 'yearly') return 'pro_yearly';
    return 'pro_monthly';
};