const FAKE_TOKEN_PREFIX = 'fake-jwt-token';

function issueToken(user) {
  return `${FAKE_TOKEN_PREFIX}.${Buffer.from(`${user.id}:${user.email}:${user.role}`).toString('base64')}`;
}

function verifyToken(token) {
  if (!token || !token.startsWith(`${FAKE_TOKEN_PREFIX}.`)) return null;
  try {
    const payload = Buffer.from(token.split('.')[1], 'base64').toString('utf8');
    const [id, email, role] = payload.split(':');
    if (!id || !email || !role) return null;
    return { id: Number(id), email, role };
  } catch (_) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized — token manquant ou invalide' });
  }
  req.user = user;
  next();
}

module.exports = { issueToken, verifyToken, requireAuth };
