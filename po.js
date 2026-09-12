(function () {
  const root = document.getElementById("po-app");
  let quotations = [];
  let editingId = null;
  let printHeader = localStorage.getItem("po_print_header") || "";
  let printFooter = localStorage.getItem("po_print_footer") || "";

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

  function formatMoney(n) {
    return Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // Builds the multi-line item description from a builder config snapshot
  // (see window.getBuilderConfig in app.js). `name` replaces the generic
  // "PANEL BOARD" title line.
  function buildDescriptionLines(config, name) {
    const lines = [];
    lines.push(name || "PANEL BOARD");
    lines.push(config.supplyVoltage + "V, " + config.supplyDescriptionText);
    lines.push(config.mountingType);
    lines.push(config.nemaRating + ", GI#" + config.giGauge);

    lines.push("MAIN:");
    if (config.mainResolved) {
      const m = config.mainResolved;
      lines.push(
        config.main.qty + "EA- " + m.at + "AT, " + m.frame + "AF, " + m.poles + "P, " + m.kaic + "KAIC, " + m.model + " (" + m.type + ")"
      );
    } else {
      lines.push("(no main breaker selected)");
    }

    lines.push("BRANCHES:");
    const branchLines = config.branchesResolved.filter((b) => b.rowData);
    if (branchLines.length) {
      branchLines.forEach((b) => {
        const r = b.rowData;
        const spareTag = b.sel.spare ? " (SPARE)" : "";
        lines.push(
          b.sel.qty + "EA- " + r.at + "AT, " + r.frame + "AF, " + r.poles + "P, " + r.kaic + "KAIC, " + r.model + " (" + r.type + ")" + spareTag
        );
      });
    } else {
      lines.push("(no branch breakers selected)");
    }

    return lines;
  }

  async function refreshQuotations() {
    quotations = await DBops.listQuotations();
  }

  function editQuotation(q) {
    editingId = q.id;
    if (window.loadBuilderConfig) window.loadBuilderConfig(q.config);
    if (window.setPOItemName) window.setPOItemName(q.name || "PANEL BOARD");
    if (window.switchPage) window.switchPage("builder");
  }

  async function deleteQuotation(id) {
    if (!window.confirm("Delete this PO line item? This can't be undone.")) return;
    await DBops.deleteQuotation(id);
    if (editingId === id) editingId = null;
    await refreshQuotations();
    render();
  }

  async function updateQty(q, newQty) {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    await DBops.updateQuotation(q.id, { ...q, qty });
    await refreshQuotations();
    render();
  }

  // Renaming rebuilds the description's title line from the item's own
  // saved config, so the rest of the spec block stays intact.
  async function renameQuotation(q, newName) {
    const name = newName || "PANEL BOARD";
    const description = buildDescriptionLines(q.config, name).join("\n");
    await DBops.updateQuotation(q.id, { ...q, name, description });
    await refreshQuotations();
    render();
  }

  function renderRow(q, index) {
    const totalCost = q.qty * q.unitCost;
    const isEditing = editingId === q.id;
    const descriptionBody = q.description.split("\n").slice(1).join("\n");

    return el("tr", { class: isEditing ? "po-row-editing" : undefined }, [
      el("td", { class: "po-item-no" }, [String(index + 1)]),
      el("td", { class: "po-description" }, [
        el("input", {
          class: "po-name-input",
          type: "text",
          value: q.name || "PANEL BOARD",
          onchange: (e) => renameQuotation(q, e.target.value),
        }),
        el("pre", {}, [descriptionBody]),
      ]),
      el("td", { class: "po-qty" }, [
        el("input", {
          type: "number",
          min: "1",
          value: String(q.qty),
          onchange: (e) => updateQty(q, e.target.value),
        }),
      ]),
      el("td", { class: "po-unit" }, [q.unit]),
      el("td", { class: "po-cost mono" }, ["\u20B1" + formatMoney(q.unitCost)]),
      el("td", { class: "po-cost mono" }, ["\u20B1" + formatMoney(totalCost)]),
      el("td", { class: "po-actions" }, [
        el("button", { class: "toolbar-btn", onclick: () => editQuotation(q) }, ["Edit"]),
        el("button", { class: "toolbar-btn po-delete-btn", onclick: () => deleteQuotation(q.id) }, ["Delete"]),
      ]),
    ]);
  }

  // Static, print-only rendering of the same data — plain text instead of
  // inputs/buttons, plus the header/footer. Kept in sync on every render()
  // and shown only by the @media print rules in styles.css.
  function renderPrintSheet(grandTotal) {
    const rows = quotations.map((q, i) =>
      el("tr", {}, [
        el("td", { class: "po-item-no" }, [String(i + 1)]),
        el("td", { class: "po-description" }, [el("pre", {}, [q.description])]),
        el("td", { class: "po-qty" }, [String(q.qty)]),
        el("td", { class: "po-unit" }, [q.unit]),
        el("td", { class: "po-cost mono" }, ["\u20B1" + formatMoney(q.unitCost)]),
        el("td", { class: "po-cost mono" }, ["\u20B1" + formatMoney(q.qty * q.unitCost)]),
      ])
    );

    return el("div", { class: "print-only po-print-sheet" }, [
      printHeader ? el("div", { class: "po-print-header" }, [printHeader]) : null,
      el("h1", { class: "po-print-title" }, ["Purchase Order"]),
      el("table", { class: "po-print-table" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", {}, ["ITEM #"]),
            el("th", {}, ["DESCRIPTION"]),
            el("th", {}, ["QTY"]),
            el("th", {}, ["UNIT"]),
            el("th", {}, ["UNIT COST"]),
            el("th", {}, ["TOTAL COST"]),
          ]),
        ]),
        el("tbody", {}, rows.length ? rows : [el("tr", {}, [el("td", { colspan: "6" }, ["No line items."])])]),
      ]),
      el("div", { class: "po-print-total" }, ["PO GRAND TOTAL: \u20B1" + formatMoney(grandTotal)]),
      printFooter ? el("div", { class: "po-print-footer" }, [printFooter]) : null,
    ]);
  }

  function render() {
    root.innerHTML = "";
    const wrap = el("div", { class: "wrap no-print" }, []);

    wrap.appendChild(
      el("div", { class: "header" }, [
        el("div", {}, [
          el("div", { class: "eyebrow" }, ["Estimator"]),
          el("h1", {}, ["PO Creation Tool"]),
        ]),
      ])
    );

    if (editingId !== null) {
      wrap.appendChild(
        el("div", { class: "view-only-banner" }, [
          "Editing line #" +
            (quotations.findIndex((q) => q.id === editingId) + 1) +
            " \u2014 make your changes in the Builder tab, then use \u201cSave to PO\u201d there to update this line.",
        ])
      );
    }

    const grandTotal = quotations.reduce((sum, q) => sum + q.qty * q.unitCost, 0);

    const table = el("table", { class: "admin-table po-table" }, [
      el("thead", {}, [
        el("tr", {}, [
          el("th", {}, ["ITEM #"]),
          el("th", {}, ["DESCRIPTION"]),
          el("th", {}, ["QTY"]),
          el("th", {}, ["UNIT"]),
          el("th", {}, ["UNIT COST"]),
          el("th", {}, ["TOTAL COST"]),
          el("th", { class: "narrow" }, [""]),
        ]),
      ]),
      el(
        "tbody",
        {},
        quotations.length
          ? quotations.map((q, i) => renderRow(q, i))
          : [
              el("tr", {}, [
                el("td", { colspan: "7", class: "empty-state" }, [
                  "No saved line items yet. Configure a panel in the Builder tab, then use \u201cSave to PO\u201d there.",
                ]),
              ]),
            ]
      ),
    ]);
    wrap.appendChild(el("div", { class: "card admin-card" }, [table]));

    if (quotations.length) {
      wrap.appendChild(
        el("div", { class: "po-grand-total" }, [
          el("span", {}, ["PO Grand Total"]),
          el("span", { class: "mono" }, ["\u20B1" + formatMoney(grandTotal)]),
        ])
      );
    }

    // Header/footer editors + print action
    const printSection = el("div", { class: "section" }, [
      el("h2", {}, ["Print / Export as PDF"]),
      el("p", { class: "sub" }, [
        "Shown at the top and bottom of the printed sheet. Use your browser's print dialog and choose \u201cSave as PDF.\u201d",
      ]),
      el("div", { class: "po-print-fields" }, [
        el("label", { class: "po-print-field-label" }, [
          "Header",
          el("textarea", {
            class: "po-print-textarea",
            rows: "3",
            placeholder: "Company name, address, contact info\u2026",
            oninput: (e) => {
              printHeader = e.target.value;
              localStorage.setItem("po_print_header", printHeader);
            },
          }, [printHeader]),
        ]),
        el("label", { class: "po-print-field-label" }, [
          "Footer",
          el("textarea", {
            class: "po-print-textarea",
            rows: "3",
            placeholder: "Terms, prepared by, signature block\u2026",
            oninput: (e) => {
              printFooter = e.target.value;
              localStorage.setItem("po_print_footer", printFooter);
            },
          }, [printFooter]),
        ]),
      ]),
      el(
        "button",
        { class: "add-btn", onclick: () => window.print() },
        ["Print / Save as PDF"]
      ),
    ]);
    wrap.appendChild(printSection);

    root.appendChild(wrap);
    root.appendChild(renderPrintSheet(grandTotal));
  }

  // ---- Bridge for the Builder tab's "Save to PO" control ----
  window.savePOItem = async function (name) {
    const config = window.getBuilderConfig ? window.getBuilderConfig() : null;
    if (!config) return null;
    const description = buildDescriptionLines(config, name).join("\n");
    const record = {
      name: name || "PANEL BOARD",
      description,
      qty: 1,
      unit: "ASSY",
      unitCost: config.grandTotal,
      config,
      savedAt: Date.now(),
    };
    let id;
    if (editingId !== null) {
      await DBops.updateQuotation(editingId, record);
      id = editingId;
      editingId = null;
    } else {
      id = await DBops.addQuotation(record);
    }
    await refreshQuotations();
    render();
    return id;
  };

  window.getPOEditingId = function () {
    return editingId;
  };

  window.cancelPOEdit = function () {
    editingId = null;
    render();
  };

  window.DBReady.then(async () => {
    await refreshQuotations();
    render();
  });
  window.renderPO = render;
})();
