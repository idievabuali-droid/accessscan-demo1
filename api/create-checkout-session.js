// Simple Stripe Setup Session for Paid Plans (Save Card, No Charge)
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    
    const { plan, customer_email, customer_name, website } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    // Get the domain for success/cancel URLs
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    // Create setup session (save card, no charge)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer_creation: 'always',
      customer_email: customer_email || undefined,
      success_url: `${origin}/#/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/pricing?canceled=1`,
      metadata: {
        plan: plan,
        source: 'paid_plan_signup',
        website: website || '',
        customer_name: customer_name || ''
      },
      setup_intent_data: {
        metadata: {
          plan: plan,
          source: 'paid_plan_signup',
          website: website || '',
          customer_name: customer_name || ''
        }
      }
    });

    return res.status(200).json({ url: session.url });
    
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    });
  }
}
