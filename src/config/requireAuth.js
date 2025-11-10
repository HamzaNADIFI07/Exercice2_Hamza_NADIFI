import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const h = req.headers['authorization'] || req.headers['Authorization'];
    let token = null;

    if (h && typeof h === 'string') {
      const parts = h.split(' ');
      token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : h;
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
