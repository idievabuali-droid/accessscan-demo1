# Stripe Integration Troubleshooting Guide
## Complete Step-by-Step Analysis and Solutions

### Project Overview
**Project**: AccessScan Demo - Vercel deployment with Stripe payment integration  
**Goal**: Deploy to Vercel and integrate Stripe for "Founder Access" reservations  
**Date**: September 2, 2025  
**Final Result**: ✅ Fully functional Stripe integration

---

## 🚨 Problems We Encountered & Solutions

### Problem 1: Environment Variable Configuration
**Error**: `MISSING_STRIPE_SECRET_KEY`

#### What was wrong:
- The `.env.local` file contained a test Stripe key instead of the live key
- Environment variables weren't properly configured in Vercel dashboard
- The vercel.json file didn't include environment variable configuration

#### Root Cause:
```bash
# Wrong key in .env.local
STRIPE_SECRET_KEY=sk_test_51RpQzzH2b4Q8NuCbVV2OmflTH5FAdpWlSK2MdXcxBdsvvIkqwA5EBme0WlbY2e5Fo9aLcdrzNlzhLoUIhKjUcCHa00iBOZ3Fi0
```

#### How we fixed it:
1. **Updated .env.local with live key**:
   ```bash
   STRIPE_SECRET_KEY=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
   ```

2. **Added environment variable to vercel.json**:
   ```json
   {
     "version": 2,
     "env": {
       "STRIPE_SECRET_KEY": "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"
     }
   }
   ```

3. **Redeployed** to ensure environment variables took effect

---

### Problem 2: Deployment Protection Settings
**Error**: All deployment URLs redirected to Vercel login page

#### What was wrong:
- Vercel deployment had "Protection" enabled
- This made the site private and required authentication
- Users couldn't access the site without Vercel account credentials

#### How we fixed it:
1. Went to Vercel Dashboard → Project Settings → Deployment Protection
2. **Disabled protection** to make the site publicly accessible
3. Confirmed site was accessible without authentication

---

### Problem 3: Live Server vs Vercel API Routes
**Error**: API calls worked locally but failed on live deployment

#### What was wrong:
- Local development used Live Server extension
- Live Server can't execute Vercel serverless functions
- API routes only work on Vercel deployment, not local file serving

#### How we identified it:
```javascript
// This error occurred when testing locally
fetch('/api/create-setup-session') // 404 on Live Server
```

#### Solution:
- **Always test on actual Vercel deployment** for API functionality
- Use `vercel dev` for local development with API routes
- Don't rely on Live Server for testing serverless functions

---

### Problem 4: Stripe Terms of Service Configuration
**Error**: `You cannot collect consent to your terms of service unless a URL is set in the Stripe Dashboard`

#### What was wrong:
The Stripe checkout session included this requirement:
```javascript
consent_collection: { terms_of_service: 'required' }
```

But the Stripe account didn't have a Terms of Service URL configured in the dashboard.

#### Root Cause:
When using `consent_collection: { terms_of_service: 'required' }`, Stripe requires:
- A Terms of Service URL to be set in Dashboard → Settings → Public business details
- This URL must be publicly accessible

#### How we fixed it:
**Option 1** (What we chose): Remove the requirement
```javascript
// Removed this line from api/create-setup-session.js
// consent_collection: { terms_of_service: 'required' },
```

**Option 2** (Alternative): Configure in Stripe Dashboard
1. Go to https://dashboard.stripe.com/settings/public
2. Add Terms of Service URL
3. Keep the consent_collection requirement

---

## 🔍 Diagnostic Process We Used

### Step 1: Environment Variable Verification
We created diagnostic endpoints to test each component:

```javascript
// /api/test-env.js - Check environment variables
export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;
  return res.status(200).json({
    hasStripeKey: !!key,
    keyPrefix: key ? key.substring(0, 7) : 'none'
  });
}
```

### Step 2: Stripe Connection Testing
```javascript
// /api/stripe-test.js - Test Stripe API connectivity
const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
const accounts = await stripe.accounts.list({ limit: 1 });
```

### Step 3: Step-by-Step API Testing
We created a comprehensive test that checked:
1. Environment variable presence
2. Stripe API connectivity
3. Customer creation
4. Checkout session creation

This helped isolate the exact failure point.

---

## 📋 How To Set Up From Zero (Avoiding All Problems)

### Prerequisites
✅ Vercel account  
✅ Stripe account with live API keys  
✅ GitHub repository  

