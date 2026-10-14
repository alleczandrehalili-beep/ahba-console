// AHBA FieldOps — NAP monitoring core (pure logic, no I/O). Same rules as supabase/migrations/nap-0N-*.sql: change both together.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NapCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DAY = 86400000;
  var STATUS = {
    AWT: 'Active (w/ tagging)', AWO: 'Active (w/o tagging)', VACANT: 'Vacant',
    RELEASED: 'Released', HILOSS: 'Hi Loss', DEFECTIVE: 'Defective', UNVERIFIED: 'Unverified'
  };
  var PORT_STATUSES = [STATUS.AWT, STATUS.AWO, STATUS.VACANT, STATUS.RELEASED, STATUS.HILOSS, STATUS.DEFECTIVE];
  var DEFAULTS = { freshnessDays: 14, fullMultiplier: 2, gpsFlagM: 50 };

  function opt(o) { var r = {}; for (var k in DEFAULTS) r[k] = (o && o[k] != null) ? o[k] : DEFAULTS[k]; return r; }
  function toMs(v) { return typeof v === 'number' ? v : v instanceof Date ? v.getTime() : Date.parse(v); }
  function isUsable(s) { return s === STATUS.VACANT || s === STATUS.RELEASED; }
  function isOccupied(s) { return s === STATUS.AWT || s === STATUS.AWO; }

  // 'QCY003 LP114 NP6-7-8' -> { prefix:'QCY003 LP114', nps:[6,7,8] }
  function parseStencil(str) {
    var m = /^\s*([A-Z]{3}\d{3} LP\d+) NP(\d+(?:-\d+)*)\s*$/i.exec(String(str || ''));
    if (!m) return null;
    return { prefix: m[1].toUpperCase(), nps: m[2].split('-').map(Number) };
  }

  // ports: the box's port rows [{status, verified_at}]. Same rule as the nap.box_status view. A port is checked when its status is not
  // Unverified and verified_at is a valid date. total = o.total when given (phase 2B: 8 x the box's NAP numbers, because port rows exist
  // only after an audit), else ports.length (boxes with pre-created Unverified rows, like the Bahay Toro pilot).
  //   free        = checked Vacant/Released ports verified within freshnessDays (an old free port does not count)
  //   installable = free > 0
  //   full        = every port checked, all occupied, newest check within freshnessDays x fullMultiplier
  //   issue       = newest check within freshnessDays and a Hi Loss / Defective port
  //   stale       = anything else that was checked; unverified = nothing checked
  function boxStatus(ports, now, o) {
    var c = opt(o), t = toMs(now), all = ports || [], total = o && o.total != null ? o.total : all.length;
    var seen = all.filter(function (p) { return p.status !== STATUS.UNVERIFIED && p.verified_at != null && isFinite(toMs(p.verified_at)); });
    if (!seen.length) return { kind: 'unverified', free: 0, checked: 0, bad: 0, total: total, ageDays: null };
    var age = function (p) { return (t - toMs(p.verified_at)) / DAY; };
    var newest = Math.max.apply(null, seen.map(function (p) { return toMs(p.verified_at); }));
    var ageFrac = (t - newest) / DAY;
    var free = seen.filter(function (p) { return isUsable(p.status) && age(p) <= c.freshnessDays; }).length;
    var bad = seen.filter(function (p) { return p.status === STATUS.HILOSS || p.status === STATUS.DEFECTIVE; }).length;
    var full = seen.length === total && seen.every(function (p) { return isOccupied(p.status); });
    var kind = free > 0 ? 'installable'
      : full && ageFrac <= c.freshnessDays * c.fullMultiplier ? 'full'
      : ageFrac <= c.freshnessDays && bad > 0 ? 'issue'
      : 'stale';
    return { kind: kind, free: free, checked: seen.length, bad: bad, total: total, ageDays: Math.max(0, Math.floor(ageFrac)) };
  }
  // 8 ports per NAP number (nap.box_status.total since phase 2B)
  function boxTotal(npNumbers) { return 8 * (Array.isArray(npNumbers) ? npNumbers.length : 0); }

  // A JO's NAPCODE ('QCY003 LP114 NP6', 'qcy003 lp114 np6 p3' or the full 'QCY003 LP114 NP6-7-8') -> the search_boxes text for its
  // FIRST NAP number and what a matching box must satisfy. null when the code is not a stencil.
  function jobNapQuery(napcode) {
    var p = parseStencil(normStencil(napcode).replace(/ P\d+.*$/, ''));
    if (!p) return null;
    return { q: p.prefix + ' NP' + p.nps[0], prefix: p.prefix, np: p.nps[0] };
  }
  // The box of that NAP number among search results: same LP (prefix + ' NP', so LP11 never matches LP114) and the NAP number listed.
  function matchJobBox(rows, jq) {
    if (!jq) return null;
    return (rows || []).find(function (b) {
      return b && String(b.stencil || '').indexOf(jq.prefix + ' NP') === 0 && Array.isArray(b.np_numbers) && b.np_numbers.indexOf(jq.np) >= 0;
    }) || null;
  }

  function haversineM(lat1, lng1, lat2, lng2) {
    var R = 6371000, r = Math.PI / 180, dp = (lat2 - lat1) * r, dl = (lng2 - lng1) * r;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // mode 'install' -> installable boxes; 'audit' -> stale + unverified boxes. Nearest first.
  function nearest(boxes, from, mode, limit) {
    if (!from || from.lat == null || from.lng == null) return [];
    var want = mode === 'audit' ? ['stale', 'unverified'] : ['installable'];
    return (boxes || [])
      .filter(function (b) { return want.indexOf(b.kind) >= 0 && b.lat != null && b.lng != null; })
      .map(function (b) { var x = {}; for (var k in b) x[k] = b[k]; x.distance_m = haversineM(from.lat, from.lng, b.lat, b.lng); return x; })
      .sort(function (a, b) { return a.distance_m - b.distance_m; })
      .slice(0, limit == null ? 5 : limit);
  }

  // a: { ports:[{port,status,tag_acct}], photos:number, declaredFull:boolean, jobId?:string }. Server repeats these checks.
  // Errors accumulate in a fixed order: ports, tags, photo, full-has-free, job.
  function validateAudit(a) {
    var errors = [], ports = a.ports || [];
    var nums = {};
    ports.forEach(function (p) { if (Number.isInteger(p.port) && p.port >= 1 && p.port <= 8) nums[p.port] = true; });
    var statusOk = ports.every(function (p) { return PORT_STATUSES.indexOf(p.status) >= 0; });
    var intOk = ports.every(function (p) { return Number.isInteger(p.port); });
    if (ports.length !== 8 || Object.keys(nums).length !== 8 || !statusOk || !intOk)
      errors.push({ code: 'NAP_PORTS_INCOMPLETE', msg: 'Every port from P1 to P8 needs a status.' });
    var noTag = ports.filter(function (p) { return p.status === STATUS.AWT && !String(p.tag_acct || '').trim(); }).map(function (p) { return 'P' + p.port; });
    if (noTag.length) errors.push({ code: 'NAP_TAG_REQUIRED', msg: 'Enter the acct no. on the label of ' + noTag.join(', ') + '.' });
    if (!(a.photos >= 1)) errors.push({ code: 'NAP_PHOTO_REQUIRED', msg: 'At least one photo of the NAP reading is required.' });
    if (a.declaredFull) {
      var free = ports.filter(function (p) { return isUsable(p.status); }).map(function (p) { return 'P' + p.port; });
      if (free.length) errors.push({ code: 'NAP_FULL_HAS_FREE', msg: 'Not a Full NAP: ' + free.join(', ') + ' is free. Install there or change the audit.' });
      if (!String(a.jobId == null ? '' : a.jobId).trim()) errors.push({ code: 'NAP_JOB_REQUIRED', msg: 'A JO is required for a Full NAP.' });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function gpsFlag(distanceM, o) { return distanceM != null && distanceM > opt(o).gpsFlagM; }

  // ---------- dispatch helpers ----------
  function normStencil(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toUpperCase(); }

  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function iso(y, m, d) {
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
    var t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return '';
    return t.toISOString().slice(0, 10);
  }
  function parseDueDate(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) {
      if (isNaN(v)) return '';
      // SheetJS (cellDates) returns LOCAL-midnight Dates, sometimes up to <60s early (tz quirks). Add 59s (NOT 12h: that
      // would roll 23:59 over into the next day), then read LOCAL fields. 12h was requested but contradicts the 23:59 case.
      var d = new Date(v.getTime() + 59 * 1000);
      return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
    if (typeof v === 'number') {
      if (!(v > 20000 && v < 80000)) return '';
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
    }
    var s = String(v).trim(), m;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return iso(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return iso(+m[3], +m[1], +m[2]);
    if ((m = /^(\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\d{2}|\d{4})$/.exec(s))) {
      var mo = MONTHS[m[2].toLowerCase()], y = +m[3]; if (y < 100) y += 2000;
      return mo ? iso(y, mo, +m[1]) : '';
    }
    return '';
  }

  // grid: array of arrays. Header row optional (a cell named stencil / nap...). Returns rows ready for nap.dispatch_match.
  function parseDispatchRows(grid) {
    var rows = [], skipped = 0, warnings = [];
    var data = (grid || []).filter(function (r) { return r && r.some(function (c) { return String(c == null ? '' : c).trim() !== ''; }); });
    var si = 0, ti = 1, di = 2, start = 0;
    var STENCIL_H = /^(nap[ _]?stencil|stencil|nap([ _]?name)?)$/i;
    if (data.length && data[0].some(function (c) { return STENCIL_H.test(String(c == null ? '' : c).trim()); })) {
      var h = data[0].map(function (c) { return String(c == null ? '' : c).trim(); });
      si = h.findIndex(function (c) { return STENCIL_H.test(c); });
      ti = h.findIndex(function (c) { return /^team$/i.test(c); });
      di = h.findIndex(function (c) { return /^(due|due[ _]?date|date|date[ _]?activity|petsa)$/i.test(c); });
      start = 1;
      if (ti < 0 && di < 0) warnings.push('The list has a header but no team or due column was recognized (use TEAM and DUE DATE / DATE ACTIVITY). Rows have no team.');
      else if (ti < 0) warnings.push('No TEAM column recognized in the header. Rows have no team.');
    }
    for (var i = start; i < data.length; i++) {
      var r = data[i], st = normStencil(si >= 0 ? r[si] : '');
      if (!st) { skipped++; continue; }
      var raw = di >= 0 ? r[di] : '', due = parseDueDate(raw);
      if (String(raw == null ? '' : raw).trim() !== '' && !due) warnings.push('Cannot read the date "' + raw + '" in ' + st);
      rows.push({ stencil: st, team: ti >= 0 && r[ti] != null ? String(r[ti]).trim().toUpperCase() : '', due: due });
    }
    return { rows: rows, skipped: skipped, warnings: warnings };
  }

  function splitDelimited(text, delim) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\r' || ch === '\n') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows;
  }
  // tab if the first non-blank line has one, else comma / semicolon (whichever appears more; comma on a tie), ignoring quoted text
  function detectDelimiter(t) {
    var first = String(t || '').split(/\r\n|\n|\r/).find(function (l) { return l.trim() !== ''; }) || '';
    var unq = first.replace(/"[^"]*("|$)/g, '');  // ignore delimiters inside double quotes
    var count = function (c) { return unq.split(c).length - 1; };
    return count('\t') > 0 ? '\t' : count(',') >= count(';') && count(',') > 0 ? ',' : count(';') > 0 ? ';' : ',';
  }
  function parseDispatchText(text) {
    var t = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    if (!t.trim()) return { rows: [], skipped: 0, warnings: [] };
    return parseDispatchRows(splitDelimited(t, detectDelimiter(t)));
  }

  // Mirrors the SQL rule in nap.submit_audit (geo block). accuracyM / distanceM in meters.
  function geoDecision(o) {
    o = o || {};
    var c = { accMaxM: 30, moveMaxM: 300, refineM: 50, minMoveM: 3 };
    for (var k in c) if (o[k] != null) c[k] = o[k];
    if (o.accuracyM == null || !(o.accuracyM >= 0)) return { action: 'none', reason: 'no_accuracy' };
    if (o.accuracyM > c.accMaxM) return { action: 'none', reason: 'low_accuracy' };
    if (!o.hasCoords) return { action: 'applied', reason: 'no_coords' };
    if (typeof o.distanceM !== 'number' || !isFinite(o.distanceM)) return { action: 'none', reason: 'no_distance' };
    if (o.distanceM < c.minMoveM) return { action: 'none', reason: 'no_change' };
    if (o.distanceM <= c.refineM) return { action: 'applied', reason: 'refine' };
    if (o.distanceM <= c.moveMaxM) return { action: 'moved', reason: 'moved' };
    return { action: 'proposed', reason: 'too_far' };
  }

  function within(boxes, from, radiusM) {
    return (boxes || [])
      .filter(function (b) { return b && b.lat != null && b.lng != null; })
      .map(function (b) { var x = {}; for (var k in b) x[k] = b[k]; x.distance_m = haversineM(from.lat, from.lng, b.lat, b.lng); return x; })
      .filter(function (b) { return b.distance_m <= radiusM; })
      .sort(function (a, b) { return a.distance_m - b.distance_m; });
  }
  function parseLatLng(text) {
    var m = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(String(text == null ? '' : text));
    if (!m) return null;
    var lat = parseFloat(m[1]), lng = parseFloat(m[2]);
    if (!(lat >= 4 && lat <= 22 && lng >= 116 && lng <= 128)) return null;
    return { lat: lat, lng: lng };
  }

  // ---------- NAP Master (import / export) helpers. The server (nap._master_run, nap-12) validates every row: these only read files. ----------
  var MASTER_IMPORT_COLS = ['stencil', 'barangay', 'district', 'dwelling', 'street', 'olt', 'lat', 'lng', 'converge_available', 'active', 'note'];
  var MASTER_EXPORT_COLS = ['stencil', 'barangay', 'district', 'dwelling', 'street', 'olt', 'lat', 'lng', 'geo_source', 'geo_updated_at', 'np_numbers',
    'total_ports', 'status', 'checked_ports', 'free_ports', 'bad_ports', 'age_days', 'last_audit_at', 'last_audit_team', 'converge_available', 'active'];
  // grey (computed) export columns: recognized and ignored on import, so an exported file can be imported back as is
  var MASTER_COMPUTED = MASTER_EXPORT_COLS.filter(function (c) { return MASTER_IMPORT_COLS.indexOf(c) < 0; });
  var MASTER_NUMERIC = { lat: 1, lng: 1, total_ports: 1, checked_ports: 1, free_ports: 1, bad_ports: 1, age_days: 1, converge_available: 1 };
  var MASTER_MAX_ROWS = 5000, MASTER_BATCH = 1000;
  // header spellings (after headerKey: lower case, non-alphanumerics -> '_')
  var MASTER_ALIAS = {
    stencil: /^(nap_?stencil|stencil|nap|nap_?name)$/, barangay: /^(barangay|brgy|barangay_?name)$/, district: /^(district|dist|district_?no)$/,
    dwelling: /^(dwelling|dwelling_?type)$/, street: /^(street|street_?name|street_?area)$/, olt: /^(olt|olt_?name)$/,
    lat: /^(lat|latitude)$/, lng: /^(lng|lon|long|longitude)$/, converge_available: /^(converge_?available|converge|available|avail)$/,
    active: /^(active|is_?active)$/, note: /^(note|notes|remark|remarks)$/
  };
  // READ ME sheet of the dashboard's .xlsx export. JSON-style strings on purpose: scripts/nap-build-templates.py reads this same list
  // for docs/nap-monitoring/templates/NAP-Export-Template.xlsx, so the template and the real export never disagree.
  var MASTER_EXPORT_README = [
    "NAP MASTER EXPORT (NAP Dashboard, tab NAP Master)",
    "",
    "One row = one NAP box (the physical box, as in the Converge POI list). The red column (stencil) is the key: never change it.",
    "Master columns (blue, editable, imported back): stencil, barangay, district, dwelling, street, olt, lat, lng, converge_available, active.",
    "Computed columns (grey, read-only, IGNORED when this file is imported back): geo_source (seed | audit | manual), geo_updated_at, np_numbers,",
    "  total_ports (8 per NAP number), status (installable | full | issue | stale | unverified | inactive), checked_ports, free_ports (fresh Vacant/Released only),",
    "  bad_ports (Hi Loss/Defective), age_days (days since the newest check), last_audit_at and last_audit_team (the newest visit, a not-found visit included).",
    "",
    "TO UPDATE BOXES: edit the blue columns, save as .xlsx or .csv, then NAP Master > Import > preview > Apply. Up to 5,000 rows per import file,",
    "  so import one barangay (or a 5,000-row part of the whole-QC file) at a time.",
    "- A blank cell never erases existing data.",
    "- TEAM GPS WINS: a box whose geo_source is audit (its location came from a team's GPS) keeps its coordinates; imported lat/lng are ignored for it.",
    "- active: YES or NO. NO deactivates the NAP: hidden from every list, map, search and dispatch, open dispatches cancelled, no new audits;",
    "  its history is kept. YES brings it back with its history. Deactivated boxes appear only in this export (status inactive).",
    "- Port statuses, audits, photos and dispatch history are never changed by an import.",
    "Dates and times are in the time zone of the computer that made the export (Philippine time on AHBA computers)."
  ];
  // same rule as nap._master_run: PREFIX LP## NP#(-#)*, NAP numbers of 1 to 4 digits
  var MASTER_STENCIL = /^[A-Z0-9]+ LP[0-9]+ NP[0-9]{1,4}(-[0-9]{1,4})*$/;

  function headerKey(c) { return String(c == null ? '' : c).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  // canonical import column for a header cell, '#computed' for a known export-only column, or null
  function masterColumn(h) {
    var k = headerKey(h);
    if (!k) return null;
    for (var c in MASTER_ALIAS) if (MASTER_ALIAS[c].test(k)) return c;
    return MASTER_COMPUTED.indexOf(k) >= 0 ? '#computed' : null;
  }
  function isMasterStencil(s) { return MASTER_STENCIL.test(normStencil(s)); }
  // 'QCY003 LP114 NP6-8-7-7' -> [6,7,8] (sorted, unique), as the server stores np_numbers; null when not a valid stencil
  function stencilNps(s) {
    var t = normStencil(s);
    if (!MASTER_STENCIL.test(t)) return null;
    var seen = {};
    return t.split(' NP')[1].split('-').map(Number).filter(function (n) { if (seen[n]) return false; seen[n] = true; return true; }).sort(function (a, b) { return a - b; });
  }
  // One cell as text for the server: booleans TRUE/FALSE, finite numbers as written by JS, whitespace collapsed, trimmed. A leading
  // apostrophe that our CSV export put in front of = + - @ (formula guard) is removed again.
  function masterCell(v) {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return isFinite(v) ? String(v) : '';
    if (v instanceof Date) return isNaN(v) ? '' : v.toISOString();
    var s = String(v).replace(/[\s\u00a0\ufeff]+/g, ' ').trim();
    return /^'[=+\-@]/.test(s) ? s.slice(1) : s;
  }
  function isBlankRow(r) { return !r || !r.some(function (c) { return masterCell(c) !== ''; }); }
  // index of the header row (the first row, among the first 20 non-blank ones, that has a stencil column), or -1
  function findMasterHeader(grid) {
    var seen = 0;
    for (var i = 0; i < (grid || []).length && seen < 20; i++) {
      var r = grid[i]; if (isBlankRow(r)) continue; seen++;
      if (r.some(function (c) { return masterColumn(c) === 'stencil'; })) return i;
    }
    return -1;
  }
  // grid: array of arrays (one sheet / CSV). firstRow = spreadsheet row number of grid[0] (default 1).
  // Returns { rows:[{row, stencil, ...only the columns the file has}], blank, columns:[canonical], ignored:[computed headers], unknown:[headers],
  //           warnings:[], error } . Rows are never dropped except fully blank ones (counted in `blank`): a row without a stencil is still
  // sent, so the preview reports it (bad_stencil).
  function parseMasterGrid(grid, firstRow) {
    var out = { rows: [], blank: 0, columns: [], ignored: [], unknown: [], warnings: [], error: null };
    var base = firstRow == null ? 1 : firstRow, hi = findMasterHeader(grid);
    if (hi < 0) { out.error = 'No header row with a "stencil" column was found. Use the NAP Master import template (or an exported file).'; return out; }
    var map = {}, head = grid[hi];
    head.forEach(function (c, j) {
      var col = masterColumn(c), label = masterCell(c);
      if (!label) return;
      if (col === '#computed') { out.ignored.push(label); return; }
      if (!col) { out.unknown.push(label); return; }
      if (map[col] != null) { out.warnings.push('Column "' + label + '" appears twice; the first one is used.'); return; }
      map[col] = j; out.columns.push(col);
    });
    for (var i = hi + 1; i < grid.length; i++) {
      var r = grid[i] || [];
      if (isBlankRow(r)) { out.blank++; continue; }
      var o = { row: base + i };
      for (var col in map) o[col] = col === 'stencil' ? normStencil(masterCell(r[map[col]])) : masterCell(r[map[col]]);
      out.rows.push(o);
    }
    if (out.rows.length > MASTER_MAX_ROWS) out.error = 'Up to ' + MASTER_MAX_ROWS.toLocaleString('en-US') + ' rows per file (this file has ' + out.rows.length.toLocaleString('en-US') + '). Split it into smaller files.';
    else if (!out.rows.length) out.error = 'The file has a header but no rows.';
    return out;
  }
  // a .csv / .tsv file of the NAP Master: same splitter and delimiter rule as Dispatch; blank lines are kept so row numbers match the file
  function parseMasterText(text) { var t = String(text == null ? '' : text).replace(/^\uFEFF/, ''); return parseMasterGrid(splitDelimited(t, detectDelimiter(t)), 1); }
  function splitBatches(arr, n) { var out = [], size = Math.max(1, n || MASTER_BATCH); for (var i = 0; i < (arr || []).length; i += size) out.push(arr.slice(i, i + size)); return out; }

  // CSV: every cell quoted; text that a spreadsheet would run as a formula (= + - @ tab CR) gets a leading apostrophe (numbers never do)
  function csvCell(v, numeric) {
    var t = v == null ? '' : String(v);
    if (!numeric && /^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  }
  function toCsv(head, rows, numericCols) {
    var num = numericCols || {};
    return [head.map(function (h) { return csvCell(h); }).join(',')].concat((rows || []).map(function (r) {
      return r.map(function (v, j) { return csvCell(v, !!num[head[j]] && typeof v === 'number'); }).join(',');
    })).join('\r\n');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  // ISO timestamp -> 'YYYY-MM-DD HH:MM' in the browser's time zone ('' when empty / unreadable)
  function fmtStamp(v) {
    if (v == null || v === '') return '';
    var d = new Date(v); if (isNaN(d)) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  // one export_boxes row -> the export sheet's cells, in MASTER_EXPORT_COLS order (numbers stay numbers, timestamps become local text)
  function masterExportCells(b) {
    return MASTER_EXPORT_COLS.map(function (c) {
      var v = b ? b[c] : null;
      if (c === 'geo_updated_at' || c === 'last_audit_at') return fmtStamp(v);
      if (MASTER_NUMERIC[c]) return v == null || v === '' || !isFinite(Number(v)) ? '' : Number(v);
      return v == null ? '' : String(v);
    });
  }
  function masterFileName(scope, ext, now) {
    var d = now instanceof Date ? now : new Date();
    var slug = String(scope || 'whole-qc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'whole-qc';
    return 'nap-master-' + slug + '-' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + '.' + ext;
  }
  // error rows of a preview / apply -> CSV text (row, stencil, reason codes, reason text)
  function masterErrorsCsv(results) {
    var rows = (results || []).filter(function (r) { return r && r.status === 'error'; }).map(function (r) {
      var rs = r.reasons || [];
      return [r.row, r.stencil, rs.map(function (x) { return x.code; }).join('; '), rs.map(function (x) { return x.text; }).join('; ')];
    });
    return toCsv(['row', 'stencil', 'reason', 'details'], rows, {});
  }

  // ---------- dispatch basket + plan (phase 4; server: nap.dispatch_plan, same caps) ----------
  // The basket is an ordered list of box ids (strings). Box details live outside it (info: id -> box row) so the basket itself can be
  // stored as ids only. A plan is an ordered list of {team, due, box_ids}; the dashboard sends it to nap.dispatch_plan as is.
  var BASKET_MAX = 2000, PLAN_MAX_TEAMS = 20;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function isUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }
  function uniq(list) { var seen = {}, out = []; (list || []).forEach(function (x) { if (x != null && x !== '' && !seen[x]) { seen[x] = true; out.push(x); } }); return out; }
  // Adds ids in order, skipping ones already there and stopping at cap. {ids (new array), added, dup, over}
  function basketAdd(ids, add, cap) {
    var max = cap == null ? BASKET_MAX : cap, cur = (ids || []).slice(), have = {}, added = 0, dup = 0, over = 0;
    cur.forEach(function (x) { have[x] = true; });
    (add || []).forEach(function (x) {
      if (x == null || x === '') return;
      if (have[x]) { dup++; return; }
      if (cur.length >= max) { over++; return; }
      have[x] = true; cur.push(x); added++;
    });
    return { ids: cur, added: added, dup: dup, over: over };
  }
  function basketRemove(ids, rm) { var gone = {}; (rm || []).forEach(function (x) { gone[x] = true; }); return (ids || []).filter(function (x) { return !gone[x]; }); }
  function brgyName(b) { return b ? (String(b.barangay == null ? '' : b.barangay).trim() || 'UNASSIGNED') : 'UNKNOWN'; }
  // [{barangay, n}] most NAPs first, then by name. An id without info counts as UNKNOWN (still loading, or not in the master).
  function basketGroups(ids, info) {
    var m = {};
    (ids || []).forEach(function (id) { var k = brgyName(info && info[id]); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(function (k) { return { barangay: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n || (a.barangay < b.barangay ? -1 : a.barangay > b.barangay ? 1 : 0); });
  }
  // sessionStorage text -> ids (uuids only, de-duplicated, capped); anything unreadable -> []
  function basketParse(text, cap) {
    var arr; try { arr = JSON.parse(text); } catch (e) { return []; }
    if (!Array.isArray(arr)) return [];
    return uniq(arr.filter(isUuid)).slice(0, cap == null ? BASKET_MAX : cap);
  }
  // Position of a point on a Hilbert curve (65,536 x 65,536 cells) laid over a square frame: points close on the curve are close on the
  // ground, so cutting the curve into contiguous pieces gives compact areas. The frame defaults to Quezon City; walkOrder fits it to the
  // boxes being split (a tighter frame = a finer curve over them). Outside the frame a point is clamped to the edge.
  var QC_FRAME = { lat0: 14.55, lng0: 120.95, size: 0.25 }, HN = 65536;
  function hilbertIndex(lat, lng, frame) {
    var f = frame || QC_FRAME, n = HN;
    function cell(v, a) { var c = Math.floor((v - a) / f.size * n); return c < 0 ? 0 : c >= n ? n - 1 : c; }
    var x = cell(lng, f.lng0), y = cell(lat, f.lat0), d = 0, s, rx, ry, t;
    for (s = n / 2; s >= 1; s = s / 2) {
      rx = (x & s) > 0 ? 1 : 0; ry = (y & s) > 0 ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (ry === 0) { if (rx === 1) { x = n - 1 - x; y = n - 1 - y; } t = x; x = y; y = t; }
    }
    return d;
  }
  // the smallest square frame around the points (a little margin), or the QC frame when there is nothing to fit
  function fitFrame(pts) {
    if (!pts.length) return QC_FRAME;
    var la0 = Infinity, la1 = -Infinity, ln0 = Infinity, ln1 = -Infinity;
    pts.forEach(function (p) { la0 = Math.min(la0, p[0]); la1 = Math.max(la1, p[0]); ln0 = Math.min(ln0, p[1]); ln1 = Math.max(ln1, p[1]); });
    var size = Math.max(la1 - la0, ln1 - ln0, 1e-6) * 1.001;
    return { lat0: la0, lng0: ln0, size: size };
  }
  function hasXY(b) { return b && b.lat != null && b.lng != null && b.lat !== '' && b.lng !== '' && isFinite(Number(b.lat)) && isFinite(Number(b.lng)); }
  function cmpStr(a, b) { a = String(a == null ? '' : a); b = String(b == null ? '' : b); return a < b ? -1 : a > b ? 1 : 0; }
  // Boxes in "walking order": barangay by barangay (barangays ordered by where their boxes are, along the same curve; barangays with no
  // coordinates at all last, by name), inside a barangay the boxes with coordinates along the curve, then the ones without coordinates
  // by street then stencil. Ties by stencil then id: the order never depends on the input order.
  function walkOrder(boxes) {
    var groups = {}, list = [], all = uniqBy(boxes);
    var frame = fitFrame(all.filter(hasXY).map(function (b) { return [Number(b.lat), Number(b.lng)]; }));
    all.forEach(function (b) { var k = brgyName(b); (groups[k] = groups[k] || []).push(b); });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k], xy = [], no = [], sx = 0, sy = 0;
      g.forEach(function (b) { if (hasXY(b)) { xy.push({ b: b, h: hilbertIndex(Number(b.lat), Number(b.lng), frame) }); sx += Number(b.lat); sy += Number(b.lng); } else no.push(b); });
      xy.sort(function (p, q) { return p.h - q.h || cmpStr(p.b.stencil, q.b.stencil) || cmpStr(p.b.box_id, q.b.box_id); });
      no.sort(function (p, q) { return cmpStr(p.street, q.street) || cmpStr(p.stencil, q.stencil) || cmpStr(p.box_id, q.box_id); });
      list.push({ name: k, key: xy.length ? hilbertIndex(sx / xy.length, sy / xy.length, frame) : null, boxes: xy.map(function (p) { return p.b; }).concat(no) });
    });
    list.sort(function (a, b) {
      if ((a.key == null) !== (b.key == null)) return a.key == null ? 1 : -1;
      return (a.key == null ? 0 : a.key - b.key) || cmpStr(a.name, b.name);
    });
    return [].concat.apply([], list.map(function (g) { return g.boxes; }));
  }
  function uniqBy(boxes) { var seen = {}; return (boxes || []).filter(function (b) { if (!b || b.box_id == null || seen[b.box_id]) return false; seen[b.box_id] = true; return true; }); }
  // Splits the boxes over the teams (in the order given): walking order, cut into contiguous pieces whose sizes differ by at most 1
  // (the first n % k teams get one more). Deterministic. -> [{team, box_ids}] (one entry per team, possibly empty).
  function splitEvenly(boxes, teams) {
    var tl = uniq((teams || []).map(function (t) { return t == null ? '' : String(t); }));
    if (!tl.length) return [];
    var order = walkOrder(boxes), n = order.length, k = tl.length, base = Math.floor(n / k), extra = n % k, at = 0;
    return tl.map(function (t, i) {
      var size = base + (i < extra ? 1 : 0), part = order.slice(at, at + size); at += size;
      return { team: t, box_ids: part.map(function (b) { return b.box_id; }) };
    });
  }
  // Moves ids to toTeam (appended in the given order; the team entry is added when missing). toTeam '' / null = unassign (remove only).
  function moveBoxes(plan, ids, toTeam) {
    var mv = uniq(ids), gone = {}; mv.forEach(function (x) { gone[x] = true; });
    var out = (plan || []).map(function (e) { var c = {}; for (var k in e) c[k] = e[k]; c.box_ids = (e.box_ids || []).filter(function (x) { return !gone[x]; }); return c; });
    if (toTeam) {
      var t = out.find(function (e) { return e.team === toTeam; });
      if (!t) { t = { team: toTeam, box_ids: [] }; out.push(t); }
      t.box_ids = t.box_ids.concat(mv);
    }
    return out;
  }
  // Per team: NAP count (excluded ones apart), barangays covered (most first). excluded: id -> reason (open item, inactive, unknown).
  // A box listed under two teams counts for the first only (the server rule: first assignment wins).
  function planSummary(plan, info, excluded) {
    var seen = {}, total = 0, out = (plan || []).map(function (e) {
      var ids = [], ex = 0, dup = 0;
      (e.box_ids || []).forEach(function (id) { if (seen[id]) { dup++; return; } seen[id] = true; if (excluded && excluded[id]) ex++; else ids.push(id); });
      total += ids.length;
      return { team: e.team, due: e.due || '', count: ids.length, excluded: ex, duplicate: dup, barangays: basketGroups(ids, info) };
    });
    return { teams: out, total: total };
  }
  // The nap.dispatch_plan payload: excluded and repeated ids dropped, teams without NAPs dropped, blank due = null.
  function planPayload(plan, excluded, o) {
    o = o || {};
    var seen = {}, as = [];
    (plan || []).forEach(function (e) {
      var ids = (e.box_ids || []).filter(function (id) { if (seen[id] || (excluded && excluded[id])) return false; seen[id] = true; return true; });
      if (ids.length && e.team) as.push({ team: e.team, due: e.due ? String(e.due) : null, box_ids: ids });
    });
    var p = { source: 'plan', assignments: as };
    if (o.note) p.note = String(o.note);
    return p;
  }

  // ---------- dashboard access (phase 5) ----------
  // What the NAP Dashboard shows for a nap.my_role() value. viewerFlag = nap.is_viewer(), asked only when the role is 'field' (a pilot
  // field team that is also a console user stays 'field' for the phone). The server is the real guard; this only decides the screens.
  //   superadmin / admin: every tab (Pilot included); dispatcher: every tab but Pilot; viewer: the Board only, read-only
  //   (no basket / checkboxes, no CSV export, no audit history / photos / account numbers in the NAP detail); anything else: no access
  //   ({ok: false, message: NO_ACCESS_MSG}).
  var DASH_TABS = ['board', 'audits', 'dispatch', 'master', 'pilot'];
  // Shown to a signed-in account that may not open the dashboard (phase 5: view-only access is the Access Control entry 'napboard',
  // granted by the superadmin to GC console users).
  var NO_ACCESS_MSG = 'You do not have access to NAP Board. Ask the superadmin to grant it in Access Control.';
  function dashAccess(role, viewerFlag) {
    var r = typeof role === 'string' ? role : 'none';
    var full = { ok: true, viewOnly: false, canExport: true, canBasket: true, canHistory: true, canTagAcct: true };
    if (r === 'superadmin' || r === 'admin') return Object.assign({ role: r, tabs: DASH_TABS.slice() }, full);
    if (r === 'dispatcher') return Object.assign({ role: r, tabs: DASH_TABS.filter(function (t) { return t !== 'pilot'; }) }, full);
    var ro = { viewOnly: true, canExport: false, canBasket: false, canHistory: false, canTagAcct: false };
    if (r === 'viewer' || (r === 'field' && viewerFlag === true)) return Object.assign({ ok: true, role: 'viewer', tabs: ['board'] }, ro);
    return Object.assign({ ok: false, role: r, tabs: [], message: NO_ACCESS_MSG }, ro);
  }

  return { STATUS: STATUS, PORT_STATUSES: PORT_STATUSES, DEFAULTS: DEFAULTS, isUsable: isUsable, isOccupied: isOccupied,
    BASKET_MAX: BASKET_MAX, PLAN_MAX_TEAMS: PLAN_MAX_TEAMS, isUuid: isUuid, basketAdd: basketAdd, basketRemove: basketRemove, basketGroups: basketGroups,
    basketParse: basketParse, hilbertIndex: hilbertIndex, walkOrder: walkOrder, splitEvenly: splitEvenly, moveBoxes: moveBoxes, planSummary: planSummary, planPayload: planPayload,
    MASTER_IMPORT_COLS: MASTER_IMPORT_COLS, MASTER_EXPORT_COLS: MASTER_EXPORT_COLS, MASTER_COMPUTED: MASTER_COMPUTED, MASTER_NUMERIC: MASTER_NUMERIC,
    MASTER_MAX_ROWS: MASTER_MAX_ROWS, MASTER_BATCH: MASTER_BATCH, MASTER_EXPORT_README: MASTER_EXPORT_README, headerKey: headerKey, masterColumn: masterColumn, isMasterStencil: isMasterStencil,
    stencilNps: stencilNps, masterCell: masterCell, findMasterHeader: findMasterHeader, parseMasterGrid: parseMasterGrid, parseMasterText: parseMasterText, splitBatches: splitBatches,
    csvCell: csvCell, toCsv: toCsv, fmtStamp: fmtStamp, masterExportCells: masterExportCells, masterFileName: masterFileName, masterErrorsCsv: masterErrorsCsv,
    parseStencil: parseStencil, boxStatus: boxStatus, haversineM: haversineM, nearest: nearest, validateAudit: validateAudit, gpsFlag: gpsFlag,
    normStencil: normStencil, parseDueDate: parseDueDate, parseDispatchRows: parseDispatchRows, parseDispatchText: parseDispatchText, geoDecision: geoDecision, within: within, parseLatLng: parseLatLng,
    boxTotal: boxTotal, jobNapQuery: jobNapQuery, matchJobBox: matchJobBox, DASH_TABS: DASH_TABS, NO_ACCESS_MSG: NO_ACCESS_MSG, dashAccess: dashAccess };
});
