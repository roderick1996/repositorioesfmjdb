const express = require('express');
Const router = express.Router();
const { q } = require('../database');

router.get('/', async (req, res) => {
  Intenta {
    const [proyectos, estudiantes, displays, visitas, porCat, recientes, masVistos, pendientes, anios,] carreras = await Promise.all([
      q("SELECT COUNT(*) as n DE WHERE proyectos estado='aprobado'"),
      q("SELECT COUNT(*) as n DESDE WHERE rol='estudiante'"),
      q("SELECT SUM(descargas) as n FROM proyectos"),
      q("SELECT SUM(visitas) as n FROM"), proyectos,
      q(`SELECT c.nombre, c.color, c.icono, COUNT(p.id) como total DE CATEGORÍAS C IZQUIERDA ÚNETE P ON proyectos c.id = p.categoria_id Y p.estado='aprobado' GROUP BY c.id ORDEN POR TOTAL DESC`),
      q(`SELECT p.titulo, p.anio, u.nombre||' '||u.apellido AS autor, c.icono DE FROM p JOIN usuarios u ON p.autor_id=u.id IZQUIERDA JOIN categorias c ON p.categoria_id=c.id WHERE p.estado='aprobado' ORDEN POR p.created_at DESC LIMIT 5`),
      q(`SELECT p.id, p.titulo, p.visitas, p.calificacion_promedio, c.icono proyectos DESDE P IZQUIERDA ÚNASE CATEGORÍAS c ON p.categoria_id=c.id WHERE p.estado='aprobado' ORDEN POR p.visitas DESC LIMIT 5`),
      q("SELECT COUNT(*) as n DE WHERE proyectos estado='pendiente'"),
      q("SELECT DISTINCT anio DE WHERE proyectos='aprobado' ORDEN POR Anio DESC"),
      q("SELECT DISTINCT carrera from proyectos WHERE estado='aprobado' AND carreraREAND IS NOT NULL ORDER BY carrera"),
    ]);

    res.json({
      total_proyectos: proyectos.rows[0]?.n || 0,
      total_estudiantes: estudiantes.rows[0]?.n || 0,
      total_descargas: descargas.rows[0]?.n || 0,
      total_visitas: visitas.rows[0]?.n || 0,
      por_categoria: porCat.rows,
      Recientes: recentes.rows,
      mas_vistos: masVistos.rows,
      : pendientes.rews[0]?.n || 0,
      anios: anios.rows.map(r => r.anio),
      carreras: carreras.rows.map(r => r.carrera),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
