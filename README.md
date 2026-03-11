# 🎓 Repositorio Académico Digital — ESFM José David Berrios

Sistema completo de repositorio de proyectos académicos con subida de PDFs, autenticación de usuarios, moderación y panel de administración.

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos
- **Node.js** v18 o superior  
- **npm** v8 o superior  
- Sistema operativo: Linux, macOS o Windows

### Pasos de instalación

```bash
# 1. Clonar o descomprimir el proyecto
cd esfm-repositorio

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Iniciar el servidor
node server.js
```

El sistema estará disponible en: **http://localhost:3000**

---

## 👤 Cuentas de Acceso por Defecto

| Rol | Email | Contraseña |
|-----|-------|------------|
| 👑 Administrador | admin@esfm.edu.bo | Admin2024! |
| 📖 Docente | rflores@esfm.edu.bo | docente123 |
| 🎓 Estudiante | maria@esfm.edu.bo | 123456 |

> ⚠️ **Importante**: Cambia las contraseñas antes de publicar en internet.

---

## 🌐 Publicar en Internet (Gratis)

### Opción 1: Railway.app (Recomendado)
1. Crea cuenta en https://railway.app
2. Sube el proyecto a GitHub
3. En Railway: "New Project" → "Deploy from GitHub"
4. Selecciona el repositorio
5. Configura la variable de entorno: `PORT=3000`
6. Railway te dará una URL pública automáticamente

### Opción 2: Render.com
1. Crea cuenta en https://render.com
2. "New Web Service" → conecta tu repo de GitHub
3. Build Command: `cd backend && npm install`
4. Start Command: `cd backend && node server.js`
5. URL pública automática (formato: `tu-proyecto.onrender.com`)

### Opción 3: VPS/Servidor propio
```bash
# Instalar Node.js en Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 para mantener el servidor activo
npm install -g pm2

# Iniciar con PM2
cd backend
pm2 start server.js --name "esfm-repositorio"
pm2 startup  # Para que inicie automáticamente
pm2 save
```

---

## 📁 Estructura del Proyecto

```
esfm-repositorio/
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── database.js        # Base de datos SQLite + seed inicial
│   ├── middleware/
│   │   └── auth.js        # Autenticación JWT
│   └── routes/
│       ├── auth.js        # Login, registro, perfil
│       ├── proyectos.js   # CRUD proyectos + upload PDF
│       ├── usuarios.js    # Gestión de usuarios
│       ├── categorias.js  # Categorías académicas
│       └── estadisticas.js # Dashboard de estadísticas
├── frontend/
│   └── public/
│       ├── index.html     # SPA (Single Page Application)
│       ├── css/style.css  # Estilos completos
│       ├── js/app.js      # Lógica del frontend
│       └── uploads/pdfs/ # PDFs subidos por estudiantes
├── data/
│   └── repositorio.db    # Base de datos SQLite (auto-generado)
└── README.md
```

---

## 🔧 Funcionalidades

### Para Estudiantes
- ✅ Registro e inicio de sesión
- ✅ Subir proyectos en PDF (hasta 50MB)
- ✅ Ver estado del proyecto (pendiente / aprobado / rechazado)
- ✅ Calificar proyectos de otros (1-5 estrellas)
- ✅ Comentar en proyectos
- ✅ Guardar favoritos
- ✅ Gestionar perfil personal

### Para Docentes
- ✅ Todo lo de estudiantes
- ✅ Aprobar / rechazar proyectos
- ✅ Ver todos los proyectos pendientes

### Para Administradores
- ✅ Todo lo anterior
- ✅ Destacar proyectos en portada
- ✅ Gestionar usuarios (cambiar roles, activar/desactivar)
- ✅ Panel de estadísticas completo
- ✅ Eliminar cualquier proyecto

### Repositorio
- ✅ Búsqueda por texto, categoría, carrera y año
- ✅ Filtros avanzados con múltiples criterios
- ✅ Vista en cuadrícula o lista
- ✅ Paginación
- ✅ Proyectos relacionados
- ✅ Contador de visitas y descargas

---

## ⚙️ Variables de Entorno (Opcional)

Crea un archivo `.env` en la carpeta `backend/`:

```env
PORT=3000
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
```

---

## 🛡️ Seguridad Incluida

- Autenticación JWT con expiración de 7 días
- Contraseñas hasheadas con bcrypt (12 rounds)
- Rate limiting: 200 requests por 15 minutos
- Headers de seguridad con Helmet
- Validación de tipos de archivo (solo PDF)
- Límite de tamaño de archivo (50MB)
- Roles y permisos por endpoint

---

## 📊 Base de Datos

SQLite con las siguientes tablas:
- `usuarios` — Cuentas de acceso
- `proyectos` — Proyectos académicos con archivos PDF
- `categorias` — Áreas de conocimiento (8 predefinidas)
- `calificaciones` — Puntuaciones de proyectos
- `comentarios` — Comentarios en proyectos
- `favoritos` — Proyectos guardados por usuarios
- `notificaciones` — Sistema de notificaciones

---

## 📞 Soporte

Para soporte técnico, contactar al administrador del sistema.

**ESFM José David Berrios — Bolivia 🇧🇴**
