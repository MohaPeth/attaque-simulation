const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload', requireAuth, upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu (champ attendu : "document")' });
  }

  return res.status(201).json({
    message: 'Document uploadé avec succès',
    file: {
      originalName: req.file.originalname,
      storedAs: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user.email,
    },
  });
});

router.get('/uploads', requireAuth, (_req, res) => {
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return { name: f, size: stat.size, uploadedAt: stat.mtime };
    });
  res.json(files);
});

module.exports = router;
