const express = require('express');
const router  = express.Router();

const { createSession }              = require('../controllers/sessionController');
const { getCareers, getCareer }      = require('../controllers/careerController');
const { saveWatchEvent, getWatchEvents } = require('../controllers/watchController');
const { generateReport, getReport }  = require('../controllers/reportController');

// Health
router.get('/health', (req, res) => res.json({ status: 'ok', app: 'Beyond Boards API' }));

// Sessions
router.post('/sessions',               createSession);

// Careers
router.get('/careers',                 getCareers);
router.get('/careers/:id',             getCareer);

// Watch events
router.post('/watch',                  saveWatchEvent);
router.get('/watch/:session_id',       getWatchEvents);

// Reports
router.post('/report/:session_id',     generateReport);
router.get('/report/:session_id',      getReport);

module.exports = router;
