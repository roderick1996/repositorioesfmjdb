const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const stats = {
    total_proyectos: db.prepare("SELECT COUNT(*) as n FROM proyectos WHERE estado='aprobado'").get().n,
    total_estudiantes: db.prepare("SELECT COUNT(*) as n FROM usuarios WHERE rol='estudiante'").get().n,
    total_descargas: db.prepare("SELECT SUM(descargas) as n FROM proyectos").get().n || 0,
    total_visitas: db.prepare("SELECT SUM(visitas) as n FROM proyectos").get().n || 0,
    por_categoria: db.prepare(`
      SELECT c.nombre, c.color, c.icono, COUNT(p.id) as total
      FROM categorias c LEFT JOIN proyectos p ON c.id = p.categoria_id AND p.estado='aprobado'
      GROUP BY c.id ORDER BY total DESC
    `).all(),
    recientes: db.prepare(`
      SELECT p.titulo, p.anio, u.nombre||' '||u.apellido AS autor, c.icono
      FROM proyectos p JOIN usuarios u ON p.autor_id=u.id
      LEFT JOIN categorias c ON p.categoria_id=c.id
      WHERE p.estado='aprobado' ORDER BY p.created_at DESC LIMIT 5
    `).all(),
    mas_vistos: db.prepare(`
      SELECT p.id, p.titulo, p.visitas, p.calificacion_promedio, c.icono
      FROM proyectos p LEFT JOIN categorias c ON p.categoria_id=c.id
      WHERE p.estado='aprobado' ORDER BY p.visitas DESC LIMIT 5
    `).all(),
    pendientes: db.prepare("SELECT COUNT(*) as n FROM proyectos WHERE estado='pendiente'").get().n,
    anios: db.prepare("SELECT DISTINCT anio FROM proyectos WHERE estado='aprobado' ORDER BY anio DESC").all().map(r => r.anio),
    carreras: db.prepare("SELECT DISTINCT carrera FROM proyectos WHERE estado='aprobado' AND carrera IS NOT NULL ORDER BY carrera").all().map(r => r.carrera),
  };
  res.json(stats);
});

module.exports = router;

// Categorías
const routerCat = express.Router();

routerCat.get('/', (req, res) => {
  const cats = db.prepare('SELECT * FROM categorias ORDER BY nombre').all();
  res.json(cats);
});

routerCat.post('/', require('../middleware/auth').auth, require('../middleware/auth').adminOnly, (req, res) => {
  const { nombre, descripcion, color, icono } = req.body;
  const r = db.prepare('INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?,?,?,?)').run(nombre, descripcion, color, icono);
  res.status(201).json({ id: r.lastInsertRowid });
});

module.exports.categorias = routerCat;
module.exports = router;
