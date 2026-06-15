const db = require('../database/db');

const WIRING_LABELS = {
  impact:     'Impact & Care',
  precision:  'Precision & Detail',
  creation:   'Creative Drive',
  logic:      'Logic & Systems',
  expression: 'Self-Expression',
  endurance:  'Endurance & Grit',
  power:      'Power & Influence',
  purpose:    'Sense of Purpose',
  risk:       'Risk Appetite',
  leadership: 'Leadership',
  aesthetics: 'Aesthetic Sense',
  security:   'Stability Seeking',
  connection: 'Human Connection',
  discipline: 'Discipline & Routine',
  persuasion: 'Persuasion',
};

async function generateReport(sessionId) {
  // 1. Get all watch events for this session
  const { data: events, error: evErr } = await db
    .from('watch_events')
    .select('career_id, seconds_watched, is_saved, opened_youtube, viewed_roadmap')
    .eq('session_id', sessionId);

  if (evErr) throw evErr;
  if (!events || events.length === 0) {
    throw new Error('No watch data found — user has not watched anything yet');
  }

  // 2. Get all career wiring tags
  const { data: careers, error: cErr } = await db
    .from('careers')
    .select('id, name, emoji, color, wiring')
    .eq('is_active', true);

  if (cErr) throw cErr;

  const careerMap = {};
  careers.forEach(c => { careerMap[c.id] = c; });

  // 3. Score calculation
  // Weights (same logic as your App.js, improved):
  //   watch time  → 2 pts/sec  (passive interest)
  //   saved       → 40 pts     (active interest)
  //   opened YT   → 20 pts     (strong interest — left the app to watch more)
  //   viewed roadmap → 30 pts  (strongest signal — checked "how do I get here")
  const wiringScores = {};
  const careerScores = [];

  events.forEach(ev => {
    const career = careerMap[ev.career_id];
    if (!career) return;

    const weight =
      (ev.seconds_watched * 2) +
      (ev.is_saved        ? 40 : 0) +
      (ev.opened_youtube  ? 20 : 0) +
      (ev.viewed_roadmap  ? 30 : 0);

    career.wiring.forEach(tag => {
      wiringScores[tag] = (wiringScores[tag] || 0) + weight;
    });

    careerScores.push({
      career_id: ev.career_id,
      name:      career.name,
      emoji:     career.emoji,
      color:     career.color,
      score:     (ev.seconds_watched * 3) +
                 (ev.is_saved        ? 40 : 0) +
                 (ev.opened_youtube  ? 20 : 0) +
                 (ev.viewed_roadmap  ? 30 : 0),
    });
  });

  // 4. Normalize wiring to 0–100
  const maxW = Math.max(...Object.values(wiringScores), 1);
  const wiring = Object.entries(wiringScores)
    .map(([key, score]) => ({
      key,
      label: WIRING_LABELS[key] || key,
      score: Math.round((score / maxW) * 100),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const topCareers = careerScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  // 5. Save to DB
  const { data: saved, error: saveErr } = await db
    .from('wiring_reports')
    .insert({ session_id: sessionId, wiring, top_careers: topCareers })
    .select()
    .single();

  if (saveErr) console.error('Report save failed (non-fatal):', saveErr);

  return {
    report_id:    saved?.id || null,
    session_id:   sessionId,
    wiring,
    top_careers:  topCareers,
    generated_at: new Date().toISOString(),
  };
}

async function getSavedReport(sessionId) {
  const { data, error } = await db
    .from('wiring_reports')
    .select('*')
    .eq('session_id', sessionId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

module.exports = { generateReport, getSavedReport };
