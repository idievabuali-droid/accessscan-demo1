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

    // Create or get customer first to set metadata
    let customer;
    if (customer_email) {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        // Update existing customer with new metadata
        customer = await stripe.customers.update(customer.id, {
          metadata: {
            plan: plan,
            source: 'paid_plan_signup',
            website: website || '',
            customer_name: customer_name || ''
          }
        });
      } else {
        // Create new customer with metadata
        customer = await stripe.customers.create({
          email: customer_email,
          name: customer_name || undefined,
          metadata: {
            plan: plan,
            source: 'paid_plan_signup',
            website: website || '',
            customer_name: customer_name || ''
          }
        });
      }
    }

    // Create setup session (save card, no charge)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer: customer ? customer.id : undefined,
      customer_creation: customer ? undefined : 'always',
      customer_email: customer ? undefined : (customer_email || undefined),
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
