// ============================================================
//  projects.js  –  Web Component <project-list> y CRUD de proyectos
//  Depende de Storage (persistencia) y de las utilidades de app.js
//  (openModal, closeModal, showToast, formatDate).
// ============================================================
import Storage from './storage.js';
import {
  showToast,
  formatDate,
  openModal,
  closeModal,
  icon,
  getProjectCompletion,
  syncProjectStatus,
} from './app.js';

function refreshProjectViews() {
  document.querySelector('project-list')?.render();
  document.querySelector('dashboard-stats')?.render?.();
  document.querySelector('activity-calendar')?.render?.();
}

// ── Web Component: <project-list> ────────────────────────────
class ProjectList extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const projects = Storage.getAll('projects');
    const activities = Storage.getAll('activities');

    if (projects.length === 0) {
      this.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('project')}</div>
          <p>No hay proyectos registrados. Haz clic en <strong>Nuevo Proyecto</strong> para comenzar.</p>
        </div>`;
      return;
    }

    this.innerHTML = `
      <div class="project-cards">
        ${projects.map(p => {
          const current = syncProjectStatus(p.id) || p;
          const acts = activities.filter(a => a.projectId === p.id);
          const done = acts.filter(a => a.estado === 'terminada').length;
          const summary = getProjectCompletion(p.id);
          const isFinished = current.estado === 'terminado';
          return `
            <div class="project-card">
              <div class="project-card-header">
                <div>
                  <div class="project-card-title">${icon('activities')} <span>${_esc(current.nombre)}</span></div>
                  <div class="project-card-status">
                    <span class="badge ${isFinished ? 'badge-project-done' : 'badge-project-active'}">${isFinished ? 'Terminado' : 'Activo'}</span>
                  </div>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="btn-icon" title="Editar" aria-label="Editar" onclick="ProjectsModule.openEdit('${current.id}')">${icon('edit')}</button>
                  <button class="btn-icon" title="Eliminar" aria-label="Eliminar" onclick="ProjectsModule.confirmDelete('${current.id}')">${icon('trash')}</button>
                </div>
              </div>
              <div class="project-card-desc">${_esc(current.descripcion || '—')}</div>
              <div class="project-card-meta">
                <span>${icon('calendar')} Inicio: ${formatDate(current.fechaInicio)}</span>
                <span>${icon('flag')} Fin: ${formatDate(current.fechaFin)}</span>
              </div>
              <div class="project-card-meta">
                <span>${icon('chart')} Actividades: ${acts.length} | Terminadas: ${done}</span>
                <span>${icon('trophy')} Hitos: ${summary.milestonesDone}/${summary.milestonesTotal}</span>
              </div>
              <div class="project-card-actions">
                <button class="btn btn-ghost btn-sm" onclick="ProjectsModule.finishProject('${current.id}')" ${isFinished || !summary.canFinish ? 'disabled' : ''} title="${isFinished ? 'El proyecto ya fue terminado' : (summary.canFinish ? 'Marcar proyecto como terminado' : 'Completa primero todas las actividades e hitos')}">
                  ${icon('check')} ${isFinished ? 'Proyecto terminado' : 'Terminar proyecto'}
                </button>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  }
}
customElements.define('project-list', ProjectList);

// ── Modal helpers ─────────────────────────────────────────────
function buildForm(p = {}) {
  return `
    <div class="form-group">
      <label class="form-label">Nombre del Proyecto *</label>
      <input id="proj-nombre" class="form-control" placeholder="Ej. Edificio Torre Norte" value="${_esc(p.nombre||'')}">
    </div>
    <div class="form-group">
      <label class="form-label">Descripción</label>
      <textarea id="proj-desc" class="form-control" rows="3" placeholder="Descripción del proyecto...">${_esc(p.descripcion||'')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha de Inicio *</label>
        <input id="proj-inicio" type="date" class="form-control" value="${p.fechaInicio||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Fecha de Fin *</label>
        <input id="proj-fin" type="date" class="form-control" value="${p.fechaFin||''}">
      </div>
    </div>`;
}

function openNew() {
  openModal({
    title: 'Nuevo Proyecto',
    body: buildForm(),
    onSave: () => _save(null),
  });
}

function openEdit(id) {
  const p = Storage.getById('projects', id);
  if (!p) return;
  openModal({
    title: 'Editar Proyecto',
    body: buildForm(p),
    onSave: () => _save(id),
  });
}

// ── Persistencia ────────────────────────────────────────────────────────
/**
 * Valida y guarda el proyecto (crear o actualizar según id).
 * Cierra el modal y refresca el componente <project-list>.
 */
function _save(id) {
  const nombre = document.getElementById('proj-nombre').value.trim();
  const descripcion = document.getElementById('proj-desc').value.trim();
  const fechaInicio = document.getElementById('proj-inicio').value;
  const fechaFin    = document.getElementById('proj-fin').value;

  if (!nombre || !fechaInicio || !fechaFin) {
    showToast('Por favor completa los campos requeridos.', 'danger'); return;
  }
  if (fechaFin < fechaInicio) {
    showToast('La fecha de fin no puede ser anterior a la de inicio.', 'danger'); return;
  }

  const data = { nombre, descripcion, fechaInicio, fechaFin };
  if (id) {
    Storage.update('projects', id, data);
    showToast('Proyecto actualizado correctamente.', 'success');
  } else {
    Storage.insert('projects', { ...data, estado: 'activo', fechaTerminado: null });
    showToast('Proyecto creado correctamente.', 'success');
  }
  closeModal();
  refreshProjectViews();
  refreshDashboard();
}

/**
 * Solicita confirmación antes de eliminar un proyecto.
 * Realiza eliminación en cascada: actividades e hitos asociados.
 */
function confirmDelete(id) {
  const p = Storage.getById('projects', id);
  if (!p) return;
  openModal({
    title: 'Eliminar Proyecto',
    body: `<p>¿Estás seguro de eliminar el proyecto <strong>${_esc(p.nombre)}</strong>?<br>Se eliminarán también sus actividades e hitos asociados.</p>`,
    saveLabel: 'Eliminar',
    saveCls: 'btn-danger',
    onSave: () => {
      // Cascade delete
      const acts = Storage.getAll('activities').filter(a => a.projectId === id).map(a => a.id);
      acts.forEach(aid => Storage.remove('activities', aid));
      Storage.getAll('milestones').filter(m => m.projectId === id).forEach(m => Storage.remove('milestones', m.id));
      Storage.remove('projects', id);
      closeModal();
      refreshProjectViews();
      refreshDashboard();
      showToast('Proyecto eliminado.', 'success');
    },
  });
}

function finishProject(id) {
  const p = Storage.getById('projects', id);
  if (!p) return;

  const summary = getProjectCompletion(id);
  if (!summary.canFinish) {
    showToast(`No se puede terminar el proyecto. Actividades: ${summary.activitiesDone}/${summary.activitiesTotal}. Hitos: ${summary.milestonesDone}/${summary.milestonesTotal}.`, 'danger');
    return;
  }

  openModal({
    title: 'Terminar Proyecto',
    body: `<p>¿Deseas marcar el proyecto <strong>${_esc(p.nombre)}</strong> como terminado?</p>`,
    saveLabel: 'Terminar',
    saveCls: 'btn-primary',
    onSave: () => {
      const today = new Date();
      const fechaTerminado = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-');
      Storage.update('projects', id, { estado: 'terminado', fechaTerminado });
      closeModal();
      refreshProjectViews();
      refreshDashboard();
      showToast('Proyecto terminado correctamente.', 'success');
    },
  });
}

/** Refresca las tarjetas de estadísticas en el dashboard si está visible. */
function refreshDashboard() {
  document.querySelector('dashboard-stats')?.render?.();
}

/** Previene XSS al insertar texto de usuario en el DOM. */
function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── API pública ─────────────────────────────────────────────────────
// Expuesto en window para los onclick de las tarjetas renderizadas en el DOM.
const ProjectsModule = { openNew, openEdit, confirmDelete, finishProject };
window.ProjectsModule = ProjectsModule;

export default ProjectsModule;
