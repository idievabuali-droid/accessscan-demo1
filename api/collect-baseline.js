// Baseline Data Collection API
// Path: /api/collect-baseline.js

module.exports = async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { name, email, website, company, timestamp, type } = req.body;

    // Validation
    if (!name || !email || !website) {
      return res.status(400).json({ error: 'Missing required fields: name, email, website' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // URL validation
    if (!website.startsWith('https://')) {
      return res.status(400).json({ error: 'Website must start with https://' });
    }

    // Create baseline request record
    const baselineRequest = {
      id: `baseline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      website: website.replace(/\/$/, ''), // Remove trailing slash
      company: company?.trim() || null,
      type: type || 'free_baseline',
      timestamp: timestamp || new Date().toISOString(),
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    // TODO: Store in your database (replace console.log)
    // Example: await database.baselineRequests.create(baselineRequest);
    console.log('📊 New baseline request:', baselineRequest);

    // TODO: Add to queue for processing
    // Example: await queueService.addBaseline(baselineRequest);

    // TODO: Send confirmation email
    // Example: await emailService.sendBaselineConfirmation(baselineRequest);

    // For now, simulate success
    return res.status(200).json({
      success: true,
      message: 'Baseline scan queued successfully',
      requestId: baselineRequest.id,
      queuePosition: Math.floor(Math.random() * 5) + 1, // Simulated queue position
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
    });

  } catch (error) {
    console.error('Baseline collection error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
