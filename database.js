const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDB() {
  // Usuarios
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
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
    )
  `);

  // Categorias
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      color TEXT,
      icono TEXT
    )
  `);

  // Proyectos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS proyectos (
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
    )
  `);

  // Calificaciones
  await db.execute(`
    CREATE TABLE IF NOT EXISTS calificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER REFERENCES proyectos(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      puntuacion INTEGER CHECK(puntuacion BETWEEN 1 AND 5),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proyecto_id, usuario_id)
    )
  `);

  // Comentarios
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER REFERENCES proyectos(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      contenido TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Favoritos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS favoritos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER REFERENCES proyectos(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proyecto_id, usuario_id)
    )
  `);

  // Notificaciones
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER REFERENCES usuarios(id),
      mensaje TEXT NOT NULL,
      leido INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed categorias
  const cats = await db.execute('SELECT COUNT(*) as count FROM categorias');
  if (cats.rows[0].count === 0) {
    const categorias = [
      ['Matemáticas', 'Proyectos de matemáticas y estadística', '#E74C3C', '📐'],
      ['Física', 'Experimentos y proyectos de física', '#3498DB', '⚗️'],
      ['Química', 'Proyectos de química y laboratorio', '#2ECC71', '🧪'],
      ['Biología', 'Proyectos de ciencias biológicas', '#27AE60', '🌿'],
      ['Tecnología', 'Proyectos de tecnología e innovación', '#9B59B6', '💻'],
      ['Investigación', 'Proyectos de investigación general', '#14B8A6', '🔍'],
    ];
    for (const cat of categorias) {
      await db.execute({
        sql: 'INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?, ?, ?, ?)',
        args: cat,
      });
    }
  }

  // Seed usuarios demo
  const usuarios = await db.execute('SELECT COUNT(*) as count FROM usuarios');
  if (usuarios.rows[0].count === 0) {
    const pass = await bcrypt.hash('123456', 10);
    const adminPass = await bcrypt.hash('Admin2024!', 10);

    await db.execute({
      sql: `INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)`,
      args: ['Admin', 'Sistema', 'admin@esfm.edu.bo', adminPass, 'admin'],
    });
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['María', 'González', 'maria@esfm.edu.bo', pass, 'estudiante', 'Matemáticas', 4],
    });
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['Carlos', 'Mamani', 'carlos@esfm.edu.bo', pass, 'estudiante', 'Física', 6],
    });
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['Ana', 'Quispe', 'ana@esfm.edu.bo', pass, 'estudiante', 'Química', 3],
    });
    await db.execute({
      sql: `INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera) VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['Dr. Roberto', 'Flores', 'rflores@esfm.edu.bo', await bcrypt.hash('docente123', 10), 'docente', 'Matemáticas'],
    });

    console.log('✅ Base de datos inicializada con datos de prueba');
    console.log('🔑 Admin: admin@esfm.edu.bo | Contraseña: Admin2024!');
  }
}

initDB().catch(console.error);

module.exports = db;
