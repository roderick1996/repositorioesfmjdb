const express = require('express');
const router = express.Router();
const { q } = require('../database');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await q(`
      SELECT c.*, COUNT(p.id) as total_proyectos
      FROM categorias c
      LEFT JOIN proyectos p ON c.id = p.categoria_id AND p.estado = 'aprobado'
      GROUP BY c.id ORDER BY c.nombre
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { nombre, descripcion, color, icono } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await q(
      'INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?,?,?,?)',
      [nombre, descripcion || '', color || '#4F46E5', icono || '📁']
    );
    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Categoría creada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await q('DELETE FROM categorias WHERE id=?', [req.params.id]);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
