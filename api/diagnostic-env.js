// Environment Variable Diagnostic Endpoint
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

    // Check all environment variables
    const adminToken = process.env.ADMIN_TOKEN;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const testKey = process.env.testkey;

    const diagnostic = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      variables: {
        ADMIN_TOKEN: {
          exists: !!adminToken,
          length: adminToken ? adminToken.length : 0,
          prefix: adminToken ? adminToken.substring(0, 8) + '...' : 'none',
          isDefault: adminToken === 'gc0diffwy133YlVBypxDwusP'
        },
        STRIPE_SECRET_KEY: {
          exists: !!stripeKey,
          length: stripeKey ? stripeKey.length : 0,
          prefix: stripeKey ? stripeKey.substring(0, 7) + '...' : 'none',
          isTest: stripeKey ? stripeKey.startsWith('sk_test_') : false,
          isLive: stripeKey ? stripeKey.startsWith('sk_live_') : false
        },
        testkey: {
          exists: !!testKey,
          length: testKey ? testKey.length : 0,
          prefix: testKey ? testKey.substring(0, 7) + '...' : 'none'
        }
      },
      allEnvVars: Object.keys(process.env).filter(key => 
        key.includes('STRIPE') || 
        key.includes('ADMIN') || 
        key.includes('testkey') ||
        key.includes('TOKEN')
      )
    };

    return res.status(200).json(diagnostic);

  } catch (err) {
    console.error('diagnostic-env error:', err);
    return res.status(500).json({ 
      error: 'DIAGNOSTIC_FAILED', 
      message: err?.message || 'unknown error' 
    });
  }
};
