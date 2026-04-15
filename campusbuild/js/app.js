// ============================================================
//  app.js  –  Bootstrap, enrutamiento SPA, modal global y toasts
//  Punto de entrada principal. Exporta utilidades consumidas por
//  projects.js, activities.js y resources.js.
// ============================================================
import Storage from './storage.js';

// ── Escapado de HTML ─────────────────────────────────────────
/** Previene XSS al insertar texto de usuario en el DOM. */
function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Utilidad de fechas (exportada) ───────────────────────────
/**
 * Convierte fecha ISO YYYY-MM-DD al formato local DD/MM/AAAA.
 * Usada por projects.js, activities.js y resources.js.
 */
export function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── Notificaciones Toast ─────────────────────────────────────
/**
 * Muestra un mensaje temporal (3.2 s) en la interfaz.
 * @param {string} type - 'success' | 'danger' | '' (neutro)
 * Usada por todos los módulos tras cada operación CRUD.
 */
export function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ' toast-'+type : ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── Modal global ─────────────────────────────────────────────
/** Guarda el callback del botón Guardar del modal activo. */
let _currentOnSave = null;

/**
 * Abre el modal reutilizable definido en index.html.
 * @param {string}   title     - Título del modal.
 * @param {string}   body      - HTML del cuerpo (formulario o confirmación).
 * @param {Function} onSave    - Acción al pulsar Guardar.
 * @param {string}   saveLabel - Texto del botón (default: 'Guardar').
 * @param {string}   saveCls   - Clase CSS del botón (default: 'btn-primary').
 */
export function openModal({ title, body, onSave, saveLabel = 'Guardar', saveCls = 'btn-primary' }) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-save').className = `btn ${saveCls}`;
  document.getElementById('modal-save').textContent = saveLabel;
  _currentOnSave = onSave;
  document.getElementById('modal-backdrop').classList.add('open');
}

/** Cierra el modal y limpia el callback activo. */
export function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  _currentOnSave = null;
}

// ── Enrutamiento SPA ─────────────────────────────────────────
/**
 * Mapa de vistas: claves = data-view del sidebar = id de sección en HTML.
 * Provee título y subtítulo para el topbar al navegar.
 */
const VIEWS = {
  dashboard:  { title: 'Panel de Control',  subtitle: 'Resumen general del sistema' },
  projects:   { title: 'Proyectos',          subtitle: 'Gestión de proyectos de construcción' },
  activities: { title: 'Actividades e Hitos', subtitle: 'Planificación y seguimiento' },
  resources:  { title: 'Recursos Humanos',   subtitle: 'Gestión del personal del proyecto' },
  calendar:   { title: 'Cronograma',         subtitle: 'Calendario visual de actividades' },
};

/**
 * Activa la vista solicitada sin recargar la página.
 * Oculta todas las secciones .view, activa la del viewId,
 * sincroniza el estado del sidebar y dispara el re-render
 * del Web Component correspondiente.
 * Expuesto en window.navigate para los onclick del HTML.
 */
