// /api/stripe-test.js
import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    // Get the environment variable
    const key = process.env.STRIPE_SECRET_KEY;
    
    // Detailed diagnostics
    const diagnostics = {
      hasEnvVar: !!key,
      keyLength: key ? key.length : 0,
      keyPrefix: key ? key.substring(0, 7) : 'none',
      keyType: key ? (key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : 'unknown') : 'missing',
      isValidFormat: key ? key.startsWith('sk_') : false
    };
    
    if (!key || !key.startsWith('sk_')) {
      return res.status(500).json({ 
        error: 'MISSING_STRIPE_SECRET_KEY',
        diagnostics 
      });
    }
    
    // Try to initialize Stripe
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    
    // Try to make a simple API call to validate the key
    try {
      const accounts = await stripe.accounts.list({ limit: 1 });
      return res.status(200).json({ 
        success: true,
        message: 'Stripe key is valid and working',
        diagnostics,
        accountsFound: accounts.data.length
      });
    } catch (stripeError) {
      return res.status(500).json({ 
        error: 'STRIPE_API_ERROR',
        message: stripeError.message,
        diagnostics
      });
    }
    
  } catch (error) {
    return res.status(500).json({ 
      error: 'GENERAL_ERROR',
      message: error.message
    });
  }
}
