const express = require('express');
const router = express.Router();
const { q } = require('../database');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const result = await q(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.carrera, u.semestre, u.activo, u.created_at, u.last_login,
        (SELECT COUNT(*) FROM proyectos WHERE autor_id = u.id) as total_proyectos
      FROM usuarios u ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/rol', auth, adminOnly, async (req, res) => {
  try {
    const { rol } = req.body;
    if (!['admin', 'docente', 'estudiante'].includes(rol))
      return res.status(400).json({ error: 'Rol inválido' });
    await q('UPDATE usuarios SET rol=$1 WHERE id=$2', [rol, req.params.id]);
    res.json({ message: 'Rol actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/activo', auth, adminOnly, async (req, res) => {
  try {
    const result = await q('SELECT activo FROM usuarios WHERE id=$1', [req.params.id]);
    const u = result.rows[0];
    if (!u) return res.status(404).json({ error: 'No encontrado' });
    await q('UPDATE usuarios SET activo=$1 WHERE id=$2', [u.activo ? 0 : 1, req.params.id]);
    res.json({ activo: !u.activo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/notificaciones', auth, async (req, res) => {
  try {
    const result = await q('SELECT * FROM notificaciones WHERE usuario_id=$1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/notificaciones/leer', auth, async (req, res) => {
  try {
    await q('UPDATE notificaciones SET leida=true WHERE usuario_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/mis-proyectos', auth, async (req, res) => {
  try {
    const result = await q(`
      SELECT p.*, c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono
      FROM proyectos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.autor_id = $1 ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/favoritos', auth, async (req, res) => {
  try {
    const result = await q(`
      SELECT p.id, p.titulo, p.descripcion, p.carrera, p.anio, p.calificacion_promedio, p.vistas,
        u.nombre || ' ' || u.apellido AS autor_nombre,
        c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono
      FROM favoritos f
      JOIN proyectos p ON f.proyecto_id = p.id
      JOIN usuarios u ON p.autor_id = u.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE f.usuario_id = $1 ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin/exportar', auth, adminOnly, async (req, res) => {
  try {
    const result = await q(`
      SELECT u.id, u.nombre, u.apellido, u.email, u.rol, u.carrera, u.semestre, u.activo, u.created_at, u.last_login,
        (SELECT COUNT(*) FROM proyectos WHERE autor_id = u.id) AS total_proyectos
      FROM usuarios u ORDER BY u.created_at DESC
    `);
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios-esfm.json"');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
