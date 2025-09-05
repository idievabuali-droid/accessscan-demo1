// Simple health check endpoint
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API is working perfectly',
    environment: {
      hasStripeKey: !!(process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey),
      hasAdminToken: !!process.env.ADMIN_TOKEN,
      nodeEnv: process.env.NODE_ENV || 'development'
    },
    debug: {
      adminTokenLength: process.env.ADMIN_TOKEN ? process.env.ADMIN_TOKEN.length : 0,
      adminTokenPrefix: process.env.ADMIN_TOKEN ? process.env.ADMIN_TOKEN.substring(0, 8) + '...' : 'none',
      expectedToken: 'VCYYZEHEGQUMXUZJXWMUCOGWDDTHNKHA',
      tokensMatch: process.env.ADMIN_TOKEN === 'VCYYZEHEGQUMXUZJXWMUCOGWDDTHNKHA',
      authHeader: req.headers.authorization || 'none',
      authHeaderMatch: req.headers.authorization === `Bearer ${process.env.ADMIN_TOKEN || 'VCYYZEHEGQUMXUZJXWMUCOGWDDTHNKHA'}`,
      expectedAuthHeader: `Bearer ${process.env.ADMIN_TOKEN || 'VCYYZEHEGQUMXUZJXWMUCOGWDDTHNKHA'}`
    }
  });
};
