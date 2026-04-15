# CampusBuild – Gestión de Proyectos de Construcción

Aplicación web de gestión de proyectos para la empresa **CampusBuild**. Permite planificar, ejecutar y hacer seguimiento de proyectos de construcción desde una interfaz centralizada sin necesidad de backend.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Estructura | HTML5 semántico |
| Estilos | CSS con variables personalizadas |
| Lógica | JavaScript ES Modules (tipo `module`) |
| Componentes | Web Components nativos (`HTMLElement`) |
| Persistencia | `localStorage` (clave: `campusbuild_db`) |

---

## Estructura del proyecto

```
Proyecto JS (PRUEBA SuperGravity)/
│
├── README.md
│
└── campusbuild/
    ├── css/
    │   └── styles.css          # Estilos globales y variables de diseño
    │
    ├── html/
    │   └── index.html          # Punto de entrada único (SPA)
    │
    └── js/
        ├── storage.js          # Capa de persistencia (CRUD sobre localStorage)
        ├── app.js              # Bootstrap, enrutamiento SPA, modal y toasts
        ├── projects.js         # Módulo de proyectos
        ├── activities.js       # Módulo de actividades e hitos
        ├── resources.js        # Módulo de recursos humanos
        └── calendar.js         # Módulo de cronograma
```

---

## Arquitectura

La aplicación es una **Single Page Application (SPA)**: un único `index.html` contiene todas las secciones (vistas). La función `navigate(viewId)` —definida en `app.js` y expuesta en `window`— activa/desactiva secciones sin recargar la página.

Cada módulo JS registra un **Web Component** propio y lo expone en `window` para que el HTML pueda invocarlo desde atributos `onclick`.

```
index.html
  └── carga como type="module":
        ├── app.js          → navigate(), openModal(), showToast(), formatDate()
        ├── projects.js     → <project-list>   | window.ProjectsModule
        ├── activities.js   → <activity-list>  | <milestone-list> | window.ActivitiesModule
        ├── resources.js    → <resource-list>  | window.ResourcesModule
        └── calendar.js     → <activity-calendar> | window.CalendarModule
```

---

## Modelo de datos

Todos los datos se almacenan como un único objeto JSON en `localStorage` bajo la clave `campusbuild_db`.

### Colecciones

#### `projects`
| Campo | Tipo | Requerido |
|---|---|---|
| `id` | string (auto) | ✓ |
| `nombre` | string | ✓ |
| `descripcion` | string | — |
| `fechaInicio` | YYYY-MM-DD | ✓ |
| `fechaFin` | YYYY-MM-DD | ✓ |
| `createdAt` | ISO string (auto) | ✓ |

#### `activities`
| Campo | Tipo | Requerido |
|---|---|---|
| `id` | string (auto) | ✓ |
| `nombre` | string | ✓ |
| `projectId` | ref → projects.id | ✓ |
| `responsableId` | ref → resources.id | — |
| `fechaInicio` | YYYY-MM-DD | ✓ |
| `duracion` | número (días) | ✓ |
| `estado` | `pendiente` \| `en-proceso` \| `terminada` | ✓ |

#### `milestones`
| Campo | Tipo | Requerido |
|---|---|---|
| `id` | string (auto) | ✓ |
| `nombre` | string | ✓ |
| `descripcion` | string | — |
| `projectId` | ref → projects.id | ✓ |
| `activityIds` | ref[] → activities.id | — |

> Un hito se considera **cumplido automáticamente** cuando todas las actividades en `activityIds` tienen estado `terminada`.

#### `resources`
| Campo | Tipo | Requerido |
|---|---|---|
| `id` | string (auto) | ✓ |
| `identificacion` | string (cédula/NIT) | ✓ |
| `nombre` | string | ✓ |
| `fechaNacimiento` | YYYY-MM-DD | ✓ |
| `tipoSangre` | string | ✓ |
| `arl` | string | ✓ |
| `genero` | string | — |
| `salario` | number | ✓ |
| `rol` | string (lista predefinida) | ✓ |

### Relación entre entidades

```
Proyecto
 ├── Actividades  (activities.projectId → project.id)
 │     └── Responsable  (activities.responsableId → resource.id)
 │
 ├── Hitos  (milestones.projectId → project.id)
 │     └── Actividades asociadas  (milestones.activityIds[])
 │
 └── Cronograma  (calendar filtra activities por projectId)
```

---

## Módulos JS

### `storage.js`
Única capa que toca `localStorage`. Expone: `getAll`, `getById`, `insert`, `update`, `remove`.
Los IDs se generan con timestamp + valor aleatorio (`_genId`).

### `app.js`
- `navigate(viewId)` — activa la vista y dispara el re-render del Web Component.
- `openModal({ title, body, onSave, saveLabel, saveCls })` — modal reutilizable compartido.
- `showToast(msg, type)` — notificaciones temporales (3.2 s).
- `formatDate(str)` — convierte YYYY-MM-DD → DD/MM/AAAA.
- `DashboardStats` — Web Component que muestra las tarjetas de resumen.

### `projects.js`
Web Component `<project-list>`. CRUD completo con eliminación en cascada (elimina actividades e hitos del proyecto).

### `activities.js`
Web Components `<activity-list>` y `<milestone-list>`. El estado de los hitos se recalcula en cada render comparando el estado de sus actividades asociadas.

### `resources.js`
Web Component `<resource-list>`. Los recursos creados aquí aparecen como opciones en el selector de responsable al crear/editar actividades.

### `calendar.js`
Web Component `<activity-calendar>`. Renderiza un calendario mensual mostrando las actividades por su `fechaInicio`. Permite filtrar por proyecto y navegar entre meses.

---

## Flujo de uso

```
1. Crear recursos humanos  →  resources.js
2. Crear un proyecto       →  projects.js
3. Definir actividades     →  activities.js  (asignar proyecto y responsable)
4. Crear hitos             →  activities.js  (asociar actividades)
5. Visualizar cronograma   →  calendar.js
6. Actualizar estados      →  activities.js  (los hitos se actualizan solos)
```

---

## Buenas prácticas aplicadas

- Separación de responsabilidades: persistencia / lógica / UI en capas distintas.
- Un único modal reutilizable inyectado dinámicamente con `openModal`.
- Escapado de HTML con `_esc()` en todos los módulos para prevenir XSS.
- Eliminación en cascada al borrar proyectos (actividades e hitos asociados).
- Re-render explícito de Web Components tras cada operación CRUD.
- `navigate()` expuesto en `window` para integración con los `onclick` del HTML estático.
