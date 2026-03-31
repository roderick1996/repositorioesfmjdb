const express = require('express');
const router = express.Router();
const { q } = require('../database');

router.get('/', async (req, res) => {
  try {
    const [proyectos, estudiantes, descargas, visitas, porCat, recientes, masVistos, pendientes, anios, carreras] = await Promise.all([
      q("SELECT COUNT(*) as n FROM proyectos WHERE estado='aprobado'"),
      q("SELECT COUNT(*) as n FROM usuarios WHERE rol='estudiante'"),
      q("SELECT COALESCE(SUM(descargas),0) as n FROM proyectos"),
      q("SELECT COALESCE(SUM(vistas),0) as n FROM proyectos"),
      q(`SELECT c.nombre, c.color, c.icono, COUNT(p.id) as total FROM categorias c LEFT JOIN proyectos p ON c.id = p.categoria_id AND p.estado='aprobado' GROUP BY c.id, c.nombre, c.color, c.icono ORDER BY total DESC`),
      q(`SELECT p.titulo, p.anio, u.nombre||' '||u.apellido AS autor, c.icono FROM proyectos p JOIN usuarios u ON p.autor_id=u.id LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.estado='aprobado' ORDER BY p.created_at DESC LIMIT 5`),
      q(`SELECT p.id, p.titulo, p.vistas, p.calificacion_promedio, c.icono FROM proyectos p LEFT JOIN categorias c ON p.categoria_id=c.id WHERE p.estado='aprobado' ORDER BY p.vistas DESC LIMIT 5`),
      q("SELECT COUNT(*) as n FROM proyectos WHERE estado='pendiente'"),
      q("SELECT DISTINCT anio FROM proyectos WHERE estado='aprobado' ORDER BY anio DESC"),
      q("SELECT DISTINCT carrera FROM proyectos WHERE estado='aprobado' AND carrera IS NOT NULL ORDER BY carrera"),
    ]);
    res.json({
      total_proyectos: parseInt(proyectos.rows[0]?.n) || 0,
      total_estudiantes: parseInt(estudiantes.rows[0]?.n) || 0,
      total_descargas: parseInt(descargas.rows[0]?.n) || 0,
      total_visitas: parseInt(visitas.rows[0]?.n) || 0,
      por_categoria: porCat.rows,
      recientes: recientes.rows,
      mas_vistos: masVistos.rows,
      pendientes: parseInt(pendientes.rows[0]?.n) || 0,
      anios: anios.rows.map(r => r.anio),
      carreras: carreras.rows.map(r => r.carrera),
    });
  } catch (err) {
    console.error('Error estadisticas:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
