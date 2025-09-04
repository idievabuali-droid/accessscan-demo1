import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Stripe with proper error handling
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    if (!stripeKey) {
      return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    
    const { plan, price_id, mode = 'subscription' } = req.body;

    if (!plan || !price_id) {
      return res.status(400).json({ error: 'Missing required fields: plan and price_id' });
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: mode,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing?canceled=1`,
      metadata: {
        plan: plan,
        source: 'clearpath_website'
      },
      // For subscriptions, collect customer information
      ...(mode === 'subscription' && {
        customer_creation: 'always',
        billing_address_collection: 'required',
      }),
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
