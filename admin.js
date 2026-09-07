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
      ],
      blank: { brand: "", model: "", at: 0, poles: 1, price: "NO PRICE", kaic: 0, type: "MCB", frame: 0, width: 0 },
    },
    mech_lugs: {
      label: "Mech lugs",
      fields: [
        { key: "item_no", label: "Item #", type: "number" },
        { key: "ampere_trip", label: "Ampere trip", type: "number" },
        { key: "mech_lugs_size", label: "Size", type: "text" },
        { key: "sets", label: "Sets", type: "number" },
        { key: "price", label: "Price", type: "number" },
      ],
      blank: { item_no: 0, ampere_trip: 0, mech_lugs_size: "", sets: 1, price: 0 },
    },
    busbars: {
      label: "Busbars",
      fields: [
        { key: "type", label: "Type", type: "text" },
        { key: "min", label: "AT min", type: "number" },
        { key: "max", label: "AT max", type: "number" },
        { key: "condition", label: "Condition", type: "text" },
        { key: "needed", label: "Busbar needed", type: "text" },
        { key: "price", label: "Price", type: "number" },
      ],
      blank: { type: "MCCB", min: 0, max: 0, condition: "", needed: "", price: 0 },
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
  };

  const TABLE_ORDER = ["breakers", "mech_lugs", "busbars", "assemblies_2p", "assemblies_3p", "constants"];

  let activeTable = "breakers";
  let filterText = "";
  let editMode = false;

  const root = document.getElementById("admin-app");

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

  function matchesFilter(row, text) {
    if (!text) return true;
    const needle = text.toLowerCase();
    return Object.values(row).some((v) => String(v).toLowerCase().includes(needle));
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
    const hadFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.role === "filter";
    const caret = hadFocus ? document.activeElement.selectionStart : null;

    root.innerHTML = "";
    const schema = SCHEMAS[activeTable];
    const rows = DBops.getTable(activeTable).filter((r) => matchesFilter(r, filterText));

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
          if (window.renderBuilder) window.renderBuilder();
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
    const toolbarChildren = [filterInput];
    if (editMode) {
      toolbarChildren.push(
        el(
          "button",
          {
            class: "add-btn",
            onclick: async () => {
              await DBops.addRow(activeTable, { ...schema.blank });
              if (window.renderBuilder) window.renderBuilder();
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
                if (window.renderBuilder) window.renderBuilder();
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
          schema.fields.map((f) => el("th", {}, [f.label])).concat(editMode ? [el("th", { class: "narrow" }, [""])] : [])
        ),
      ]),
      el(
        "tbody",
        {},
        rows.length
          ? rows.map((row) => renderRow(row, schema))
          : [
              el("tr", {}, [
                el("td", { colspan: String(schema.fields.length + 1), class: "empty-state" }, ["No rows."]),
              ]),
            ]
      ),
    ]);
    wrap.appendChild(el("div", { class: "card admin-card" }, [table]));

    root.appendChild(wrap);
    if (hadFocus) {
      const newInput = root.querySelector('[data-role="filter"]');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(caret, caret);
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
          if (window.renderBuilder) window.renderBuilder();
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
            if (window.renderBuilder) window.renderBuilder();
            render();
          },
        },
        ["\u2715"]
      );
      cells.push(el("td", { class: "actions" }, [deleteBtn]));
    }

    return el("tr", {}, cells);
  }

  window.DBReady.then(render);
  window.renderAdmin = render;
})();
