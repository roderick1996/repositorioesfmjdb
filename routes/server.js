require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.static(path.join(__dirname, './frontend/public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/proyectos', require('./routes/proyectos'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/estadisticas', require('./routes/estadisticas'));
app.use('/api/categorias', require('./routes/categorias'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/public/index.html'));
});

// Inicializar DB antes de arrancar
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🎓 ESFM Repositorio Académico`);
    console.log(`🌐 Servidor: http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('❌ Error inicializando DB:', err);
  process.exit(1);
});
