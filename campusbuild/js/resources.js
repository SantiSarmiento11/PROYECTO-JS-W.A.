// ============================================================
//  resources.js  –  Web Component <resource-list> y CRUD de Recursos Humanos
//  Gestiona el personal asignable como responsable en actividades.
//  Depende de Storage y de las utilidades de app.js.
// ============================================================
import Storage from './storage.js';
import { showToast, formatDate, openModal, closeModal, icon } from './app.js';

/** Previene XSS al insertar texto de usuario en el DOM. */
function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Web Component: <resource-list> ───────────────────────────
/**
 * Tabla de recursos humanos. Muestra identificación, nombre, rol,
 * datos personales y salario. El tipo de sangre se resalta en rojo
 * por ser dato crítico de seguridad en obra.
 * Botones de edición/eliminación invocan ResourcesModule (window).
 */
class ResourceList extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const resources = Storage.getAll('resources');

    if (resources.length === 0) {
      this.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('resource')}</div>
          <p>No hay recursos humanos registrados. Crea uno con <strong>Nuevo Recurso</strong>.</p>
        </div>`;
      return;
    }

    this.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Identificación</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Fecha Nacimiento</th>
              <th>Sangre</th>
              <th>ARL</th>
              <th>Salario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${resources.map(r => `
              <tr>
                <td>${_esc(r.identificacion)}</td>
                <td><strong>${_esc(r.nombre)}</strong>${r.genero ? `<br><small style="color:var(--color-muted)">${_esc(r.genero)}</small>` : ''}</td>
                <td><span style="background:var(--color-bg);padding:2px 8px;border-radius:4px;font-size:12px;">${_esc(r.rol)}</span></td>
                <td>${formatDate(r.fechaNacimiento)}</td>
                <td><span style="font-weight:700;color:var(--color-danger);">${_esc(r.tipoSangre)}</span></td>
                <td>${_esc(r.arl)}</td>
                <td>$${Number(r.salario||0).toLocaleString('es-CO')}</td>
                <td style="display:flex;gap:4px;align-items:center;">
                  <button class="btn-icon" title="Editar" aria-label="Editar" onclick="ResourcesModule.openEdit('${r.id}')">${icon('edit')}</button>
                  <button class="btn-icon" title="Eliminar" aria-label="Eliminar" onclick="ResourcesModule.confirmDelete('${r.id}')">${icon('trash')}</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
}
customElements.define('resource-list', ResourceList);

// ── Formulario de recurso ─────────────────────────────────────
/**
 * Retorna el HTML del formulario de recurso humano.
 * Roles y tipos de sangre están predefinidos como arrays internos.
 * @param {Object} r - Datos del recurso (vacío = formulario nuevo).
 */
function buildForm(r = {}) {
  const roles = ['Ingeniero','Arquitecto','Supervisor','Operario','Electricista','Plomero','Otro'];
  const sangres = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  return `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Identificación *</label>
        <input id="res-id" class="form-control" placeholder="Cédula / NIT" value="${_esc(r.identificacion||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Nombre completo *</label>
        <input id="res-nombre" class="form-control" placeholder="Ej. Juan Pérez" value="${_esc(r.nombre||'')}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Fecha de Nacimiento *</label>
        <input id="res-fnac" type="date" class="form-control" value="${r.fechaNacimiento||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de Sangre *</label>
        <select id="res-sangre" class="form-control">
          ${sangres.map(s => `<option value="${s}" ${r.tipoSangre===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">ARL *</label>
        <input id="res-arl" class="form-control" placeholder="Ej. Sura, Colmena..." value="${_esc(r.arl||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Género <small style="font-weight:400;color:var(--color-muted)">(opcional)</small></label>
        <select id="res-genero" class="form-control">
          <option value="">No especificar</option>
          <option value="Masculino"  ${r.genero==='Masculino'?'selected':''}>Masculino</option>
          <option value="Femenino"   ${r.genero==='Femenino'?'selected':''}>Femenino</option>
          <option value="No binario" ${r.genero==='No binario'?'selected':''}>No binario</option>
          <option value="Otro"       ${r.genero==='Otro'?'selected':''}>Otro</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Salario *</label>
        <input id="res-salario" type="number" min="0" class="form-control" placeholder="Ej. 2000000" value="${r.salario||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Rol *</label>
        <select id="res-rol" class="form-control">
          ${roles.map(rl => `<option value="${rl}" ${r.rol===rl?'selected':''}>${rl}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

function openNew() {
  openModal({ title: 'Nuevo Recurso Humano', body: buildForm(), onSave: () => _save(null) });
}

function openEdit(id) {
  const r = Storage.getById('resources', id);
  if (!r) return;
  openModal({ title: 'Editar Recurso Humano', body: buildForm(r), onSave: () => _save(id) });
}

/**
 * Valida y persiste el recurso. El recurso queda disponible
 * como opción en el selector de responsable al crear actividades.
 */
function _save(id) {
  const identificacion = document.getElementById('res-id').value.trim();
  const nombre         = document.getElementById('res-nombre').value.trim();
  const fechaNacimiento = document.getElementById('res-fnac').value;
  const tipoSangre     = document.getElementById('res-sangre').value;
  const arl            = document.getElementById('res-arl').value.trim();
  const genero         = document.getElementById('res-genero').value;
  const salario        = parseFloat(document.getElementById('res-salario').value);
  const rol            = document.getElementById('res-rol').value;

  if (!identificacion || !nombre || !fechaNacimiento || !arl || !salario || !rol) {
    showToast('Completa todos los campos requeridos.', 'danger'); return;
  }

  const data = { identificacion, nombre, fechaNacimiento, tipoSangre, arl, genero, salario, rol };
  if (id) {
    Storage.update('resources', id, data); showToast('Recurso actualizado.', 'success');
  } else {
    Storage.insert('resources', data); showToast('Recurso creado.', 'success');
  }
  closeModal();
  document.querySelector('resource-list')?.render();
}

function confirmDelete(id) {
  const r = Storage.getById('resources', id);
  if (!r) return;
  openModal({
    title: 'Eliminar Recurso',
    body: `<p>¿Eliminar a <strong>${_esc(r.nombre)}</strong>?</p>`,
    saveLabel: 'Eliminar', saveCls: 'btn-danger',
    onSave: () => {
      Storage.remove('resources', id);
      closeModal();
      document.querySelector('resource-list')?.render();
      showToast('Recurso eliminado.', 'success');
    },
  });
}

// ── API pública ─────────────────────────────────────────────────────
// Expuesto en window para los onclick de la tabla renderizada en el DOM.
const ResourcesModule = { openNew, openEdit, confirmDelete };
window.ResourcesModule = ResourcesModule;

export default ResourcesModule;
