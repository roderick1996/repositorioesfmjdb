const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// Función helper compatible con el código existente
async function q(sql, args = []) {
  return await db.execute({ sql, args });
}

async function initDB() {
  await q(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'estudiante' CHECK(rol IN ('admin','docente','estudiante')),
    carrera TEXT,
    semestre INTEGER,
    avatar TEXT,
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);

  await q(`CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    color TEXT,
    icono TEXT
  )`);

  await q(`CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    archivo_url TEXT,
    imagen_url TEXT,
    autor_id INTEGER REFERENCES usuarios(id),
    categoria_id INTEGER REFERENCES categorias(id),
    semestre INTEGER,
    anio INTEGER,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
    vistas INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await q(`CREATE TABLE IF NOT EXISTS calificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    puntuacion INTEGER CHECK(puntuacion BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proyecto_id, usuario_id)
  )`);

  await q(`CREATE TABLE IF NOT EXISTS comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await q(`CREATE TABLE IF NOT EXISTS favoritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proyecto_id, usuario_id)
  )`);

  await q(`CREATE TABLE IF NOT EXISTS notificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER REFERENCES usuarios(id),
    mensaje TEXT NOT NULL,
    leido INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed categorias
  const cats = await q('SELECT COUNT(*) as count FROM categorias');
  if (Number(cats.rows[0].count) === 0) {
    const categorias = [
      ['Matemáticas', 'Proyectos de matemáticas y estadística', '#E74C3C', '📐'],
      ['Física', 'Experimentos y proyectos de física', '#3498DB', '⚗️'],
      ['Química', 'Proyectos de química y laboratorio', '#2ECC71', '🧪'],
      ['Biología', 'Proyectos de ciencias biológicas', '#27AE60', '🌿'],
      ['Tecnología', 'Proyectos de tecnología e innovación', '#9B59B6', '💻'],
      ['Investigación', 'Proyectos de investigación general', '#14B8A6', '🔍'],
    ];
    for (const cat of categorias) {
      await q('INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?, ?, ?, ?)', cat);
    }
  }

  // Seed usuarios demo
  const usuarios = await q('SELECT COUNT(*) as count FROM usuarios');
  if (Number(usuarios.rows[0].count) === 0) {
    const pass = bcrypt.hashSync('123456', 10);
    const adminPass = bcrypt.hashSync('Admin2024!', 10);
    const docentePass = bcrypt.hashSync('docente123', 10);

    await q('INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)',
      ['Admin', 'Sistema', 'admin@esfm.edu.bo', adminPass, 'admin']);
    await q('INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['María', 'González', 'maria@esfm.edu.bo', pass, 'estudiante', 'Matemáticas', 4]);
    await q('INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Carlos', 'Mamani', 'carlos@esfm.edu.bo', pass, 'estudiante', 'Física', 6]);
    await q('INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Ana', 'Quispe', 'ana@esfm.edu.bo', pass, 'estudiante', 'Química', 3]);
    await q('INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera) VALUES (?, ?, ?, ?, ?, ?)',
      ['Dr. Roberto', 'Flores', 'rflores@esfm.edu.bo', docentePass, 'docente', 'Matemáticas']);

    console.log('✅ Base de datos inicializada con datos de prueba');
    console.log('🔑 Admin: admin@esfm.edu.bo | Contraseña: Admin2024!');
  }
}

initDB().catch(console.error);

module.exports = { db, q };
