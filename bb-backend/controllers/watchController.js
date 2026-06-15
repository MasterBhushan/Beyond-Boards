const watchService = require('../services/watchService');
const sessionService = require('../services/sessionService');

async function saveWatchEvent(req, res) {
  try {
    const { session_id, career_id, seconds_watched, is_saved, opened_youtube, viewed_roadmap } = req.body;

    if (!session_id || !career_id) {
      return res.status(400).json({ success: false, message: 'session_id and career_id are required' });
    }

    await watchService.upsertWatchEvent(session_id, career_id, {
      seconds_watched, is_saved, opened_youtube, viewed_roadmap
    });

    // Keep session alive
    await sessionService.touchSession(session_id);

    res.json({ success: true });
  } catch (err) {
    console.error('Watch event error:', err);
    res.status(500).json({ success: false, message: 'Failed to save watch event' });
  }
}

async function getWatchEvents(req, res) {
  try {
    const { session_id } = req.params;
    const data = await watchService.getWatchEventsForSession(session_id);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Watch fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch watch events' });
  }
}

module.exports = { saveWatchEvent, getWatchEvents };
