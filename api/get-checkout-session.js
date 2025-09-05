// /api/get-checkout-session.js
// Returns summary for the success page and surfaces the website URL
// from Session/SetupIntent/Customer metadata.

import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const key = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    if (!key) return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    const { session_id } = req.query || {};
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['setup_intent.payment_method', 'customer']
    });

    const si = session.setup_intent;
    const pm = si?.payment_method;
    const card = pm?.card;

    // Update customer metadata for paid plans
    if (session.customer && session.metadata && session.metadata.source === 'paid_plan_signup') {
      try {
        await stripe.customers.update(session.customer.id, {
          metadata: {
            source: 'paid_plan_signup',
            plan: session.metadata.plan || '',
            website: session.metadata.website || '',
            customer_name: session.metadata.customer_name || ''
          }
        });
        console.log(`Updated customer ${session.customer.id} with paid plan metadata`);
      } catch (updateError) {
        console.error('Failed to update customer metadata:', updateError);
        // Continue anyway, don't fail the request
      }
    }

    // Pull website from the most reliable source available
    const website =
      session?.metadata?.fa_website ||
      session?.metadata?.website ||
      session?.client_reference_id ||
      si?.metadata?.fa_website ||
      (session?.customer && session.customer.metadata?.fa_website) ||
      (session?.customer && session.customer.metadata?.website) ||
      null;

    return res.status(200).json({
      status: si?.status || 'unknown',
      customer_email:
        session.customer_details?.email ||
        session.customer?.email ||
        null,
      website, // <— expose it to the UI
      plan: session?.metadata?.plan || null, // Add plan information
      payment_method: card
        ? {
            brand: card.brand,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year
          }
        : null
    });
  } catch (err) {
    console.error('get-checkout-session error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
