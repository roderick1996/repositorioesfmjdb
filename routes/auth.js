const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { q } = require('../database');
const { auth, SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const result = await q('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    await q('UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    const token = jwt.sign({ id: user.id, rol: user.rol }, SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user;
    res.json({ token, user: userData, message: `¡Bienvenido/a, ${user.nombre}!` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, email, password, carrera, semestre } = req.body;
    if (!nombre || !apellido || !email || !password)
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    if (password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const exists = await q('SELECT id FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'El email ya está registrado' });
    const hash = bcrypt.hashSync(password, 10);
    const result = await q(
      'INSERT INTO usuarios (nombre, apellido, email, password, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellido, email.toLowerCase().trim(), hash, carrera || null, semestre || null]
    );
    const token = jwt.sign({ id: Number(result.lastInsertRowid), rol: 'estudiante' }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, message: 'Cuenta creada exitosamente', userId: Number(result.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  try {
    const result = await q(`
      SELECT u.*,
        (SELECT COUNT(*) FROM proyectos WHERE autor_id = u.id) as total_proyectos,
        (SELECT COUNT(*) FROM favoritos WHERE usuario_id = u.id) as total_favoritos
      FROM usuarios u WHERE u.id = ?
    `, [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password, ...userData } = user;
    res.json(userData);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/perfil', auth, async (req, res) => {
  try {
    const { nombre, apellido, carrera, semestre } = req.body;
    await q('UPDATE usuarios SET nombre=?, apellido=?, carrera=?, semestre=? WHERE id=?',
      [nombre, apellido, carrera, semestre, req.user.id]);
    res.json({ message: 'Perfil actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/password', auth, async (req, res) => {
  try {
    const { actual, nueva } = req.body;
    const result = await q('SELECT password FROM usuarios WHERE id=?', [req.user.id]);
    const user = result.rows[0];
    if (!bcrypt.compareSync(actual, user.password))
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    if (nueva.length < 6)
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    await q('UPDATE usuarios SET password=? WHERE id=?', [bcrypt.hashSync(nueva, 10), req.user.id]);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
