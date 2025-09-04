// /api/request-rescan.js
// Accepts { website, email, context, reportUrl } and records intent in Stripe customer metadata.
import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { website = '', email = '', context = 'unknown', reportUrl = '' } = req.body || {};
    if (!website || !email) return res.status(400).json({ error: 'website_and_email_required' });

    const key = process.env.STRIPE_SECRET_KEY || process.env.stripe_testkey;
    const stripe = key ? new Stripe(key, { apiVersion: '2024-06-20' }) : null;

    let noteSaved = false;
    if (stripe) {
      // Try to find customer by email; create if missing
      const search = await stripe.customers.list({ email, limit: 1 });
      let customer = search.data?.[0];
      if (!customer) {
        customer = await stripe.customers.create({
          email,
          name: email.split('@')[0],
          metadata: {}
        });
      }
      const ts = new Date().toISOString();
      await stripe.customers.update(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          rescan_requested: '1',
          rescan_website: website.replace(/\/$/, ''),
          rescan_context: context,
          rescan_report_url: reportUrl || '',
          rescan_ts: ts
        }
      });
      noteSaved = true;
    }

    return res.status(200).json({
      ok: true,
      queued: true,
      via: noteSaved ? 'stripe_customer_metadata' : 'local',
      website,
      email
    });
  } catch (err) {
    console.error('request-rescan error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
