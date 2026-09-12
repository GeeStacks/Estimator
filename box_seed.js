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

// ATS/MTS bending, motor, controller & accessories reference, by main AT
// range and pole count. AT is stored as min/max (single-value rows have
// min === max), same convention as the busbars table.
const SEED_ATS_MTS = [
  { min: 50, max: 100, pole: 2, bend_1st: 100, bend_2nd: 100, bend_hor: 200, bend_3rd: 100, bend_4th: 100, total_length_mm: 600, motor: 8000, controller: 3000, accessories: 6000 },
  { min: 125, max: 250, pole: 2, bend_1st: 150, bend_2nd: 100, bend_hor: 320, bend_3rd: 150, bend_4th: 100, total_length_mm: 820, motor: 10000, controller: 3000, accessories: 6000 },
  { min: 50, max: 100, pole: 3, bend_1st: 100, bend_2nd: 100, bend_hor: 300, bend_3rd: 100, bend_4th: 100, total_length_mm: 700, motor: 8000, controller: 3000, accessories: 6000 },
  { min: 125, max: 250, pole: 3, bend_1st: 150, bend_2nd: 100, bend_hor: 320, bend_3rd: 150, bend_4th: 100, total_length_mm: 820, motor: 10000, controller: 3000, accessories: 6000 },
  { min: 320, max: 320, pole: 3, bend_1st: 200, bend_2nd: 150, bend_hor: 400, bend_3rd: 200, bend_4th: 150, total_length_mm: 1100, motor: 16000, controller: 3000, accessories: 6000 },
  { min: 350, max: 350, pole: 3, bend_1st: 200, bend_2nd: 150, bend_hor: 400, bend_3rd: 200, bend_4th: 150, total_length_mm: 1100, motor: 16000, controller: 3000, accessories: 6000 },
  { min: 400, max: 400, pole: 3, bend_1st: 200, bend_2nd: 150, bend_hor: 400, bend_3rd: 200, bend_4th: 150, total_length_mm: 1100, motor: 16000, controller: 3000, accessories: 6000 },
  { min: 500, max: 500, pole: 3, bend_1st: 250, bend_2nd: 150, bend_hor: 400, bend_3rd: 250, bend_4th: 150, total_length_mm: 1200, motor: 19000, controller: 13000, accessories: 8000 },
  { min: 600, max: 630, pole: 3, bend_1st: 250, bend_2nd: 150, bend_hor: 400, bend_3rd: 250, bend_4th: 150, total_length_mm: 1200, motor: 19000, controller: 13000, accessories: 8000 },
  { min: 700, max: 700, pole: 3, bend_1st: 300, bend_2nd: 200, bend_hor: 450, bend_3rd: 300, bend_4th: 200, total_length_mm: 1450, motor: 32000, controller: 15000, accessories: 8000 },
  { min: 800, max: 800, pole: 3, bend_1st: 300, bend_2nd: 200, bend_hor: 450, bend_3rd: 300, bend_4th: 200, total_length_mm: 1450, motor: 32000, controller: 15000, accessories: 8000 },
];
const ATS_MTS = [];
