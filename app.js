// =============================================
//  ESFM REPOSITORIO ACADÉMICO - FRONTEND APP
// =============================================

const API = '/api';
let currentUser = null;
let currentPage = 1;
let currentView = 'grid';
let currentFilters = {};
let currentProyectoId = null;
let statsData = {};

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  loadStats();
  loadHomePage();
  setupScrollNavbar();
  setupDragDrop();
  window.addEventListener('popstate', handlePopState);
});

function setupScrollNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
  });
}

// ====== AUTH ======
function initAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(user => {
        if (user) setUser(user);
        else localStorage.removeItem('token');
      }).catch(() => localStorage.removeItem('token'));
  }
}

function setUser(user) {
  currentUser = user;
  document.getElementById('navGuest').classList.add('hidden');
  document.getElementById('navUser').classList.remove('hidden');
  const initials = `${user.nombre[0]}${user.apellido[0]}`.toUpperCase();
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('userAvatarLg').textContent = initials;
  document.getElementById('userNameNav').textContent = user.nombre;
  document.getElementById('dropdownName').textContent = `${user.nombre} ${user.apellido}`;
  document.getElementById('dropdownRole').textContent = user.rol;
  document.getElementById('perfilAvatarBig').textContent = initials;
  document.getElementById('perfilNombreH').textContent = `${user.nombre} ${user.apellido}`;
  document.getElementById('perfilRolBadge').textContent = user.rol;
  document.getElementById('perfilTotalProyectos').textContent = user.total_proyectos || 0;
  document.getElementById('perfilTotalFavs').textContent = user.total_favoritos || 0;
  document.getElementById('perfilNombre').value = user.nombre;
  document.getElementById('perfilApellido').value = user.apellido;
  document.getElementById('perfilCarrera').value = user.carrera || '';
  document.getElementById('perfilSemestre').value = user.semestre || '';
  document.getElementById('upCarrera').value = user.carrera || '';
  document.getElementById('upSemestre').value = user.semestre || '';
  document.getElementById('heroRegisterBtn').textContent = '📤 Subir mi Proyecto →';
  document.getElementById('heroRegisterBtn').onclick = () => openModal('uploadModal');
  if (['admin', 'docente'].includes(user.rol)) {
    document.getElementById('adminMenuItems').classList.remove('hidden');
  }
  loadNotifications();
}

async function doLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');
  btn.textContent = 'Iniciando sesión...';
  btn.disabled = true;
  try {
    const res = await apiFetch('/auth/login', 'POST', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPass').value
    });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    closeModal('loginModal');
    showToast(`¡Bienvenido/a, ${res.user.nombre}! 🎉`, 'success');
    if (['admin', 'docente'].includes(res.user.rol)) loadAdminPendientes();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
  btn.textContent = 'Iniciar Sesión';
  btn.disabled = false;
}

async function doRegister(e) {
  e.preventDefault();
  const errEl = document.getElementById('regError');
  errEl.classList.add('hidden');
  try {
    const res = await apiFetch('/auth/register', 'POST', {
      nombre: document.getElementById('regNombre').value,
      apellido: document.getElementById('regApellido').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPass').value,
      carrera: document.getElementById('regCarrera').value,
      semestre: document.getElementById('regSemestre').value
    });
    localStorage.setItem('token', res.token);
    closeModal('registerModal');
    showToast('¡Cuenta creada exitosamente! 🎓', 'success');
    initAuth();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  document.getElementById('navGuest').classList.remove('hidden');
  document.getElementById('navUser').classList.add('hidden');
  document.getElementById('adminMenuItems').classList.add('hidden');
  showPage('home');
  showToast('Sesión cerrada', 'info');
}

// ====== STATS ======
async function loadStats() {
  try {
    statsData = await apiFetch('/estadisticas', 'GET', null, false);
    animateNumber('heroProyectos', statsData.total_proyectos);
    animateNumber('heroEstudiantes', statsData.total_estudiantes);
    animateNumber('heroDescargas', statsData.total_descargas);
    animateNumber('statProyectos', statsData.total_proyectos);
    animateNumber('statEstudiantes', statsData.total_estudiantes);
    animateNumber('statDescargas', statsData.total_descargas);
    animateNumber('statVisitas', statsData.total_visitas);
  } catch (e) {}
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const increment = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = current.toLocaleString('es-BO');
    if (current >= target) clearInterval(timer);
  }, 40);
}

// ====== HOME ======
async function loadHomePage() {
  await Promise.all([loadHomeCategories(), loadHomeDestacados(), loadHomeRecientes()]);
}

