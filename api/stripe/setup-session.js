// Vercel Serverless Function
// Path: /api/stripe/setup-session.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: read { plan } from body — we only allow 'founder' here
    const { plan } = req.body || {};
    if (plan !== 'founder') {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create a Checkout Session in SETUP mode (saves card, no charge)
    // currency is required with dynamic payment methods in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'gbp',
      payment_method_types: ['card'],
      // Create a Customer automatically so the PM is attached
      customer_creation: 'always',
      // Clear copy for honesty (optional but recommended)
      consent_collection: { terms_of_service: 'none' },
      // Success -> we'll read ?sid=… and confirm server-side
      success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/start-baseline/queued?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/start-baseline?plan=founder#payment`,
      metadata: { flow: 'founder-reservation' },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe setup-session error', err);
    return res.status(500).json({ error: 'Unable to create session' });
  }
}
