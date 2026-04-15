// ============================================================
//  activities.js  –  Web Components <activity-list> y <milestone-list>
//  Gestiona el CRUD de actividades e hitos. Depende de Storage
//  y de las utilidades de app.js. Los hitos se consideran
//  cumplidos cuando todas sus actividades asociadas terminan.
// ============================================================
import Storage from './storage.js';
import {
  showToast,
  formatDate,
  openModal,
  closeModal,
  icon,
  resolveMilestoneDate,
  milestoneIsCompleted,
  syncProjectStatus,
} from './app.js';

// ── Helper ────────────────────────────────────────────────────
function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Genera el HTML de un badge con la clase y etiqueta del estado.
 * Estados válidos: 'pendiente' | 'en-proceso' | 'terminada'.
 */
function estadoBadge(e) {
  const map = { pendiente: 'badge-pending', 'en-proceso': 'badge-progress', terminada: 'badge-done' };
  const label = { pendiente: 'Pendiente', 'en-proceso': 'En Proceso', terminada: 'Terminada' };
  return `<span class="badge ${map[e] || 'badge-pending'}">${label[e] || e}</span>`;
}

function refreshProjectDependencies(projectId = '') {
  if (projectId) syncProjectStatus(projectId);
  document.querySelector('activity-list')?.render();
  document.querySelector('milestone-list')?.render();
  document.querySelector('project-list')?.render?.();
  document.querySelector('dashboard-stats')?.render?.();
  document.querySelector('activity-calendar')?.render?.();
}

function renderMilestoneActivities(projectId, assocIds = [], activities = Storage.getAll('activities')) {
  const scopedActivities = projectId ? activities.filter(a => a.projectId === projectId) : [];

  if (!projectId) {
    return '<em style="color:var(--color-muted);font-size:13px;">Selecciona primero un proyecto.</em>';
  }
  if (!scopedActivities.length) {
    return '<em style="color:var(--color-muted);font-size:13px;">Este proyecto no tiene actividades creadas.</em>';
  }

  return scopedActivities.map(a => `
    <label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;cursor:pointer;">
      <input type="checkbox" value="${a.id}" ${assocIds.includes(a.id) ? 'checked' : ''} class="ms-act-check">
      ${_esc(a.nombre)}
    </label>`).join('');
}

// ── Web Component: <activity-list> ───────────────────────────
/**
 * Tabla de actividades con proyecto, responsable y estado.
 * El responsable se resuelve cruzando `responsableId` con resources.
 * Botones de edición/eliminación invocan ActivitiesModule (window).
 */
class ActivityList extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const activities = Storage.getAll('activities');
    const projects = Storage.getAll('projects');
    const resources = Storage.getAll('resources');

    if (activities.length === 0) {
      this.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('activities')}</div>
          <p>No hay actividades registradas. Crea una usando el botón <strong>Nueva Actividad</strong>.</p>
        </div>`;
      return;
    }

    this.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Actividad</th>
              <th>Proyecto</th>
              <th>Responsable</th>
              <th>Inicio</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${activities.map(a => {
      const proj = projects.find(p => p.id === a.projectId);
      const res = resources.find(r => r.id === a.responsableId);
      return `
                <tr>
                  <td><strong>${_esc(a.nombre)}</strong></td>
                  <td>${proj ? _esc(proj.nombre) : '<em style="color:var(--color-muted)">Sin proyecto</em>'}</td>
                  <td>${res ? _esc(res.nombre) : '<em style="color:var(--color-muted)">—</em>'}</td>
                  <td>${formatDate(a.fechaInicio)}</td>
                  <td>${a.duracion} día(s)</td>
                  <td>${estadoBadge(a.estado)}</td>
                  <td style="display:flex;gap:4px;align-items:center;">
                    <button class="btn-icon" title="Editar" aria-label="Editar" onclick="ActivitiesModule.openEdit('${a.id}')">${icon('edit')}</button>
                    <button class="btn-icon" title="Eliminar" aria-label="Eliminar" onclick="ActivitiesModule.confirmDelete('${a.id}')">${icon('trash')}</button>
                  </td>
                </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  }
}
customElements.define('activity-list', ActivityList);

// ── Web Component: <milestone-list> ──────────────────────────
/**
 * Tabla de hitos. Muestra las actividades asociadas de cada hito
 * y lo marca como cumplido cuando todas tienen estado 'terminada'.
 */
