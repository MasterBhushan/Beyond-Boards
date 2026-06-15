const sessionService = require('../services/sessionService');

async function createSession(req, res) {
  try {
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ success: false, message: 'device_id is required' });

    const sessionId = await sessionService.getOrCreateSession(device_id);
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
}

module.exports = { createSession };
