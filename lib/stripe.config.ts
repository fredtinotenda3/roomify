// FILE: lib/stripe.config.ts

import { loadStripe } from '@stripe/stripe-js';

// These values come from your .env.local
// The VITE_ prefix makes them available in the browser
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Price IDs from your Stripe Dashboard
export const STRIPE_PRICES = {
    monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_1TPLjXGB6VC6JAnkVonlBmAF',
    yearly: import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_1TPLq2GB6VC6JAnkhpsJL7Zy',
};

// Helper to get Stripe instance
export const getStripe = async () => {
    if (!STRIPE_PUBLISHABLE_KEY) {
        console.error('Stripe publishable key not configured');
        return null;
    }
    return await loadStripe(STRIPE_PUBLISHABLE_KEY);
};

// Helper to check if Stripe is configured
export const isStripeConfigured = (): boolean => {
    return !!STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== '';
};