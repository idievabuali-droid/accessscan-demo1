// /api/test-stripe-simple.js
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const key = process.env.STRIPE_SECRET_KEY;
    
    if (!key || !key.startsWith('sk_')) {
      return res.status(500).json({ 
        error: 'MISSING_STRIPE_SECRET_KEY',
        debug: 'Environment variable STRIPE_SECRET_KEY is not set or invalid'
      });
    }
    
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    // Test 1: Basic Stripe connection
    try {
      const accounts = await stripe.accounts.list({ limit: 1 });
      console.log('✅ Stripe connection successful');
    } catch (error) {
      return res.status(500).json({ 
        step: 'stripe_connection',
        error: 'STRIPE_CONNECTION_FAILED',
        message: error.message
      });
    }

    // Test 2: Customer creation
    const testEmail = 'test@example.com';
    let customer;
    try {
      const existing = await stripe.customers.list({ email: testEmail, limit: 1 });
      customer = existing.data[0] || await stripe.customers.create({
        email: testEmail,
        name: 'Test User',
        metadata: { website: 'https://example.com' }
      });
      console.log('✅ Customer creation successful');
    } catch (error) {
      return res.status(500).json({ 
        step: 'customer_creation',
        error: 'CUSTOMER_CREATION_FAILED',
        message: error.message
      });
    }

    // Test 3: Checkout session creation
    try {
      const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: customer.id,
        payment_method_types: ['card'],
        success_url: `${origin}/#/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/#/founder-access?canceled=1`,
        metadata: { website: 'https://example.com', name: 'Test User' },
        consent_collection: { terms_of_service: 'required' },
        locale: 'auto'
      });
      console.log('✅ Checkout session creation successful');
      
      return res.status(200).json({ 
        success: true,
        message: 'All Stripe operations successful',
        sessionUrl: session.url,
        customerId: customer.id,
        sessionId: session.id
      });
    } catch (error) {
      return res.status(500).json({ 
        step: 'session_creation',
        error: 'SESSION_CREATION_FAILED',
        message: error.message,
        customerId: customer.id
      });
    }

  } catch (error) {
    return res.status(500).json({ 
      step: 'general',
      error: 'GENERAL_ERROR',
      message: error.message
    });
  }
}
