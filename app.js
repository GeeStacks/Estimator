(function () {
  const FIELD_ORDER = ["brand", "at", "poles", "model"];

  // ---- Busbar helpers ----
  function sortedBusbarsForType(type) {
    return BUSBARS.filter((b) => b.type === type).sort((a, b) => Number(a.min) - Number(b.min));
  }

  // Same bracket if it exists; otherwise round UP to the next higher one.
  function lookupBusbar(type, at) {
    const list = sortedBusbarsForType(type);
    const idx = list.findIndex((b) => Number(at) <= Number(b.max));
    return idx === -1 ? null : list[idx];
  }

  // Walks a sorted list backward from matchIdx looking for the first row
  // whose `field` value differs from the matched row's. Several consecutive
  // AT brackets often share the same physical conductor/lug size (priced
  // differently for other reasons), so stepping down by table row alone can
  // land on a row that's technically "lower" but physically the same size.
  // This steps down to an actually smaller size. Falls back to the matched
  // row itself if nothing smaller exists.
  function stepDownByDistinctValue(list, matchIdx, field) {
    const matchValue = list[matchIdx][field];
    for (let i = matchIdx - 1; i >= 0; i--) {
      if (list[i][field] !== matchValue) return list[i];
    }
    return list[matchIdx];
  }

  // Same-or-next-higher bracket (as above), then step DOWN to the next
  // actually-smaller conductor size from that match. Used for ground and
  // neutral busbars alike.
  function lookupBusbarOneDown(type, at) {
    const list = sortedBusbarsForType(type);
    const idx = list.findIndex((b) => Number(at) <= Number(b.max));
    if (idx === -1) return null; // AT exceeds every bracket for this type
    return stepDownByDistinctValue(list, idx, "needed");
  }

  function pairedQty(rawQty) {
    return Math.ceil(rawQty / 2);
  }

  // ---- Mech lugs helpers ----
  // Match a breaker's AT to a mech lugs bracket. Brackets are discrete
  // ratings (16A, 20A, 25A...), so an AT that falls between brackets rounds
  // UP to the next available one (e.g. a 10A breaker uses the 16A lugs).
  function lookupMechLugs(at) {
    const numAt = Number(at);
    if (!Number.isFinite(numAt)) return null;
    const candidates = MECH_LUGS.filter((r) => Number(r.ampere_trip) >= numAt);
    if (!candidates.length) return null;
    return candidates.reduce((best, r) =>
      Number(r.ampere_trip) < Number(best.ampere_trip) ? r : best
    );
  }

  // Mech lugs cost for the main breaker only. `multiplier` lets the main
  // feed be sized up (2x/3x parallel lug sets) independent of branches.
  function computeMainMechLugs(multiplier) {
    const buckets = {};
    let cost = 0;
    let missing = 0;

    if (!main.spare) {
      const rowData = resolveRowData(main);
      if (rowData) {
        const lug = lookupMechLugs(rowData.at);
        if (!lug) {
          missing += main.qty;
        } else {
          const totalSets = main.qty * rowData.poles * lug.sets * multiplier;
          const lineCost = totalSets * lug.price;
          cost += lineCost;
          const key = lug.ampere_trip + "|" + lug.mech_lugs_size;
          buckets[key] = { ampereTrip: lug.ampere_trip, size: lug.mech_lugs_size, sets: totalSets, cost: lineCost };
        }
      }
    }

    const breakdown = Object.values(buckets).sort((a, b) => a.ampereTrip - b.ampereTrip);
    return { cost, missing, breakdown, multiplier };
  }

  // Mech lugs cost across the branch breakers only (unchanged: one
  // bracket's worth of lug sets per pole, per selected breaker).
  function computeBranchMechLugs() {
    const buckets = {};
    let cost = 0;
    let missing = 0;

    branches.forEach((sel) => {
      if (sel.spare) return;
      const rowData = resolveRowData(sel);
      if (!rowData) return;
      const lug = lookupMechLugs(rowData.at);
      if (!lug) {
        missing += sel.qty;
        return;
      }
      const totalSets = sel.qty * rowData.poles * lug.sets;
      const lineCost = totalSets * lug.price;
      cost += lineCost;
      const key = lug.ampere_trip + "|" + lug.mech_lugs_size;
      if (!buckets[key]) {
        buckets[key] = { ampereTrip: lug.ampere_trip, size: lug.mech_lugs_size, sets: 0, cost: 0 };
      }
      buckets[key].sets += totalSets;
      buckets[key].cost += lineCost;
    });

    const breakdown = Object.values(buckets).sort((a, b) => a.ampereTrip - b.ampereTrip);
    return { cost, missing, breakdown };
  }

  // ---- Ground lugs / ground busbar helpers ----
  // "One size down" means an actually smaller physical lug size, not just
  // the next row down. Several consecutive AT brackets often share the same
  // mech_lugs_size (priced differently at higher AT for other reasons), so
  // this walks down until the size itself changes. If the matched bracket
  // is already the smallest size available, there's nothing smaller.
  function sortedMechLugsAsc() {
    return [...MECH_LUGS].sort((a, b) => Number(a.ampere_trip) - Number(b.ampere_trip));
  }

  function lookupGroundLug(at) {
    const sorted = sortedMechLugsAsc();
    const matchIdx = sorted.findIndex((r) => Number(r.ampere_trip) >= Number(at));
    if (matchIdx === -1) return null; // AT exceeds the mech lugs table entirely
    return stepDownByDistinctValue(sorted, matchIdx, "mech_lugs_size");
  }

  // 1 ground lug per breaker (not per pole), across main + branches.
  function computeGroundLugs() {
    const buckets = {};
    let cost = 0;
    let missing = 0;

    function consider(sel) {
      if (sel.spare) return;
      const rowData = resolveRowData(sel);
      if (!rowData) return;
      const groundLug = lookupGroundLug(rowData.at);
      if (!groundLug) {
        missing += sel.qty;
        return;
      }
      const qty = sel.qty; // 1 lug per breaker
      const lineCost = qty * groundLug.price;
      cost += lineCost;
      const key = groundLug.ampere_trip + "|" + groundLug.mech_lugs_size;
      if (!buckets[key]) {
        buckets[key] = { ampereTrip: groundLug.ampere_trip, size: groundLug.mech_lugs_size, qty: 0, cost: 0 };
      }
      buckets[key].qty += qty;
      buckets[key].cost += lineCost;
    }

    consider(main);
    branches.forEach(consider);

    const breakdown = Object.values(buckets).sort((a, b) => a.ampereTrip - b.ampereTrip);
    return { cost, missing, breakdown };
  }

  // Ground busbar: same-or-next-higher bracket as the main breaker's own
  // busbar, then one size down from that, priced at a flat standard length
  // rather than measured cuts.
  function computeGroundBusbar() {
    const mainData = resolveRowData(main);
    if (!mainData) return null;

    const groundBusbar = lookupBusbarOneDown(mainData.type, mainData.at);
    const standardLength = CONSTANTS.ground_bus_length_mm || 0;
    const BAR_LENGTH = 6000;
    const pctOfBar = standardLength / BAR_LENGTH;
    const busbarPrice = groundBusbar ? groundBusbar.price : null;
    const cost = busbarPrice !== null ? pctOfBar * busbarPrice : null;

    return {
      standardLength, pctOfBar, busbarPrice,
      busbarNeeded: groundBusbar ? groundBusbar.needed : null,
      exceedsTable: !groundBusbar,
      cost,
    };
  }

  // Wiring description shown in the panel info bar. 400V always wins,
  // regardless of pole count; otherwise it's driven by the main's poles.
  function supplyDescription(voltage, poles) {
    if (voltage === 400) return "3PH, 4W+G";
    if (poles === 1 || poles === 2) return "1PH,2W+G";
    if (poles === 3) return "3PH, 3W+G";
    return "\u2014";
  }

  // Neutral busbar: same-or-next-higher bracket as the main breaker's own
  // busbar, then one size down from that (same rule as ground). Disabled
  // entirely by the "needs neutral bar" toggle for 3-phase-only panels.
  function computeNeutralBusbar(enabled) {
    const standardLength = CONSTANTS.neutral_bus_length_mm || 0;
    if (!enabled) {
      return { enabled: false, standardLength, busbarPrice: null, busbarNeeded: null, exceedsTable: false, cost: 0 };
    }
    const mainData = resolveRowData(main);
    if (!mainData) {
      return { enabled: true, standardLength, busbarPrice: null, busbarNeeded: null, exceedsTable: false, cost: null };
    }
    const neutralBusbar = lookupBusbarOneDown(mainData.type, mainData.at);
    const BAR_LENGTH = 6000;
    const pctOfBar = standardLength / BAR_LENGTH;
    const busbarPrice = neutralBusbar ? neutralBusbar.price : null;
    const cost = busbarPrice !== null ? pctOfBar * busbarPrice : null;
    return {
      enabled: true, standardLength, pctOfBar, busbarPrice,
      busbarNeeded: neutralBusbar ? neutralBusbar.needed : null,
      exceedsTable: !neutralBusbar,
      cost,
    };
  }

  // ---- Box dimensioning helpers ----
  // Same-or-next-higher AT match against the clearance table (same
  // round-up convention as busbars/mech lugs).
  function lookupClearance(at) {
    const sorted = [...CLEARANCE].sort((a, b) => Number(a.at) - Number(b.at));
    const idx = sorted.findIndex((r) => Number(at) <= Number(r.at));
    return idx === -1 ? null : sorted[idx];
  }

  function lookupLugDimensions(catNo) {
    return LUG_DIMENSIONS.find((r) => r.cat_no === catNo) || null;
  }

  // Same-or-next-higher AT match against the ATS/MTS table, scoped to the
  // matching pole count (2P and 3P have separate bracket ladders).
  function lookupAtsMts(at, poles) {
    const candidates = ATS_MTS.filter((r) => Number(r.pole) === Number(poles));
    const sorted = candidates.sort((a, b) => Number(a.max) - Number(b.max));
    const idx = sorted.findIndex((r) => Number(at) <= Number(r.max));
    return idx === -1 ? null : sorted[idx];
  }

  // Only applies when the panel type is MTS/MTS MDP or ATS/ATS MDP.
  // MTS: bending cost = (ATS/MTS table's Total Length / 6000) * the main
  // breaker's own busbar bracket price.
  // ATS: adds the table's Controller + Accessories costs (flat, not
  // length-based). Neither applies to the other panel type per spec.
  // Bending cost applies to BOTH MTS and ATS (same length/busbar-price
  // formula). ATS additionally adds Controller + Accessories on top.
  function computeAtsMtsCost() {
    if (panelType !== "MTS/ MTS MDP" && panelType !== "ATS/ATS MDP") return null;
    const mainData = resolveRowData(main);
    if (!mainData) return null;

    const atsRow = lookupAtsMts(mainData.at, mainData.poles);
    if (!atsRow) return { cost: 0, breakdown: [], atsRow: null, exceedsTable: true };

    const breakdown = [];
    let cost = 0;

    const busbar = lookupBusbar(mainData.type, mainData.at);
    const busbarPrice = busbar ? busbar.price : null;
    if (busbarPrice !== null) {
      const pctOfBar = atsRow.total_length_mm / 6000;
      const bendCost = pctOfBar * busbarPrice;
      cost += bendCost;
      breakdown.push({ label: "Bending (" + atsRow.total_length_mm + "mm total length)", cost: bendCost });
    } else {
      return { cost: 0, breakdown: [], atsRow, exceedsTable: true };
    }

    if (panelType === "ATS/ATS MDP") {
      cost += atsRow.controller;
      breakdown.push({ label: "Controller", cost: atsRow.controller });
      cost += atsRow.accessories;
      breakdown.push({ label: "Accessories", cost: atsRow.accessories });
    }

    return { cost, breakdown, atsRow, exceedsTable: false };
  }

  // Box Height = main clearance + main/branch gap + (branch breaker width
  // stacked 2-per-row) + insulator/ground stand allowance + backplate
  // clearance.
  // Box Width = main width + side clearance (both sides) + branch height
  // + lug factor (the matched lug's L dimension, doubled for parallel runs)
  // + the same bending clearance used in Height.
  function computeBoxDimensions() {
    const mainData = resolveRowData(main);
    if (!mainData) return null;

    const clearanceRow = lookupClearance(mainData.at);
    const mainClearance = clearanceRow ? clearanceRow.bending_clearance_mm : null;
    const mainLugRow = clearanceRow ? lookupLugDimensions(clearanceRow.mgl_cat_no) : null;
    const mainLugFactor = mainLugRow ? mainLugRow.H * 0.6 * (clearanceRow.parallel_count || 1) : null;

    const branchEntries = branches
      .map((sel) => ({ sel, rowData: resolveRowData(sel) }))
      .filter((x) => x.rowData);
    const branchQty = branches.reduce((sum, sel) => sum + (resolveRowData(sel) ? sel.qty : 0), 0);
    const branchWidth = branchEntries.length ? Math.max(...branchEntries.map((x) => x.rowData.width || 0)) : 0;
    const branchHeight = branchEntries.length ? Math.max(...branchEntries.map((x) => x.rowData.height || 0)) : 0;

    const gap = CONSTANTS.box_main_branch_gap_mm || 0;
    const groundStand = CONSTANTS.box_insulator_ground_stand_mm || 0;
    const backplateClearance = CONSTANTS.box_backplate_clearance_mm || 0;

    const branchRows = Math.ceil(branchQty / 2);
    const branchBlockHeight = branchWidth * branchRows;

    const height =
      mainClearance !== null && mainLugFactor !== null
        ? mainClearance + mainLugFactor + gap + branchBlockHeight + groundStand + backplateClearance
        : null;

    // ---- First/Second branch: which branches set each side's lug
    // factor + clearance. Sorted by AT descending; First = highest AT.
    // Second = next-highest AT, UNLESS that one is a lone breaker (qty 1
    // and no other branch selection shares its brand+model) — then skip
    // down to the next branch with qty != 1. If nothing qualifies, reuse
    // First branch's own values for the second side too.
    const sortedByAt = [...branchEntries].sort((a, b) => Number(b.rowData.at) - Number(a.rowData.at));
    const firstBranch = sortedByAt[0] || null;

    function modelSharedElsewhere(entry) {
      return branchEntries.some(
        (x) => x !== entry && x.rowData.brand === entry.rowData.brand && x.rowData.model === entry.rowData.model
      );
    }

    let secondBranch = sortedByAt[1] || null;
    if (secondBranch) {
      const isLoneUnit = secondBranch.sel.qty === 1 && !modelSharedElsewhere(secondBranch);
      if (isLoneUnit) {
        const replacement = sortedByAt.slice(2).find((x) => x.sel.qty !== 1);
        secondBranch = replacement || firstBranch; // no qualifying branch: reuse First branch's values
      }
    } else {
      secondBranch = firstBranch; // only one branch selected total
    }

    function sideFactorsFor(entry) {
      if (!entry) return { at: null, lugFactor: null, sideClearance: null, exceeds: false };
      const cRow = lookupClearance(entry.rowData.at);
      if (!cRow) return { at: entry.rowData.at, lugFactor: null, sideClearance: null, exceeds: true };
      const lRow = lookupLugDimensions(cRow.mgl_cat_no);
      const lugFactor = lRow ? lRow.H * 0.6 * (cRow.parallel_count || 1) : null;
      return { at: entry.rowData.at, lugFactor, sideClearance: cRow.bending_clearance_mm, exceeds: !lRow };
    }

    const side1 = sideFactorsFor(firstBranch);
    const side2 = sideFactorsFor(secondBranch);
    const sidesResolved = side1.lugFactor !== null && side2.lugFactor !== null;

    const width =
      mainClearance !== null && sidesResolved
        ? mainData.width + branchHeight + mainClearance +
          (side1.lugFactor + side1.sideClearance) +
          (side2.lugFactor + side2.sideClearance)
        : null;

    return {
      mainClearance, mainLugFactor, gap, branchBlockHeight, branchRows, branchQty, branchWidth, branchHeight,
      groundStand, backplateClearance, clearanceRow,
      mainWidth: mainData.width, height, width,
      firstBranch, secondBranch, side1, side2,
      exceedsTable: !clearanceRow || !mainLugRow || (branchEntries.length > 0 && (side1.exceeds || side2.exceeds)),
    };
  }

  // Busbar cuts needed for a group of N identical breakers, each with
  // `poles` phases. Pairing shares one cut per phase between 2 breakers;
  // an odd one out still needs its own cut per phase.
  function cutsForGroup(rawQty, poles) {
    return Math.ceil(rawQty / 2) * poles;
  }

  // Group identical branch selections (brand+model+at+poles) — spares
  // included, since a spare position still occupies busbar space —
  // and compute total busbar cuts per group.
  function branchGroups() {
    const groups = {};
    branches.forEach((sel) => {
      const rowData = resolveRowData(sel);
      if (!rowData) return;
      const key = [sel.brand, sel.model, sel.at, sel.poles].join("|");
      if (!groups[key]) groups[key] = { rowData, rawQty: 0 };
      groups[key].rawQty += sel.qty;
    });
    return Object.values(groups).map((g) => ({
      rowData: g.rowData,
      cuts: cutsForGroup(g.rawQty, g.rowData.poles),
    }));
  }

  function anyBranchAtOrAbove(threshold) {
    return branches.some((sel) => {
      const rowData = resolveRowData(sel);
      return rowData && Number(rowData.at) >= threshold;
    });
  }

  // ---- Assembly (alternative to busbars for all-MCB panels) ----
  function assemblyEligible() {
    const mainData = resolveRowData(main);
    if (!mainData) return false;
    if (mainData.poles !== 2 && mainData.poles !== 3) return false;
    const resolvedBranches = branches
      .map((sel) => resolveRowData(sel))
      .filter(Boolean);
    if (resolvedBranches.length === 0) return false;
    return resolvedBranches.every((r) => r.type === "MCB");
  }

  function computeAssembly() {
    const mainData = resolveRowData(main);
    if (!mainData || !assemblyEligible()) return null;

    const table = mainData.poles === 2 ? ASSEMBLIES["2P"] : ASSEMBLIES["3P"];

    let totalWays = 0;
    branches.forEach((sel) => {
      const rowData = resolveRowData(sel);
      if (!rowData) return;
      totalWays += sel.qty * rowData.poles;
    });

    const sorted = [...table].sort((a, b) => a.ways - b.ways);
    const match = sorted.find((row) => row.ways >= totalWays) || null;

    return {
      poles: mainData.poles,
      totalWays,
      match,
      cost: match ? match.price : null,
      overCapacity: !match,
    };
  }

  function branchHorizontalLength(poles) {
    const map = { 1: 180, 2: 230, 3: 250 };
    return map[poles] || 250;
  }

  function computeMainBusbar() {
    const mainData = resolveRowData(main);
    if (!mainData) return null;
    const groups = branchGroups();

    // bucket busbar cuts by width
    const widthBuckets = {};
    groups.forEach((g) => {
      const w = g.rowData.width;
      if (w === null || w === undefined) return;
      widthBuckets[w] = (widthBuckets[w] || 0) + g.cuts;
    });

    let sumLengths = 0;
    const breakdown = Object.entries(widthBuckets).map(([width, cuts]) => {
      const totalLength = parseFloat(width) * cuts;
      sumLengths += totalLength;
      return { width: parseFloat(width), cuts, totalLength };
    });

    const mainBend = CONSTANTS.main_bend_mm || 0;
    const excessBend = CONSTANTS.excess_bend_mm || 0;
    const poles = mainData.poles;
    // bends belong to the main feed itself, so they scale with the
    // main breaker's own pole count; branch cuts already carry their
    // own pole count individually.
    const totalLength = sumLengths + poles * (mainBend + excessBend);

    const BAR_LENGTH = 6000;
    const pctOfBar = totalLength / BAR_LENGTH;
    const busbar = lookupBusbar(mainData.type, mainData.at);
    const busbarPrice = busbar ? busbar.price : null;
    let cost = busbarPrice !== null ? pctOfBar * busbarPrice : null;

    const surcharge = anyBranchAtOrAbove(315);
    if (cost !== null && surcharge) cost *= 1.3;

    return {
      poles, sumLengths, mainBend, excessBend, totalLength, breakdown,
      pctOfBar, busbarPrice, busbarNeeded: busbar ? busbar.needed : null,
      cost, surcharge, exceedsTable: !busbar,
    };
  }

  function computeBranchBusbar() {
    const mainData = resolveRowData(main);
    if (!mainData) return null;
    const groups = branchGroups();
    const poles = mainData.poles;
    const HORIZONTAL_LENGTH = branchHorizontalLength(poles);

    // bucket busbar cuts by (type, at)
    const buckets = {};
    groups.forEach((g) => {
      const key = g.rowData.type + "|" + g.rowData.at;
      if (!buckets[key]) buckets[key] = { type: g.rowData.type, at: g.rowData.at, cuts: 0 };
      buckets[key].cuts += g.cuts;
    });

    const rows = Object.values(buckets).map((b) => {
      const totalLength = HORIZONTAL_LENGTH * b.cuts;
      const busbar = lookupBusbar(b.type, b.at);
      return {
        type: b.type,
        at: b.at,
        cuts: b.cuts,
        totalLength,
        busbarPrice: busbar ? busbar.price : null,
        busbarNeeded: busbar ? busbar.needed : null,
        exceedsTable: !busbar,
      };
    });

    const BAR_LENGTH = 6000;
    let cost = 0;
    let exceedsCount = 0;
    rows.forEach((r) => {
      r.pctOfLength = r.totalLength / BAR_LENGTH;
      r.finalPrice = r.busbarPrice !== null ? r.pctOfLength * r.busbarPrice : null;
      if (r.finalPrice !== null) cost += r.finalPrice;
      if (r.exceedsTable) exceedsCount += r.cuts;
    });

    const surcharge = anyBranchAtOrAbove(315);
    if (surcharge) cost *= 2;

    return { poles, rows, cost, surcharge, exceedsCount };
  }

  function parsePrice(raw) {
    if (!raw || /no price/i.test(raw)) return null;
    const n = parseFloat(String(raw).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function formatMoney(n) {
    return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function emptyRow() {
    return { brand: "", at: "", poles: "", model: "", qty: 1, spare: false };
  }

  function filteredRows(sel, excludeField) {
    return BREAKERS.filter((r) =>
      FIELD_ORDER.every((f) => {
        if (f === excludeField) return true;
        if (!sel[f]) return true;
        return String(r[f]) === String(sel[f]);
      })
    );
  }

  function optionsFor(field, sel) {
    const rows = filteredRows(sel, field);
    const vals = Array.from(new Set(rows.map((r) => r[field])));
    if (field === "at" || field === "poles") {
      return vals.sort((a, b) => a - b);
    }
    return vals.sort();
  }

  function resolveRowData(sel) {
    if (!sel.brand || !sel.at || !sel.poles || !sel.model) return null;
    return (
      BREAKERS.find(
        (r) =>
          r.brand === sel.brand &&
          String(r.at) === String(sel.at) &&
          String(r.poles) === String(sel.poles) &&
          r.model === sel.model
      ) || null
    );
  }

  // ---- State ----
  let main = emptyRow();
  let branches = [emptyRow()];
  let useAssembly = false;
  let mainLugMultiplier = 1;
  let panelType = "MDP";
  let supplyVoltage = 230;
  let needsNeutralBar = true;
  let profitMode = "percent"; // "percent" | "flat"
  let profitValue = 0;
  let discountMode = "percent"; // "percent" | "flat"
  let discountValue = 0;
  let mountingType = "SURFACE MOUNTED";
  let nemaRating = "NEMA-1";
  let giGauge = "16";
  let poItemName = "PANEL BOARD";
  let poSaveMessage = "";

  function updateSelection(row, field, value) {
    const next = { ...row, [field]: value };
    const idx = FIELD_ORDER.indexOf(field);
    FIELD_ORDER.slice(idx + 1).forEach((f) => {
      next[f] = "";
    });
    return next;
  }

  // ---- Rendering ----
  const app = document.getElementById("builder-app");

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
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

  function selectField({ value, options, labelFn, disabled, onChange, dataLabel }) {
    const select = el(
      "select",
      {
        disabled: disabled ? "disabled" : undefined,
        onchange: (e) => onChange(e.target.value),
      },
      [el("option", { value: "" }, [disabled ? "—" : "Select"])].concat(
        options.map((opt) =>
          el(
            "option",
            { value: String(opt), selected: String(opt) === String(value) ? "selected" : undefined },
            [labelFn ? labelFn(opt) : String(opt)]
          )
        )
      )
    );
    const wrap = el("div", { class: "field data" }, [select]);
    const td = el("td", dataLabel ? { "data-label": dataLabel } : {}, [wrap]);
    return td;
  }

  function renderBreakerRow(sel, onChange, opts) {
    const { circuitNo, onRemove } = opts || {};
    const brandOpts = optionsFor("brand", sel);
    const atOpts = optionsFor("at", sel);
    const polesOpts = optionsFor("poles", sel);
    const modelOpts = optionsFor("model", sel);
    const rowData = resolveRowData(sel);
    const price = rowData ? parsePrice(rowData.price) : null;
    const subtotal = price !== null ? price * sel.qty : null;

    const tr = el("tr", {}, []);

    if (circuitNo !== undefined) {
      tr.appendChild(el("td", { class: "ckt" }, [String(circuitNo).padStart(2, "0")]));
    }

    tr.appendChild(
      selectField({
        value: sel.brand,
        options: brandOpts,
        dataLabel: "Brand",
        onChange: (v) => onChange(updateSelection(sel, "brand", v)),
      })
    );
    tr.appendChild(
      selectField({
        value: sel.at,
        options: atOpts,
        disabled: !sel.brand,
        labelFn: (v) => v + "A",
        dataLabel: "AT",
        onChange: (v) => onChange(updateSelection(sel, "at", v)),
      })
    );
    tr.appendChild(
      selectField({
        value: sel.poles,
        options: polesOpts,
        disabled: !sel.at,
        labelFn: (v) => v + "P",
        dataLabel: "Poles",
        onChange: (v) => onChange(updateSelection(sel, "poles", v)),
      })
    );
    tr.appendChild(
      selectField({
        value: sel.model,
        options: modelOpts,
        disabled: !sel.poles,
        dataLabel: "Model",
        onChange: (v) => onChange(updateSelection(sel, "model", v)),
      })
    );

    if (opts && opts.showSpare) {
      const spareCheckbox = el("input", {
        type: "checkbox",
        checked: sel.spare ? "checked" : undefined,
        onchange: (e) => onChange({ ...sel, spare: e.target.checked }),
      });
      const spareTd = el("td", { "data-label": "Spare", class: "spare-cell" }, [spareCheckbox]);
      tr.appendChild(spareTd);
    }

    const qtyInput = el("input", {
      type: "number",
      min: "1",
      value: sel.qty,
      oninput: (e) => onChange({ ...sel, qty: Math.max(1, parseInt(e.target.value || "1", 10)) }),
    });
    const qtyTd = el("td", { "data-label": "Qty", class: "field" }, [qtyInput]);

    const priceSpan = el(
      "span",
      { class: "price-cell " + (rowData ? (sel.spare ? "" : price !== null ? "" : "quote") : "empty") },
      [rowData ? (sel.spare ? "spare" : price !== null ? formatMoney(subtotal) : "quote") : "—"]
    );
    const priceTd = el("td", { class: "price-row", "data-label": "" }, [
      el("span", { class: "mobile-only-label", style: "display:none" }, []),
      priceSpan,
    ]);

    tr.appendChild(qtyTd);
    tr.appendChild(priceTd);

    if (onRemove) {
      const btn = el(
        "button",
        {
          class: "remove-btn",
          "aria-label": "Remove row",
          onclick: onRemove,
        },
        [trashIcon()]
      );
      tr.appendChild(el("td", { class: "actions" }, [btn]));
    }

    return tr;
  }

  function renderMainBusbarBlock(data) {
    if (!data) {
      return el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Main busbar (vertical bend)"]),
        el("div", { class: "busbar-empty" }, ["Select a main breaker to calculate."]),
      ]);
    }
    const rows = data.breakdown.map((b) =>
      el("div", { class: "busbar-line" }, [
        el("span", {}, [b.width + "mm \u00d7 " + b.cuts]),
        el("span", { class: "mono" }, [b.totalLength + "mm"]),
      ])
    );
    return el("div", { class: "busbar-block" }, [
      el("div", { class: "busbar-block-title" }, ["Main busbar (vertical bend)"]),
      el("div", { class: "busbar-lines" }, rows.concat([
        el("div", { class: "busbar-line" }, [
          el("span", {}, ["Main bend"]),
          el("span", { class: "mono" }, [data.mainBend + "mm"]),
        ]),
        el("div", { class: "busbar-line" }, [
          el("span", {}, ["Excess bend"]),
          el("span", { class: "mono" }, [data.excessBend + "mm"]),
        ]),
      ])),
      el("div", { class: "busbar-total" }, [
        el("span", {}, ["\u00d7 " + data.poles + " poles"]),
        el("span", { class: "mono" }, [Math.round(data.totalLength) + "mm total"]),
      ]),
      el("div", { class: "busbar-total" }, [
        el("span", {}, ["Main busbar cost"]),
        el("span", { class: "mono" }, [
          data.cost !== null ? "\u20B1" + formatMoney(data.cost) : "no rate for this AT",
        ]),
      ]),
      data.exceedsTable
        ? el("div", { class: "warn" }, ["Main breaker's AT exceeds the busbar table \u2014 needs a manual quote."])
        : null,
    ]);
  }

  function renderBranchBusbarBlock(data) {
    if (!data) {
      return el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Branch busbar (horizontal bend)"]),
        el("div", { class: "busbar-empty" }, ["Select a main breaker to calculate."]),
      ]);
    }
    const rows = data.rows.map((r) =>
      el("div", { class: "busbar-line" }, [
        el("span", {}, [r.type + " " + r.at + "A \u00d7 " + r.cuts]),
        el("span", { class: "mono" }, [
          r.finalPrice !== null ? formatMoney(r.finalPrice) : "no rate",
        ]),
      ])
    );
    return el("div", { class: "busbar-block" }, [
      el("div", { class: "busbar-block-title" }, ["Branch busbar (horizontal bend)"]),
      el(
        "div",
        { class: "busbar-lines" },
        rows.length ? rows : [el("div", { class: "busbar-empty" }, ["No branch breakers selected."])]
      ),
      el("div", { class: "busbar-total" }, [
        el("span", {}, ["Branch busbar cost"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(data.cost)]),
      ]),
      data.exceedsCount > 0
        ? el("div", { class: "warn" }, [
            data.exceedsCount +
              " branch cut" +
              (data.exceedsCount !== 1 ? "s" : "") +
              " exceed" +
              (data.exceedsCount !== 1 ? "" : "s") +
              " the busbar table \u2014 needs a manual quote.",
          ])
        : null,
    ]);
  }

  function renderAssemblyBlock(data) {
    return el("div", { class: "card assembly-card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, [data.poles + "P assembly"]),
        el("div", { class: "busbar-lines" }, [
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Total ways needed (qty \u00d7 poles)"]),
            el("span", { class: "mono" }, [String(data.totalWays)]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Matched assembly"]),
            el("span", { class: "mono" }, [
              data.match ? data.match.model + " (" + data.match.ways + " ways)" : "none \u2014 exceeds capacity",
            ]),
          ]),
        ]),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Assembly price (replaces busbars)"]),
          el("span", { class: "mono" }, [
            data.cost !== null ? "\u20B1" + formatMoney(data.cost) : "no match found",
          ]),
        ]),
      ]),
    ]);
  }

  function renderMechLugsBlock(data, title, extraControl) {
    const rows = data.breakdown.map((b) =>
      el("div", { class: "busbar-line" }, [
        el("span", {}, [b.ampereTrip + "A \u00d7 " + b.sets + " (" + b.size + ")"]),
        el("span", { class: "mono" }, [formatMoney(b.cost)]),
      ])
    );
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, [title]),
        extraControl || null,
        el(
          "div",
          { class: "busbar-lines" },
          rows.length ? rows : [el("div", { class: "busbar-empty" }, ["No breakers selected."])]
        ),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Total"]),
          el("span", { class: "mono" }, ["\u20B1" + formatMoney(data.cost)]),
        ]),
      ]),
    ]);
  }

  function mainLugMultiplierControl() {
    return el("label", { class: "assembly-toggle-label", style: "margin-bottom:10px;" }, [
      el("span", {}, ["Lug sets \u00d7"]),
      el(
        "select",
        {
          style: "width:auto;margin-left:8px;",
          onchange: (e) => {
            mainLugMultiplier = parseInt(e.target.value, 10);
            render();
          },
        },
        [1, 2, 3].map((n) =>
          el(
            "option",
            { value: String(n), selected: n === mainLugMultiplier ? "selected" : undefined },
            [n + "\u00d7"]
          )
        )
      ),
    ]);
  }

  function renderGroundLugsBlock(data) {
    const rows = data.breakdown.map((b) =>
      el("div", { class: "busbar-line" }, [
        el("span", {}, [b.ampereTrip + "A \u00d7 " + b.qty + " (" + b.size + ")"]),
        el("span", { class: "mono" }, [formatMoney(b.cost)]),
      ])
    );
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Ground lugs"]),
        el(
          "div",
          { class: "busbar-lines" },
          rows.length ? rows : [el("div", { class: "busbar-empty" }, ["No breakers selected."])]
        ),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Total"]),
          el("span", { class: "mono" }, ["\u20B1" + formatMoney(data.cost)]),
        ]),
      ]),
    ]);
  }

  function renderGroundBusbarBlock(data) {
    if (!data) {
      return el("div", { class: "card" }, [
        el("div", { class: "busbar-block" }, [
          el("div", { class: "busbar-block-title" }, ["Ground busbar"]),
          el("div", { class: "busbar-empty" }, ["Select a main breaker to calculate."]),
        ]),
      ]);
    }
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Ground busbar"]),
        el("div", { class: "busbar-lines" }, [
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Standard length"]),
            el("span", { class: "mono" }, [data.standardLength + "mm"]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Busbar used"]),
            el("span", { class: "mono" }, [data.busbarNeeded || "\u2014"]),
          ]),
        ]),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Ground busbar cost"]),
          el("span", { class: "mono" }, [
            data.cost !== null ? "\u20B1" + formatMoney(data.cost) : "no rate for this AT",
          ]),
        ]),
        data.exceedsTable
          ? el("div", { class: "warn" }, ["Main breaker's AT exceeds the busbar table \u2014 needs a manual quote."])
          : null,
      ]),
    ]);
  }

  function renderNeutralBusbarBlock(data) {
    if (!data.enabled) {
      return el("div", { class: "card" }, [
        el("div", { class: "busbar-block" }, [
          el("div", { class: "busbar-block-title" }, ["Neutral busbar"]),
        ]),
      ]);
    }
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Neutral busbar"]),
        el("div", { class: "busbar-lines" }, [
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Standard length"]),
            el("span", { class: "mono" }, [data.standardLength + "mm"]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Busbar used"]),
            el("span", { class: "mono" }, [data.busbarNeeded || "\u2014"]),
          ]),
        ]),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Neutral busbar cost"]),
          el("span", { class: "mono" }, [
            data.cost !== null ? "\u20B1" + formatMoney(data.cost) : "no rate for this AT",
          ]),
        ]),
        data.exceedsTable
          ? el("div", { class: "warn" }, ["Main breaker's AT exceeds the busbar table \u2014 needs a manual quote."])
          : null,
      ]),
    ]);
  }

  // Applies calibrated profit (markup on the subtotal), then applied
  // discount (off the profit-inclusive price) — either can be a flat peso
  // amount or a percent.
  function computeReceipt(subtotal) {
    const profitAmount = profitMode === "percent" ? subtotal * (profitValue / 100) : profitValue;
    const afterProfit = subtotal + profitAmount;
    const discountAmount = discountMode === "percent" ? afterProfit * (discountValue / 100) : discountValue;
    const grandTotal = afterProfit - discountAmount;
    return { subtotal, profitAmount, afterProfit, discountAmount, grandTotal };
  }

  function renderAtsMtsBlock(data) {
    const rows = data.breakdown.map((b) =>
      el("div", { class: "busbar-line" }, [
        el("span", {}, [b.label]),
        el("span", { class: "mono" }, [formatMoney(b.cost)]),
      ])
    );
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, [panelType === "MTS/ MTS MDP" ? "MTS price" : "ATS price"]),
        el(
          "div",
          { class: "busbar-lines" },
          rows.length ? rows : [el("div", { class: "busbar-empty" }, ["No breakdown available."])]
        ),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Total"]),
          el("span", { class: "mono" }, ["\u20B1" + formatMoney(data.cost)]),
        ]),
      ]),
    ]);
  }

  function renderBoxDimensionsBlock(data) {
    if (!data) {
      return el("div", { class: "card" }, [
        el("div", { class: "busbar-block" }, [
          el("div", { class: "busbar-block-title" }, ["Box dimensions"]),
          el("div", { class: "busbar-empty" }, ["Select a main breaker to calculate."]),
        ]),
      ]);
    }
    return el("div", { class: "card" }, [
      el("div", { class: "busbar-block" }, [
        el("div", { class: "busbar-block-title" }, ["Box dimensions"]),
        el("div", { class: "busbar-lines" }, [
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Main clearance (AT " + main.at + ")"]),
            el("span", { class: "mono" }, [data.mainClearance !== null ? data.mainClearance + "mm" : "\u2014"]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Main lug factor (" + (data.clearanceRow ? data.clearanceRow.mgl_cat_no : "\u2014") + ")"]),
            el("span", { class: "mono" }, [data.mainLugFactor !== null ? data.mainLugFactor.toFixed(1) + "mm" : "\u2014"]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, ["Branch rows (qty " + data.branchQty + ")"]),
            el("span", { class: "mono" }, [String(data.branchRows)]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, [
              "First branch (AT " + (data.side1.at !== null ? data.side1.at : "\u2014") + ") lug + clearance",
            ]),
            el("span", { class: "mono" }, [
              data.side1.lugFactor !== null
                ? data.side1.lugFactor.toFixed(1) + " + " + data.side1.sideClearance + "mm"
                : "\u2014",
            ]),
          ]),
          el("div", { class: "busbar-line" }, [
            el("span", {}, [
              "Second branch (AT " + (data.side2.at !== null ? data.side2.at : "\u2014") + ") lug + clearance",
            ]),
            el("span", { class: "mono" }, [
              data.side2.lugFactor !== null
                ? data.side2.lugFactor.toFixed(1) + " + " + data.side2.sideClearance + "mm"
                : "\u2014",
            ]),
          ]),
        ]),
        el("div", { class: "busbar-total" }, [
          el("span", {}, ["Height \u00d7 Width"]),
          el("span", { class: "mono" }, [
            data.height !== null && data.width !== null
              ? Math.round(data.height) + "mm \u00d7 " + Math.round(data.width) + "mm"
              : "no clearance data for this AT",
          ]),
        ]),
      ]),
    ]);
  }

  function trashIcon() {
    const span = el("span", { html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>' }, []);
    return span;
  }

  function computeTotals() {
    let cost = 0;
    let circuitCount = 0;
    let missing = 0;
    const breakerLines = [];

    function consider(sel, label) {
      const rowData = resolveRowData(sel);
      if (!rowData) return;
      circuitCount += sel.qty;
      if (sel.spare) {
        breakerLines.push({
          label, brand: rowData.brand, model: rowData.model, at: rowData.at, poles: rowData.poles,
          qty: sel.qty, unitPrice: null, lineCost: 0, spare: true,
        });
        return; // spares occupy busbar space but carry no breaker cost
      }
      const price = parsePrice(rowData.price);
      if (price === null) {
        missing += 1;
        breakerLines.push({
          label, brand: rowData.brand, model: rowData.model, at: rowData.at, poles: rowData.poles,
          qty: sel.qty, unitPrice: null, lineCost: null, spare: false,
        });
      } else {
        cost += price * sel.qty;
        breakerLines.push({
          label, brand: rowData.brand, model: rowData.model, at: rowData.at, poles: rowData.poles,
          qty: sel.qty, unitPrice: price, lineCost: price * sel.qty, spare: false,
        });
      }
    }

    consider(main, "Main");
    branches.forEach((sel, i) => consider(sel, "Branch " + (i + 1)));

    const eligible = assemblyEligible();
    const assembly = eligible && useAssembly ? computeAssembly() : null;

    const mainBusbar = computeMainBusbar();
    const branchBusbar = computeBranchBusbar();

    let busbarTotal = 0;
    if (assembly) {
      // assembly replaces both main and branch busbar cost
      busbarTotal = assembly.cost !== null ? assembly.cost : 0;
    } else {
      if (branchBusbar) busbarTotal += branchBusbar.cost;
      if (mainBusbar && mainBusbar.cost !== null) busbarTotal += mainBusbar.cost;
    }
    cost += busbarTotal;

    const mainMechLugs = computeMainMechLugs(mainLugMultiplier);
    const branchMechLugs = computeBranchMechLugs();
    const mechLugs = {
      cost: mainMechLugs.cost + branchMechLugs.cost,
      missing: mainMechLugs.missing + branchMechLugs.missing,
      main: mainMechLugs,
      branches: branchMechLugs,
    };
    cost += mechLugs.cost;

    const groundLugs = computeGroundLugs();
    cost += groundLugs.cost;

    const groundBusbar = computeGroundBusbar();
    if (groundBusbar && groundBusbar.cost !== null) cost += groundBusbar.cost;

    const neutralBusbar = computeNeutralBusbar(needsNeutralBar);
    if (neutralBusbar.cost !== null) cost += neutralBusbar.cost;

    const boxDimensions = computeBoxDimensions();

    const atsMts = computeAtsMtsCost();
    if (atsMts && atsMts.cost) cost += atsMts.cost;

    return {
      cost, circuitCount, missing, mainBusbar, branchBusbar, busbarTotal, breakerLines,
      assemblyEligible: eligible, assembly, mechLugs, groundLugs, groundBusbar, neutralBusbar, boxDimensions, atsMts,
    };
  }

  function render() {
    app.innerHTML = "";
    const wrap = el("div", { class: "wrap" }, []);

    // Header
    const header = el("div", { class: "header" }, [
      el("div", {}, [
        el("div", { class: "eyebrow" }, [zapIcon(), "Estimator"]),
        el("h1", {}, ["Panel board builder"]),
      ]),
      lineDiagramSvg(),
    ]);
    wrap.appendChild(header);

    // Panel info bar: panel type, supply voltage, wiring description
    const mainDataForDesc = resolveRowData(main);
    const descText = supplyDescription(supplyVoltage, mainDataForDesc ? mainDataForDesc.poles : null);
    const panelInfoBar = el("div", { class: "panel-info-bar" }, [
      el("select", {
        class: "panel-info-select",
        onchange: (e) => {
          panelType = e.target.value;
          render();
        },
      }, ["MDP", "ECB", "MTS/ MTS MDP", "ATS/ATS MDP"].map((opt) =>
        el("option", { value: opt, selected: opt === panelType ? "selected" : undefined }, [opt])
      )),
      el("div", { class: "panel-info-right" }, [
        el("select", {
          class: "panel-info-select",
          onchange: (e) => {
            supplyVoltage = parseInt(e.target.value, 10);
            render();
          },
        }, [230, 400].map((v) =>
          el("option", { value: String(v), selected: v === supplyVoltage ? "selected" : undefined }, [v + "V"])
        )),
        el("span", { class: "panel-info-desc" }, [descText]),
      ]),
    ]);
    wrap.appendChild(panelInfoBar);

    // Enclosure info bar: mounting + NEMA rating + GI gauge (feeds the PO description)
    const enclosureBar = el("div", { class: "panel-info-bar" }, [
      el("select", {
        class: "panel-info-select",
        onchange: (e) => { mountingType = e.target.value; render(); },
      }, ["SURFACE MOUNTED", "FLUSH MOUNTED"].map((opt) =>
        el("option", { value: opt, selected: opt === mountingType ? "selected" : undefined }, [opt])
      )),
      el("div", { class: "panel-info-right" }, [
        el("select", {
          class: "panel-info-select",
          onchange: (e) => { nemaRating = e.target.value; render(); },
        }, ["NEMA-1", "NEMA-3R", "NEMA-4", "NEMA-4X", "NEMA-12"].map((opt) =>
          el("option", { value: opt, selected: opt === nemaRating ? "selected" : undefined }, [opt])
        )),
        el("select", {
          class: "panel-info-select",
          onchange: (e) => { giGauge = e.target.value; render(); },
        }, ["12", "14", "16"].map((opt) =>
          el("option", { value: opt, selected: opt === giGauge ? "selected" : undefined }, ["GI#" + opt])
        )),
      ]),
    ]);
    wrap.appendChild(enclosureBar);

    // Main breaker section
    const mainSection = el("div", { class: "section" }, [
      el("h2", {}, ["Main breaker"]),
      el("p", { class: "sub" }, ["The incoming feed for this panel."]),
      el("div", { class: "card" }, [
        el("table", { class: "breaker-table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", {}, ["Brand"]),
              el("th", {}, ["AT"]),
              el("th", {}, ["Poles"]),
              el("th", {}, ["Model"]),
              el("th", { class: "num" }, ["Qty"]),
              el("th", { class: "num" }, ["Price"]),
            ]),
          ]),
          el("tbody", {}, [
            renderBreakerRow(main, (next) => {
              main = next;
              render();
            }),
          ]),
        ]),
      ]),
    ]);
    wrap.appendChild(mainSection);

    // Branch breakers section
    const branchRows = branches.map((row, idx) =>
      renderBreakerRow(
        row,
        (next) => {
          branches = branches.map((r, i) => (i === idx ? next : r));
          render();
        },
        {
          circuitNo: idx + 1,
          showSpare: true,
          onRemove: () => {
            branches = branches.filter((_, i) => i !== idx);
            render();
          },
        }
      )
    );

    const branchSection = el("div", { class: "section" }, [
      el("div", { class: "section-title-row" }, [
        el("h2", {}, ["Branch breakers"]),
        el("span", { class: "count" }, [
          branches.length + " circuit" + (branches.length !== 1 ? "s" : ""),
        ]),
      ]),
      el("p", { class: "sub" }, ["Every circuit fed from this panel."]),
      el("div", { class: "card" }, [
        el("table", { class: "breaker-table" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { class: "narrow" }, ["Ckt"]),
              el("th", {}, ["Brand"]),
              el("th", {}, ["AT"]),
              el("th", {}, ["Poles"]),
              el("th", {}, ["Model"]),
              el("th", { class: "narrow" }, ["Spare"]),
              el("th", { class: "num" }, ["Qty"]),
              el("th", { class: "num" }, ["Price"]),
              el("th", { class: "narrow" }, [""]),
            ]),
          ]),
          el(
            "tbody",
            {},
            branches.length
              ? branchRows
              : [
                  el("tr", {}, [
                    el("td", { colspan: "9", class: "empty-state" }, ["No branch breakers yet."]),
                  ]),
                ]
          ),
        ]),
        el("div", { class: "add-row" }, [
          el(
            "button",
            {
              class: "add-btn",
              onclick: () => {
                branches = [...branches, emptyRow()];
                render();
              },
            },
            [plusIcon(), "Add branch breaker"]
          ),
        ]),
      ]),
    ]);
    wrap.appendChild(branchSection);

    // Busbars
    const totals = computeTotals();
    const toggleRow = el("div", { class: "assembly-toggle" }, [
      el("label", { class: "assembly-toggle-label" }, [
        el("input", {
          type: "checkbox",
          checked: useAssembly ? "checked" : undefined,
          disabled: !totals.assemblyEligible ? "disabled" : undefined,
          onchange: (e) => {
            useAssembly = e.target.checked;
            render();
          },
        }),
        el("span", {}, ["Use assembly instead of busbars (all-MCB panel)"]),
      ]),
      !totals.assemblyEligible
        ? el("span", { class: "assembly-toggle-hint" }, [
            "Available when every branch breaker is MCB and the main breaker is 2 or 3 pole.",
          ])
        : null,
    ]);

    const busbarBody =
      useAssembly && totals.assembly
        ? renderAssemblyBlock(totals.assembly)
        : el("div", { class: "card busbar-card" }, [
            renderMainBusbarBlock(totals.mainBusbar),
            renderBranchBusbarBlock(totals.branchBusbar),
          ]);

    const busbarSection = el("div", { class: "section" }, [
      el("h2", {}, ["Busbars"]),
      el("p", { class: "sub" }, ["Derived from the selected main and branch breakers."]),
      toggleRow,
      busbarBody,
    ]);
    wrap.appendChild(busbarSection);

    // Mech lugs
    const mechLugsSection = el("div", { class: "section" }, [
      el("h2", {}, ["Mech lugs"]),
      el("p", { class: "sub" }, ["Solved separately for the main breaker and the branch breakers."]),
      el("div", { class: "busbar-grid" }, [
        el("div", {}, [
          el("div", { class: "busbar-subtitle" }, ["Main breaker"]),
          renderMechLugsBlock(totals.mechLugs.main, "Main mech lugs", mainLugMultiplierControl()),
          totals.mechLugs.main.missing > 0
            ? el("div", { class: "warn" }, ["No mech lugs bracket available for the main breaker's AT"])
            : null,
        ]),
        el("div", {}, [
          el("div", { class: "busbar-subtitle" }, ["Branch breakers"]),
          renderMechLugsBlock(totals.mechLugs.branches, "Branch mech lugs"),
          totals.mechLugs.branches.missing > 0
            ? el("div", { class: "warn" }, [
                totals.mechLugs.branches.missing +
                  " circuit" +
                  (totals.mechLugs.branches.missing !== 1 ? "s" : "") +
                  " exceed" +
                  (totals.mechLugs.branches.missing !== 1 ? "" : "s") +
                  " the mech lugs table \u2014 no bracket available for that AT",
              ])
            : null,
        ]),
      ]),
    ]);
    wrap.appendChild(mechLugsSection);

    // Ground lugs, ground busbar & neutral busbar
    const groundSection = el("div", { class: "section" }, [
      el("h2", {}, ["Grounding & neutral"]),
      el("p", { class: "sub" }, ["1 ground lug per breaker, plus ground and neutral busbars."]),
      el("div", { class: "assembly-toggle" }, [
        el("label", { class: "assembly-toggle-label" }, [
          el("input", {
            type: "checkbox",
            checked: needsNeutralBar ? "checked" : undefined,
            onchange: (e) => {
              needsNeutralBar = e.target.checked;
              render();
            },
          }),
          el("span", {}, ["This panel needs a neutral bar"]),
        ]),
        el("span", { class: "assembly-toggle-hint" }, [
          "for 1P branches",
        ]),
      ]),
      el("div", { class: "busbar-grid" }, [
        el("div", {}, [
          renderGroundLugsBlock(totals.groundLugs),
          totals.groundLugs.missing > 0
            ? el("div", { class: "warn" }, [
                totals.groundLugs.missing +
                  " circuit" +
                  (totals.groundLugs.missing !== 1 ? "s" : "") +
                  " exceed" +
                  (totals.groundLugs.missing !== 1 ? "" : "s") +
                  " the mech lugs table \u2014 needs a manual quote",
              ])
            : null,
        ]),
        el("div", {}, [renderGroundBusbarBlock(totals.groundBusbar)]),
      ]),
      el("div", { style: "margin-top:14px;" }, [renderNeutralBusbarBlock(totals.neutralBusbar)]),
    ]);
    wrap.appendChild(groundSection);

    // Box dimensions
    const boxSection = el("div", { class: "section" }, [
      el("h2", {}, ["Box dimensions"]),
      el("p", { class: "sub" }, ["Estimated enclosure height and width from the main breaker, branches, and clearance table."]),
      renderBoxDimensionsBlock(totals.boxDimensions),
      totals.boxDimensions && totals.boxDimensions.exceedsTable
        ? el("div", { class: "warn" }, ["Main or branch AT exceeds the clearance table \u2014 needs a manual quote."])
        : null,
    ]);
    wrap.appendChild(boxSection);

    // ATS/MTS price (only when that panel type is selected)
    if (totals.atsMts) {
      const atsMtsSection = el("div", { class: "section" }, [
        el("h2", {}, [panelType === "MTS/ MTS MDP" ? "MTS price" : "ATS price"]),
        el("p", { class: "sub" }, [
          panelType === "MTS/ MTS MDP"
            ? "Bending cost from the ATS/MTS table's total length, at the main breaker's own busbar price."
            : "Bending cost, plus controller and accessories, from the ATS/MTS table.",
        ]),
        renderAtsMtsBlock(totals.atsMts),
        totals.atsMts.exceedsTable
          ? el("div", { class: "warn" }, ["Main breaker's AT/pole combination isn't in the ATS/MTS table \u2014 needs a manual quote."])
          : null,
      ]);
      wrap.appendChild(atsMtsSection);
    }

    // Receipt
    const surchargeActive =
      (totals.mainBusbar && totals.mainBusbar.surcharge) ||
      (totals.branchBusbar && totals.branchBusbar.surcharge);
    const groundCost =
      totals.groundLugs.cost + (totals.groundBusbar && totals.groundBusbar.cost !== null ? totals.groundBusbar.cost : 0);
    const neutralCost = totals.neutralBusbar.cost !== null ? totals.neutralBusbar.cost : 0;
    const receipt = computeReceipt(totals.cost);

    function adjustRow(label, mode, value, onModeChange, onValueChange, amountLabel) {
      return el("div", { class: "receipt-adjust-row" }, [
        el("span", { class: "receipt-adjust-label" }, [label]),
        el(
          "select",
          { class: "receipt-adjust-select", onchange: (e) => onModeChange(e.target.value) },
          [
            el("option", { value: "percent", selected: mode === "percent" ? "selected" : undefined }, ["%"]),
            el("option", { value: "flat", selected: mode === "flat" ? "selected" : undefined }, ["\u20B1"]),
          ]
        ),
        el("input", {
          type: "number",
          class: "receipt-adjust-input",
          value: String(value),
          oninput: (e) => onValueChange(parseFloat(e.target.value) || 0),
        }),
        el("span", { class: "receipt-adjust-amount" }, [amountLabel]),
      ]);
    }

    const receiptCard = el("div", { class: "card receipt" }, [
      el("div", { class: "receipt-title" }, ["Estimate"]),

      el("div", { class: "receipt-line" }, [
        el("span", {}, ["Breakers selected"]),
        el("span", { class: "mono" }, [String(totals.circuitCount)]),
      ]),
      totals.missing > 0
        ? el("div", { class: "warn" }, [
            totals.missing + " model" + (totals.missing !== 1 ? "s" : "") + " need a price quote",
          ])
        : null,

      el(
        "div",
        { class: "receipt-items" },
        totals.breakerLines.map((line) =>
          el("div", { class: "receipt-line item" }, [
            el("span", { class: "receipt-item-label" }, [
              line.label +
                ": " +
                line.brand +
                " " +
                line.model +
                " (" +
                line.at +
                "A, " +
                line.poles +
                "P)" +
                (line.qty > 1 ? " \u00d7" + line.qty : ""),
            ]),
            el("span", { class: "mono" }, [
              line.spare ? "SPARE" : line.unitPrice === null ? "NO PRICE" : formatMoney(line.lineCost),
            ]),
          ])
        )
      ),

      el("div", { class: "receipt-line" }, [
        el("span", {}, ["Busbar"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(totals.busbarTotal)]),
      ]),
      surchargeActive
        ? el("div", { class: "warn" }, ["\u2265315A branch present \u2014 main \u00d71.3, branch \u00d72 applied"])
        : null,

      el("div", { class: "receipt-line" }, [
        el("span", {}, ["Mech lugs"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(totals.mechLugs.cost)]),
      ]),
      el("div", { class: "receipt-line" }, [
        el("span", {}, ["Ground (lugs + busbar)"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(groundCost)]),
      ]),
      el("div", { class: "receipt-line" }, [
        el("span", {}, ["Neutral busbar"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(neutralCost)]),
      ]),
      totals.atsMts
        ? el("div", { class: "receipt-line" }, [
            el("span", {}, [panelType === "MTS/ MTS MDP" ? "MTS price" : "ATS price"]),
            el("span", { class: "mono" }, ["\u20B1" + formatMoney(totals.atsMts.cost)]),
          ])
        : null,

      el("div", { class: "receipt-line subtotal" }, [
        el("span", {}, ["Subtotal"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(receipt.subtotal)]),
      ]),

      adjustRow(
        "Calibrated profit",
        profitMode,
        profitValue,
        (v) => { profitMode = v; render(); },
        (v) => { profitValue = v; render(); },
        "+\u20B1" + formatMoney(receipt.profitAmount)
      ),
      adjustRow(
        "Applied discount",
        discountMode,
        discountValue,
        (v) => { discountMode = v; render(); },
        (v) => { discountValue = v; render(); },
        "\u2212\u20B1" + formatMoney(receipt.discountAmount)
      ),

      el("div", { class: "receipt-line grand-total" }, [
        el("span", {}, ["Grand total"]),
        el("span", { class: "mono" }, ["\u20B1" + formatMoney(receipt.grandTotal)]),
      ]),
    ]);
    wrap.appendChild(receiptCard);

    // Save to PO
    const editingId = window.getPOEditingId ? window.getPOEditingId() : null;
    const poSection = el("div", { class: "section" }, [
      el("h2", {}, ["Save to PO"]),
      editingId !== null
        ? el("p", { class: "sub" }, ["Editing PO line item #" + editingId + ". Saving will update it in place."])
        : el("p", { class: "sub" }, ["Save this configuration as a line item in the PO Creation Tool."]),
      el("div", { class: "po-save-row" }, [
        el("input", {
          type: "text",
          class: "po-save-name",
          placeholder: "Item name (e.g. PANEL BOARD 1)",
          value: poItemName,
          oninput: (e) => { poItemName = e.target.value; },
        }),
        el(
          "button",
          {
            class: "add-btn",
            onclick: async () => {
              if (window.savePOItem) await window.savePOItem(poItemName);
              poSaveMessage = editingId !== null ? "Updated PO line item." : "Saved to PO Creation Tool.";
              render();
            },
          },
          [editingId !== null ? "Update PO line item" : "+ Save to PO"]
        ),
        editingId !== null
          ? el(
              "button",
              {
                class: "toolbar-btn",
                onclick: () => {
                  if (window.cancelPOEdit) window.cancelPOEdit();
                  poSaveMessage = "";
                  render();
                },
              },
              ["Cancel edit"]
            )
          : null,
      ]),
      poSaveMessage ? el("div", { class: "po-save-message" }, [poSaveMessage]) : null,
    ]);
    wrap.appendChild(poSection);

    app.appendChild(wrap);
  }

  function zapIcon() {
    return el("span", {
      html: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      style: "display:inline-flex;vertical-align:middle;margin-right:6px;",
    });
  }

  function plusIcon() {
    return el("span", {
      html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      style: "display:inline-flex;vertical-align:middle;margin-right:4px;",
    });
  }

  function lineDiagramSvg() {
    const span = el("span", {
      html: `<svg width="132" height="46" viewBox="0 0 132 46" fill="none">
        <path d="M4 23H30" stroke="#4A5157" stroke-width="1.5" />
        <rect x="30" y="14" width="18" height="18" stroke="#C1501C" stroke-width="1.5" />
        <path d="M48 23H62" stroke="#4A5157" stroke-width="1.5" />
        <path d="M62 23V8M62 23V38" stroke="#4A5157" stroke-width="1.5" />
        <path d="M62 8H128M62 38H128" stroke="#4A5157" stroke-width="1.5" />
        <rect x="72" y="2" width="12" height="12" stroke="#6B7B72" stroke-width="1.3" />
        <rect x="72" y="32" width="12" height="12" stroke="#6B7B72" stroke-width="1.3" />
        <rect x="106" y="2" width="12" height="12" stroke="#6B7B72" stroke-width="1.3" />
        <rect x="106" y="32" width="12" height="12" stroke="#6B7B72" stroke-width="1.3" />
      </svg>`,
    });
    return span;
  }

  window.DBReady.then(render);
  window.renderBuilder = render;

  // ---- PO tool bridge ----
  // Snapshot everything the PO page needs to build a description + price,
  // without duplicating the breaker-matching logic here.
  window.getBuilderConfig = function () {
    const mainResolved = resolveRowData(main);
    const branchesResolved = branches.map((sel) => ({ sel: { ...sel }, rowData: resolveRowData(sel) }));
    const totals = computeTotals();
    const receipt = computeReceipt(totals.cost);
    return {
      main: { ...main },
      branches: branches.map((b) => ({ ...b })),
      useAssembly, mainLugMultiplier, panelType, supplyVoltage, needsNeutralBar,
      profitMode, profitValue, discountMode, discountValue,
      mountingType, nemaRating, giGauge,
      mainResolved, branchesResolved,
      supplyDescriptionText: supplyDescription(supplyVoltage, mainResolved ? mainResolved.poles : null),
      grandTotal: receipt.grandTotal,
    };
  };

  window.loadBuilderConfig = function (config) {
    if (!config) return;
    main = { ...config.main };
    branches = config.branches.map((b) => ({ ...b }));
    useAssembly = !!config.useAssembly;
    mainLugMultiplier = config.mainLugMultiplier || 1;
    panelType = config.panelType || "MDP";
    supplyVoltage = config.supplyVoltage || 230;
    needsNeutralBar = config.needsNeutralBar !== undefined ? config.needsNeutralBar : true;
    profitMode = config.profitMode || "percent";
    profitValue = config.profitValue || 0;
    discountMode = config.discountMode || "percent";
    discountValue = config.discountValue || 0;
    mountingType = config.mountingType || "SURFACE MOUNTED";
    nemaRating = config.nemaRating || "NEMA-1";
    giGauge = config.giGauge || "16";
    poSaveMessage = "";
    render();
  };

  window.setPOItemName = function (name) {
    poItemName = name || "PANEL BOARD";
    render();
  };
})();
