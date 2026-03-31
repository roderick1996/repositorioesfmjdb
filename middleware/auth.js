const jwt = require('jsonwebtoken');
const { q } = require('../database');

const SECRET = process.env.JWT_SECRET || 'esfm_jose_david_berrios_2024_secret_key';

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const result = await q(
      'SELECT id, nombre, apellido, email, rol, carrera, semestre, avatar FROM usuarios WHERE id = ? AND activo = 1',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  next();
};

const docenteOrAdmin = (req, res, next) => {
  if (!['admin', 'docente'].includes(req.user.rol)) return res.status(403).json({ error: 'Acceso denegado' });
  next();
};

module.exports = { auth, adminOnly, docenteOrAdmin, SECRET };
