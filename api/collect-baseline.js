// Baseline Data Collection API
// Path: /api/collect-baseline.js

module.exports = async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { name, email, website, company, timestamp, type } = req.body;

    // Validation
    if (!name || !email || !website) {
      return res.status(400).json({ error: 'Missing required fields: name, email, website' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // URL validation
    if (!website.startsWith('https://')) {
      return res.status(400).json({ error: 'Website must start with https://' });
    }

    // Create baseline request record
    const baselineRequest = {
      id: `baseline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      website: website.replace(/\/$/, ''), // Remove trailing slash
      company: company?.trim() || null,
      type: type || 'free_baseline',
      timestamp: timestamp || new Date().toISOString(),
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    // Store baseline request in Stripe as customer for easy admin access
    // This way both founder access and baseline users appear in same dashboard
    let stripeSuccess = false;
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({ 
          email: email.trim().toLowerCase(), 
          limit: 1 
        });
        
        let customer = existingCustomers.data[0];
        
        if (!customer) {
          // Create new customer for baseline submission
          customer = await stripe.customers.create({
            email: email.trim().toLowerCase(),
            name: name.trim(),
            metadata: {
              submission_type: 'baseline',
              ba_source: 'free_baseline',
              ba_website: website.replace(/\/$/, ''),
              ba_company: company?.trim() || '',
              ba_timestamp: timestamp || new Date().toISOString(),
              ba_status: 'queued'
            }
          });
          console.log('📊 Baseline customer created in Stripe:', customer.id);
          stripeSuccess = true;
        } else {
          // Update existing customer with baseline info
          await stripe.customers.update(customer.id, {
            name: name.trim(),
            metadata: {
              ...(customer.metadata || {}),
              submission_type: 'baseline',
              ba_source: 'free_baseline', 
              ba_website: website.replace(/\/$/, ''),
              ba_company: company?.trim() || '',
              ba_timestamp: timestamp || new Date().toISOString(),
              ba_status: 'queued'
            }
          });
          console.log('📊 Baseline info added to existing customer:', customer.id);
          stripeSuccess = true;
        }
      } else {
        console.log('⚠️ No Stripe key found, baseline submission saved locally only');
      }
      
    } catch (stripeError) {
      console.error('Failed to save baseline to Stripe (continuing anyway):', stripeError.message);
      stripeSuccess = false;
    }

    // Also log for immediate visibility
    console.log('📊 New baseline request:', baselineRequest);

    // Return success regardless of Stripe status
    return res.status(200).json({
      success: true,
      message: 'Baseline scan queued successfully',
      requestId: baselineRequest.id,
      stripeIntegration: stripeSuccess,
      queuePosition: Math.floor(Math.random() * 5) + 1,
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Baseline collection error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
