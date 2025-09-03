// Simple health check endpoint
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API is working',
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasAdminToken: !!process.env.ADMIN_TOKEN,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  });
};
