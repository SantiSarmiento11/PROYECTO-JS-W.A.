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

const ICONS = {
  project: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M3 21h18M4 21V10l8-6 8 6v11" stroke="currentColor" fill="none" stroke-width="2"/>
    </svg>`,
  activities: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M4 4h16v16H4zM8 8h8M8 12h6M8 16h4" stroke="currentColor" fill="none" stroke-width="2"/>
    </svg>`,
  resource: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M4 20c0-4 16-4 16 0" stroke="currentColor" fill="none" stroke-width="2"/>
    </svg>`,
  calendar: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" fill="none" stroke-width="2"/>
    </svg>`,
  flag: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M5 21V4m0 0h10l-2 3 2 3H5" stroke="currentColor" fill="none" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
  chart: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" fill="none" stroke-width="2"/>
    </svg>`,
  check: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  bolt: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" stroke="currentColor" fill="none" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
  pending: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M12 7v5l3 2" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  trophy: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" stroke="currentColor" fill="none" stroke-width="2"/>
      <path d="M9 16h6M12 11v5m-5-9H4a3 3 0 0 0 3 3m10-3h3a3 3 0 0 1-3 3M10 20h4" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  plus: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  edit: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="m4 20 4.5-1 9-9a2.1 2.1 0 1 0-3-3l-9 9L4 20Z" stroke="currentColor" fill="none" stroke-width="2" stroke-linejoin="round"/>
    </svg>`,
  trash: `
    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
};

export function icon(name, extraClass = '') {
  const markup = ICONS[name];
  if (!markup) return '';
  return extraClass ? markup.replace('class="icon-svg"', `class="icon-svg ${extraClass}"`) : markup;
}

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + days);
  return [
    base.getFullYear(),
    String(base.getMonth() + 1).padStart(2, '0'),
    String(base.getDate()).padStart(2, '0'),
  ].join('-');
}

export function activityEndDate(activity) {
  const duration = Math.max(1, Number(activity?.duracion || 1));
  return addDays(activity?.fechaInicio, duration - 1);
}

export function milestoneIsCompleted(milestone, activities = Storage.getAll('activities')) {
  const assocIds = milestone?.activityIds || [];
  const assocActs = activities.filter(a => assocIds.includes(a.id));
  return assocActs.length > 0 && assocActs.every(a => a.estado === 'terminada');
}

export function resolveMilestoneDate(milestone, activities = Storage.getAll('activities')) {
  if (milestone?.fecha) return milestone.fecha;
  const assocIds = milestone?.activityIds || [];
  const assocActs = activities.filter(a => assocIds.includes(a.id));
  if (!assocActs.length) return '';
  return assocActs.map(activityEndDate).filter(Boolean).sort().at(-1) || '';
}

export function getProjectCompletion(projectId) {
  const activities = Storage.getAll('activities').filter(a => a.projectId === projectId);
  const milestones = Storage.getAll('milestones').filter(m => m.projectId === projectId);
  const activitiesDone = activities.filter(a => a.estado === 'terminada').length;
  const milestonesDone = milestones.filter(m => milestoneIsCompleted(m, activities)).length;
  const allActivitiesDone = activities.length > 0 && activitiesDone === activities.length;
  const allMilestonesDone = milestones.length === 0 || milestonesDone === milestones.length;

  return {
    activitiesTotal: activities.length,
    activitiesDone,
    milestonesTotal: milestones.length,
    milestonesDone,
    canFinish: allActivitiesDone && allMilestonesDone,
  };
}

export function syncProjectStatus(projectId) {
  const project = Storage.getById('projects', projectId);
  if (!project) return null;

  const summary = getProjectCompletion(projectId);
  if (!project.estado) {
    return Storage.update('projects', projectId, { estado: 'activo', fechaTerminado: null });
  }
  if (project.estado === 'terminado' && !summary.canFinish) {
    return Storage.update('projects', projectId, { estado: 'activo', fechaTerminado: null });
  }
  return project;
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

    const completedMs = milestones.filter(m => milestoneIsCompleted(m, activities)).length;

    this.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon">${icon('project')}</div>
          <div class="stat-value">${projects.length}</div>
          <div class="stat-label">Proyectos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('activities')}</div>
          <div class="stat-value">${activities.length}</div>
          <div class="stat-label">Actividades</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('check')}</div>
          <div class="stat-value" style="color:var(--color-success)">${done}</div>
          <div class="stat-label">Terminadas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('bolt')}</div>
          <div class="stat-value" style="color:var(--color-primary)">${inProcess}</div>
          <div class="stat-label">En Proceso</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('pending')}</div>
          <div class="stat-value" style="color:var(--color-warning)">${pending}</div>
          <div class="stat-label">Pendientes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('resource')}</div>
          <div class="stat-value">${resources.length}</div>
          <div class="stat-label">Recursos Humanos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${icon('trophy')}</div>
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
    el.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">${icon('activities')}</div><p>No hay actividades registradas aún.</p></div>`;
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
