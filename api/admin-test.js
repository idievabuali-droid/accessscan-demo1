// Simple Admin Test API - No Stripe dependency
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
    const adminToken = process.env.ADMIN_TOKEN || 'gc0diffwy133YlVBypxDwusP';
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ error: 'Unauthorized - Token required' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Return mock data for testing
    const mockData = {
      success: true,
      stats: {
        total: 5,
        withCards: 2,
        withoutCards: 3,
        founderAccess: 2,
        founderWithCards: 1,
        founderWithoutCards: 1
      },
      customers: [
        {
          id: 'cus_test1',
          name: 'John Doe',
          email: 'john@example.com',
          created: new Date().toISOString(),
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
          id: 'cus_test2',
          name: 'Jane Smith',
          email: 'jane@test.com',
          created: new Date().toISOString(),
          hasCard: false,
          cardDetails: null,
          accessType: 'founder_access',
          website: 'https://test.com'
        }
      ],
      lastUpdated: new Date().toISOString(),
      note: 'This is test data - Stripe integration will provide real customer data'
    };

    return res.status(200).json(mockData);

  } catch (error) {
    console.error('Admin test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
