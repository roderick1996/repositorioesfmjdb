const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { auth, SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  db.prepare('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET, { expiresIn: '7d' });
  const { password: _, ...userData } = user;
  res.json({ token, user: userData, message: `¡Bienvenido/a, ${user.nombre}!` });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { nombre, apellido, email, password, carrera, semestre } = req.body;
  if (!nombre || !apellido || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'El email ya está registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO usuarios (nombre, apellido, email, password, carrera, semestre)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nombre, apellido, email.toLowerCase().trim(), hash, carrera || null, semestre || null);

  const token = jwt.sign({ id: result.lastInsertRowid, rol: 'estudiante' }, SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, message: 'Cuenta creada exitosamente', userId: result.lastInsertRowid });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = db.prepare(`
    SELECT u.*, 
      (SELECT COUNT(*) FROM proyectos WHERE autor_id = u.id) as total_proyectos,
      (SELECT COUNT(*) FROM favoritos WHERE usuario_id = u.id) as total_favoritos
    FROM usuarios u WHERE u.id = ?
  `).get(req.user.id);
  const { password, ...userData } = user;
  res.json(userData);
});

// PUT /api/auth/perfil
router.put('/perfil', auth, (req, res) => {
  const { nombre, apellido, carrera, semestre } = req.body;
  db.prepare('UPDATE usuarios SET nombre=?, apellido=?, carrera=?, semestre=? WHERE id=?')
    .run(nombre, apellido, carrera, semestre, req.user.id);
  res.json({ message: 'Perfil actualizado' });
});

// PUT /api/auth/password
router.put('/password', auth, (req, res) => {
  const { actual, nueva } = req.body;
  const user = db.prepare('SELECT password FROM usuarios WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(actual, user.password))
    return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  if (nueva.length < 6)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  db.prepare('UPDATE usuarios SET password=? WHERE id=?').run(bcrypt.hashSync(nueva, 10), req.user.id);
  res.json({ message: 'Contraseña actualizada exitosamente' });
});

module.exports = router;
