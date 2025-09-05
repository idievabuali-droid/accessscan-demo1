// Paid Plan Checkout Session API - Setup Mode (Save Card, No Immediate Charge)
import Stripe from 'stripe';

export default async function handler(req, res) {
  console.log('=== PAID PLAN CHECKOUT API CALLED ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    // Initialize Stripe with proper error handling
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    if (!stripeKey) {
      console.log('ERROR: Missing Stripe key');
      return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    
    const { plan, mode = 'setup', customer_email, customer_name, website } = req.body;
    console.log('Extracted data:', { plan, mode, customer_email, customer_name, website });

    if (!plan) {
      console.log('ERROR: Missing plan');
      return res.status(400).json({ error: 'Missing required field: plan' });
    }

    // Compute origin for success/cancel URLs (works on Vercel)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;
    console.log('Origin:', origin);

    // For paid plans, we use setup mode (save card, no immediate charge)
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'setup',  // Always setup mode for paid plans
      success_url: `${origin}/#/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/pricing?canceled=1`,
      customer_creation: 'always',
      customer_email: customer_email || undefined,
      metadata: {
        plan: plan,
        source: 'clearpath_website',
        website: website || '',
        customer_name: customer_name || ''
      },
      setup_intent_data: {
        metadata: {
          plan: plan,
          source: 'clearpath_website',
          website: website || '',
          customer_name: customer_name || ''
        }
      }
    };
    
    console.log('Session config:', JSON.stringify(sessionConfig, null, 2));

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('Session created successfully:', session.id);

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session', details: error.message });
  }
}
// Force update
