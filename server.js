require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Security middleware
const app = express();
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, './frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../frontend/public/uploads')));

// Routes
const authRoutes = require('./routes/auth');
const proyectosRoutes = require('./routes/proyectos');
const usuariosRoutes = require('./routes/usuarios');
const estadisticasRoutes = require('./routes/estadisticas');
const categoriasRoutes = require('./routes/categorias');

app.use('/api/auth', authRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/categorias', categoriasRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎓 ESFM Repositorio Académico`);
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📚 Listo para recibir proyectos!\n`);
});
