export default function handler(req, res) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  res.status(200).json({ 
    hasStripeKey: !!stripeKey,
    keyPrefix: stripeKey ? stripeKey.substring(0, 7) + '...' : 'MISSING',
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('STRIPE'))
  });
}
