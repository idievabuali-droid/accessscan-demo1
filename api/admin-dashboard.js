// Admin Dashboard API - Customer Data Overview
// Path: /api/admin-dashboard.js
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

module.exports = async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Security check - require admin token
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_TOKEN || 'demo-admin-123';
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Check if Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe key not configured' });
    }

    // Get all customers from Stripe
    const customers = await stripe.customers.list({ 
      limit: 100,
      expand: ['data.sources', 'data.subscriptions']
    });

    // Get setup sessions (card saving attempts)
    const setupSessions = await stripe.checkout.sessions.list({
      limit: 100,
      mode: 'setup'
    });

    // Categorize customers
    const customerData = [];
    
    for (const customer of customers.data) {
      // Get customer's payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer.id,
        type: 'card'
      });

      // Check if they completed card setup
      const hasCard = paymentMethods.data.length > 0;
      
      // Find their setup session
      const setupSession = setupSessions.data.find(s => s.customer === customer.id);
      
      // Extract metadata
      const metadata = customer.metadata || {};
      const isFounderAccess = metadata.fa_source === 'founder_access';
      const website = metadata.fa_website || '';
      
      customerData.push({
        id: customer.id,
        name: customer.name || 'Unknown',
        email: customer.email,
        created: new Date(customer.created * 1000).toISOString(),
        
        // Card status
        hasCard,
        cardDetails: hasCard ? {
          brand: paymentMethods.data[0].card.brand,
          last4: paymentMethods.data[0].card.last4,
          expMonth: paymentMethods.data[0].card.exp_month,
          expYear: paymentMethods.data[0].card.exp_year
        } : null,
        
        // Access type
        accessType: isFounderAccess ? 'founder_access' : 'unknown',
        website,
        
        // Setup session status
        setupSession: setupSession ? {
          id: setupSession.id,
          status: setupSession.status,
          url: setupSession.url
        } : null,
        
        metadata
      });
    }

    // Summary statistics
    const stats = {
      total: customerData.length,
      withCards: customerData.filter(c => c.hasCard).length,
      withoutCards: customerData.filter(c => !c.hasCard).length,
      founderAccess: customerData.filter(c => c.accessType === 'founder_access').length,
      founderWithCards: customerData.filter(c => c.accessType === 'founder_access' && c.hasCard).length,
      founderWithoutCards: customerData.filter(c => c.accessType === 'founder_access' && !c.hasCard).length
    };

    return res.status(200).json({
      success: true,
      stats,
      customers: customerData,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
