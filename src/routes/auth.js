const express = require('express');
const path = require('path');
const fs = require('fs');
const { issueToken } = require('../middleware/auth');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

function loadUsers() {
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(raw);
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email et password requis' });
  }

  const users = loadUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = issueToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  });
});

module.exports = router;
