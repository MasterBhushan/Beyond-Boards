require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' })); // Open for MVP — tighten after launch
app.use(express.json({ limit: '10kb' }));

// 100 req/min per IP
app.use('/api', rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/api', routes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✦ Beyond Boards API → http://localhost:${PORT}/api/health`);
});
