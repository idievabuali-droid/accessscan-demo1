// Test API to verify paid plan flow without Stripe
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Test checkout API called');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  const { plan, customer_email, customer_name, website } = req.body;
  
  if (!plan) {
    return res.status(400).json({ error: 'Missing plan' });
  }

  // Simulate successful response
  return res.status(200).json({ 
    url: 'https://checkout.stripe.com/test-session-url',
    message: 'Test mode - would redirect to Stripe',
    plan,
    customer_email,
    customer_name,
    website
  });
}
