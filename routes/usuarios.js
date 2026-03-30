const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');

// GET /api/usuarios - Admin: lista usuarios
router.get('/', auth, adminOnly, (req, res) => {
  const usuarios = db.prepare(`
    SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.carrera, u.semestre, u.activo, u.created_at, u.last_login,
      (SELECT COUNT(*) FROM proyectos WHERE autor_id = u.id) as total_proyectos
    FROM usuarios u ORDER BY u.created_at DESC
  `).all();
  res.json(usuarios);
});

// PUT /api/usuarios/:id/rol
router.put('/:id/rol', auth, adminOnly, (req, res) => {
  const { rol } = req.body;
  if (!['admin', 'docente', 'estudiante'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  db.prepare('UPDATE usuarios SET rol=? WHERE id=?').run(rol, req.params.id);
  res.json({ message: 'Rol actualizado' });
});

// PUT /api/usuarios/:id/activo
router.put('/:id/activo', auth, adminOnly, (req, res) => {
  const u = db.prepare('SELECT activo FROM usuarios WHERE id=?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE usuarios SET activo=? WHERE id=?').run(u.activo ? 0 : 1, req.params.id);
  res.json({ activo: !u.activo });
});

// GET /api/usuarios/notificaciones
router.get('/notificaciones', auth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notificaciones WHERE usuario_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json(notifs);
});

// PUT /api/usuarios/notificaciones/leer
router.put('/notificaciones/leer', auth, (req, res) => {
  db.prepare('UPDATE notificaciones SET leida=1 WHERE usuario_id=?').run(req.user.id);
  res.json({ ok: true });
});

// GET /api/usuarios/mis-proyectos
router.get('/mis-proyectos', auth, (req, res) => {
  const proyectos = db.prepare(`
    SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono
    FROM proyectos p
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.autor_id = ? ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(proyectos);
});

// GET /api/usuarios/favoritos
router.get('/favoritos', auth, (req, res) => {
  const favoritos = db.prepare(`
    SELECT p.id, p.titulo, p.descripcion, p.carrera, p.anio, p.calificacion_promedio, p.visitas,
      u.nombre || ' ' || u.apellido AS autor_nombre,
      c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono
    FROM favoritos f
    JOIN proyectos p ON f.proyecto_id = p.id
    JOIN usuarios u ON p.autor_id = u.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE f.usuario_id = ?
    ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json(favoritos);
});

module.exports = router;

// Exportar todos los usuarios (solo admin)
router.get('/admin/exportar', auth, adminOnly, (req, res) => {
  const usuarios = db.prepare(`
    SELECT u.id, u.nombre, u.apellido, u.email, u.rol,
      u.carrera, u.semestre, u.activo, u.created_at, u.last_login,
      COUNT(p.id) AS total_proyectos
    FROM usuarios u
    LEFT JOIN proyectos p ON p.autor_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.setHeader('Content-Disposition', 'attachment; filename="usuarios-esfm.json"');
  res.json(usuarios);
});
