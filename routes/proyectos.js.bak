const express = require('express');
const router = express.Router();
const { q } = require('../database');
const { auth, adminOnly, docenteOrAdmin } = require('../middleware/auth');
const { upload, cloudinary } = require('../uploads');

router.get('/:id', async (req, res) => {
  try {
    const r = await q(`SELECT p.*, u.nombre || ' ' || u.apellido AS autor_nombre, u.email AS autor_email, u.carrera AS autor_carrera, u.semestre AS autor_semestre, c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono FROM proyectos p JOIN usuarios u ON p.autor_id = u.id LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?`, [req.params.id]);
    const proyecto = r.rows[0];
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    await q('UPDATE proyectos SET visitas = visitas + 1 WHERE id = ?', [req.params.id]);
    const r2 = await q(`SELECT cm.*, u.nombre || ' ' || u.apellido AS usuario_nombre, u.rol AS usuario_rol FROM comentarios cm JOIN usuarios u ON cm.usuario_id = u.id WHERE cm.proyecto_id = ? AND cm.aprobado = 1 ORDER BY cm.created_at DESC`, [req.params.id]);
    const r3 = await q(`SELECT p.id, p.titulo, p.carrera, p.anio, p.calificacion_promedio, u.nombre || ' ' || u.apellido AS autor_nombre, c.color AS categoria_color, c.icono AS categoria_icono FROM proyectos p JOIN usuarios u ON p.autor_id = u.id LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.estado = 'aprobado' AND p.id != ? AND p.categoria_id = ? ORDER BY p.visitas DESC LIMIT 4`, [req.params.id, proyecto.categoria_id || 0]);
    res.json({ ...proyecto, comentarios: r2.rows, relacionados: r3.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/admin/exportar', auth, adminOnly, async (req, res) => {
  try {
    const r = await q(`SELECT p.*, u.nombre || ' ' || u.apellido AS autor_nombre, u.email AS autor_email, u.carrera AS autor_carrera, c.nombre AS categoria_nombre FROM proyectos p JOIN usuarios u ON p.autor_id = u.id LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.created_at DESC`);
    res.setHeader('Content-Disposition', 'attachment; filename="proyectos-esfm.json"');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await q(`SELECT p.*, u.nombre || ' ' || u.apellido AS autor_nombre, u.email AS autor_email, u.carrera AS autor_carrera, u.semestre AS autor_semestre, c.nombre AS categoria_nombre, c.color AS categoria_color, c.icono AS categoria_icono FROM proyectos p JOIN usuarios u ON p.autor_id = u.id LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?`, [req.params.id]);
    const proyecto = r.rows[0];
    if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });
    await q('UPDATE proyectos SET visitas = visitas + 1 WHERE id = ?', [req.params.id]);
    const r2 = await q(`SELECT cm.*, u.nombre || ' ' || u.apellido AS usuario_nombre, u.rol AS usuario_rol FROM comentarios cm JOIN usuarios u ON cm.usuario_id = u.id WHERE cm.proyecto_id = ? AND cm.aprobado = 1 ORDER BY cm.created_at DESC`, [req.params.id]);
    const r3 = await q(`SELECT p.id, p.titulo, p.carrera, p.anio, p.calificacion_promedio, u.nombre || ' ' || u.apellido AS autor_nombre, c.color AS categoria_color, c.icono AS categoria_icono FROM proyectos p JOIN usuarios u ON p.autor_id = u.id LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.estado = 'aprobado' AND p.id != ? AND p.categoria_id = ? ORDER BY p.visitas DESC LIMIT 4`, [req.params.id, proyecto.categoria_id]);
    res.json({ ...proyecto, comentarios: r2.rows, relacionados: r3.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF requerido' });
    const { titulo, descripcion, resumen, categoria_id, carrera, semestre, anio, palabras_clave } = req.body;
    if (!titulo || !descripcion) return res.status(400).json({ error: 'Título y descripción requeridos' });
    const estadoFinal = req.user.rol === 'admin' ? 'aprobado' : 'pendiente';
    const r = await q(`INSERT INTO proyectos (titulo, descripcion, resumen, autor_id, categoria_id, carrera, semestre, anio, palabras_clave, archivo_pdf, archivo_nombre, archivo_tamano, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion, resumen || null, req.user.id, categoria_id || null, carrera || req.user.carrera, semestre || req.user.semestre, anio || new Date().getFullYear(), palabras_clave || null, req.file.path, req.file.originalname, req.file.size, estadoFinal]);
    const admins = await q("SELECT id FROM usuarios WHERE rol = 'admin'");
    for (const a of admins.rows) {
      await q('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)', [a.id, 'Nuevo proyecto pendiente', `"${titulo}" por ${req.user.nombre} ${req.user.apellido}`, 'nuevo']);
    }
    res.status(201).json({ id: r.lastInsertRowid, message: 'Proyecto subido exitosamente.' });
  } catch (err) { console.error('Error al subir:', err); res.status(500).json({ error: 'Error al subir: ' + err.message }); }
});

router.put('/:id/estado', auth, docenteOrAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['aprobado', 'rechazado', 'pendiente'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    const r = await q('SELECT * FROM proyectos WHERE id = ?', [req.params.id]);
    const proyecto = r.rows[0];
    if (!proyecto) return res.status(404).json({ error: 'No encontrado' });
    await q('UPDATE proyectos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, req.params.id]);
    const msg = estado === 'aprobado' ? `¡Tu proyecto "${proyecto.titulo}" fue aprobado!` : `Tu proyecto "${proyecto.titulo}" requiere revisión.`;
    await q('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)', [proyecto.autor_id, `Proyecto ${estado}`, msg, estado === 'aprobado' ? 'aprobado' : 'rechazado']);
    res.json({ message: `Proyecto ${estado}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/destacar', auth, adminOnly, async (req, res) => {
  try {
    const r = await q('SELECT destacado FROM proyectos WHERE id = ?', [req.params.id]);
    const p = r.rows[0];
    if (!p) return res.status(404).json({ error: 'No encontrado' });
    await q('UPDATE proyectos SET destacado = ? WHERE id = ?', [p.destacado ? 0 : 1, req.params.id]);
    res.json({ destacado: !p.destacado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const r = await q('SELECT * FROM proyectos WHERE id = ?', [req.params.id]);
    const proyecto = r.rows[0];
    if (!proyecto) return res.status(404).json({ error: 'No encontrado' });
    if (proyecto.autor_id !== req.user.id && req.user.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    if (proyecto.archivo_pdf && proyecto.archivo_pdf.includes('cloudinary')) {
      const parts = proyecto.archivo_pdf.split('/');
      const publicId = 'esfm/pdfs/' + parts[parts.length - 1].replace(/\.[^/.]+$/, '');
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    await q('DELETE FROM proyectos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Proyecto eliminado' });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
});

router.post('/:id/calificar', auth, async (req, res) => {
  try {
    const { puntuacion, comentario } = req.body;
    if (!puntuacion || puntuacion < 1 || puntuacion > 5) return res.status(400).json({ error: 'Puntuación entre 1 y 5' });
    const exists = await q('SELECT id FROM calificaciones WHERE proyecto_id=? AND usuario_id=?', [req.params.id, req.user.id]);
    if (exists.rows[0]) await q('UPDATE calificaciones SET puntuacion=?, comentario=? WHERE proyecto_id=? AND usuario_id=?', [puntuacion, comentario, req.params.id, req.user.id]);
    else await q('INSERT INTO calificaciones (proyecto_id, usuario_id, puntuacion, comentario) VALUES (?,?,?,?)', [req.params.id, req.user.id, puntuacion, comentario]);
    const stats = await q('SELECT AVG(puntuacion) as avg, COUNT(*) as total FROM calificaciones WHERE proyecto_id=?', [req.params.id]);
    await q('UPDATE proyectos SET calificacion_promedio=?, total_calificaciones=? WHERE id=?', [Math.round(stats.rows[0].avg * 10) / 10, stats.rows[0].total, req.params.id]);
    res.json({ message: 'Calificación guardada', promedio: stats.rows[0].avg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/comentar', auth, async (req, res) => {
  try {
    const { contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ error: 'Comentario vacío' });
    await q('INSERT INTO comentarios (proyecto_id, usuario_id, contenido) VALUES (?,?,?)', [req.params.id, req.user.id, contenido.trim()]);
    res.status(201).json({ message: 'Comentario añadido' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/descargar', async (req, res) => {
  try {
    await q('UPDATE proyectos SET descargas = descargas + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/favorito', auth, async (req, res) => {
  try {
    const exists = await q('SELECT id FROM favoritos WHERE usuario_id=? AND proyecto_id=?', [req.user.id, req.params.id]);
    if (exists.rows[0]) { await q('DELETE FROM favoritos WHERE usuario_id=? AND proyecto_id=?', [req.user.id, req.params.id]); res.json({ favorito: false }); }
    else { await q('INSERT INTO favoritos (usuario_id, proyecto_id) VALUES (?,?)', [req.user.id, req.params.id]); res.json({ favorito: true }); }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
