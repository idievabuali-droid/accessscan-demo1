// Test the exact same flow as create-setup-session but with detailed error logging
import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    console.log('=== TEST ENDPOINT START ===');
    console.log('Method:', req.method);
    console.log('Body:', req.body);

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const key = process.env.STRIPE_SECRET_KEY;
    console.log('Stripe key exists:', !!key);
    if (!key) return res.status(500).json({ error: 'MISSING_STRIPE_SECRET_KEY' });

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    console.log('Stripe initialized');

    const { name = '', email = '', website = '' } = (req.body || {});
    console.log('Parsed fields:', { name, email, website });
    if (!name || !email || !website) return res.status(400).json({ error: 'Missing required fields' });

    // Find or create customer
    console.log('Finding customer...');
    const found = await stripe.customers.list({ email, limit: 1 });
    console.log('Customer search result:', found.data.length);
    let customer = found.data[0];

    if (!customer) {
      console.log('Creating new customer...');
      customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          fa_source: 'founder_access',
          fa_website: website || ''
        }
      });
      console.log('Customer created:', customer.id);
    } else {
      console.log('Updating existing customer...');
      await stripe.customers.update(customer.id, {
        name: name || customer.name || undefined,
        metadata: {
          ...(customer.metadata || {}),
          fa_source: 'founder_access',
          fa_website: website || ''
        }
      });
      console.log('Customer updated:', customer.id);
    }

    // Compute origin for success/cancel URLs (works on Vercel)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;
    console.log('Origin:', origin);

    console.log('Creating checkout session...');
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

    console.log('Session created:', session.id);
    console.log('=== TEST ENDPOINT SUCCESS ===');
    return res.status(200).json({ url: session.url, debug: 'success' });
  } catch (err) {
    console.error('=== TEST ENDPOINT ERROR ===');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('=== END ERROR ===');
    return res.status(500).json({ 
      error: 'SERVER_ERROR', 
      message: err.message,
      stack: err.stack
    });
  }
}
