// /api/create-setup-session.js
// Vercel Serverless Function (Node.js)
// Creates a Stripe Checkout Session in "setup" mode and
// saves Website URL on the Customer + Session + SetupIntent metadata.

import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    const { name = '', email = '', website = '' } = (req.body || {});
    if (!name || !email || !website) return res.status(400).json({ error: 'Missing required fields' });

    // Find or create customer
    const found = await stripe.customers.list({ email, limit: 1 });
    let customer = found.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          fa_source: 'founder_access',
          fa_website: website || ''
        }
      });
    } else {
      // Always update metadata so the latest URL is saved even for existing emails
      await stripe.customers.update(customer.id, {
        name: name || customer.name || undefined,
        metadata: {
          ...(customer.metadata || {}),
          fa_source: 'founder_access',
          fa_website: website || ''
        }
      });
    }

    // Compute origin for success/cancel URLs (works on Vercel)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],

      // Hash-router success route in your SPA
      success_url: `${origin}/#/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/founder-access?canceled=1`,

      // Helpful in Stripe Dashboard search
      client_reference_id: website || '',

      // Visible on the Checkout Session object
      metadata: {
        fa_source: 'founder_access',
        fa_website: website || '',
        name: name || ''
      },

      // Persists onto the SetupIntent that actually stores the card
      setup_intent_data: {
        metadata: {
          fa_source: 'founder_access',
          fa_website: website || '',
          name: name || ''
        }
      },

      locale: 'auto'
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-setup-session error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
