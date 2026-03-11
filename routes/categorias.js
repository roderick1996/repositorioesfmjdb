const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', (req, res) => {
  const cats = db.prepare(`
    SELECT c.*, COUNT(p.id) as total_proyectos
    FROM categorias c
    LEFT JOIN proyectos p ON c.id = p.categoria_id AND p.estado = 'aprobado'
    GROUP BY c.id ORDER BY c.nombre
  `).all();
  res.json(cats);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { nombre, descripcion, color, icono } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare('INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?,?,?,?)').run(nombre, descripcion || '', color || '#4F46E5', icono || '📁');
  res.status(201).json({ id: r.lastInsertRowid, message: 'Categoría creada' });
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM categorias WHERE id=?').run(req.params.id);
  res.json({ message: 'Categoría eliminada' });
});

module.exports = router;
