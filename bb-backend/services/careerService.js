const db = require('../database/db');

async function getAllCareers() {
  const { data, error } = await db
    .from('careers')
    .select('id, name, emoji, title, description, youtube_id, color, wiring, roadmap, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;

  // Return camelCase to match App.js expectations exactly
  return data.map(c => ({
    id:        c.id,
    name:      c.name,
    emoji:     c.emoji,
    title:     c.title,
    desc:      c.description,
    youtubeId: c.youtube_id,
    color:     c.color,
    wiring:    c.wiring,
    roadmap:   c.roadmap,
  }));
}

async function getCareerById(id) {
  const { data, error } = await db
    .from('careers')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) return null;

  return {
    id:        data.id,
    name:      data.name,
    emoji:     data.emoji,
    title:     data.title,
    desc:      data.description,
    youtubeId: data.youtube_id,
    color:     data.color,
    wiring:    data.wiring,
    roadmap:   data.roadmap,
  };
}

module.exports = { getAllCareers, getCareerById };
