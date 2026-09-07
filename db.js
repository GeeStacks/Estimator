(function () {
  const DB_NAME = "estimator-db";
  const DB_VERSION = 1;
  const TABLES_STORE = "tables"; // live, working data
  const SEEDS_STORE = "seeds"; // baseline that "Reset table" restores to

  const TABLE_NAMES = [
    "breakers", "mech_lugs", "busbars", "assemblies_2p", "assemblies_3p", "constants",
  ];

  function hardcodedSeedFor(name) {
    switch (name) {
      case "breakers":
        return BREAKERS.map((r, i) => ({ id: i + 1, ...r }));
      case "mech_lugs":
        return SEED_MECH_LUGS.map((r, i) => ({ id: i + 1, ...r }));
      case "busbars":
        return BUSBARS.map((r, i) => ({ id: i + 1, ...r }));
      case "assemblies_2p":
        return ASSEMBLIES["2P"].map((r, i) => ({ id: i + 1, ...r }));
      case "assemblies_3p":
        return ASSEMBLIES["3P"].map((r, i) => ({ id: i + 1, ...r }));
      case "constants":
        return Object.entries(CONSTANTS).map(([name, value], i) => ({ id: i + 1, name, value }));
      default:
        return [];
    }
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(TABLES_STORE)) db.createObjectStore(TABLES_STORE);
        if (!db.objectStoreNames.contains(SEEDS_STORE)) db.createObjectStore(SEEDS_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGet(idb, storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function idbPut(idb, storeName, key, value) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  let idbHandle = null;
  const DB = {}; // in-memory mirror of the live "tables" store

  function syncGlobals() {
    // keep the legacy globals (used by app.js's calculation logic) mutated
    // in place so existing code keeps working against live, editable data.
    replaceArrayContents(BREAKERS, DB.breakers.map(stripId));
    replaceArrayContents(BUSBARS, DB.busbars.map(stripId));
    replaceArrayContents(ASSEMBLIES["2P"], DB.assemblies_2p.map(stripId));
    replaceArrayContents(ASSEMBLIES["3P"], DB.assemblies_3p.map(stripId));
    Object.keys(CONSTANTS).forEach((k) => delete CONSTANTS[k]);
    DB.constants.forEach((c) => { CONSTANTS[c.name] = c.value; });
  }

  function stripId(row) {
    const { id, ...rest } = row;
    return rest;
  }

  function replaceArrayContents(arr, items) {
    arr.length = 0;
    items.forEach((it) => arr.push(it));
  }

  function nextId(rows) {
    return rows.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
  }

  const DBReady = (async () => {
    idbHandle = await openIDB();
    for (const name of TABLE_NAMES) {
      let seed = await idbGet(idbHandle, SEEDS_STORE, name);
      if (!seed) {
        seed = hardcodedSeedFor(name);
        await idbPut(idbHandle, SEEDS_STORE, name, seed);
      }
      let live = await idbGet(idbHandle, TABLES_STORE, name);
      if (!live) {
        live = seed.map((r) => ({ ...r }));
        await idbPut(idbHandle, TABLES_STORE, name, live);
      }
      DB[name] = live;
    }
    syncGlobals();
    return DB;
  })();

  async function persist(name) {
    await idbPut(idbHandle, TABLES_STORE, name, DB[name]);
    syncGlobals();
  }

  const DBops = {
    ready: DBReady,
    tableNames: TABLE_NAMES,
    getTable(name) {
      return DB[name] || [];
    },
    async addRow(name, row) {
      const rows = DB[name];
      const id = nextId(rows);
      const newRow = { id, ...row };
      rows.push(newRow);
      await persist(name);
      return newRow;
    },
    async updateRow(name, id, patch) {
      const rows = DB[name];
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...patch, id };
      await persist(name);
      return rows[idx];
    },
    async deleteRow(name, id) {
      const rows = DB[name];
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      rows.splice(idx, 1);
      await persist(name);
      return true;
    },
    // Restores a table to its last-imported (or original hardcoded, if
    // never imported) baseline.
    async resetTable(name) {
      const seed = await idbGet(idbHandle, SEEDS_STORE, name);
      DB[name] = (seed || hardcodedSeedFor(name)).map((r) => ({ ...r }));
      await persist(name);
      return DB[name];
    },
    // Exports current live data for all tables (id stripped) as one object.
    exportAll() {
      const out = {};
      TABLE_NAMES.forEach((name) => {
        out[name] = DB[name].map(stripId);
      });
      return out;
    },
    // Imports a full dataset. This becomes both the new live data AND the
    // new reset baseline for every table it includes.
    async importAll(data) {
      for (const name of TABLE_NAMES) {
        if (!Array.isArray(data[name])) continue;
        const rows = data[name].map((r, i) => ({ id: i + 1, ...r }));
        DB[name] = rows;
        await idbPut(idbHandle, SEEDS_STORE, name, rows.map((r) => ({ ...r })));
        await idbPut(idbHandle, TABLES_STORE, name, rows);
      }
      syncGlobals();
    },
  };

  window.DBops = DBops;
  window.DBReady = DBReady;
})();
