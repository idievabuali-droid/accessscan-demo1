// /api/create-setup-session.js
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !key.startsWith('sk_')) {
      return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });
    }
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    const { name, email, website } = req.body || {};
    if (!name || !email || !website) return res.status(400).json({ error: 'MISSING_FIELDS' });

    // Reuse customer by email for repeat attempts
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] || await stripe.customers.create({
      email,
      name,
      metadata: { website }
    });

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],
      // NOTE: hash-router keeps query out of route state, but stays in location.hash
      success_url: `${origin}/#/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/founder-access?canceled=1`,
      // Keep useful context
      metadata: { website, name },
      consent_collection: { terms_of_service: 'required' },
      locale: 'auto'
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-setup-session error:', err?.message || err);
    return res.status(500).json({ error: 'STRIPE_CREATE_SESSION_FAILED', message: err?.message || 'unknown' });
  }
}
