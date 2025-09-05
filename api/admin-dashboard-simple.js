// Admin Dashboard API - Customer Data Overview (Simplified)
// Path: /api/admin-dashboard-simple.js

module.exports = async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Security check - require admin token
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_TOKEN || 'gc0diffwy133YlVBypxDwusP';
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ error: 'Unauthorized - Token required' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Try to get real Stripe data, fall back to mock if Stripe fails
    let realData;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Get all customers from Stripe
      const customers = await stripe.customers.list({ 
        limit: 100,
        expand: ['data.sources', 'data.subscriptions']
      });

      // Get setup sessions (card saving attempts)
      const setupSessions = await stripe.checkout.sessions.list({
        limit: 100
      });

      // Process real customer data
      const customerData = [];
      
      for (const customer of customers.data) {
        // Get customer's payment methods
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customer.id,
          type: 'card'
        });

        // Check if they completed card setup
        const hasCard = paymentMethods.data.length > 0;
        
        // Find their setup session
        const setupSession = setupSessions.data.find(s => s.customer === customer.id);
        
        // Extract metadata to determine customer type
        const metadata = customer.metadata || {};
        
        // Also check setup session metadata for paid plans
        const setupSessionMetadata = setupSession?.metadata || {};
        
        // Debug logging for paid plan customers
        if (customer.email?.includes('teststarter')) {
          console.log(`Debug for ${customer.email}:`, {
            customerId: customer.id,
            customerMetadata: metadata,
            setupSessionId: setupSession?.id,
            setupSessionMetadata: setupSessionMetadata,
          });
        }
        
        const isFounderAccess = metadata.fa_source === 'founder_access';
        const isBaselineSubmission = metadata.ba_source === 'free_baseline' || metadata.submission_type === 'baseline';
        const isPaidPlan = metadata.source === 'paid_plan_signup' || setupSessionMetadata.source === 'paid_plan_signup';
        
        // Get website from various sources
        const website = metadata.fa_website || metadata.ba_website || metadata.website || setupSessionMetadata.website || '';
        
        // Get plan information for paid plans
        const planName = metadata.plan || setupSessionMetadata.plan || '';
        
        // More debug logging
        if (customer.email?.includes('teststarter')) {
          console.log(`Detection results for ${customer.email}:`, {
            isFounderAccess,
            isBaselineSubmission,
            isPaidPlan,
            planName,
            finalAccessType: isPaidPlan ? `paid_plan_${planName.toLowerCase()}` : (isFounderAccess ? 'founder_access' : (isBaselineSubmission ? 'free_baseline' : 'unknown'))
          });
        }
        
        // Determine access type based on metadata
        let accessType = 'unknown';
        if (isPaidPlan) {
          accessType = `paid_plan_${planName.toLowerCase()}`;
        } else if (isFounderAccess) {
          accessType = 'founder_access';
        } else if (isBaselineSubmission) {
          accessType = 'free_baseline';
        }
        
        customerData.push({
          id: customer.id,
          name: customer.name || 'Unknown',
          email: customer.email,
          created: new Date(customer.created * 1000).toISOString(),
          
          // Card status (founder access and paid plan customers can have cards)
          hasCard: hasCard && (isFounderAccess || isPaidPlan),
          cardDetails: (hasCard && (isFounderAccess || isPaidPlan)) ? {
            brand: paymentMethods.data[0].card.brand,
            last4: paymentMethods.data[0].card.last4,
            expMonth: paymentMethods.data[0].card.exp_month,
            expYear: paymentMethods.data[0].card.exp_year
          } : null,
          
          // Access type
          accessType,
          website,
          
          // Setup session status (for founder access and paid plans)
          setupSession: (setupSession && (isFounderAccess || isPaidPlan)) ? {
            id: setupSession.id,
            status: setupSession.status,
            url: setupSession.url
          } : null,
          
          // Additional metadata for baseline submissions
          company: metadata.ba_company || null,
          submissionStatus: metadata.ba_status || null,
          
          // Plan information for paid plans
          planName: isPaidPlan ? planName : null,
          
          metadata
        });
      }

      // Real statistics (now includes baseline submissions from Stripe)
      const stats = {
        total: customerData.length,
        withCards: customerData.filter(c => c.hasCard).length,
        withoutCards: customerData.filter(c => !c.hasCard).length,
        founderAccess: customerData.filter(c => c.accessType === 'founder_access').length,
        freeBaseline: customerData.filter(c => c.accessType === 'free_baseline').length,
        founderWithCards: customerData.filter(c => c.accessType === 'founder_access' && c.hasCard).length,
        founderWithoutCards: customerData.filter(c => c.accessType === 'founder_access' && !c.hasCard).length,
        
        // Paid plan statistics
        paidPlans: customerData.filter(c => c.accessType.startsWith('paid_plan_')).length,
        starterPlan: customerData.filter(c => c.accessType === 'paid_plan_starter').length,
        proPlan: customerData.filter(c => c.accessType === 'paid_plan_pro').length,
        agencyPlan: customerData.filter(c => c.accessType === 'paid_plan_agency').length,
        paidPlanWithCards: customerData.filter(c => c.accessType.startsWith('paid_plan_') && c.hasCard).length,
        paidPlanWithoutCards: customerData.filter(c => c.accessType.startsWith('paid_plan_') && !c.hasCard).length
      };

      realData = {
        success: true,
        note: 'Real Stripe data',
        dataSource: 'stripe_live',
        stats,
        customers: customerData,
        lastUpdated: new Date().toISOString(),
        environment: {
          hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
          hasAdminToken: !!process.env.ADMIN_TOKEN,
          nodeVersion: process.version
        }
      };

    } catch (stripeError) {
      console.log('Stripe error, falling back to mock data:', stripeError.message);
      
      // Fallback to mock data if Stripe fails
      realData = {
        success: true,
        note: 'Mock data - Stripe connection failed: ' + stripeError.message,
        dataSource: 'mock_fallback',
        stats: {
          total: 8,
          withCards: 3,
          withoutCards: 5,
          founderAccess: 3,
          freeBaseline: 5,
          founderWithCards: 2,
          founderWithoutCards: 1
        },
        customers: [
          {
            id: 'cus_mock1',
            name: 'John Doe',
            email: 'john@example.com',
            created: '2025-09-02T10:30:00Z',
            hasCard: true,
            cardDetails: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2025
            },
            accessType: 'founder_access',
            website: 'https://example.com'
          },
          {
            id: 'cus_mock2',
            name: 'Jane Smith',
            email: 'jane@test.com',
            created: '2025-09-02T11:15:00Z',
            hasCard: false,
            cardDetails: null,
            accessType: 'founder_access',
            website: 'https://test.com'
          },
          {
            id: 'baseline_1',
            name: 'Mike Wilson',
            email: 'mike@company.com',
            created: '2025-09-03T09:20:00Z',
            hasCard: false,
            cardDetails: null,
            accessType: 'free_baseline',
            website: 'https://company.com'
          }
        ],
        lastUpdated: new Date().toISOString(),
        environment: {
          hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
          hasAdminToken: !!process.env.ADMIN_TOKEN,
          nodeVersion: process.version
        }
      };
    }

    return res.status(200).json(realData);

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
