// Recommended wire/lug size & bending clearance, by main breaker AT.
// mgl_cat_no links each row to a catalog entry in SEED_LUG_DIMENSIONS.
// parallel_count is 2 for AT ratings that use two conductors/lugs per phase.
const SEED_CLEARANCE = [
  { at: 100, wire_size: "35 mm\u00b2 Cu", lug_size_label: "35 mm\u00b2 (~1/0 AWG)", bending_clearance_mm: 75, parallel_count: 1, mgl_cat_no: "MGL-A0" },
  { at: 125, wire_size: "50 mm\u00b2 Cu", lug_size_label: "50 mm\u00b2 (~1/0 AWG)", bending_clearance_mm: 100, parallel_count: 1, mgl_cat_no: "MGL-A0" },
  { at: 160, wire_size: "70 mm\u00b2 Cu", lug_size_label: "70 mm\u00b2 (~2/0 AWG)", bending_clearance_mm: 120, parallel_count: 1, mgl_cat_no: "MGLA-2/0" },
  { at: 175, wire_size: "70 mm\u00b2 Cu", lug_size_label: "70 mm\u00b2 (~2/0 AWG)", bending_clearance_mm: 120, parallel_count: 1, mgl_cat_no: "MGLA-2/0" },
  { at: 200, wire_size: "95 mm\u00b2 Cu", lug_size_label: "95 mm\u00b2 (~4/0 AWG)", bending_clearance_mm: 120, parallel_count: 1, mgl_cat_no: "MGLA-250" },
  { at: 225, wire_size: "120 mm\u00b2 Cu", lug_size_label: "120 mm\u00b2 (250 MCM)", bending_clearance_mm: 150, parallel_count: 1, mgl_cat_no: "MGLA-250" },
  { at: 250, wire_size: "120 mm\u00b2 Cu", lug_size_label: "120 mm\u00b2 (250 MCM)", bending_clearance_mm: 150, parallel_count: 1, mgl_cat_no: "MGLA-250" },
  { at: 300, wire_size: "150 mm\u00b2 Cu", lug_size_label: "150 mm\u00b2 (300 MCM)", bending_clearance_mm: 175, parallel_count: 1, mgl_cat_no: "MGLA-300" },
  { at: 350, wire_size: "185 mm\u00b2 Cu", lug_size_label: "185 mm\u00b2 (350 MCM)", bending_clearance_mm: 200, parallel_count: 1, mgl_cat_no: "MGLA-350" },
  { at: 400, wire_size: "240 mm\u00b2 Cu", lug_size_label: "240 mm\u00b2 (500 MCM)", bending_clearance_mm: 225, parallel_count: 1, mgl_cat_no: "MGLA-500" },
  { at: 450, wire_size: "2 \u00d7 120 mm\u00b2 Cu", lug_size_label: "2 \u00d7 120 mm\u00b2 (2 \u00d7 250 MCM)", bending_clearance_mm: 250, parallel_count: 2, mgl_cat_no: "MGLA-250" },
  { at: 500, wire_size: "2 \u00d7 150 mm\u00b2 Cu", lug_size_label: "2 \u00d7 150 mm\u00b2 (2 \u00d7 300 MCM)", bending_clearance_mm: 250, parallel_count: 2, mgl_cat_no: "MGLA-300" },
  { at: 600, wire_size: "2 \u00d7 185 mm\u00b2 Cu", lug_size_label: "2 \u00d7 185 mm\u00b2 (2 \u00d7 350 MCM)", bending_clearance_mm: 300, parallel_count: 2, mgl_cat_no: "MGLA-350" },
  { at: 630, wire_size: "2 \u00d7 185 mm\u00b2 Cu", lug_size_label: "2 \u00d7 185 mm\u00b2 (2 \u00d7 350 MCM)", bending_clearance_mm: 300, parallel_count: 2, mgl_cat_no: "MGLA-350" },
  { at: 700, wire_size: "2 \u00d7 240 mm\u00b2 Cu", lug_size_label: "2 \u00d7 240 mm\u00b2 (2 \u00d7 500 MCM)", bending_clearance_mm: 325, parallel_count: 2, mgl_cat_no: "MGLA-500" },
  { at: 800, wire_size: "2 \u00d7 240 mm\u00b2 Cu", lug_size_label: "2 \u00d7 240 mm\u00b2 (2 \u00d7 500 MCM)", bending_clearance_mm: 350, parallel_count: 2, mgl_cat_no: "MGLA-500" },
];
const CLEARANCE = [];

// MGL lug body dimensions (mm), converted from inch catalog specs.
const SEED_LUG_DIMENSIONS = [
  { cat_no: "MGL-A6", wire_range: "4\u201314 AWG", bolt_size_in: "1/4\"", metric_bolt_mm: 6.35, L: 27.00, W: 12.70, G: 9.60, H: 12.70, F: 2.39, std_pkg: 50 },
  { cat_no: "MGL-A2", wire_range: "2\u201314 AWG", bolt_size_in: "1/4\"", metric_bolt_mm: 6.35, L: 29.39, W: 12.70, G: 11.99, H: 14.00, F: 2.74, std_pkg: 200 },
  { cat_no: "MGL-A0", wire_range: "1/0\u201314 AWG", bolt_size_in: "1/4\"", metric_bolt_mm: 6.35, L: 37.08, W: 15.90, G: 15.80, H: 19.99, F: 4.70, std_pkg: 50 },
  { cat_no: "MGLA-2/0", wire_range: "2/0\u201314 AWG", bolt_size_in: "1/4\"", metric_bolt_mm: 6.35, L: 37.08, W: 15.90, G: 15.80, H: 19.99, F: 4.70, std_pkg: 50 },
  { cat_no: "MGLA-250", wire_range: "250 MCM\u20136 AWG", bolt_size_in: "5/16\"", metric_bolt_mm: 7.94, L: 50.80, W: 25.40, G: 25.40, H: 28.40, F: 6.40, std_pkg: 25 },
  { cat_no: "MGLA-300", wire_range: "300 MCM\u20136 AWG", bolt_size_in: "1/4\"", metric_bolt_mm: 6.35, L: 50.80, W: 21.74, G: 25.40, H: 28.40, F: 6.40, std_pkg: 25 },
  { cat_no: "MGLA-350", wire_range: "350 MCM\u20136 AWG", bolt_size_in: "3/8\"", metric_bolt_mm: 9.53, L: 57.15, W: 28.60, G: 28.55, H: 31.80, F: 6.40, std_pkg: 20 },
  { cat_no: "MGLA-500", wire_range: "500 MCM\u20134 AWG", bolt_size_in: "3/8\"", metric_bolt_mm: 9.53, L: 71.50, W: 38.10, G: 31.09, H: 39.80, F: 8.00, std_pkg: 10 },
  { cat_no: "MGLA-600", wire_range: "600 MCM\u20132 AWG", bolt_size_in: "3/8\"", metric_bolt_mm: 9.53, L: 81.00, W: 38.10, G: 35.08, H: 39.80, F: 11.10, std_pkg: 10 },
  { cat_no: "MGLA-800", wire_range: "800\u2013300 MCM", bolt_size_in: "5/8\"", metric_bolt_mm: 15.88, L: 85.70, W: 44.50, G: 41.25, H: 49.20, F: 12.70, std_pkg: 10 },
  { cat_no: "MGLA-1000", wire_range: "1000\u2013500 MCM", bolt_size_in: "5/8\"", metric_bolt_mm: 15.88, L: 85.70, W: 44.50, G: 41.25, H: 49.20, F: 12.70, std_pkg: 10 },
];
const LUG_DIMENSIONS = [];
