(function () {
  const SCHEMAS = {
    breakers: {
      label: "Breakers",
      fields: [
        { key: "brand", label: "Brand", type: "text" },
        { key: "model", label: "Model", type: "text" },
        { key: "at", label: "AT", type: "number" },
        { key: "poles", label: "Poles", type: "number" },
        { key: "price", label: "Price", type: "text" },
        { key: "kaic", label: "KAIC", type: "number" },
        { key: "type", label: "Type", type: "text" },
        { key: "frame", label: "Frame", type: "number" },
        { key: "width", label: "Width", type: "number" },
        { key: "height", label: "Height", type: "number" },
        { key: "depth", label: "Depth", type: "number" },
      ],
      blank: { brand: "", model: "", at: 0, poles: 1, price: "NO PRICE", kaic: 0, type: "MCB", frame: 0, width: 0, height: 0, depth: 0 },
    },
    mech_lugs: {
      label: "Mech lugs",
      fields: [
        { key: "ampere_trip", label: "Ampere trip", type: "number" },
        { key: "mech_lugs_size", label: "Size", type: "text" },
        { key: "sets", label: "Sets", type: "number" },
        { key: "price", label: "Price", type: "number" },
        { key: "cat_no", label: "Cat. no.", type: "text" },
      ],
      blank: { ampere_trip: 0, mech_lugs_size: "", sets: 1, price: 0, cat_no: "" },
    },
    busbars: {
      label: "Busbars",
      fields: [
        { key: "type", label: "Type", type: "text" },
        { key: "at", label: "AT", type: "number" },
        { key: "needed", label: "Busbar needed", type: "text" },
        { key: "price", label: "Price", type: "number" },
      ],
      blank: { type: "MCCB", at: 0, needed: "", price: 0 },
    },
    assemblies_2p: {
      label: "2P assembly",
      fields: [
        { key: "model", label: "Model", type: "text" },
        { key: "ways", label: "Ways", type: "number" },
        { key: "unit_cost", label: "Unit cost", type: "number" },
        { key: "price", label: "Price", type: "number" },
      ],
      blank: { model: "", ways: 0, unit_cost: 0, price: 0 },
    },
    assemblies_3p: {
      label: "3P assembly",
      fields: [
        { key: "model", label: "Model", type: "text" },
        { key: "ways", label: "Ways", type: "number" },
        { key: "unit_cost", label: "Unit cost", type: "number" },
        { key: "price", label: "Price", type: "number" },
      ],
      blank: { model: "", ways: 0, unit_cost: 0, price: 0 },
    },
    constants: {
      label: "Constants",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "value", label: "Value", type: "number" },
      ],
      blank: { name: "", value: 0 },
    },
    box_pricing: {
      label: "Box pricing",
      fields: [
        { key: "panel_type", label: "Box type", type: "text" },
        { key: "material_loss_pct", label: "Material loss %", type: "number" },
        { key: "laser_mode", label: "Laser mode (rate/flat)", type: "text" },
        { key: "laser_rate", label: "Laser rate (₱/mm)", type: "number" },
        { key: "laser_flat", label: "Laser flat (₱)", type: "number" },
        { key: "powder_mode", label: "Powder mode (rate/flat)", type: "text" },
        { key: "powder_rate", label: "Powder rate (₱/m²)", type: "number" },
        { key: "powder_flat", label: "Powder flat (₱)", type: "number" },
        { key: "labor_mode", label: "Labor mode (perUnit/perHour)", type: "text" },
        { key: "labor_rate_per_unit", label: "Labor per unit (₱)", type: "number" },
        { key: "labor_hours", label: "Labor hours", type: "number" },
        { key: "labor_rate_per_hour", label: "Labor per hour (₱)", type: "number" },
        { key: "other_price", label: "Other (₱)", type: "number" },
        { key: "safety_factor", label: "Safety factor (×)", type: "number" },
      ],
      blank: {
        panel_type: "MDP", material_loss_pct: 20,
        laser_mode: "rate", laser_rate: 0.168, laser_flat: 0,
        powder_mode: "rate", powder_rate: 300, powder_flat: 0,
        labor_mode: "perUnit", labor_rate_per_unit: 150, labor_hours: 0, labor_rate_per_hour: 0,
        other_price: 0, safety_factor: 1.2,
      },
    },
    clearance: {
      label: "Clearance",
      fields: [
        { key: "at", label: "AT", type: "number" },
        { key: "wire_size", label: "Wire size", type: "text" },
        { key: "lug_size_label", label: "Lug size", type: "text" },
        { key: "bending_clearance_mm", label: "Bend clearance (mm)", type: "number" },
        { key: "parallel_count", label: "Parallel count", type: "number" },
        { key: "mgl_cat_no", label: "MGL cat. no.", type: "text" },
      ],
      blank: { at: 0, wire_size: "", lug_size_label: "", bending_clearance_mm: 0, parallel_count: 1, mgl_cat_no: "" },
    },
    lug_dimensions: {
      label: "Lug dimensions",
      fields: [
        { key: "cat_no", label: "Cat. no.", type: "text" },
        { key: "relative_mmsq_size", label: "Relative MMSQ size", type: "text" },
        { key: "wire_range", label: "Wire range", type: "text" },
        { key: "bolt_size_in", label: "Bolt size", type: "text" },
        { key: "metric_bolt_mm", label: "Metric bolt (mm)", type: "number" },
        { key: "L", label: "L (mm)", type: "number" },
        { key: "W", label: "W (mm)", type: "number" },
        { key: "G", label: "G (mm)", type: "number" },
        { key: "H", label: "H (mm)", type: "number" },
        { key: "F", label: "F (mm)", type: "number" },
        { key: "std_pkg", label: "Std. pkg", type: "number" },
      ],
      blank: { cat_no: "", relative_mmsq_size: "", wire_range: "", bolt_size_in: "", metric_bolt_mm: 0, L: 0, W: 0, G: 0, H: 0, F: 0, std_pkg: 0 },
    },
    grounding_busbars: {
      label: "Grounding busbars",
      fields: [
        { key: "branches", label: "Branches", type: "number" },
        { key: "cost", label: "Cost", type: "number" },
      ],
      blank: { branches: 0, cost: 0 },
    },
    ats_mts: {
      label: "ATS/MTS",
      fields: [
        { key: "min", label: "AT min", type: "number" },
        { key: "max", label: "AT max", type: "number" },
        { key: "pole", label: "Pole", type: "number" },
        { key: "bend_1st", label: "1st Bend", type: "number" },
        { key: "bend_2nd", label: "2nd Bend", type: "number" },
        { key: "bend_hor", label: "Hor. Bend", type: "number" },
        { key: "bend_3rd", label: "3rd Bend", type: "number" },
        { key: "bend_4th", label: "4th Bend", type: "number" },
        { key: "total_length_mm", label: "Total Length (mm)", type: "number" },
        { key: "motor", label: "Motor", type: "number" },
        { key: "controller", label: "Controller", type: "number" },
        { key: "accessories", label: "Accessories", type: "number" },
      ],
      blank: {
        min: 0, max: 0, pole: 3, bend_1st: 0, bend_2nd: 0, bend_hor: 0, bend_3rd: 0, bend_4th: 0,
        total_length_mm: 0, motor: 0, controller: 0, accessories: 0,
      },
    },
  };

  const TABLE_ORDER = [
    "breakers", "mech_lugs", "busbars", "assemblies_2p", "assemblies_3p", "constants",
    "box_pricing", "clearance", "lug_dimensions", "ats_mts", "grounding_busbars",
  ];

  let activeTable = "breakers";
  let filterText = "";
  let filterField = "all";
  let valueFilters = {};
  let sortKey = "";
  let sortDirection = "asc";
  let editMode = false;

  const root = document.getElementById("admin-app");

  function refreshBuilder(forcePricingDefaults) {
    if (forcePricingDefaults || activeTable === "box_pricing") {
      if (window.refreshBoxPricingDefaults) {
        window.refreshBoxPricingDefaults();
        return;
      }
    }
    if (window.renderBuilder) window.renderBuilder();
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") node.className = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else if (v !== undefined && v !== null) node.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function coerce(type, raw) {
    if (type === "number") {
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }
    return raw;
  }

  function matchesFilter(row, text, fieldKey, fields) {
    if (!text) return true;
    const needle = text.toLowerCase();
    const values = fieldKey === "all" ? fields.map((field) => row[field.key]) : [row[fieldKey]];
    return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
  }

  function compareRows(a, b, field) {
    const aValue = a[field.key];
    const bValue = b[field.key];
    const aEmpty = aValue === null || aValue === undefined || aValue === "";
    const bEmpty = bValue === null || bValue === undefined || bValue === "";
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;

    if (field.type === "number") return Number(aValue) - Number(bValue);
    return String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: "base" });
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function render() {
    const activeElement = document.activeElement;
    const focusRole = activeElement && activeElement.dataset && activeElement.dataset.role;
    const caret = focusRole === "filter" ? activeElement.selectionStart : null;
    const focusedValueIndex = focusRole === "value-filter" ? activeElement.dataset.index : null;
    const valuesMenuOpen = !!root.querySelector(".admin-value-filter[open]");

    root.innerHTML = "";
    const schema = SCHEMAS[activeTable];
    const tableRows = DBops.getTable(activeTable);
    const activeValueFilter = valueFilters[activeTable + ":" + filterField];
    const rows = tableRows
      .filter((row) => matchesFilter(row, filterText, filterField, schema.fields))
      .filter((row) => {
        if (!activeValueFilter) return true;
        const values = filterField === "all"
          ? schema.fields.map((field) => String(row[field.key] ?? ""))
          : [String(row[filterField] ?? "")];
        return values.some((value) => activeValueFilter.has(value));
      });
    if (sortKey) {
      const sortField = schema.fields.find((field) => field.key === sortKey);
      if (sortField) {
        rows.sort((a, b) => {
          const result = compareRows(a, b, sortField);
          const aValue = a[sortField.key];
          const bValue = b[sortField.key];
          const hasEmptyValue = aValue === null || aValue === undefined || aValue === ""
            || bValue === null || bValue === undefined || bValue === "";
          return sortDirection === "asc" || hasEmptyValue ? result : -result;
        });
      }
    }

    const wrap = el("div", { class: "wrap" }, []);

    // Header
    wrap.appendChild(
      el("div", { class: "header" }, [
        el("div", {}, [
          el("div", { class: "eyebrow" }, ["Estimator"]),
          el("h1", {}, ["Database admin"]),
        ]),
      ])
    );

    // Global toolbar: edit mode toggle + export/import
    const editToggleLabel = el("label", { class: "edit-toggle-label" }, [
      el("input", {
        type: "checkbox",
        checked: editMode ? "checked" : undefined,
        onchange: (e) => {
          editMode = e.target.checked;
          render();
        },
      }),
      el("span", {}, ["Edit mode"]),
    ]);

    const exportBtn = el(
      "button",
      {
        class: "toolbar-btn",
        onclick: () => {
          downloadJSON(DBops.exportAll(), "estimator-data.json");
        },
      },
      ["Export data"]
    );

    const importInput = el("input", {
      type: "file",
      accept: "application/json",
      style: "display:none",
      onchange: async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          await DBops.importAll(data);
          refreshBuilder(true);
          render();
          window.alert("Import complete. Imported data is now the live data and the new baseline for \u201cReset table\u201d.");
        } catch (err) {
          window.alert("Could not import that file: " + err.message);
        }
        e.target.value = "";
      },
    });
    const importBtn = el(
      "button",
      {
        class: "toolbar-btn",
        disabled: !editMode ? "disabled" : undefined,
        onclick: () => importInput.click(),
      },
      ["Import data"]
    );

    wrap.appendChild(
      el("div", { class: "global-toolbar" }, [editToggleLabel, exportBtn, importBtn, importInput])
    );

    if (!editMode) {
      wrap.appendChild(
        el("div", { class: "view-only-banner" }, [
          "View-only mode. Toggle \u201cEdit mode\u201d above to add, edit, or delete records.",
        ])
      );
    }

    // Table tabs
    const tabs = el(
      "div",
      { class: "admin-tabs" },
      TABLE_ORDER.map((name) =>
        el(
          "button",
          {
            class: "admin-tab" + (name === activeTable ? " active" : ""),
            onclick: () => {
              activeTable = name;
              filterText = "";
              filterField = "all";
              valueFilters = {};
              sortKey = "";
              sortDirection = "asc";
              render();
            },
          },
          [SCHEMAS[name].label + " (" + DBops.getTable(name).length + ")"]
        )
      )
    );
    wrap.appendChild(tabs);

    // Per-table toolbar: filter + add + reset
    const filterInput = el("input", {
      type: "text",
      "data-role": "filter",
      placeholder: "Filter rows\u2026",
      value: filterText,
      oninput: (e) => {
        filterText = e.target.value;
        render();
      },
    });
    const filterSelect = el("select", {
      "data-role": "filter-field",
      "aria-label": "Filter column",
      onchange: (e) => {
        filterField = e.target.value;
        render();
      },
    }, [
      el("option", { value: "all" }, ["All columns"]),
      ...schema.fields.map((field) => el("option", { value: field.key }, [field.label])),
    ]);
    filterSelect.value = filterField;

    const valueKey = activeTable + ":" + filterField;
    const uniqueValues = Array.from(new Set(tableRows.flatMap((row) =>
      filterField === "all"
        ? schema.fields.map((field) => String(row[field.key] ?? ""))
        : [String(row[filterField] ?? "")]
    ))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    const selectedValues = valueFilters[valueKey];
    const valueOptions = uniqueValues.map((value, index) => {
      const checkbox = el("input", {
        type: "checkbox",
        "data-role": "value-filter",
        "data-index": String(index),
        checked: !selectedValues || selectedValues.has(value) ? "checked" : undefined,
        onchange: (e) => {
          const next = new Set(valueFilters[valueKey] || uniqueValues);
          if (e.target.checked) next.add(value);
          else next.delete(value);
          if (next.size === uniqueValues.length) delete valueFilters[valueKey];
          else valueFilters[valueKey] = next;
          render();
        },
      });
      return el("label", { class: "admin-value-option" }, [
        checkbox,
        el("span", {}, [value || "(Blanks)"]),
      ]);
    });
    const valueFilterMenu = el("details", { class: "admin-value-filter" }, [
      el("summary", {}, [
        "Values (" + (selectedValues ? selectedValues.size + " selected" : "All selected") + ")",
      ]),
      el("div", { class: "admin-value-menu" }, [
        el("div", { class: "admin-value-actions" }, [
          el("button", {
            type: "button",
            class: "admin-value-action",
            onclick: () => {
              delete valueFilters[valueKey];
              render();
            },
          }, ["Select all"]),
          el("button", {
            type: "button",
            class: "admin-value-action",
            onclick: () => {
              valueFilters[valueKey] = new Set();
              render();
            },
          }, ["Clear all"]),
        ]),
        ...valueOptions,
      ]),
    ]);
    const toolbarChildren = [filterInput, filterSelect, valueFilterMenu];
    if (editMode) {
      toolbarChildren.push(
        el(
          "button",
          {
            class: "add-btn",
            onclick: async () => {
              await DBops.addRow(activeTable, { ...schema.blank });
              refreshBuilder();
              render();
            },
          },
          ["+ Add row"]
        )
      );
      toolbarChildren.push(
        el(
          "button",
          {
            class: "reset-btn",
            onclick: async () => {
              if (window.confirm("Reset " + schema.label + " to its last-imported (or original) baseline? This discards edits to this table.")) {
                await DBops.resetTable(activeTable);
                refreshBuilder();
                render();
              }
            },
          },
          ["Reset table"]
        )
      );
    }
    wrap.appendChild(el("div", { class: "admin-toolbar" }, toolbarChildren));

    // Table
    const table = el("table", { class: "admin-table" }, [
      el("thead", {}, [
        el(
          "tr",
          {},
          schema.fields.map((field) => {
            const isSorted = sortKey === field.key;
            const direction = isSorted ? sortDirection : "asc";
            return el("th", { "aria-sort": isSorted ? (direction === "asc" ? "ascending" : "descending") : "none" }, [
              el("button", {
                type: "button",
                class: "admin-sort-btn",
                "aria-label": "Sort by " + field.label + (isSorted ? (direction === "asc" ? ", ascending" : ", descending") : ""),
                onclick: () => {
                  if (sortKey === field.key) sortDirection = sortDirection === "asc" ? "desc" : "asc";
                  else {
                    sortKey = field.key;
                    sortDirection = "asc";
                  }
                  render();
                },
              }, [field.label + (isSorted ? (direction === "asc" ? " \u25B2" : " \u25BC") : "")])
            ]);
          }).concat(editMode ? [el("th", { class: "narrow" }, [""])] : [])
        ),
      ]),
      el(
        "tbody",
        {},
        rows.length
          ? rows.map((row) => renderRow(row, schema))
          : [
              el("tr", {}, [
                el("td", { colspan: String(schema.fields.length + (editMode ? 1 : 0)), class: "empty-state" }, ["No rows match the current filters."]),
              ]),
            ]
      ),
    ]);
    wrap.appendChild(el("div", { class: "card admin-card" }, [table]));

    root.appendChild(wrap);
    if (valuesMenuOpen) root.querySelector(".admin-value-filter").open = true;
    if (focusRole) {
      const selector = focusRole === "value-filter"
        ? '[data-role="value-filter"][data-index="' + focusedValueIndex + '"]'
        : '[data-role="' + focusRole + '"]';
      const newElement = root.querySelector(selector);
      if (newElement) {
        newElement.focus();
        if (focusRole === "filter" && typeof caret === "number") newElement.setSelectionRange(caret, caret);
      }
    }
  }

  function renderRow(row, schema) {
    const cells = schema.fields.map((f) => {
      const input = el("input", {
        type: f.type === "number" ? "number" : "text",
        value: row[f.key] === null || row[f.key] === undefined ? "" : row[f.key],
        readonly: !editMode ? "readonly" : undefined,
        onchange: async (e) => {
          if (!editMode) return;
          await DBops.updateRow(activeTable, row.id, { [f.key]: coerce(f.type, e.target.value) });
          refreshBuilder();
        },
      });
      return el("td", {}, [input]);
    });

    if (editMode) {
      const deleteBtn = el(
        "button",
        {
          class: "remove-btn",
          onclick: async () => {
            await DBops.deleteRow(activeTable, row.id);
            refreshBuilder();
            render();
          },
        },
        ["\u2715"]
      );
      cells.push(el("td", { class: "actions" }, [deleteBtn]));
    }

    return el("tr", {}, cells);
  }

  window.DBReady.then(render).catch((err) => window.reportDBError(err));
  window.renderAdmin = render;
})();
