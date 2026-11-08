(function () {
  const DB_NAME = "estimator-db";
  const DB_VERSION = 2;
  const TABLES_STORE = "tables"; // live, working data
  const SEEDS_STORE = "seeds"; // baseline that "Reset table" restores to
  const QUOTATIONS_STORE = "quotations"; // saved PO line items (no seed/baseline)

  const TABLE_NAMES = [
    "breakers", "mech_lugs", "busbars", "assemblies_2p", "assemblies_3p", "constants",
    "clearance", "lug_dimensions", "ats_mts", "grounding_busbars", "box_pricing",
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
      case "clearance":
        return SEED_CLEARANCE.map((r, i) => ({ id: i + 1, ...r }));
      case "lug_dimensions":
        return SEED_LUG_DIMENSIONS.map((r, i) => ({ id: i + 1, ...r }));
      case "ats_mts":
        return SEED_ATS_MTS.map((r, i) => ({ id: i + 1, ...r }));
      case "grounding_busbars":
        return SEED_GROUNDING_BUSBARS.map((r, i) => ({ id: i + 1, ...r }));
      case "box_pricing":
        return BOX_PRICING.map((r, i) => ({ id: i + 1, ...r }));
      default:
        return [];
    }
  }

  // Shows a visible banner so a storage failure doesn't leave blank pages.
  // Safe to call more than once; later calls replace the message.
  function showDBBanner(message, isError) {
    let bar = document.getElementById("db-error-banner");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "db-error-banner";
      bar.setAttribute("role", "alert");
      bar.style.cssText =
        "position:sticky;top:0;z-index:9999;padding:10px 14px;font:500 14px/1.4 sans-serif;color:#fff;";
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.style.background = isError ? "#7a1f1f" : "#7a5a00";
    bar.textContent = message;
  }
  function hideDBBanner() {
    const bar = document.getElementById("db-error-banner");
    if (bar) bar.remove();
  }
  window.reportDBError = function (err) {
    console.error("Database failed to start.", err);
    const detail = err && err.message ? " (" + err.message + ")" : "";
    showDBBanner(
      "The app's local database could not be opened" + detail +
        ". Private/incognito mode, blocked site storage, or another open tab on an older version can cause this. " +
        "Close other tabs of this app, allow storage, and reload.",
      true
    );
  };

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available in this browser"));
        return;
      }
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }
      // Another tab still holds an older version open, so the upgrade is
      // waiting. It resumes on its own once that tab closes, so warn
      // instead of rejecting.
      req.onblocked = () =>
        showDBBanner("Database upgrade is waiting: close other tabs or windows of this app.", false);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(TABLES_STORE)) db.createObjectStore(TABLES_STORE);
        if (!db.objectStoreNames.contains(SEEDS_STORE)) db.createObjectStore(SEEDS_STORE);
        if (!db.objectStoreNames.contains(QUOTATIONS_STORE)) {
          db.createObjectStore(QUOTATIONS_STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = () => {
        const handle = req.result;
        // If a newer version of the app wants to upgrade, get out of its way.
        handle.onversionchange = () => handle.close();
        hideDBBanner();
        resolve(handle);
      };
      req.onerror = () => reject(req.error || new Error("Unable to open the database"));
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

  // These operate on QUOTATIONS_STORE, which uses an in-line keyPath
  // ("id"), so — unlike idbGet/idbPut above — no separate key is passed.
  function idbGetAll(idb, storeName) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function idbAdd(idb, storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readwrite");
      const req = tx.objectStore(storeName).add(value);
      req.onsuccess = () => resolve(req.result); // generated key
      req.onerror = () => reject(req.error);
    });
  }

  function idbPutKeyed(idb, storeName, value) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbDeleteKey(idb, storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
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
    replaceArrayContents(MECH_LUGS, DB.mech_lugs.map(stripId));
    replaceArrayContents(CLEARANCE, DB.clearance.map(stripId));
    replaceArrayContents(LUG_DIMENSIONS, DB.lug_dimensions.map(stripId));
    replaceArrayContents(ATS_MTS, DB.ats_mts.map(stripId));
    replaceArrayContents(GROUNDING_BUSBARS, DB.grounding_busbars.map(stripId));
    replaceArrayContents(BOX_PRICING, DB.box_pricing.map(stripId));
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

  // If new constants get added to CONSTANTS in a later version of the app,
  // a browser that already has a saved "constants" table won't pick them up
  // on its own (it just keeps whatever rows it already has). This adds any
  // missing ones (by name) at their code-default value, without touching
  // rows the table already has. Returns true if it changed anything.
  function healConstants(rows) {
    const known = new Set(rows.map((r) => r.name));
    let changed = false;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (String(rows[i].name).startsWith("box_price_")) {
        rows.splice(i, 1);
        changed = true;
      }
    }
    Object.entries(CONSTANTS).forEach(([name, value]) => {
      if (!known.has(name)) {
        rows.push({ id: nextId(rows), name, value });
        known.add(name);
        changed = true;
      }
    });
    return changed;
  }

  function healBoxPricing(rows) {
    let changed = false;
    BOX_PRICING.forEach((defaultRow) => {
      if (rows.some((row) => row.panel_type === defaultRow.panel_type)) return;
      rows.push({ id: nextId(rows), ...defaultRow });
      changed = true;
    });
    return changed;
  }

  const MECH_LUG_CATALOG_BY_AT = {
    16: "MGL-A6", 20: "MGL-A6", 25: "MGL-A6", 30: "MGL-A6", 32: "MGL-A6",
    40: "MGL-A6", 50: "MGL-A6", 60: "MGL-A6", 63: "MGL-A0", 75: "MGL-A0",
    80: "MGL-A0", 100: "MGL-A0", 125: "MGLA-250", 160: "MGLA-250",
    180: "MGLA-250", 200: "MGLA-250", 225: "MGLA-250", 250: "MGLA-250",
    315: "MGLA-350", 320: "MGLA-350", 350: "MGLA-500", 400: "MGLA-350",
    500: "MGLA-350", 600: "MGLA-350", 630: "MGLA-350", 700: "MGLA-500",
    800: "MGLA-500", 1000: "MGLA-600", 1250: "MGLA-800", 1600: "MGLA-800",
    2000: "MGLA-1000",
  };

  function healMechLugCatalog(rows) {
    let changed = false;
    rows.forEach((row) => {
      if (row.cat_no) return;
      const catNo = MECH_LUG_CATALOG_BY_AT[Number(row.ampere_trip)];
      if (catNo) {
        row.cat_no = catNo;
        changed = true;
      }
    });
    return changed;
  }

  const LUG_RELATIVE_MMSQ_BY_CAT = {
    "MGL-A6": "10/14MMSQ",
    "MGL-A0": "35/50MMSQ",
    "MGLA-250": "125MMSQ",
    "MGLA-300": "300MMSQ",
    "MGLA-350": "200MMSQ",
    "MGLA-500": "250MMSQ",
    "MGLA-600": "300MMSQ",
    "MGLA-800": "350/400MMSQ",
    "MGLA-1000": "500MMSQ",
  };

  function healLugRelativeMmsq(rows) {
    let changed = false;
    rows.forEach((row) => {
      if (row.relative_mmsq_size) return;
      const size = LUG_RELATIVE_MMSQ_BY_CAT[row.cat_no];
      if (size) {
        row.relative_mmsq_size = size;
        changed = true;
      }
    });
    return changed;
  }

  // One-time migration of legacy busbar rows (min/max/condition shape) to the
  // single-"at" shape. MCB rows get their standard bar/price ONLY during that
  // migration, so later edits made in Database admin are kept across reloads.
  function normalizeBusbars(rows) {
    let changed = false;
    rows.forEach((row) => {
      if (row.at === undefined || row.at === null) {
        row.at = row.max !== undefined ? row.max : row.min || 0;
        changed = true;
      }
      const legacy = row.min !== undefined || row.max !== undefined || row.condition !== undefined;
      if (legacy) {
        if (row.type === "MCB") {
          row.needed = "3MM X 10MM X 20FT";
          row.price = 2500;
        }
        delete row.min;
        delete row.max;
        delete row.condition;
        changed = true;
      }
    });
    return changed;
  }

  // Older saved clearance tables stop at 800A. If a table has no rows above
  // 800A at all, add the code-default rows for 1000A and up (rows the user
  // already has are never touched).
  function healClearance(rows) {
    if (rows.some((r) => Number(r.at) > 800)) return false;
    SEED_CLEARANCE.filter((d) => Number(d.at) > 800).forEach((d) => {
      rows.push({ id: nextId(rows), ...d });
    });
    return true;
  }

  const DBReady = (async () => {
    idbHandle = await openIDB();
    for (const name of TABLE_NAMES) {
      let seed = await idbGet(idbHandle, SEEDS_STORE, name);
      if (!seed) {
        seed = hardcodedSeedFor(name);
        if (name === "busbars") normalizeBusbars(seed);
        await idbPut(idbHandle, SEEDS_STORE, name, seed);
      } else {
        const seedChanged =
          (name === "constants" && healConstants(seed)) ||
          (name === "box_pricing" && healBoxPricing(seed)) ||
          (name === "mech_lugs" && healMechLugCatalog(seed)) ||
          (name === "lug_dimensions" && healLugRelativeMmsq(seed)) ||
          (name === "clearance" && healClearance(seed)) ||
          (name === "busbars" && normalizeBusbars(seed));
        if (seedChanged) await idbPut(idbHandle, SEEDS_STORE, name, seed);
      }
      let live = await idbGet(idbHandle, TABLES_STORE, name);
      if (!live) {
        live = seed.map((r) => ({ ...r }));
        await idbPut(idbHandle, TABLES_STORE, name, live);
      } else {
        const liveChanged =
          (name === "constants" && healConstants(live)) ||
          (name === "box_pricing" && healBoxPricing(live)) ||
          (name === "mech_lugs" && healMechLugCatalog(live)) ||
          (name === "lug_dimensions" && healLugRelativeMmsq(live)) ||
          (name === "clearance" && healClearance(live)) ||
          (name === "busbars" && normalizeBusbars(live));
        if (liveChanged) await idbPut(idbHandle, TABLES_STORE, name, live);
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
        if (name === "busbars") normalizeBusbars(rows);
        if (name === "box_pricing") healBoxPricing(rows);
        if (name === "clearance") healClearance(rows);
        DB[name] = rows;
        await idbPut(idbHandle, SEEDS_STORE, name, rows.map((r) => ({ ...r })));
        await idbPut(idbHandle, TABLES_STORE, name, rows);
      }
      syncGlobals();
    },

    // ---- Saved PO line items (quotations). No seed/baseline concept —
    // these are user documents, not editable pricing tables.
    async listQuotations() {
      const rows = await idbGetAll(idbHandle, QUOTATIONS_STORE);
      return rows.sort((a, b) => (a.id || 0) - (b.id || 0));
    },
    async addQuotation(data) {
      const id = await idbAdd(idbHandle, QUOTATIONS_STORE, { ...data });
      return id;
    },
    async updateQuotation(id, data) {
      await idbPutKeyed(idbHandle, QUOTATIONS_STORE, { ...data, id });
    },
    async deleteQuotation(id) {
      await idbDeleteKey(idbHandle, QUOTATIONS_STORE, id);
    },
  };

  window.DBops = DBops;
  window.DBReady = DBReady;
})();
