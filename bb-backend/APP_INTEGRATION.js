// ============================================================
// DROP THIS FILE INTO: BeyondBoards5/src/api.js
// Then follow the steps in APP_CHANGES.md
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── STEP 1: When testing on phone via Expo Go,
//   replace with your laptop's WiFi IP (run `ipconfig` on Windows)
//   e.g. 'http://192.168.1.5:5000/api'
// ── STEP 2: After Railway deploy, replace with your Railway URL
const BASE_URL = __DEV__
  ? 'http://YOUR_LAPTOP_IP:5000/api'   // ← Change this
  : 'https://YOUR_APP.railway.app/api'; // ← Change after deploy

// Persistent device ID — generated once, stored forever
async function getDeviceId() {
  let id = await AsyncStorage.getItem('bb_device_id');
  if (!id) {
    // Simple UUID-like ID without extra library
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    await AsyncStorage.setItem('bb_device_id', id);
  }
  return id;
}

// Call on app open — returns session_id string
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
  await AsyncStorage.setItem('bb_session_id', json.sessionId);
  return json.sessionId;
}

// Replaces the hardcoded CAREERS array
export async function fetchCareers() {
  const res = await fetch(`${BASE_URL}/careers`);
  const json = await res.json();
  return json.data; // array of career objects, same shape as your App.js CAREERS
}

// Call this debounced (every 5s) while user is watching
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
    // Silent fail — offline, carry on
    console.warn('Watch sync failed (offline?):', e.message);
  }
}

// Restore watch state on app re-open (so timer doesn't reset)
export async function restoreWatchState(sessionId) {
  try {
    const res = await fetch(`${BASE_URL}/watch/${sessionId}`);
    const json = await res.json();
    return json.data; // { career_id: { seconds, saved, ... } }
  } catch (e) {
    return {}; // Offline — return empty, app still works
  }
}

// Generate wiring report (call after last career)
export async function generateReport(sessionId) {
  const res = await fetch(`${BASE_URL}/report/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json();
  return json.data; // { wiring: [...], top_careers: [...] }
}
