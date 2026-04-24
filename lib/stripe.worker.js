// FILE: lib/stripe.worker.js
// This needs to be deployed as a separate worker or added to your existing worker

import Stripe from 'stripe';

// Initialize Stripe with your secret key
// In production, store this in environment variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here';
const stripe = new Stripe(stripeSecretKey);

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Handle CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }
        
        // Create checkout session
        if (url.pathname === '/api/create-checkout-session' && request.method === 'POST') {
            try {
                const body = await request.json();
                const { priceId, userId, email, planType, successUrl, cancelUrl } = body;
                
                if (!priceId || !userId || !email) {
                    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }
                
                // Create Stripe checkout session
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [
                        {
                            price: priceId,
                            quantity: 1,
                        },
                    ],
                    mode: 'subscription',
                    success_url: successUrl,
                    cancel_url: cancelUrl,
                    client_reference_id: userId,
                    customer_email: email,
                    metadata: {
                        userId,
                        planType,
                    },
                });
                
                console.log('Created checkout session:', session.id);
                
                return new Response(JSON.stringify({
                    sessionId: session.id,
                    checkoutUrl: session.url,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
                
            } catch (error) {
                console.error('Stripe checkout error:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }
        
        // Verify payment
        if (url.pathname === '/api/verify-payment' && request.method === 'GET') {
            try {
                const sessionId = url.searchParams.get('session_id');
                
                if (!sessionId) {
                    return new Response(JSON.stringify({ error: 'Session ID required' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }
                
                // Retrieve the session from Stripe
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                
                const isVerified = session.payment_status === 'paid';
                
                if (isVerified && session.client_reference_id) {
                    // Store the subscription in your KV storage
                    const userId = session.client_reference_id;
                    const usageKey = `roomify_usage_${userId}`;
                    
                    // Get existing usage stats or create new
                    let usageStats = await env.ROOMIFY_KV.get(usageKey, 'json');
                    if (!usageStats) {
                        usageStats = {
                            renderCount: 0,
                            exportCount: 0,
                            pdfExportCount: 0,
                            lastResetDate: new Date().toISOString(),
                            isPremium: false,
                        };
                    }
                    
                    // Update to premium
                    usageStats.isPremium = true;
                    usageStats.subscriptionType = session.metadata?.planType || 'monthly';
                    
                    // Set subscription end date (30 or 365 days from now)
                    const endDate = new Date();
                    if (usageStats.subscriptionType === 'yearly') {
                        endDate.setDate(endDate.getDate() + 365);
                    } else {
                        endDate.setDate(endDate.getDate() + 30);
                    }
                    usageStats.subscriptionEndDate = endDate.toISOString();
                    
                    await env.ROOMIFY_KV.put(usageKey, JSON.stringify(usageStats));
                }
                
                return new Response(JSON.stringify({ verified: isVerified }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
                
            } catch (error) {
                console.error('Verification error:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }
        
        // Stripe webhook
        if (url.pathname === '/api/stripe/webhook' && request.method === 'POST') {
            try {
                const body = await request.text();
                const sig = request.headers.get('stripe-signature');
                
                // Verify webhook signature (use your webhook secret)
                const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                let event;
                
                try {
                    if (webhookSecret) {
                        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
                    } else {
                        event = JSON.parse(body);
                    }
                } catch (err) {
                    console.error('Webhook signature verification failed:', err);
                    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
                }
                
                // Handle the event
                if (event.type === 'checkout.session.completed') {
                    const session = event.data.object;
                    const userId = session.client_reference_id;
                    
                    if (userId) {
                        const usageKey = `roomify_usage_${userId}`;
                        let usageStats = await env.ROOMIFY_KV.get(usageKey, 'json');
                        
                        if (usageStats) {
                            usageStats.isPremium = true;
                            usageStats.subscriptionType = session.metadata?.planType || 'monthly';
                            const endDate = new Date();
                            if (usageStats.subscriptionType === 'yearly') {
                                endDate.setDate(endDate.getDate() + 365);
                            } else {
                                endDate.setDate(endDate.getDate() + 30);
                            }
                            usageStats.subscriptionEndDate = endDate.toISOString();
                            await env.ROOMIFY_KV.put(usageKey, JSON.stringify(usageStats));
                        }
                    }
                }
                
                return new Response(JSON.stringify({ received: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
                
            } catch (error) {
                console.error('Webhook error:', error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }
        
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
};