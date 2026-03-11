const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data/repositorio.db');
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    color TEXT DEFAULT '#4F46E5',
    icono TEXT DEFAULT '📁',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    resumen TEXT,
    autor_id INTEGER NOT NULL,
    categoria_id INTEGER,
    carrera TEXT,
    semestre INTEGER,
    anio INTEGER,
    palabras_clave TEXT,
    archivo_pdf TEXT,
    archivo_nombre TEXT,
    archivo_tamano INTEGER,
    portada TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
    destacado INTEGER DEFAULT 0,
    visitas INTEGER DEFAULT 0,
    descargas INTEGER DEFAULT 0,
    calificacion_promedio REAL DEFAULT 0,
    total_calificaciones INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES usuarios(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );

  CREATE TABLE IF NOT EXISTS calificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    puntuacion INTEGER NOT NULL CHECK(puntuacion BETWEEN 1 AND 5),
    comentario TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE(proyecto_id, usuario_id)
  );

  CREATE TABLE IF NOT EXISTS comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    contenido TEXT NOT NULL,
    aprobado INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS favoritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    proyecto_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    UNIQUE(usuario_id, proyecto_id)
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    tipo TEXT DEFAULT 'info',
    leida INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  );

  CREATE INDEX IF NOT EXISTS idx_proyectos_estado ON proyectos(estado);
  CREATE INDEX IF NOT EXISTS idx_proyectos_categoria ON proyectos(categoria_id);
  CREATE INDEX IF NOT EXISTS idx_proyectos_autor ON proyectos(autor_id);
  CREATE VIRTUAL TABLE IF NOT EXISTS proyectos_fts USING fts5(titulo, descripcion, palabras_clave, content=proyectos, content_rowid=id);
`);

// Seed initial data
const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@esfm.edu.bo');

if (!adminExists) {
  const hash = bcrypt.hashSync('Admin2024!', 12);
  db.prepare(`
    INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('Administrador', 'ESFM', 'admin@esfm.edu.bo', hash, 'admin', 'Administración');

  // Seed categories
  const cats = [
    ['Matemáticas', 'Proyectos de matemáticas puras y aplicadas', '#6366F1', '📐'],
    ['Física', 'Investigaciones en física experimental y teórica', '#8B5CF6', '⚛️'],
    ['Química', 'Proyectos de química orgánica e inorgánica', '#EC4899', '🧪'],
    ['Biología', 'Investigaciones biológicas y ciencias naturales', '#10B981', '🔬'],
    ['Tecnología', 'Proyectos tecnológicos e innovación', '#F59E0B', '💻'],
    ['Educación', 'Investigaciones pedagógicas y didácticas', '#3B82F6', '📚'],
    ['Ciencias Sociales', 'Estudios sociales y humanísticos', '#EF4444', '🌍'],
    ['Investigación', 'Proyectos de investigación general', '#14B8A6', '🔍'],
  ];
  const insertCat = db.prepare('INSERT INTO categorias (nombre, descripcion, color, icono) VALUES (?, ?, ?, ?)');
  cats.forEach(c => insertCat.run(...c));

  // Seed demo students
  const pass = bcrypt.hashSync('123456', 10);
  const insertUser = db.prepare(`
    INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera, semestre)
    VALUES (?, ?, ?, ?, 'estudiante', ?, ?)
  `);
  insertUser.run('María', 'González', 'maria@esfm.edu.bo', pass, 'Matemáticas', 4);
  insertUser.run('Carlos', 'Mamani', 'carlos@esfm.edu.bo', pass, 'Física', 6);
  insertUser.run('Ana', 'Quispe', 'ana@esfm.edu.bo', pass, 'Química', 3);

  const insertProf = db.prepare(`
    INSERT INTO usuarios (nombre, apellido, email, password, rol, carrera)
    VALUES (?, ?, ?, ?, 'docente', ?)
  `);
  insertProf.run('Dr. Roberto', 'Flores', 'rflores@esfm.edu.bo', bcrypt.hashSync('docente123', 10), 'Matemáticas');

  console.log('✅ Base de datos inicializada con datos de prueba');
  console.log('📧 Admin: admin@esfm.edu.bo | Contraseña: Admin2024!');
}

module.exports = db;