### Step 1: Environment Setup
1. **Create `.env.local` with correct keys**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_LIVE_KEY_HERE
   ```

2. **Configure vercel.json properly**:
   ```json
   {
     "version": 2,
     "env": {
       "STRIPE_SECRET_KEY": "sk_live_YOUR_ACTUAL_LIVE_KEY_HERE"
     }
   }
   ```

### Step 2: Stripe Account Configuration
1. **Set up public business details** (if using terms consent):
   - Go to https://dashboard.stripe.com/settings/public
   - Add business name, website, terms of service URL
   - Add privacy policy URL

2. **Test your API keys**:
   ```bash
   curl https://api.stripe.com/v1/customers \
     -u sk_live_YOUR_KEY: \
     -d email="test@example.com"
   ```

### Step 3: API Implementation Best Practices
```javascript
// api/create-setup-session.js
import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Enhanced error checking
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return res.status(500).json({ 
        error: 'MISSING_STRIPE_SECRET_KEY',
        debug: 'Environment variable not set'
      });
    }
    
    if (!key.startsWith('sk_')) {
      return res.status(500).json({ 
        error: 'INVALID_STRIPE_SECRET_KEY',
        debug: `Key format invalid. Starts with: ${key.substring(0, 3)}`
      });
    }

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    // Validate input
    const { name, email, website } = req.body || {};
    if (!name || !email || !website) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // Create or reuse customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] || await stripe.customers.create({
      email,
      name,
      metadata: { website }
    });

    // Create checkout session
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      payment_method_types: ['card'],
      success_url: `${origin}/#/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/founder-access?canceled=1`,
      metadata: { website, name },
      locale: 'auto'
      // Note: Only add consent_collection if Terms URL is configured in Stripe Dashboard
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('create-setup-session error:', err?.message || err);
    return res.status(500).json({ 
      error: 'STRIPE_CREATE_SESSION_FAILED', 
      message: err?.message || 'unknown' 
    });
  }
}
```

### Step 4: Deployment Process
```bash
# 1. Commit changes
git add .
git commit -m "Add Stripe integration with proper error handling"
git push

# 2. Deploy to Vercel
vercel --prod

# 3. Verify deployment
curl https://your-deployment-url.vercel.app/api/test-env

# 4. Test Stripe integration
curl -X POST https://your-deployment-url.vercel.app/api/create-setup-session \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","website":"https://example.com"}'
```

### Step 5: Deployment Protection Settings
1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to "Deployment Protection"
3. **Disable protection** for public access
4. Or configure proper authentication if needed

---

## 🧪 Testing Checklist

### Before Going Live:
- [ ] Environment variables set correctly in both `.env.local` and `vercel.json`
- [ ] Stripe account configured with business details
- [ ] API endpoints return proper error messages
- [ ] Deployment protection settings configured appropriately
- [ ] Test with actual form submission
- [ ] Verify redirect to Stripe checkout page
- [ ] Test success/cancel URL handling

### Diagnostic Commands:
```bash
# Test environment variable
curl https://your-site.vercel.app/api/test-env

# Test Stripe connectivity
curl -X POST https://your-site.vercel.app/api/stripe-test

# Test full integration
curl -X POST https://your-site.vercel.app/api/create-setup-session \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","website":"https://example.com"}'
```

---

## ⚠️ Common Pitfalls to Avoid

### 1. Environment Variables
- **Don't** put secrets directly in code
- **Don't** forget to redeploy after changing environment variables
- **Do** use different keys for development and production
- **Do** verify environment variables are actually set with diagnostic endpoints

### 2. Stripe Configuration
- **Don't** use test keys in production
- **Don't** enable terms consent without configuring Terms URL in Stripe Dashboard
- **Do** test API keys before deploying
- **Do** handle all possible Stripe errors gracefully

### 3. Deployment Issues
- **Don't** test serverless functions with Live Server
- **Don't** forget to make deployment public if needed
- **Do** use `vercel dev` for local development
- **Do** test on actual deployment URLs

### 4. Error Handling
- **Don't** show generic error messages
- **Do** implement comprehensive error logging
- **Do** provide specific error messages for debugging
- **Do** create diagnostic endpoints for troubleshooting

---

## 📊 Final Architecture

```
User Form Submission
        ↓
Frontend JavaScript (index.html)
        ↓
POST /api/create-setup-session
        ↓
Environment Variable Check
        ↓
Stripe API: Create Customer
        ↓
Stripe API: Create Checkout Session
        ↓
Return Stripe Checkout URL
        ↓
Redirect User to Stripe
        ↓
User Completes Payment Setup
        ↓
Redirect to Success/Cancel URL
```

---

## 🎯 Key Lessons Learned

1. **Environment variables require redeployment** to take effect
2. **Live Server cannot run serverless functions** - use Vercel deployment for testing
3. **Stripe configurations** must match your dashboard settings
4. **Deployment protection** can make sites inaccessible
5. **Comprehensive error handling** is essential for debugging
6. **Diagnostic endpoints** speed up troubleshooting significantly

---

## 📝 Quick Reference Commands

```bash
# Deploy changes
git add . && git commit -m "Update" && git push && vercel --prod

# Check deployment status
vercel ls

# Test environment
curl https://your-site.vercel.app/api/test-env

# View logs
vercel logs

# Local development with API routes
vercel dev
```

---

**Final Status**: ✅ All issues resolved, Stripe integration fully functional

This guide serves as a complete reference for troubleshooting and setting up Stripe integration with Vercel deployments.
