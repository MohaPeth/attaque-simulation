const express = require('express');
const os = require('os');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({
    status: 'API running',
    project: 'Internal Document Portal',
    version: '1.0.0',
    hostname: os.hostname(),
    uptime: process.uptime(),
    node: process.version,
  });
});

module.exports = router;