async function loadHomeCategories() {
  try {
    const cats = await apiFetch('/categorias', 'GET', null, false);
    const el = document.getElementById('homeCats');
    el.innerHTML = cats.map(c => `
      <div class="cat-card" onclick="filterByCategory(${c.id})" style="--cat-color:${c.color}">
        <style>.cat-card[onclick*="${c.id}"]::before { background:${c.color}; }</style>
        <span class="cat-icon">${c.icono}</span>
        <div class="cat-name">${c.nombre}</div>
        <div class="cat-count">${c.total_proyectos || 0} proyecto${c.total_proyectos !== 1 ? 's' : ''}</div>
      </div>
    `).join('');
    // Populate repo filter
    const filterDiv = document.getElementById('filterCats');
    filterDiv.innerHTML = cats.map(c => `
      <label class="filter-checkbox">
        <input type="checkbox" value="${c.id}" onchange="applyFilters()">
        <span>${c.icono} ${c.nombre}</span>
      </label>
    `).join('');
    // Populate upload select
    const upCat = document.getElementById('upCategoria');
    cats.forEach(c => {
      const opt = new Option(`${c.icono} ${c.nombre}`, c.id);
      upCat.add(opt);
    });
    // Populate cats detail page
    const detailGrid = document.getElementById('catsDetailGrid');
    detailGrid.innerHTML = cats.map(c => `
      <div class="cat-detail-card" style="border-top-color:${c.color}" onclick="filterByCategory(${c.id})">
        <div class="cat-detail-header">
          <span class="cat-detail-icon">${c.icono}</span>
          <span class="cat-detail-name">${c.nombre}</span>
        </div>
        <p class="cat-detail-desc">${c.descripcion || 'Proyectos académicos de ' + c.nombre}</p>
        <span class="cat-detail-count" style="background:${c.color}">${c.total_proyectos || 0} proyectos</span>
      </div>
    `).join('');
  } catch(e) {}
}

async function loadHomeDestacados() {
  try {
    const data = await apiFetch('/proyectos?destacados=1&limite=6', 'GET', null, false);
    document.getElementById('homeDestacados').innerHTML = data.proyectos.length
      ? data.proyectos.map(p => renderProjectCard(p, 'dark')).join('')
      : '<div class="empty-state"><span class="empty-icon">⭐</span><div class="empty-title">Sin proyectos destacados aún</div></div>';
  } catch(e) {}
}

async function loadHomeRecientes() {
  try {
    const data = await apiFetch('/proyectos?limite=6&orden=reciente', 'GET', null, false);
    document.getElementById('homeRecientes').innerHTML = data.proyectos.length
      ? data.proyectos.map(p => renderProjectCard(p)).join('')
      : '<div class="empty-state"><span class="empty-icon">📚</span><div class="empty-title">Aún no hay proyectos</div></div>';
  } catch(e) {}
}

// ====== REPOSITORIO ======
async function loadRepositorio(page = 1) {
  currentPage = page;
  const grid = document.getElementById('repoGrid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando proyectos...</p></div>';

  const cats = [...document.querySelectorAll('#filterCats input:checked')].map(i => i.value);
  const params = new URLSearchParams({
    pagina: page, limite: 12,
    buscar: document.getElementById('repoSearch').value || '',
    anio: document.getElementById('filterAnio').value || '',
    carrera: document.getElementById('filterCarrera').value || '',
    orden: document.getElementById('filterOrden').value || 'reciente'
  });
  if (cats.length === 1) params.set('categoria', cats[0]);

  try {
    const data = await apiFetch(`/proyectos?${params}`, 'GET', null, false);
    document.getElementById('resultsCount').textContent = `${data.total} proyecto${data.total !== 1 ? 's' : ''} encontrado${data.total !== 1 ? 's' : ''}`;
    grid.innerHTML = data.proyectos.length
      ? data.proyectos.map(p => renderProjectCard(p)).join('')
      : '<div class="empty-state"><span class="empty-icon">🔍</span><div class="empty-title">No se encontraron proyectos</div><p class="empty-desc">Prueba con otros filtros</p></div>';
    renderPagination(data.total, 12, page);
    // Populate filters if first load
    if (statsData.anios) {
      const anioSel = document.getElementById('filterAnio');
      if (anioSel.options.length === 1) {
        statsData.anios.forEach(a => anioSel.add(new Option(a, a)));
      }
    }
    if (statsData.carreras) {
      const carrSel = document.getElementById('filterCarrera');
      if (carrSel.options.length === 1) {
        statsData.carreras.forEach(c => carrSel.add(new Option(c, c)));
      }
    }
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><div class="empty-title">Error al cargar</div></div>';
  }
}

function renderPagination(total, limite, current) {
  const pages = Math.ceil(total / limite);
  const el = document.getElementById('repoPagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="loadRepositorio(${current-1})">←</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= current - 2 && i <= current + 2)) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="loadRepositorio(${i})">${i}</button>`;
    } else if (i === current - 3 || i === current + 3) {
      html += `<span style="color:var(--gray-400);padding:0 4px;">…</span>`;
    }
  }
  if (current < pages) html += `<button class="page-btn" onclick="loadRepositorio(${current+1})">→</button>`;
  el.innerHTML = html;
}