class MilestoneList extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const milestones = Storage.getAll('milestones');
    const activities = Storage.getAll('activities');
    const projects = Storage.getAll('projects');

    if (milestones.length === 0) {
      this.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('trophy')}</div>
          <p>No hay hitos definidos. Crea uno usando el botón <strong>Nuevo Hito</strong>.</p>
        </div>`;
      return;
    }

    this.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hito</th>
              <th>Proyecto</th>
              <th>Actividades asociadas</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${milestones.map(m => {
      const proj = projects.find(p => p.id === m.projectId);
      const assocIds = m.activityIds || [];
      const assocActs = activities.filter(a => assocIds.includes(a.id));
      const allDone = milestoneIsCompleted(m, activities);
      const rowCls = allDone ? 'milestone-row completed' : 'milestone-row';
      const details = [_esc(m.descripcion || '')].filter(Boolean).join(' · ');
      return `
                <tr class="${rowCls}">
                  <td><strong>${_esc(m.nombre)}</strong><br><small style="color:var(--color-muted)">${formatDate(resolveMilestoneDate(m, activities))}${details ? ` · ${details}` : ''}</small></td>
                  <td>${proj ? _esc(proj.nombre) : '—'}</td>
                  <td style="max-width:220px;font-size:12px;">
                    ${assocActs.length ? assocActs.map(a => `<span style="display:inline-block;background:var(--color-bg);border-radius:4px;padding:1px 7px;margin:2px;">${_esc(a.nombre)}</span>`).join('') : '<em style="color:var(--color-muted)">Sin actividades</em>'}
                  </td>
                  <td>
                    ${allDone
          ? `<span class="badge badge-milestone-ok">${icon('check')} Cumplido</span>`
          : `<span class="badge badge-milestone-no">${icon('pending')} Pendiente</span>`}
                  </td>
                  <td style="display:flex;gap:4px;align-items:center;">
                    <button class="btn-icon" title="Editar" aria-label="Editar" onclick="ActivitiesModule.openEditMilestone('${m.id}')">${icon('edit')}</button>
                    <button class="btn-icon" title="Eliminar" aria-label="Eliminar" onclick="ActivitiesModule.confirmDeleteMilestone('${m.id}')">${icon('trash')}</button>
                  </td>
                </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  }
}
customElements.define('milestone-list', MilestoneList);

// ── Activity CRUD ─────────────────────────────────────────────
/**
 * Formulario de actividad: carga proyectos y recursos desde Storage
 * para los selectores de proyecto y responsable.
 * @param {Object} a - Datos de la actividad (vacío = formulario nuevo).
 */
