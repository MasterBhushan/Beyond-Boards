import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://beyond-boards-production.up.railway.app/api';

async function getDeviceId() {
  let id = await AsyncStorage.getItem('bb_device_id');
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    await AsyncStorage.setItem('bb_device_id', id);
  }
  return id;
}

export async function initSession() {
  const cached = await AsyncStorage.getItem('bb_session_id');
  if (cached) return cached;

  const device_id = await getDeviceId();
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id }),
  });
  const json = await res.json();

  // Debug: log what the backend actually returns
  console.log('Sessions response:', JSON.stringify(json));

  const sessionId = json.sessionId || json.session_id || json.id || json.data?.id;
  if (!sessionId) throw new Error(`No sessionId in response: ${JSON.stringify(json)}`);

  await AsyncStorage.setItem('bb_session_id', sessionId);
  return sessionId;
}

export async function fetchCareers() {
  const res = await fetch(`${BASE_URL}/careers`);
  const json = await res.json();
  console.log('Careers response keys:', Object.keys(json));
  return json.data;
}

export async function syncWatchEvent(sessionId, careerId, state) {
  try {
    await fetch(`${BASE_URL}/watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:      sessionId,
        career_id:       careerId,
        seconds_watched: state.seconds || 0,
        is_saved:        state.saved || false,
        opened_youtube:  state.openedYoutube || false,
        viewed_roadmap:  state.viewedRoadmap || false,
      }),
    });
  } catch (e) {
    console.warn('Watch sync failed:', e.message);
  }
}

export async function restoreWatchState(sessionId) {
  try {
    const res = await fetch(`${BASE_URL}/watch/${sessionId}`);
    const json = await res.json();
    return json.data;
  } catch (e) {
    return {};
  }
}

export async function generateReport(sessionId) {
  const res = await fetch(`${BASE_URL}/report/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  return json.data;
}