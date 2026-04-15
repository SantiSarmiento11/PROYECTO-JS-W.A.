// ============================================================
//  calendar.js  –  Web Component <activity-calendar>
//  Renderiza un calendario mensual con las actividades.
//  Cada celda muestra las actividades que inician en ese día,
//  coloreadas según su estado. Permite filtrar por proyecto
//  y navegar entre meses sin recargar la página.
// ============================================================
import Storage from './storage.js';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Web Component: <activity-calendar> ───────────────────────
/**
 * Calendario mensual interactivo. Estado interno: _year, _month,
 * _projectFilter. Admite filtrado por proyecto y navegación por mes.
 * CalendarModule (window) delega en los métodos públicos de esta clase.
 */
class ActivityCalendar extends HTMLElement {
  constructor() {
    super();
    const now = new Date();
    this._year  = now.getFullYear();
    this._month = now.getMonth();
    this._projectFilter = '';
  }

  connectedCallback() { this.render(); }

  render() {
    const activities = Storage.getAll('activities');
    const projects   = Storage.getAll('projects');

    // Filter by project
    const filtered = this._projectFilter
      ? activities.filter(a => a.projectId === this._projectFilter)
      : activities;

    // Build calendar days
    const firstDay = new Date(this._year, this._month, 1).getDay();
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();
    const daysInPrev  = new Date(this._year, this._month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    let cells = [];
    // prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, current: false });
    }
    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true });
    }
    // next month padding
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: nextDay++, current: false });
    }

    const filterOptions = `
      <div class="calendar-filter">
        <label>Filtrar por proyecto:</label>
        <select id="cal-filter" onchange="CalendarModule.filterProject(this.value)">
          <option value="">Todos los proyectos</option>
          ${projects.map(p => `<option value="${p.id}" ${this._projectFilter===p.id?'selected':''}>${p.nombre}</option>`).join('')}
        </select>
        <span style="font-size:13px;color:var(--color-muted);">${MONTHS[this._month]} ${this._year}</span>
      </div>`;

    const navBar = `
      <div class="calendar-controls">
        <button class="btn btn-ghost btn-sm" onclick="CalendarModule.prevMonth()">◀ Anterior</button>
        <strong style="font-size:15px;">${MONTHS[this._month]} ${this._year}</strong>
        <button class="btn btn-ghost btn-sm" onclick="CalendarModule.nextMonth()">Siguiente ▶</button>
      </div>`;

    const legend = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <span class="badge badge-pending">Pendiente</span>
        <span class="badge badge-progress">En Proceso</span>
        <span class="badge badge-done">Terminada</span>
      </div>`;

    const calHeader = `
      <div class="cal-header">
        ${DAYS.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}
      </div>`;

    const calBody = `
      <div class="cal-body">
        ${cells.map(cell => {
          const cls = cell.current ? '' : 'other-month';
          const dateStr = cell.current
            ? `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`
            : null;
          const isTodayDay = dateStr === todayStr;
          const dayActs = dateStr
            ? filtered.filter(a => this._activityStartsOn(a, dateStr))
            : [];
          return `
            <div class="cal-day ${cls} ${isTodayDay ? 'today' : ''}">
              <div class="cal-day-num">${cell.day}</div>
              ${dayActs.map(a => `
                <div class="cal-event ${a.estado}" title="${a.nombre} – ${a.estado}">
                  ${a.nombre}
                </div>`).join('')}
            </div>`;
        }).join('')}
      </div>`;

    this.innerHTML = filterOptions + navBar + legend + `<div class="calendar-grid">${calHeader}${calBody}</div>`;
  }

  /** Compara la fecha de inicio de la actividad con `dateStr` (YYYY-MM-DD). */
  _activityStartsOn(activity, dateStr) {
    return activity.fechaInicio === dateStr;
  }

  /** Actualiza el filtro de proyecto y re-renderiza el calendario. */
  setFilter(projectId) {
    this._projectFilter = projectId;
    this.render();
  }

  prevMonth() {
    if (this._month === 0) { this._month = 11; this._year--; }
    else this._month--;
    this.render();
  }

  nextMonth() {
    if (this._month === 11) { this._month = 0; this._year++; }
    else this._month++;
    this.render();
  }
}
customElements.define('activity-calendar', ActivityCalendar);

// ── API pública (CalendarModule) ──────────────────────────────
/**
 * Intermediario entre los onclick del HTML y el Web Component.
 * Expuesto en window.CalendarModule para que el HTML pueda invocarlo.
 */
const CalendarModule = {
  filterProject(val) {
    document.querySelector('activity-calendar')?.setFilter(val);
  },
  prevMonth() {
    document.querySelector('activity-calendar')?.prevMonth();
  },
  nextMonth() {
    document.querySelector('activity-calendar')?.nextMonth();
  },
};
window.CalendarModule = CalendarModule;

export default CalendarModule;