function buildActivityForm(a = {}) {
  const projects = Storage.getAll('projects');
  const resources = Storage.getAll('resources');
  return `
    <div class="form-group">
      <label class="form-label">Nombre de la Actividad *</label>
      <input id="act-nombre" class="form-control" placeholder="Ej. Excavación de cimientos" value="${_esc(a.nombre || '')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Proyecto *</label>
        <select id="act-project" class="form-control">
          <option value="">Seleccionar...</option>
          ${projects.map(p => `<option value="${p.id}" ${a.projectId === p.id ? 'selected' : ''}>${_esc(p.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Responsable</label>
        <select id="act-responsable" class="form-control">
          <option value="">Sin asignar</option>
          ${resources.map(r => `<option value="${r.id}" ${a.responsableId === r.id ? 'selected' : ''}>${_esc(r.nombre)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha de Inicio *</label>
        <input id="act-inicio" type="date" class="form-control" value="${a.fechaInicio || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Duración estimada (días) *</label>
        <input id="act-duracion" type="number" min="1" class="form-control" placeholder="1" value="${a.duracion || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Estado *</label>
      <select id="act-estado" class="form-control">
        <option value="pendiente" ${(a.estado || 'pendiente') === 'pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="en-proceso" ${a.estado === 'en-proceso' ? 'selected' : ''}>En Proceso</option>
        <option value="terminada"  ${a.estado === 'terminada' ? 'selected' : ''}>Terminada</option>
      </select>
    </div>`;
}

function openNewActivity() {
  openModal({
    title: 'Nueva Actividad',
    body: buildActivityForm(),
    onSave: () => _saveActivity(null),
  });
}

function openEdit(id) {
  const a = Storage.getById('activities', id);
  if (!a) return;
  openModal({
    title: 'Editar Actividad',
    body: buildActivityForm(a),
    onSave: () => _saveActivity(id),
  });
}

/**
 * Valida y guarda la actividad. Refresca `activity-list` y
 * `milestone-list` porque el estado de las actividades afecta
 * el cálculo automático de hitos cumplidos.
 */
function _saveActivity(id) {
  const nombre = document.getElementById('act-nombre').value.trim();
  const projectId = document.getElementById('act-project').value;
  const responsableId = document.getElementById('act-responsable').value;
  const fechaInicio = document.getElementById('act-inicio').value;
  const duracion = parseInt(document.getElementById('act-duracion').value, 10);
  const estado = document.getElementById('act-estado').value;

  if (!nombre || !projectId || !fechaInicio || !duracion) {
    showToast('Completa todos los campos requeridos.', 'danger'); return;
  }
  const data = { nombre, projectId, responsableId: responsableId || null, fechaInicio, duracion, estado };
  if (id) {
    Storage.update('activities', id, data); showToast('Actividad actualizada.', 'success');
  } else {
    Storage.insert('activities', data); showToast('Actividad creada.', 'success');
  }
  closeModal();
  refreshProjectDependencies(projectId);
}

function confirmDelete(id) {
  const a = Storage.getById('activities', id);
  if (!a) return;
  openModal({
    title: 'Eliminar Actividad',
    body: `<p>¿Eliminar la actividad <strong>${_esc(a.nombre)}</strong>?</p>`,
    saveLabel: 'Eliminar', saveCls: 'btn-danger',
    onSave: () => {
      Storage.getAll('milestones')
        .filter(m => (m.activityIds || []).includes(id))
        .forEach(m => {
          Storage.update('milestones', m.id, {
            activityIds: (m.activityIds || []).filter(activityId => activityId !== id),
          });
        });
      Storage.remove('activities', id);
      closeModal();
      refreshProjectDependencies(a.projectId);
      showToast('Actividad eliminada.', 'success');
    },
  });
}

// ── Milestone CRUD ────────────────────────────────────────────
/**
 * Formulario de hito: permite asociar múltiples actividades
 * mediante checkboxes. El estado se calcula automáticamente
 * en <milestone-list> según el estado de esas actividades.
 * @param {Object} m - Datos del hito (vacío = formulario nuevo).
 */
function buildMilestoneForm(m = {}) {
  const projects = Storage.getAll('projects');
  const activities = Storage.getAll('activities');
  const assocIds = m.activityIds || [];

  return `
    <div class="form-group">
      <label class="form-label">Nombre del Hito *</label>
      <input id="ms-nombre" class="form-control" placeholder="Ej. Finalización de cimientos" value="${_esc(m.nombre || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Descripción</label>
      <input id="ms-desc" class="form-control" placeholder="Descripción breve..." value="${_esc(m.descripcion || '')}">
    </div>
    <div class="form-group">
      <label class="form-label">Fecha del Hito *</label>
      <input id="ms-fecha" type="date" class="form-control" value="${resolveMilestoneDate(m, activities)}">
    </div>
    <div class="form-group">
      <label class="form-label">Proyecto *</label>
      <select id="ms-project" class="form-control" onchange="ActivitiesModule.onMilestoneProjectChange(this.value)">
        <option value="">Seleccionar...</option>
        ${projects.map(p => `<option value="${p.id}" ${m.projectId === p.id ? 'selected' : ''}>${_esc(p.nombre)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Actividades asociadas</label>
      <div id="ms-activities-box" style="max-height:150px;overflow-y:auto;border:1.5px solid var(--color-border);border-radius:var(--radius-sm);padding:8px;">
        ${renderMilestoneActivities(m.projectId || '', assocIds, activities)}
      </div>
    </div>`;
}

function openNewMilestone() {
  openModal({
    title: 'Nuevo Hito',
    body: buildMilestoneForm(),
    onSave: () => _saveMilestone(null),
  });
}

function openEditMilestone(id) {
  const m = Storage.getById('milestones', id);
  if (!m) return;
  openModal({
    title: 'Editar Hito',
    body: buildMilestoneForm(m),
    onSave: () => _saveMilestone(id),
  });
}

/** Valida y persiste el hito. Refresca `milestone-list` tras guardar. */
function _saveMilestone(id) {
  const nombre = document.getElementById('ms-nombre').value.trim();
  const descripcion = document.getElementById('ms-desc').value.trim();
  const fecha = document.getElementById('ms-fecha').value;
  const projectId = document.getElementById('ms-project').value;
  const checks = [...document.querySelectorAll('.ms-act-check:checked')].map(c => c.value);

  if (!nombre || !projectId || !fecha) { showToast('Completa los campos requeridos.', 'danger'); return; }

  const validActivityIds = Storage.getAll('activities')
    .filter(a => a.projectId === projectId)
    .map(a => a.id);
  const data = {
    nombre,
    descripcion,
    fecha,
    projectId,
    activityIds: checks.filter(activityId => validActivityIds.includes(activityId)),
  };
  if (id) {
    Storage.update('milestones', id, data); showToast('Hito actualizado.', 'success');
  } else {
    Storage.insert('milestones', data); showToast('Hito creado.', 'success');
  }
  closeModal();
  refreshProjectDependencies(projectId);
}

function confirmDeleteMilestone(id) {
  const m = Storage.getById('milestones', id);
  if (!m) return;
  openModal({
    title: 'Eliminar Hito',
    body: `<p>¿Eliminar el hito <strong>${_esc(m.nombre)}</strong>?</p>`,
    saveLabel: 'Eliminar', saveCls: 'btn-danger',
    onSave: () => {
      Storage.remove('milestones', id);
      closeModal();
      refreshProjectDependencies(m.projectId);
      showToast('Hito eliminado.', 'success');
    },
  });
}

function onMilestoneProjectChange(projectId) {
  const selected = [...document.querySelectorAll('.ms-act-check:checked')].map(c => c.value);
  const box = document.getElementById('ms-activities-box');
  if (!box) return;
  box.innerHTML = renderMilestoneActivities(projectId, selected);
}

// ── API pública ─────────────────────────────────────────────────────
// Expuesto en window para los onclick de la tabla renderizada en el DOM.
const ActivitiesModule = {
  openNewActivity, openEdit, confirmDelete,
  openNewMilestone, openEditMilestone, confirmDeleteMilestone, onMilestoneProjectChange,
};
window.ActivitiesModule = ActivitiesModule;

export default ActivitiesModule;
