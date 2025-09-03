// Admin Dashboard API - Customer Data Overview (Simplified)
// Path: /api/admin-dashboard.js

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
      return res.status(401).json({ error: 'Unauthorized - Token required' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // For now, return simulated data until Stripe integration is working
    // TODO: Add real Stripe integration after basic API is confirmed working
    const mockData = {
      success: true,
      note: 'Mock data - Stripe integration will be added once API is confirmed working',
      stats: {
        total: 8,
        withCards: 3,
        withoutCards: 5,
        founderAccess: 3,
        founderWithCards: 2,
        founderWithoutCards: 1
      },
      customers: [
        {
          id: 'cus_mock1',
          name: 'John Doe',
          email: 'john@example.com',
          created: '2025-09-02T10:30:00Z',
          hasCard: true,
          cardDetails: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2025
          },
          accessType: 'founder_access',
          website: 'https://example.com'
        },
        {
          id: 'cus_mock2',
          name: 'Jane Smith',
          email: 'jane@test.com',
          created: '2025-09-02T11:15:00Z',
          hasCard: false,
          cardDetails: null,
          accessType: 'founder_access',
          website: 'https://test.com'
        },
        {
          id: 'baseline_1',
          name: 'Mike Wilson',
          email: 'mike@company.com',
          created: '2025-09-03T09:20:00Z',
          hasCard: false,
          cardDetails: null,
          accessType: 'free_baseline',
          website: 'https://company.com'
        }
      ],
      lastUpdated: new Date().toISOString(),
      environment: {
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasAdminToken: !!process.env.ADMIN_TOKEN,
        nodeVersion: process.version
      }
    };

    return res.status(200).json(mockData);

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