function applyFilters() { loadRepositorio(1); }
function clearFilters() {
  document.getElementById('repoSearch').value = '';
  document.getElementById('filterAnio').value = '';
  document.getElementById('filterCarrera').value = '';
  document.getElementById('filterOrden').value = 'reciente';
  document.querySelectorAll('#filterCats input').forEach(i => i.checked = false);
  loadRepositorio(1);
}

function setView(v) {
  currentView = v;
  document.getElementById('repoGrid').classList.toggle('list-view', v === 'list');
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewList').classList.toggle('active', v === 'list');
}

function filterByCategory(catId) {
  showPage('repositorio');
  document.querySelectorAll('#filterCats input').forEach(i => { i.checked = i.value == catId; });
  loadRepositorio(1);
}

function searchFromHero() {
  const q = document.getElementById('heroSearch').value;
  showPage('repositorio');
  document.getElementById('repoSearch').value = q;
  loadRepositorio(1);
}

// ====== PROJECT CARD ======
function renderProjectCard(p, theme = 'light') {
  const stars = renderStars(p.calificacion_promedio);
  const featured = p.destacado ? '<div class="featured-badge">⭐ Destacado</div>' : '';
  return `
    <div class="project-card" onclick="showProject(${p.id})">
      ${featured}
      <div class="project-card-top">
        ${p.categoria_nombre ? `<span class="project-cat-badge" style="background:${p.categoria_color || '#6366F1'}">${p.categoria_icono} ${p.categoria_nombre}</span>` : '<span></span>'}
        ${p.estado !== 'aprobado' ? `<span class="project-state state-${p.estado}">${p.estado}</span>` : ''}
      </div>
      <div class="project-card-body">
        <div class="project-title">${escHtml(p.titulo)}</div>
        <div class="project-desc">${escHtml(p.descripcion)}</div>
        <div class="project-meta">
          ${p.carrera ? `<span class="project-meta-item">🎓 ${escHtml(p.carrera)}</span>` : ''}
          ${p.anio ? `<span class="project-meta-item">📅 ${p.anio}</span>` : ''}
          ${p.semestre ? `<span class="project-meta-item">📖 Sem. ${p.semestre}</span>` : ''}
        </div>
      </div>
      <div class="project-card-footer">
        <div class="project-author">
          <div class="author-av">${p.autor_nombre ? p.autor_nombre.slice(0,2).toUpperCase() : '??'}</div>
          <span class="author-name">${escHtml(p.autor_nombre || '')}</span>
        </div>
        <div class="project-stats">
          <span class="project-stat">👁 ${p.visitas || 0}</span>
          <span class="project-stat">⬇ ${p.descargas || 0}</span>
          <span class="project-stat stars">${stars}</span>
        </div>
      </div>
    </div>
  `;
}

