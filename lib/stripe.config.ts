// FILE: C:\Users\user\Desktop\roomify\lib\stripe.config.ts

import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual Stripe publishable key
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const STRIPE_PRICES = {
    monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_monthly_123',
    yearly: import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_yearly_456',
};

export const getStripe = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
        console.error('Stripe publishable key not configured');
        return null;
    }
    return await loadStripe(STRIPE_PUBLISHABLE_KEY);
};