import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.id).select('_id name firstName lastName email mobile verified onboarded plan prefs');
    if (!admin) return res.status(401).json({ message: 'Account not found.' });
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}
