// ============================================================
//  storage.js  –  Capa de persistencia (localStorage)
//  Todos los módulos (projects, activities, resources, calendar)
//  acceden a los datos exclusivamente a través de este archivo.
// ============================================================

/** Clave única bajo la que se almacena toda la base de datos. */
const DB_KEY = 'campusbuild_db';

/** Lee y devuelve la base de datos completa desde localStorage. */
function _load() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || _defaultDB();
  } catch {
    return _defaultDB();
  }
}

/** Serializa y persiste el objeto base de datos en localStorage. */
function _save(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/**
 * Estructura inicial vacía de la base de datos.
 * Colecciones disponibles: projects | activities | milestones | resources
 */
function _defaultDB() {
  return {
    projects:   [],
    activities: [],
    milestones: [],
    resources:  [],
  };
}

// ── Helpers CRUD genéricos ────────────────────────────────────

/** Genera un ID único combinando timestamp y valor aleatorio. */
function _genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Devuelve todos los registros de una colección. */
function getAll(collection) {
  return _load()[collection] || [];
}

/** Busca un registro por su ID dentro de una colección. Retorna null si no existe. */
function getById(collection, id) {
  return getAll(collection).find(i => i.id === id) || null;
}

/**
 * Inserta un nuevo registro en la colección.
 * Agrega automáticamente los campos `id` y `createdAt`.
 */
function insert(collection, data) {
  const db = _load();
  const record = { ...data, id: _genId(), createdAt: new Date().toISOString() };
  db[collection].push(record);
  _save(db);
  return record;
}

/**
 * Actualiza un registro existente fusionando los nuevos datos.
 * Agrega automáticamente el campo `updatedAt`. Retorna null si no lo encuentra.
 */
function update(collection, id, data) {
  const db = _load();
  const idx = db[collection].findIndex(i => i.id === id);
  if (idx === -1) return null;
  db[collection][idx] = { ...db[collection][idx], ...data, updatedAt: new Date().toISOString() };
  _save(db);
  return db[collection][idx];
}

/**
 * Elimina un registro de la colección por su ID.
 * Retorna true si se eliminó algo, false si no existía.
 */
function remove(collection, id) {
  const db = _load();
  const before = db[collection].length;
  db[collection] = db[collection].filter(i => i.id !== id);
  _save(db);
  return db[collection].length < before;
}

// ── API pública del módulo ────────────────────────────────────
const Storage = { getAll, getById, insert, update, remove };

export default Storage;