function navigate(viewId) {
  // Ocultar todas las secciones y activar la seleccionada
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewId}`)?.classList.add('active');

  // Marcar enlace activo en el sidebar
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === viewId);
  });

  // Actualizar topbar con título y subtítulo de la vista
  const info = VIEWS[viewId] || {};
  document.getElementById('topbar-title').textContent    = info.title    || '';
  document.getElementById('topbar-subtitle').textContent = info.subtitle || '';

  // Disparar re-render del Web Component de la vista activa
  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'projects')  document.querySelector('project-list')?.render();
  if (viewId === 'activities') {
    document.querySelector('activity-list')?.render();
    document.querySelector('milestone-list')?.render();
  }
  if (viewId === 'resources') document.querySelector('resource-list')?.render();
  if (viewId === 'calendar')  document.querySelector('activity-calendar')?.render();
}

// ── Web Component: <dashboard-stats> ─────────────────────────
/**
 * Tarjetas de estadísticas en el dashboard.
 * Un hito se considera cumplido cuando todas sus actividades
 * asociadas (activityIds) tienen estado 'terminada'.
 */
class DashboardStats extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const projects   = Storage.getAll('projects');
    const activities = Storage.getAll('activities');
    const resources  = Storage.getAll('resources');
    const milestones = Storage.getAll('milestones');

    const done      = activities.filter(a => a.estado === 'terminada').length;
    const inProcess = activities.filter(a => a.estado === 'en-proceso').length;
    const pending   = activities.filter(a => a.estado === 'pendiente').length;

    const completedMs = milestones.filter(m => {
      const acts = (m.activityIds||[]).map(id => activities.find(a => a.id === id)).filter(Boolean);
      return acts.length > 0 && acts.every(a => a.estado === 'terminada');
    }).length;

    this.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon">🏗️</div>
          <div class="stat-value">${projects.length}</div>
          <div class="stat-label">Proyectos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">${activities.length}</div>
          <div class="stat-label">Actividades</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value" style="color:var(--color-success)">${done}</div>
          <div class="stat-label">Terminadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-value" style="color:var(--color-primary)">${inProcess}</div>
          <div class="stat-label">En Proceso</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-value" style="color:var(--color-warning)">${pending}</div>
          <div class="stat-label">Pendientes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👷</div>
          <div class="stat-value">${resources.length}</div>
          <div class="stat-label">Recursos Humanos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${completedMs}/${milestones.length}</div>
          <div class="stat-label">Hitos Cumplidos</div>
        </div>
      </div>`;
  }
}
customElements.define('dashboard-stats', DashboardStats);

// ── Render del dashboard ─────────────────────────────────────────
/**
 * Refresca las estadísticas y la tabla de últimas 5 actividades.
 * Llamada automáticamente por navigate() al activar el dashboard.
 */
function renderDashboard() {
  document.querySelector('dashboard-stats')?.render();

  // Últimas 5 actividades en orden descendente
  const activities = Storage.getAll('activities').slice(-5).reverse();
  const projects   = Storage.getAll('projects');
  const el = document.getElementById('recent-activities');
  if (!el) return;

  if (!activities.length) {
    el.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📋</div><p>No hay actividades registradas aún.</p></div>`;
    return;
  }

  const stateLabel = { pendiente:'Pendiente', 'en-proceso':'En Proceso', terminada:'Terminada' };
  const stateCls   = { pendiente:'badge-pending','en-proceso':'badge-progress',terminada:'badge-done' };

  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Actividad</th><th>Proyecto</th><th>Inicio</th><th>Estado</th></tr></thead>
        <tbody>
          ${activities.map(a => {
            const p = projects.find(pr => pr.id === a.projectId);
            return `<tr>
              <td><strong>${_esc(a.nombre)}</strong></td>
              <td>${p ? _esc(p.nombre) : '—'}</td>
              <td>${formatDate(a.fechaInicio)}</td>
              <td><span class="badge ${stateCls[a.estado]||'badge-pending'}">${stateLabel[a.estado]||a.estado}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Arranque de la aplicación ─────────────────────────────────
/**
 * Registra todos los listeners y navega a la vista inicial.
 * Si otro módulo guardó 'campusbuild_initial_view' en localStorage,
 * se navega a esa vista; de lo contrario, al dashboard.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Activar navegación desde el sidebar
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.view);
    });
  });

  // Modal wiring
  document.getElementById('modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-backdrop')) closeModal();
  });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', () => {
    if (typeof _currentOnSave === 'function') _currentOnSave();
  });

  // Si se guardó una vista de redirección, usarla; si no, ir al dashboard
  const initialView = localStorage.getItem('campusbuild_initial_view');
  localStorage.removeItem('campusbuild_initial_view');
  navigate(initialView && VIEWS[initialView] ? initialView : 'dashboard');
});

// Expone navigate globalmente para los onclick del HTML
window.navigate = navigate;
