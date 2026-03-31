const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function q(sql, args = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, args);
  return {
    rows: result.rows,
    lastInsertRowid: result.rows[0]?.id || null
  };
}

async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rol TEXT DEFAULT 'estudiante' CHECK(rol IN ('admin','docente','estudiante')),
    carrera TEXT,
    semestre INTEGER,
    avatar TEXT,
    activo INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    color TEXT,
    icono TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS proyectos (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    resumen TEXT,
    archivo_pdf TEXT,
    archivo_nombre TEXT,
    archivo_tamano INTEGER,
    imagen_url TEXT,
    autor_id INTEGER REFERENCES usuarios(id),
    categoria_id INTEGER REFERENCES categorias(id),
    carrera TEXT,
    semestre INTEGER,
    anio INTEGER,
    palabras_clave TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
    destacado INTEGER DEFAULT 0,
    vistas INTEGER DEFAULT 0,
    descargas INTEGER DEFAULT 0,
    calificacion_promedio NUMERIC DEFAULT 0,
    total_calificaciones INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS calificaciones (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    puntuacion INTEGER CHECK(puntuacion BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proyecto_id, usuario_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    aprobado INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS favoritos (
    id SERIAL PRIMARY KEY,
    proyecto_id INTEGER REFERENCES proyectos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proyecto_id, usuario_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    titulo TEXT,
    mensaje TEXT NOT NULL,
    tipo TEXT,
    leido INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed categorias
  const cats = await pool.query('SELECT COUNT(*) as count FROM categorias');
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
      await pool.query(
        'INSERT INTO categorias (nombre, descripcion, color, icono) VALUES ($1,$2,$3,$4)',
        cat
      );
    }
  }

  // Seed usuarios demo
  const usuarios = await pool.query('SELECT COUNT(*) as count FROM usuarios');
  if (Number(usuarios.rows[0].count) === 0) {
    const pass = bcrypt.hashSync('123456', 10);
    const adminPass = bcrypt.hashSync('Admin2024!', 10);
    const docentePass = bcrypt.hashSync('docente123', 10);

    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES ($1,$2,$3,$4,$5)',
      ['Admin', 'Sistema', 'admin@esfm.edu.bo', adminPass, 'admin']);
    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      ['María', 'González', 'maria@esfm.edu.bo', pass, 'estudiante', 'Matemáticas', 4]);
    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      ['Carlos', 'Mamani', 'carlos@esfm.edu.bo', pass, 'estudiante', 'Física', 6]);
    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      ['Ana', 'Quispe', 'ana@esfm.edu.bo', pass, 'estudiante', 'Química', 3]);
    await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera) VALUES ($1,$2,$3,$4,$5,$6)',
      ['Dr. Roberto', 'Flores', 'rflores@esfm.edu.bo', docentePass, 'docente', 'Matemáticas']);

    console.log('✅ Base de datos inicializada con datos de prueba');
    console.log('🔑 Admin: admin@esfm.edu.bo | Contraseña: Admin2024!');
  }
}

async function migrateDB() {
  const cols = [
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS resumen TEXT',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS archivo_pdf TEXT',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS archivo_nombre TEXT',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS archivo_tamano INTEGER',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS palabras_clave TEXT',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS destacado INTEGER DEFAULT 0',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS descargas INTEGER DEFAULT 0',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC DEFAULT 0',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER DEFAULT 0',
    'ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT',
    'ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS tipo TEXT',
    'ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS aprobado INTEGER DEFAULT 1',
    'ALTER TABLE calificaciones ADD COLUMN IF NOT EXISTS comentario TEXT',
  ];
  for (const sql of cols) {
    await pool.query(sql).catch(() => {});
  }
}

initDB().catch(console.error);
migrateDB().catch(console.error);

module.exports = { pool, q };
