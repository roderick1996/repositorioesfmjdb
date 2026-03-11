const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { auth, adminOnly, docenteOrAdmin } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../frontend/public/uploads/pdfs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

// GET /api/proyectos - Listar proyectos
router.get('/', (req, res) => {
  const { buscar, categoria, carrera, anio, estado = 'aprobado', orden = 'reciente', pagina = 1, limite = 12, destacados } = req.query;
  const offset = (pagina - 1) * limite;

  let where = ['p.estado = ?'];
  let params = [estado];

  if (buscar) {
    where.push('(p.titulo LIKE ? OR p.descripcion LIKE ? OR p.palabras_clave LIKE ?)');
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
  }
  if (categoria) { where.push('p.categoria_id = ?'); params.push(categoria); }
  if (carrera) { where.push('p.carrera LIKE ?'); params.push(`%${carrera}%`); }
  if (anio) { where.push('p.anio = ?'); params.push(anio); }
  if (destacados) { where.push('p.destacado = 1'); }

  const orderMap = {
    reciente: 'p.created_at DESC',
    antiguo: 'p.created_at ASC',
    visitas: 'p.visitas DESC',
    descargas: 'p.descargas DESC',
    calificacion: 'p.calificacion_promedio DESC',
    titulo: 'p.titulo ASC'
  };
  const orderBy = orderMap[orden] || orderMap.reciente;

  const whereStr = where.join(' AND ');

  const proyectos = db.prepare(`
    SELECT p.*, 
      u.nombre || ' ' || u.apellido AS autor_nombre,
      u.carrera AS autor_carrera,
      c.nombre AS categoria_nombre,
      c.color AS categoria_color,
      c.icono AS categoria_icono
    FROM proyectos p
    JOIN usuarios u ON p.autor_id = u.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE ${whereStr}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limite), parseInt(offset));

  const total = db.prepare(`SELECT COUNT(*) as total FROM proyectos p WHERE ${whereStr}`).get(...params);

  res.json({ proyectos, total: total.total, pagina: parseInt(pagina), limite: parseInt(limite) });
});

// GET /api/proyectos/:id
router.get('/:id', (req, res) => {
  const proyecto = db.prepare(`
    SELECT p.*, 
      u.nombre || ' ' || u.apellido AS autor_nombre,
      u.email AS autor_email,
      u.carrera AS autor_carrera,
      u.semestre AS autor_semestre,
      u.avatar AS autor_avatar,
      c.nombre AS categoria_nombre,
      c.color AS categoria_color,
      c.icono AS categoria_icono
    FROM proyectos p
    JOIN usuarios u ON p.autor_id = u.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!proyecto) return res.status(404).json({ error: 'Proyecto no encontrado' });

  // Increment views
  db.prepare('UPDATE proyectos SET visitas = visitas + 1 WHERE id = ?').run(req.params.id);

  // Get comments
  const comentarios = db.prepare(`
    SELECT cm.*, u.nombre || ' ' || u.apellido AS usuario_nombre, u.rol AS usuario_rol, u.avatar
    FROM comentarios cm
    JOIN usuarios u ON cm.usuario_id = u.id
    WHERE cm.proyecto_id = ? AND cm.aprobado = 1
    ORDER BY cm.created_at DESC
  `).all(req.params.id);

  // Related projects
  const relacionados = db.prepare(`
    SELECT p.id, p.titulo, p.carrera, p.anio, p.calificacion_promedio,
      u.nombre || ' ' || u.apellido AS autor_nombre,
      c.color AS categoria_color, c.icono AS categoria_icono
    FROM proyectos p
    JOIN usuarios u ON p.autor_id = u.id
    LEFT JOIN categorias c ON p.categoria_id = c.id
    WHERE p.estado = 'aprobado' AND p.id != ? AND p.categoria_id = ?
    ORDER BY p.visitas DESC LIMIT 4
  `).all(req.params.id, proyecto.categoria_id);

  res.json({ ...proyecto, comentarios, relacionados });
});

