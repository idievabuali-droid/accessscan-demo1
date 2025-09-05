// Stripe Connectivity Diagnostic Endpoint
// Based on Stripe Integration Troubleshooting Guide

module.exports = async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const diagnostic = {
      timestamp: new Date().toISOString(),
      stripe: {}
    };

    // Check environment variables first
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const testKey = process.env.testkey;

    if (!stripeKey && !testKey) {
      diagnostic.stripe.error = 'NO_STRIPE_KEYS_FOUND';
      diagnostic.stripe.available_keys = {
        STRIPE_SECRET_KEY: false,
        testkey: false
      };
      return res.status(200).json(diagnostic);
    }

    // Try to import Stripe
    try {
      const Stripe = require('stripe');
      diagnostic.stripe.stripe_module_loaded = true;

      // Test with main key
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
          const accounts = await stripe.accounts.list({ limit: 1 });
          diagnostic.stripe.main_key = {
            valid: true,
            key_type: stripeKey.startsWith('sk_test_') ? 'test' : 'live',
            api_connectivity: 'success'
          };
        } catch (stripeError) {
          diagnostic.stripe.main_key = {
            valid: false,
            error: stripeError.message,
            key_type: stripeKey.startsWith('sk_test_') ? 'test' : 'live'
          };
        }
      }

      // Test with testkey
      if (testKey) {
        try {
          const stripe = new Stripe(testKey, { apiVersion: '2024-06-20' });
          const accounts = await stripe.accounts.list({ limit: 1 });
          diagnostic.stripe.test_key = {
            valid: true,
            key_type: testKey.startsWith('sk_test_') ? 'test' : 'live',
            api_connectivity: 'success'
          };
        } catch (stripeError) {
          diagnostic.stripe.test_key = {
            valid: false,
            error: stripeError.message,
            key_type: testKey.startsWith('sk_test_') ? 'test' : 'live'
          };
        }
      }

    } catch (moduleError) {
      diagnostic.stripe.stripe_module_loaded = false;
      diagnostic.stripe.module_error = moduleError.message;
    }

    return res.status(200).json(diagnostic);

  } catch (err) {
    console.error('diagnostic-stripe error:', err);
    return res.status(500).json({ 
      error: 'DIAGNOSTIC_FAILED', 
      message: err?.message || 'unknown error' 
    });
  }
};
