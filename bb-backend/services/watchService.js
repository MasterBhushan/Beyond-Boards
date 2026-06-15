const db = require('../database/db');

async function upsertWatchEvent(sessionId, careerId, payload) {
  const { seconds_watched, is_saved, opened_youtube, viewed_roadmap } = payload;

  const { data, error } = await db
    .from('watch_events')
    .upsert({
      session_id:      sessionId,
      career_id:       careerId,
      seconds_watched: seconds_watched ?? 0,
      is_saved:        is_saved        ?? false,
      opened_youtube:  opened_youtube  ?? false,
      viewed_roadmap:  viewed_roadmap  ?? false,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'session_id,career_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getWatchEventsForSession(sessionId) {
  const { data, error } = await db
    .from('watch_events')
    .select('career_id, seconds_watched, is_saved, opened_youtube, viewed_roadmap')
    .eq('session_id', sessionId);

  if (error) throw error;

  // Return as object keyed by career_id — easy for app to consume
  const result = {};
  data.forEach(e => {
    result[e.career_id] = {
      seconds:       e.seconds_watched,
      saved:         e.is_saved,
      openedYoutube: e.opened_youtube,
      viewedRoadmap: e.viewed_roadmap,
    };
  });
  return result;
}

module.exports = { upsertWatchEvent, getWatchEventsForSession };
