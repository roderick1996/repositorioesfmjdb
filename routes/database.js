const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: process.env.TURSO_URL || 'file:data/repositorio.db',
  authToken: process.env.TURSO_TOKEN || '',
});

async function q(sql, args = []) {
  const res = await client.execute({ sql, args });
  return res;
}

async function initDB() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, apellido TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, rol TEXT DEFAULT 'estudiante', carrera TEXT, semestre INTEGER, avatar TEXT, activo INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME);
    CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, descripcion TEXT, color TEXT DEFAULT '#4F46E5', icono TEXT DEFAULT '📁', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS proyectos (id INTEGER PRIMARY KEY AUTOINCREMENT, titulo TEXT NOT NULL, descripcion TEXT NOT NULL, resumen TEXT, autor_id INTEGER NOT NULL, categoria_id INTEGER, carrera TEXT, semestre INTEGER, anio INTEGER, palabras_clave TEXT, archivo_pdf TEXT, archivo_nombre TEXT, archivo_tamano INTEGER, estado TEXT DEFAULT 'pendiente', destacado INTEGER DEFAULT 0, visitas INTEGER DEFAULT 0, descargas INTEGER DEFAULT 0, calificacion_promedio REAL DEFAULT 0, total_calificaciones INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS calificaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL, usuario_id INTEGER NOT NULL, puntuacion INTEGER NOT NULL, comentario TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(proyecto_id, usuario_id));
    CREATE TABLE IF NOT EXISTS comentarios (id INTEGER PRIMARY KEY AUTOINCREMENT, proyecto_id INTEGER NOT NULL, usuario_id INTEGER NOT NULL, contenido TEXT NOT NULL, aprobado INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS favoritos (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, proyecto_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(usuario_id, proyecto_id));
    CREATE TABLE IF NOT EXISTS notificaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL, titulo TEXT NOT NULL, mensaje TEXT NOT NULL, tipo TEXT DEFAULT 'info', leida INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);

  const adminRes = await q('SELECT id FROM usuarios WHERE email = ?', ['admin@esfm.edu.bo']);
  if (adminRes.rows.length === 0) {
    const hash = bcrypt.hashSync('Admin2024!', 12);
    await q('INSERT INTO usuarios (nombre,apellido,email,password,rol,carrera) VALUES (?,?,?,?,?,?)', ['Administrador','ESFM','admin@esfm.edu.bo',hash,'admin','Administración']);
    const cats = [
      ['Matemáticas','Proyectos de matemáticas','#6366F1','📐'],
      ['Física','Investigaciones en física','#8B5CF6','⚛️'],
      ['Química','Proyectos de química','#EC4899','🧪'],
      ['Biología','Investigaciones biológicas','#10B981','🔬'],
      ['Tecnología','Proyectos tecnológicos','#F59E0B','💻'],
      ['Educación','Investigaciones pedagógicas','#3B82F6','📚'],
      ['Ciencias Sociales','Estudios sociales','#EF4444','🌍'],
      ['Investigación','Proyectos de investigación','#14B8A6','🔍'],
    ];
    for (const c of cats) {
      await q('INSERT OR IGNORE INTO categorias (nombre,descripcion,color,icono) VALUES (?,?,?,?)', c);
    }
    console.log('✅ DB inicializada | admin@esfm.edu.bo / Admin2024!');
  }
}

module.exports = { q, initDB };
