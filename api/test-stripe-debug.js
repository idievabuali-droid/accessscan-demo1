// Quick diagnostic endpoint for Stripe integration
import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    // Check environment variable
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return res.status(500).json({ 
        error: 'MISSING_STRIPE_SECRET_KEY',
        debug: 'Environment variable STRIPE_SECRET_KEY is not set'
      });
    }
    
    if (!key.startsWith('sk_')) {
      return res.status(500).json({ 
        error: 'INVALID_STRIPE_SECRET_KEY',
        debug: `Key exists but invalid format. Starts with: ${key.substring(0, 3)}`
      });
    }

    // Test Stripe connection
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    
    // Simple test - list customers (should work if everything is configured correctly)
    const customers = await stripe.customers.list({ limit: 1 });
    
    return res.status(200).json({ 
      success: true,
      stripe_connected: true,
      customers_count: customers.data.length,
      debug: 'Stripe connection successful'
    });

  } catch (err) {
    console.error('Stripe test error:', err);
    return res.status(500).json({ 
      error: 'STRIPE_CONNECTION_FAILED',
      message: err.message,
      stack: err.stack
    });
  }
}
