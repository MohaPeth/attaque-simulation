const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const DOCS_FILE = path.join(__dirname, '..', 'data', 'documents.json');
const DOCS_DIR = path.join(__dirname, '..', '..', 'documents');

function loadDocuments() {
  const raw = fs.readFileSync(DOCS_FILE, 'utf8');
  return JSON.parse(raw);
}

router.get('/files', requireAuth, (req, res) => {
  const docs = loadDocuments().map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    owner: d.owner,
    createdAt: d.createdAt,
    description: d.description,
  }));
  res.json(docs);
});

router.get('/files/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const doc = loadDocuments().find((d) => d.id === id);

  if (!doc) {
    return res.status(404).json({ error: 'Document introuvable' });
  }

  const filePath = path.join(DOCS_DIR, doc.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier physique manquant', meta: doc });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return res.json({
    id: doc.id,
    name: doc.name,
    category: doc.category,
    owner: doc.owner,
    createdAt: doc.createdAt,
    description: doc.description,
    content,
  });
});

module.exports = router;
