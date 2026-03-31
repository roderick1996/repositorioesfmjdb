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
      GROUP BY c.id, c.nombre, c.descripcion, c.color, c.icono
      ORDER BY c.nombre
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { nombre, descripcion, color, icono } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await q(
      'INSERT INTO categorias (nombre, descripcion, color, icono) VALUES ($1,$2,$3,$4) RETURNING id',
      [nombre, descripcion || '', color || '#4F46E5', icono || '📁']
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Categoría creada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await q('DELETE FROM categorias WHERE id=$1', [req.params.id]);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
