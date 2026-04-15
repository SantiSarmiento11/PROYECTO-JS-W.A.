// ============================================================
//  projects.js  –  Web Component <project-list> y CRUD de proyectos
//  Depende de Storage (persistencia) y de las utilidades de app.js
//  (openModal, closeModal, showToast, formatDate).
// ============================================================
import Storage from './storage.js';
import { showToast, formatDate, openModal, closeModal } from './app.js';

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
          <div class="empty-icon">🏗️</div>
          <p>No hay proyectos registrados. Haz clic en <strong>Nuevo Proyecto</strong> para comenzar.</p>
        </div>`;
      return;
    }

    this.innerHTML = `
      <div class="project-cards">
        ${projects.map(p => {
          const acts = activities.filter(a => a.projectId === p.id);
          const done = acts.filter(a => a.estado === 'terminada').length;
          return `
            <div class="project-card">
              <div class="project-card-header">
                <div>
                  <div class="project-card-title">📋 ${_esc(p.nombre)}</div>
                </div>
                <div style="display:flex;gap:4px;">
                  <button class="btn-icon" title="Editar" onclick="ProjectsModule.openEdit('${p.id}')">✏️</button>
                  <button class="btn-icon" title="Eliminar" onclick="ProjectsModule.confirmDelete('${p.id}')">🗑️</button>
                </div>
              </div>
              <div class="project-card-desc">${_esc(p.descripcion || '—')}</div>
              <div class="project-card-meta">
                <span>📅 Inicio: ${formatDate(p.fechaInicio)}</span>
                <span>🏁 Fin: ${formatDate(p.fechaFin)}</span>
              </div>
              <div class="project-card-meta">
                <span>📊 Actividades: ${acts.length} | Terminadas: ${done}</span>
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
    Storage.insert('projects', data);
    showToast('Proyecto creado correctamente.', 'success');
  }
  closeModal();
  document.querySelector('project-list')?.render();
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
      document.querySelector('project-list')?.render();
      refreshDashboard();
      showToast('Proyecto eliminado.', 'success');
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
const ProjectsModule = { openNew, openEdit, confirmDelete };
window.ProjectsModule = ProjectsModule;

export default ProjectsModule;
