# Stripe Configuration Notes

## Business Name Issue

**Problem:** When using Stripe test keys, you get the error "Only live keys can access this method" when trying to update business information.

**Cause:** Stripe restricts certain business settings changes to live mode only.

**Solutions:**

### Option 1: Accept the Limitation (Recommended for now)
- Keep using test keys for development
- The business name shown in checkout will be "ESSENTIX" or your test account name
- This doesn't affect functionality, only the display name

### Option 2: Use Live Keys (Production Ready)
- Switch to live Stripe keys in environment variables
- Update business information in Stripe Dashboard → Settings → Public business information
- **Warning:** Live keys will charge real cards!

### Option 3: Configure Business Info in Test Mode
- In Stripe Dashboard → Test mode → Settings → Business settings
- Add your business information in test mode
- This will show in test checkout sessions

## Current Status
The system works correctly with test keys. The business name issue is cosmetic only and doesn't break functionality.
