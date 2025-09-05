import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    // Initialize Stripe with proper error handling
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    if (!stripeKey) {
      return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    
    const { plan, price_id, mode = 'setup', customer_email, customer_name, website } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Missing required field: plan' });
    }

    // Compute origin for success/cancel URLs (works on Vercel)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    // Create checkout session configuration based on mode
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: mode,
      success_url: `${origin}/#/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/pricing?canceled=1`,
      metadata: {
        plan: plan,
        source: 'clearpath_website',
        website: website || '',
        customer_name: customer_name || ''
      }
    };

    // For setup mode (save card, no immediate charge)
    if (mode === 'setup') {
      sessionConfig.customer_creation = 'always';
      sessionConfig.customer_email = customer_email || undefined;
      
      // Setup intent data to store plan information
      sessionConfig.setup_intent_data = {
        metadata: {
          plan: plan,
          source: 'clearpath_website',
          website: website || '',
          customer_name: customer_name || ''
        }
      };
    } 
    // For subscription mode (immediate billing)
    else if (mode === 'subscription') {
      if (!price_id) {
        return res.status(400).json({ error: 'Missing required field: price_id for subscription mode' });
      }
      
      sessionConfig.line_items = [{
        price: price_id,
        quantity: 1,
      }];
      sessionConfig.customer_creation = 'always';
      sessionConfig.billing_address_collection = 'required';
      sessionConfig.customer_email = customer_email || undefined;
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
