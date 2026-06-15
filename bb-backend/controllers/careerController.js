const careerService = require('../services/careerService');

async function getCareers(req, res) {
  try {
    const careers = await careerService.getAllCareers();
    res.json({ success: true, count: careers.length, data: careers });
  } catch (err) {
    console.error('Careers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch careers' });
  }
}

async function getCareer(req, res) {
  try {
    const career = await careerService.getCareerById(req.params.id);
    if (!career) return res.status(404).json({ success: false, message: 'Career not found' });
    res.json({ success: true, data: career });
  } catch (err) {
    console.error('Career error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch career' });
  }
}

module.exports = { getCareers, getCareer };