// POST /api/proyectos - Subir proyecto
router.post('/', auth, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'PDF requerido' });

  const { titulo, descripcion, resumen, categoria_id, carrera, semestre, anio, palabras_clave } = req.body;
  if (!titulo || !descripcion) return res.status(400).json({ error: 'Título y descripción requeridos' });

  const result = db.prepare(`
    INSERT INTO proyectos (titulo, descripcion, resumen, autor_id, categoria_id, carrera, semestre, anio, palabras_clave, archivo_pdf, archivo_nombre, archivo_tamano, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    titulo, descripcion, resumen || null,
    req.user.id, categoria_id || null, carrera || req.user.carrera,
    semestre || req.user.semestre, anio || new Date().getFullYear(),
    palabras_clave || null,
    `/uploads/pdfs/${req.file.filename}`,
    req.file.originalname,
    req.file.size,
    req.user.rol === 'admin' ? 'aprobado' : 'pendiente'
  );

  // Notify admins
  const admins = db.prepare("SELECT id FROM usuarios WHERE rol = 'admin'").all();
  const notifStmt = db.prepare('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)');
  admins.forEach(a => notifStmt.run(a.id, 'Nuevo proyecto pendiente', `"${titulo}" por ${req.user.nombre} ${req.user.apellido}`, 'nuevo'));

  res.status(201).json({ id: result.lastInsertRowid, message: 'Proyecto subido exitosamente. Pendiente de aprobación.' });
});

// PUT /api/proyectos/:id/estado
router.put('/:id/estado', auth, docenteOrAdmin, (req, res) => {
  const { estado } = req.body;
  if (!['aprobado', 'rechazado', 'pendiente'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });

  const proyecto = db.prepare('SELECT * FROM proyectos WHERE id = ?').get(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'No encontrado' });

  db.prepare('UPDATE proyectos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(estado, req.params.id);

  // Notify author
  const msg = estado === 'aprobado'
    ? `¡Tu proyecto "${proyecto.titulo}" fue aprobado y ya es visible en el repositorio!`
    : `Tu proyecto "${proyecto.titulo}" requiere revisión.`;
  db.prepare('INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?)')
    .run(proyecto.autor_id, `Proyecto ${estado}`, msg, estado === 'aprobado' ? 'aprobado' : 'rechazado');

  res.json({ message: `Proyecto ${estado}` });
});

// PUT /api/proyectos/:id/destacar
router.put('/:id/destacar', auth, adminOnly, (req, res) => {
  const p = db.prepare('SELECT destacado FROM proyectos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE proyectos SET destacado = ? WHERE id = ?').run(p.destacado ? 0 : 1, req.params.id);
  res.json({ destacado: !p.destacado });
});

// DELETE /api/proyectos/:id
router.delete('/:id', auth, (req, res) => {
  const proyecto = db.prepare('SELECT * FROM proyectos WHERE id = ?').get(req.params.id);
  if (!proyecto) return res.status(404).json({ error: 'No encontrado' });
  if (proyecto.autor_id !== req.user.id && req.user.rol !== 'admin')
    return res.status(403).json({ error: 'Sin permisos' });

  // Delete file
  if (proyecto.archivo_pdf) {
    const filePath = path.join(__dirname, '../../frontend/public', proyecto.archivo_pdf);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM proyectos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Proyecto eliminado' });
});

// POST /api/proyectos/:id/calificar
router.post('/:id/calificar', auth, (req, res) => {
  const { puntuacion, comentario } = req.body;
  if (!puntuacion || puntuacion < 1 || puntuacion > 5)
    return res.status(400).json({ error: 'Puntuación entre 1 y 5' });

  const exists = db.prepare('SELECT id FROM calificaciones WHERE proyecto_id=? AND usuario_id=?').get(req.params.id, req.user.id);
  if (exists) {
    db.prepare('UPDATE calificaciones SET puntuacion=?, comentario=? WHERE proyecto_id=? AND usuario_id=?')
      .run(puntuacion, comentario, req.params.id, req.user.id);
  } else {
    db.prepare('INSERT INTO calificaciones (proyecto_id, usuario_id, puntuacion, comentario) VALUES (?,?,?,?)')
      .run(req.params.id, req.user.id, puntuacion, comentario);
  }

  const stats = db.prepare('SELECT AVG(puntuacion) as avg, COUNT(*) as total FROM calificaciones WHERE proyecto_id=?').get(req.params.id);
  db.prepare('UPDATE proyectos SET calificacion_promedio=?, total_calificaciones=? WHERE id=?')
    .run(Math.round(stats.avg * 10) / 10, stats.total, req.params.id);

  res.json({ message: 'Calificación guardada', promedio: stats.avg });
});

// POST /api/proyectos/:id/comentar
router.post('/:id/comentar', auth, (req, res) => {
  const { contenido } = req.body;
  if (!contenido?.trim()) return res.status(400).json({ error: 'Comentario vacío' });

  db.prepare('INSERT INTO comentarios (proyecto_id, usuario_id, contenido) VALUES (?,?,?)')
    .run(req.params.id, req.user.id, contenido.trim());
  res.status(201).json({ message: 'Comentario añadido' });
});

// POST /api/proyectos/:id/descargar
router.post('/:id/descargar', (req, res) => {
  db.prepare('UPDATE proyectos SET descargas = descargas + 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/proyectos/:id/favorito
router.post('/:id/favorito', auth, (req, res) => {
  const exists = db.prepare('SELECT id FROM favoritos WHERE usuario_id=? AND proyecto_id=?').get(req.user.id, req.params.id);
  if (exists) {
    db.prepare('DELETE FROM favoritos WHERE usuario_id=? AND proyecto_id=?').run(req.user.id, req.params.id);
    res.json({ favorito: false });
  } else {
    db.prepare('INSERT INTO favoritos (usuario_id, proyecto_id) VALUES (?,?)').run(req.user.id, req.params.id);
    res.json({ favorito: true });
  }
});

module.exports = router;
