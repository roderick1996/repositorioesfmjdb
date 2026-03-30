// =============================================
//  RUTA EXTRA: Exportar usuarios (para admin)
//  Agregar en routes/usuarios.js al final
// =============================================

// GET /api/usuarios/admin/exportar
// Solo admin puede descargar lista completa de usuarios
router.get('/admin/exportar', auth, adminOnly, (req, res) => {
  const usuarios = db.prepare(`
    SELECT 
      u.id, u.nombre, u.apellido, u.email, u.rol,
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
