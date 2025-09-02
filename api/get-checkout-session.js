// /api/get-checkout-session.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export default async function handler(req, res) {
  const { session_id } = req.query || {};
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['setup_intent.payment_method', 'customer']
    });

    const si = session.setup_intent;
    const pm = si?.payment_method;
    const card = pm?.card;

    return res.status(200).json({
      status: si?.status || 'unknown',
      customer_email: session.customer_details?.email || session.customer?.email || null,
      payment_method: card ? {
        brand: card.brand,
        last4: card.last4,
        exp_month: card.exp_month,
        exp_year: card.exp_year
      } : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'stripe_error', message: err.message });
  }
}
