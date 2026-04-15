// ============================================================
//  calendar.js  –  Web Component <activity-calendar>
//  Renderiza un calendario mensual con proyectos, hitos y
//  actividades. Permite filtrar por proyecto y navegar entre
//  meses sin recargar la página.
// ============================================================
import Storage from './storage.js';
import { activityEndDate, milestoneIsCompleted, resolveMilestoneDate, icon } from './app.js';

const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Web Component: <activity-calendar> ───────────────────────
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
    const milestones = Storage.getAll('milestones');

    const filteredProjects = this._projectFilter
      ? projects.filter(p => p.id === this._projectFilter)
      : projects;
    const filteredActivities = this._projectFilter
      ? activities.filter(a => a.projectId === this._projectFilter)
      : activities;
    const filteredMilestones = this._projectFilter
      ? milestones.filter(m => m.projectId === this._projectFilter)
      : milestones;

    const firstDay = new Date(this._year, this._month, 1).getDay();
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();
    const daysInPrev  = new Date(this._year, this._month, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const entries = [
      ...filteredProjects.map(project => ({
        start: project.fechaInicio,
        end: project.fechaFin,
        className: project.estado === 'terminado' ? 'project-done' : 'project-active',
        title: `${project.nombre} · Proyecto`,
        label: `Proyecto: ${project.nombre}`,
        order: 0,
      })),
      ...filteredMilestones.map(milestone => ({
        start: resolveMilestoneDate(milestone, filteredActivities),
        end: resolveMilestoneDate(milestone, filteredActivities),
        className: milestoneIsCompleted(milestone, filteredActivities) ? 'milestone-done' : 'milestone-pending',
        title: `${milestone.nombre} · Hito`,
        label: `Hito: ${milestone.nombre}`,
        order: 1,
      })),
      ...filteredActivities.map(activity => ({
        start: activity.fechaInicio,
        end: activityEndDate(activity),
        className: activity.estado,
        title: `${activity.nombre} · Actividad · ${activity.estado}`,
        label: `Actividad: ${activity.nombre}`,
        order: 2,
      })),
    ].filter(entry => entry.start && entry.end);

    let cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true });
    }
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
        <button class="btn btn-ghost btn-sm" onclick="CalendarModule.prevMonth()">Anterior</button>
        <strong style="font-size:15px;">${MONTHS[this._month]} ${this._year}</strong>
        <button class="btn btn-ghost btn-sm" onclick="CalendarModule.nextMonth()">Siguiente</button>
      </div>`;

    const legend = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <span class="badge badge-project-active">${icon('project')} Proyecto</span>
        <span class="badge badge-milestone-no">${icon('trophy')} Hito</span>
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
          const dayEntries = dateStr
            ? entries.filter(entry => this._entryOccursOn(entry, dateStr)).sort((a, b) => a.order - b.order)
            : [];
          return `
            <div class="cal-day ${cls} ${isTodayDay ? 'today' : ''}">
              <div class="cal-day-num">${cell.day}</div>
              ${dayEntries.map(entry => `
                <div class="cal-event ${entry.className}" title="${entry.title}">
                  ${entry.label}
                </div>`).join('')}
            </div>`;
        }).join('')}
      </div>`;

    this.innerHTML = filterOptions + navBar + legend + `<div class="calendar-grid">${calHeader}${calBody}</div>`;
  }

  _entryOccursOn(entry, dateStr) {
    return entry.start <= dateStr && entry.end >= dateStr;
  }

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
