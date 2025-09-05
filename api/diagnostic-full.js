// Complete System Diagnostic Endpoint
// Tests all major functionality and dependencies

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
      overall_status: 'testing',
      tests: {}
    };

    // Test 1: Environment Variables
    const adminToken = process.env.ADMIN_TOKEN;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    diagnostic.tests.environment = {
      admin_token_exists: !!adminToken,
      admin_token_correct: adminToken === 'gc0diffwy133YlVBypxDwusP',
      stripe_key_exists: !!stripeKey,
      stripe_key_format: stripeKey ? (stripeKey.startsWith('sk_') ? 'valid' : 'invalid') : 'missing'
    };

    // Test 2: Admin Authentication
    try {
      // Simulate admin auth check
      if (adminToken === 'gc0diffwy133YlVBypxDwusP') {
        diagnostic.tests.admin_auth = {
          status: 'success',
          token_match: true
        };
      } else {
        diagnostic.tests.admin_auth = {
          status: 'failed',
          token_match: false,
          expected: 'gc0diffwy133YlVBypxDwusP',
          actual: adminToken ? 'exists_but_wrong' : 'missing'
        };
      }
    } catch (authError) {
      diagnostic.tests.admin_auth = {
        status: 'error',
        error: authError.message
      };
    }

    // Test 3: Stripe Connectivity (if available)
    if (stripeKey) {
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
        
        // Simple API test
        const testCustomer = await stripe.customers.list({ limit: 1 });
        diagnostic.tests.stripe = {
          status: 'success',
          module_loaded: true,
          api_reachable: true,
          key_valid: true
        };
      } catch (stripeError) {
        diagnostic.tests.stripe = {
          status: 'failed',
          error: stripeError.message,
          code: stripeError.code || 'unknown'
        };
      }
    } else {
      diagnostic.tests.stripe = {
        status: 'skipped',
        reason: 'no_stripe_key'
      };
    }

    // Test 4: API Dependencies
    diagnostic.tests.dependencies = {
      nodejs_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Determine overall status
    const hasErrors = Object.values(diagnostic.tests).some(test => 
      test.status === 'failed' || test.status === 'error'
    );
    diagnostic.overall_status = hasErrors ? 'issues_detected' : 'healthy';

    return res.status(200).json(diagnostic);

  } catch (err) {
    console.error('diagnostic-full error:', err);
    return res.status(500).json({ 
      error: 'DIAGNOSTIC_FAILED', 
      message: err?.message || 'unknown error',
      stack: err?.stack || 'no stack trace'
    });
  }
};
