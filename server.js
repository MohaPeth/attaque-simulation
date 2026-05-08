const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./src/routes/auth');
const filesRouter = require('./src/routes/files');
const uploadRouter = require('./src/routes/upload');
const statusRouter = require('./src/routes/status');
const adminRouter = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', authRouter);
app.use('/api', filesRouter);
app.use('/api', uploadRouter);
app.use('/api', statusRouter);
app.use('/api', adminRouter);

app.use((err, _req, res, _next) => {
  console.error('[ERR]', err);
  res.status(500).json({ error: 'Erreur serveur', detail: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Internal Document Portal — API en écoute sur le port ${PORT}`);
  console.log(`UI : http://localhost:${PORT}`);
});