function renderStars(avg) {
  if (!avg) return '☆☆☆☆☆';
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// ====== PROJECT DETAIL ======
async function showProject(id) {
  currentProyectoId = id;
  showPage('proyecto');
  const container = document.getElementById('proyectoDetail');
  container.innerHTML = '<div class="loading" style="padding:100px"><div class="spinner"></div><p>Cargando proyecto...</p></div>';
  try {
    const p = await apiFetch(`/proyectos/${id}`, 'GET', null, false);
    const isFav = currentUser ? await checkFav(id) : false;
    const stars = renderStarsInteractive(p.calificacion_promedio, p.id);
    container.innerHTML = `
      <div style="background:var(--primary); padding:24px 0; margin-bottom:0;">
        <div style="max-width:1280px;margin:0 auto;padding:0 24px;">
          <div class="detail-breadcrumb">
            <a href="#" onclick="showPage('repositorio')">📚 Repositorio</a>
            <span>›</span>
            <span>${p.categoria_nombre || 'Sin categoría'}</span>
          </div>
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-main">
          <h1 class="detail-title">${escHtml(p.titulo)}</h1>
          <div class="detail-meta-row">
            ${p.categoria_nombre ? `<span class="project-cat-badge" style="background:${p.categoria_color}">${p.categoria_icono} ${p.categoria_nombre}</span>` : ''}
            <div class="detail-author">
              <div class="author-av" style="width:36px;height:36px;font-size:13px">${p.autor_nombre ? p.autor_nombre.slice(0,2).toUpperCase() : '??'}</div>
              <div class="detail-author-info">
                <div class="detail-author-name">${escHtml(p.autor_nombre)}</div>
                <div class="detail-author-sub">${p.autor_carrera || ''} ${p.autor_semestre ? '· Sem. ' + p.autor_semestre : ''}</div>
              </div>
            </div>
            ${p.anio ? `<span class="project-meta-item">📅 ${p.anio}</span>` : ''}
          </div>

          ${p.resumen ? `
          <div class="detail-section">
            <div class="detail-section-title">📋 Resumen</div>
            <div class="detail-desc" style="background:var(--gray-100);padding:20px;border-radius:12px;font-style:italic">${escHtml(p.resumen)}</div>
          </div>` : ''}

          <div class="detail-section">
            <div class="detail-section-title">📖 Descripción Completa</div>
            <div class="detail-desc">${escHtml(p.descripcion)}</div>
          </div>

          ${p.palabras_clave ? `
          <div class="detail-section">
            <div class="detail-section-title">🏷️ Palabras Clave</div>
            <div class="keywords">${p.palabras_clave.split(',').map(k => `<span class="keyword">${escHtml(k.trim())}</span>`).join('')}</div>
          </div>` : ''}

          <!-- CALIFICACIÓN -->
          <div class="detail-section">
            <div class="detail-section-title">⭐ Calificación</div>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
              <span style="font-size:36px;font-weight:700;font-family:var(--font-display)">${p.calificacion_promedio || 0}</span>
              <div>
                <div class="stars" style="font-size:20px">${renderStars(p.calificacion_promedio)}</div>
                <div style="font-size:12px;color:var(--gray-400)">${p.total_calificaciones || 0} calificaciones</div>
              </div>
            </div>
            ${currentUser ? `
            <div>
              <p style="font-size:13px;color:var(--gray-600);margin-bottom:8px">Tu calificación:</p>
              <div class="stars-input" id="starsInput">
                ${[1,2,3,4,5].map(n => `<span class="star" onclick="rateProject(${p.id}, ${n})" onmouseover="highlightStars(${n})" onmouseout="resetStars()">★</span>`).join('')}
              </div>
            </div>` : `<p style="font-size:13px;color:var(--gray-400)"><a href="#" onclick="openModal('loginModal')" style="color:var(--accent)">Inicia sesión</a> para calificar</p>`}
          </div>

          <!-- COMENTARIOS -->
          <div class="detail-section">
            <div class="detail-section-title">💬 Comentarios (${p.comentarios.length})</div>
            ${currentUser ? `
            <div class="comment-form">
              <textarea class="comment-textarea" id="commentInput" placeholder="Comparte tu opinión sobre este proyecto..."></textarea>
              <button onclick="submitComment(${p.id})" class="btn-primary">Publicar Comentario</button>
            </div>` : `<p style="font-size:13px;color:var(--gray-400);margin-bottom:16px"><a href="#" onclick="openModal('loginModal')" style="color:var(--accent)">Inicia sesión</a> para comentar</p>`}
            <div id="commentsList">
              ${p.comentarios.length ? p.comentarios.map(c => `
                <div class="comment-item">
                  <div class="comment-header">
                    <div class="author-av">${c.usuario_nombre.slice(0,2).toUpperCase()}</div>
                    <div>
                      <span class="comment-author">${escHtml(c.usuario_nombre)}</span>
                      <span class="comment-time"> · ${formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div class="comment-text">${escHtml(c.contenido)}</div>
                </div>
              `).join('') : '<p style="color:var(--gray-400);font-size:14px">Sé el primero en comentar</p>'}
            </div>
          </div>
        </div>
        <div class="detail-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-card-body">
              ${p.archivo_pdf ? `
              <a href="${p.archivo_pdf}" target="_blank" class="btn-download" onclick="countDownload(${p.id})">
                📄 Descargar PDF
              </a>` : '<p style="color:var(--gray-400);font-size:13px">Sin archivo disponible</p>'}
              ${currentUser ? `
              <button class="btn-fav" onclick="toggleFav(${p.id})" id="favBtn">
                ${isFav ? '❤️ En Favoritos' : '🤍 Guardar en Favoritos'}
              </button>` : ''}
            </div>
          </div>
          <div class="sidebar-card">
            <div class="sidebar-card-body">
              <div class="sidebar-stat"><span class="sidebar-stat-label">👁 Visitas</span><span class="sidebar-stat-value">${(p.visitas || 0).toLocaleString()}</span></div>
              <div class="sidebar-stat"><span class="sidebar-stat-label">⬇ Descargas</span><span class="sidebar-stat-value">${(p.descargas || 0).toLocaleString()}</span></div>
              <div class="sidebar-stat"><span class="sidebar-stat-label">📅 Año</span><span class="sidebar-stat-value">${p.anio || '-'}</span></div>
              <div class="sidebar-stat"><span class="sidebar-stat-label">🎓 Carrera</span><span class="sidebar-stat-value">${escHtml(p.carrera || '-')}</span></div>
              ${p.semestre ? `<div class="sidebar-stat"><span class="sidebar-stat-label">📖 Semestre</span><span class="sidebar-stat-value">${p.semestre}</span></div>` : ''}
              ${p.archivo_tamano ? `<div class="sidebar-stat"><span class="sidebar-stat-label">📦 Tamaño</span><span class="sidebar-stat-value">${(p.archivo_tamano / 1024 / 1024).toFixed(1)} MB</span></div>` : ''}
              <div class="sidebar-stat"><span class="sidebar-stat-label">📆 Publicado</span><span class="sidebar-stat-value">${formatDate(p.created_at)}</span></div>
            </div>
          </div>
          ${currentUser && ['admin','docente'].includes(currentUser.rol) ? `
          <div class="sidebar-card">
            <div class="sidebar-card-body">
              <p style="font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Moderación</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn-sm btn-approve" onclick="moderateProject(${p.id},'aprobado')">✓ Aprobar</button>
                <button class="btn-sm btn-reject" onclick="moderateProject(${p.id},'rechazado')">✕ Rechazar</button>
                ${currentUser.rol === 'admin' ? `<button class="btn-sm btn-view" onclick="toggleDestacado(${p.id})">${p.destacado ? '★ Quitar' : '★ Destacar'}</button>` : ''}
              </div>
            </div>
          </div>` : ''}
          ${p.relacionados.length ? `
          <div class="sidebar-card">
            <div class="sidebar-card-body">
              <p style="font-size:12px;font-weight:700;color:var(--gray-700);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Proyectos Relacionados</p>
              ${p.relacionados.map(r => `
                <div class="related-item" onclick="showProject(${r.id})">
                  <div class="related-title">${r.categoria_icono || '📄'} ${escHtml(r.titulo)}</div>
                  <div class="related-meta">${escHtml(r.autor_nombre)} · ${r.anio || '-'}</div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  } catch(e) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><div class="empty-title">Error al cargar el proyecto</div></div>';
  }
}

async function checkFav(id) {
  if (!currentUser) return false;
  try {
    const favs = await apiFetch('/usuarios/favoritos', 'GET');
    return favs.some(f => f.id == id);
  } catch { return false; }
}

async function toggleFav(id) {
  try {
    const res = await apiFetch(`/proyectos/${id}/favorito`, 'POST');
    const btn = document.getElementById('favBtn');
    btn.textContent = res.favorito ? '❤️ En Favoritos' : '🤍 Guardar en Favoritos';
    showToast(res.favorito ? 'Añadido a favoritos ❤️' : 'Eliminado de favoritos', 'info');
  } catch (e) { showToast(e.message, 'error'); }
}

function countDownload(id) {
  fetch(`${API}/proyectos/${id}/descargar`, { method: 'POST' });
}

async function submitComment(id) {
  const input = document.getElementById('commentInput');
  const texto = input.value.trim();
  if (!texto) return showToast('Escribe un comentario', 'warning');
  try {
    await apiFetch(`/proyectos/${id}/comentar`, 'POST', { contenido: texto });
    showToast('Comentario publicado ✓', 'success');
    input.value = '';
    showProject(id);
  } catch (e) { showToast(e.message, 'error'); }
}

async function rateProject(id, puntuacion) {
  try {
    await apiFetch(`/proyectos/${id}/calificar`, 'POST', { puntuacion });
    showToast(`Calificación de ${puntuacion} estrellas guardada ⭐`, 'success');
    showProject(id);
  } catch (e) { showToast(e.message, 'error'); }
}

function highlightStars(n) {
  document.querySelectorAll('#starsInput .star').forEach((s, i) => {
    s.style.color = i < n ? 'var(--gold)' : 'var(--gray-300)';
  });
}
function resetStars() {
  document.querySelectorAll('#starsInput .star').forEach(s => s.style.color = '');
}
function renderStarsInteractive(avg, id) { return ''; }

async function moderateProject(id, estado) {
  try {
    await apiFetch(`/proyectos/${id}/estado`, 'PUT', { estado });
    showToast(`Proyecto ${estado} ✓`, 'success');
    showProject(id);
  } catch (e) { showToast(e.message, 'error'); }
}

async function toggleDestacado(id) {
  try {
    const r = await apiFetch(`/proyectos/${id}/destacar`, 'PUT');
    showToast(r.destacado ? '⭐ Proyecto destacado' : 'Proyecto sin destacar', 'info');
    showProject(id);
  } catch (e) { showToast(e.message, 'error'); }
}

// ====== UPLOAD ======
async function uploadProject(e) {
  e.preventDefault();
  if (!currentUser) { openModal('loginModal'); return; }
  const pdf = document.getElementById('upPdf').files[0];
  if (!pdf) return showError('uploadError', 'Selecciona un archivo PDF');

  const btn = document.getElementById('uploadBtn');
  const errEl = document.getElementById('uploadError');
  const progressEl = document.getElementById('uploadProgress');
  const fillEl = document.getElementById('progressFill');
  const textEl = document.getElementById('progressText');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';
  progressEl.classList.remove('hidden');

  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('titulo', document.getElementById('upTitulo').value);
  formData.append('descripcion', document.getElementById('upDescripcion').value);
  formData.append('resumen', document.getElementById('upResumen').value);
  formData.append('categoria_id', document.getElementById('upCategoria').value);
  formData.append('carrera', document.getElementById('upCarrera').value);
  formData.append('semestre', document.getElementById('upSemestre').value);
  formData.append('anio', document.getElementById('upAnio').value);
  formData.append('palabras_clave', document.getElementById('upKeywords').value);

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      fillEl.style.width = pct + '%';
      textEl.textContent = `Subiendo... ${pct}%`;
    }
  };
  xhr.onload = () => {
    progressEl.classList.add('hidden');
    btn.disabled = false;
    btn.textContent = '📤 Subir Proyecto';
    if (xhr.status === 201) {
      closeModal('uploadModal');
      showToast('¡Proyecto subido exitosamente! Pendiente de aprobación 📚', 'success');
      document.getElementById('page-mis-proyectos') && loadMisProyectos();
    } else {
      try {
        const err = JSON.parse(xhr.responseText);
        showError('uploadError', err.error || 'Error al subir');
      } catch { showError('uploadError', 'Error al subir el proyecto'); }
    }
  };
  xhr.onerror = () => {
    progressEl.classList.add('hidden');
    btn.disabled = false;
    btn.textContent = '📤 Subir Proyecto';
    showError('uploadError', 'Error de conexión');
  };
  xhr.open('POST', `${API}/proyectos`);
  xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
  xhr.send(formData);
}

function handlePdfSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const info = document.getElementById('uploadInfo');
  const zone = document.getElementById('uploadZone');
  info.textContent = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
  zone.style.borderColor = 'var(--green)';
  zone.style.background = '#f0fdf4';
}

function setupDragDrop() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      const input = document.getElementById('upPdf');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handlePdfSelect(input);
    } else showToast('Solo se permiten archivos PDF', 'error');
  });
}

// ====== MIS PROYECTOS ======
async function loadMisProyectos() {
  if (!currentUser) return;
  try {
    const proyectos = await apiFetch('/usuarios/mis-proyectos', 'GET');
    const grid = document.getElementById('misProyectosGrid');
    grid.innerHTML = proyectos.length
      ? proyectos.map(p => renderProjectCard(p)).join('')
      : `<div class="empty-state col-full">
          <span class="empty-icon">📁</span>
          <div class="empty-title">Aún no has subido proyectos</div>
          <p class="empty-desc">Comparte tu trabajo con la comunidad</p>
          <button onclick="openModal('uploadModal')" class="btn-primary" style="margin-top:16px">+ Subir mi primer proyecto</button>
        </div>`;
  } catch(e) {}
}

// ====== FAVORITOS ======
async function loadFavoritos() {
  if (!currentUser) return;
  try {
    const favs = await apiFetch('/usuarios/favoritos', 'GET');
    const grid = document.getElementById('favoritosGrid');
    grid.innerHTML = favs.length
      ? favs.map(p => renderProjectCard(p)).join('')
      : '<div class="empty-state"><span class="empty-icon">❤️</span><div class="empty-title">Sin favoritos aún</div></div>';
  } catch(e) {}
}

// ====== NOTIFICACIONES ======
async function loadNotifications() {
  if (!currentUser) return;
  try {
    const notifs = await apiFetch('/usuarios/notificaciones', 'GET');
    const unread = notifs.filter(n => !n.leida).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread;
    badge.classList.toggle('hidden', unread === 0);
    const panel = document.getElementById('notifPanel');
    if (notifs.length) {
      panel.innerHTML = `
        <div style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center">
          <span style="color:white;font-weight:700;font-size:13px">Notificaciones</span>
          <button onclick="markAllRead()" style="background:none;border:none;color:var(--teal);font-size:12px;cursor:pointer">Marcar leídas</button>
        </div>
        ${notifs.map(n => `
          <div class="notif-item ${n.leida ? '' : 'unread'}">
            <div class="notif-title">${escHtml(n.titulo)}</div>
            <div class="notif-msg">${escHtml(n.mensaje)}</div>
            <div class="notif-time">${formatDate(n.created_at)}</div>
          </div>
        `).join('')}
      `;
    } else {
      panel.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray-400);font-size:14px">Sin notificaciones</div>';
    }
  } catch(e) {}
}

async function markAllRead() {
  try {
    await apiFetch('/usuarios/notificaciones/leer', 'PUT');
    loadNotifications();
  } catch(e) {}
}

function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  document.getElementById('userDropdown').classList.add('hidden');
}

function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  dd.classList.toggle('hidden');
  document.getElementById('notifPanel').classList.add('hidden');
}

function closeDropdowns() {
  document.getElementById('userDropdown')?.classList.add('hidden');
  document.getElementById('notifPanel')?.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user')) closeDropdowns();
});

// ====== ADMIN ======
async function loadAdminPendientes() {
  try {
    const data = await apiFetch('/proyectos?estado=pendiente&limite=50', 'GET', null, false);
    const badge = document.getElementById('pendienteBadge');
    if (badge) badge.textContent = data.total;
  } catch(e) {}
}

async function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    const tabs = ['pendientes','proyectos','usuarios','estadisticas'];
    t.classList.toggle('active', tabs[i] === tab);
  });
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    if (tab === 'pendientes') await renderAdminPendientes(content);
    else if (tab === 'proyectos') await renderAdminProyectos(content);
    else if (tab === 'usuarios') await renderAdminUsuarios(content);
    else if (tab === 'estadisticas') await renderAdminStats(content);
  } catch(e) { content.innerHTML = '<p style="color:red">Error al cargar</p>'; }
}

async function renderAdminPendientes(el) {
  const data = await apiFetch('/proyectos?estado=pendiente&limite=50', 'GET', null, false);
  if (!data.proyectos.length) { el.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><div class="empty-title">No hay proyectos pendientes</div></div>'; return; }
  el.innerHTML = `<table class="admin-table">
    <thead><tr><th>Título</th><th>Autor</th><th>Carrera</th><th>Fecha</th><th>Acciones</th></tr></thead>
    <tbody>${data.proyectos.map(p => `
      <tr>
        <td><strong>${escHtml(p.titulo)}</strong></td>
        <td>${escHtml(p.autor_nombre)}</td>
        <td>${escHtml(p.carrera || '-')}</td>
        <td>${formatDate(p.created_at)}</td>
        <td><div class="action-btns">
          <button class="btn-sm btn-view" onclick="showProject(${p.id})">👁 Ver</button>
          <button class="btn-sm btn-approve" onclick="adminModerate(${p.id},'aprobado')">✓ Aprobar</button>
          <button class="btn-sm btn-reject" onclick="adminModerate(${p.id},'rechazado')">✕ Rechazar</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function renderAdminProyectos(el) {
  const data = await apiFetch('/proyectos?estado=aprobado&limite=50', 'GET', null, false);
  el.innerHTML = `<table class="admin-table">
    <thead><tr><th>Título</th><th>Autor</th><th>Estado</th><th>Visitas</th><th>Acciones</th></tr></thead>
    <tbody>${data.proyectos.map(p => `
      <tr>
        <td><strong>${escHtml(p.titulo)}</strong></td>
        <td>${escHtml(p.autor_nombre)}</td>
        <td><span class="project-state state-${p.estado}">${p.estado}</span></td>
        <td>${p.visitas}</td>
        <td><div class="action-btns">
          <button class="btn-sm btn-view" onclick="showProject(${p.id})">👁 Ver</button>
          <button class="btn-sm btn-delete" onclick="adminDelete(${p.id})">🗑 Eliminar</button>
        </div></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function renderAdminUsuarios(el) {
  const usuarios = await apiFetch('/usuarios', 'GET');
  el.innerHTML = `<table class="admin-table">
    <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Carrera</th><th>Proyectos</th><th>Estado</th></tr></thead>
    <tbody>${usuarios.map(u => `
      <tr>
        <td><strong>${escHtml(u.nombre)} ${escHtml(u.apellido)}</strong></td>
        <td style="font-size:12px">${escHtml(u.email)}</td>
        <td>
          <select onchange="changeRol(${u.id}, this.value)" style="font-size:12px;padding:4px;border:1px solid var(--gray-200);border-radius:4px">
            <option value="admin" ${u.rol==='admin'?'selected':''}>Admin</option>
            <option value="docente" ${u.rol==='docente'?'selected':''}>Docente</option>
            <option value="estudiante" ${u.rol==='estudiante'?'selected':''}>Estudiante</option>
          </select>
        </td>
        <td>${escHtml(u.carrera || '-')}</td>
        <td>${u.total_proyectos}</td>
        <td>
          <button class="btn-sm ${u.activo ? 'btn-approve' : 'btn-reject'}" onclick="toggleUserActivo(${u.id})">
            ${u.activo ? '✓ Activo' : '✕ Inactivo'}
          </button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function renderAdminStats(el) {
  const stats = await apiFetch('/estadisticas', 'GET', null, false);
  el.innerHTML = `
    <div class="admin-stats-grid">
      <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--accent)">${stats.total_proyectos}</div><div class="admin-stat-label">Proyectos Aprobados</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--teal)">${stats.total_estudiantes}</div><div class="admin-stat-label">Estudiantes</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--purple)">${stats.total_descargas}</div><div class="admin-stat-label">Descargas</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--green)">${stats.total_visitas}</div><div class="admin-stat-label">Visitas</div></div>
      <div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--gold)">${stats.pendientes}</div><div class="admin-stat-label">Pendientes</div></div>
    </div>
    <h3 style="font-size:16px;font-weight:700;margin-bottom:16px">Proyectos por Área</h3>
    <div class="admin-stats-grid">
      ${stats.por_categoria.map(c => `
        <div class="admin-stat-card" style="border-top:3px solid ${c.color}">
          <div style="font-size:28px;margin-bottom:8px">${c.icono}</div>
          <div class="admin-stat-num" style="font-size:28px;color:${c.color}">${c.total}</div>
          <div class="admin-stat-label">${c.nombre}</div>
        </div>
      `).join('')}
    </div>
    <h3 style="font-size:16px;font-weight:700;margin:24px 0 16px">Más Vistos</h3>
    <table class="admin-table">
      <thead><tr><th>Proyecto</th><th>Visitas</th><th>Calificación</th></tr></thead>
      <tbody>${stats.mas_vistos.map(p => `<tr><td>${p.icono} ${escHtml(p.titulo)}</td><td>${p.visitas}</td><td>${p.calificacion_promedio || '-'}</td></tr>`).join('')}</tbody>
    </table>
  `;
}

async function adminModerate(id, estado) {
  try {
    await apiFetch(`/proyectos/${id}/estado`, 'PUT', { estado });
    showToast(`Proyecto ${estado} ✓`, 'success');
    switchAdminTab('pendientes');
    loadAdminPendientes();
  } catch(e) { showToast(e.message, 'error'); }
}

async function adminDelete(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  try {
    await apiFetch(`/proyectos/${id}`, 'DELETE');
    showToast('Proyecto eliminado', 'warning');
    switchAdminTab('proyectos');
  } catch(e) { showToast(e.message, 'error'); }
}

async function changeRol(id, rol) {
  try {
    await apiFetch(`/usuarios/${id}/rol`, 'PUT', { rol });
    showToast('Rol actualizado ✓', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

async function toggleUserActivo(id) {
  try {
    await apiFetch(`/usuarios/${id}/activo`, 'PUT');
    switchAdminTab('usuarios');
  } catch(e) { showToast(e.message, 'error'); }
}

// ====== PERFIL ======
async function updatePerfil(e) {
  e.preventDefault();
  try {
    await apiFetch('/auth/perfil', 'PUT', {
      nombre: document.getElementById('perfilNombre').value,
      apellido: document.getElementById('perfilApellido').value,
      carrera: document.getElementById('perfilCarrera').value,
      semestre: document.getElementById('perfilSemestre').value
    });
    showToast('Perfil actualizado ✓', 'success');
    initAuth();
  } catch(e) { showToast(e.message, 'error'); }
}

async function changePassword(e) {
  e.preventDefault();
  try {
    await apiFetch('/auth/password', 'PUT', {
      actual: document.getElementById('passActual').value,
      nueva: document.getElementById('passNueva').value
    });
    showToast('Contraseña actualizada ✓', 'success');
    document.getElementById('passActual').value = '';
    document.getElementById('passNueva').value = '';
  } catch(e) { showToast(e.message, 'error'); }
}

// ====== PAGE ROUTING ======
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) {
    page.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === name);
  });
  // Close mobile menu
  document.getElementById('navLinks').classList.remove('mobile-open');
  closeDropdowns();

  if (name === 'repositorio') loadRepositorio(1);
  else if (name === 'mis-proyectos') loadMisProyectos();
  else if (name === 'favoritos') loadFavoritos();
  else if (name === 'admin') {
    if (!currentUser || !['admin','docente'].includes(currentUser.rol)) {
      showPage('home'); showToast('Acceso denegado', 'error'); return;
    }
    switchAdminTab('pendientes');
  }
}

function handlePopState() {}

// ====== MODALS ======
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}
function switchModal(from, to) { closeModal(from); openModal(to); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
});

// ====== UTILS ======
async function apiFetch(endpoint, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('mobile-open');
}

function fillDemo(email, pass) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPass').value = pass;
}

// Enter key on search
document.getElementById('repoSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
document.getElementById('heroSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchFromHero(); });
