const reportService = require('../services/reportService');

async function generateReport(req, res) {
  try {
    const { session_id } = req.params;
    const report = await reportService.generateReport(session_id);
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Report gen error:', err);
    const msg = err.message.includes('No watch data') 
      ? err.message 
      : 'Failed to generate report';
    res.status(err.message.includes('No watch data') ? 400 : 500).json({ success: false, message: msg });
  }
}

async function getReport(req, res) {
  try {
    const { session_id } = req.params;
    const report = await reportService.getSavedReport(session_id);
    if (!report) return res.status(404).json({ success: false, message: 'No report found' });
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Report fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
}

module.exports = { generateReport, getReport };
