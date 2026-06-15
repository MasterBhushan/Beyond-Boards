const db = require('../database/db');

async function getOrCreateSession(deviceId) {
  const { data, error } = await db
    .from('sessions')
    .upsert(
      { device_id: deviceId, last_active: new Date().toISOString() },
      { onConflict: 'device_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function touchSession(sessionId) {
  await db
    .from('sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('id', sessionId);
}

module.exports = { getOrCreateSession, touchSession };
