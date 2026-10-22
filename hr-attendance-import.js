// AHBA HR — biometric "Daily Attendance Details" import rules (LOCAL DEMO ONLY: pure, no DOM/fetch, nothing is written anywhere). UMD, shared by hr-demo.html and the node test.
// Source columns: Personnel ID · First Name · Last Name · Department Name · Record Date · Record Counts · Earliest Time · Latest Time · Punch Time ("hh:mm:ss;hh:mm:ss;…").
// Second-shift Time In is deliberately ignored: only the EARLIEST punch drives lateness and the LATEST is the time out.
// Company late rules (minutes after shift start): 0–10 grace · 11–20 → 0.5 h · 21–40 → 1 h · 41–60 → 2 h · >60 → half-day absent (4 h).
// Payroll cutoff = Friday through the following Thursday (HrCore.periodFor, week_start_dow 5).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./hr-core.js'));
  else root.HrAttendanceImport = factory(root.HrCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  var SHIFT_START = '08:00';   // owner-confirmed 2026-10-05: regular shift starts 08:00 (the upload step can still override it per file)
  var NOON = '12:00:00';       // a lone punch at/after noon is read as a missing Time In
  var MIN_SPAN_H = 4;          // two punches closer than this look like an accidental double tap

  // SheetJS may hand back a locale-formatted cell ("10/2/26", "7:30 AM"): normalise to ISO date / hh:mm:ss so sorting and cutoffs stay string-safe
  function normTime(t) {
    var m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*$/.exec(String(t == null ? '' : t)); if (!m) return String(t == null ? '' : t).trim();
    if (!validTime(t)) return String(t).trim();   // preserve malformed raw evidence through duplicate-row merging
    var h = +m[1]; if (m[4]) h = h % 12 + (/p/i.test(m[4]) ? 12 : 0);
    return ('0' + h).slice(-2) + ':' + m[2] + ':' + ('0' + (m[3] || '00')).slice(-2);
  }
  function normDate(v) {
    var s = String(v == null ? '' : v).trim(), m;
    if ((m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s))) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);   // US order, as SheetJS formats
    return s.slice(0, 10);
  }
  function secs(t) { var p = String(t).split(':'); return (+p[0] || 0) * 3600 + (+p[1] || 0) * 60 + (+p[2] || 0); }
  function validTime(t) {
    var m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*$/.exec(String(t == null ? '' : t));
    return !!m && +m[2] < 60 && +(m[3] || 0) < 60 && (m[4] ? +m[1] >= 1 && +m[1] <= 12 : +m[1] <= 23);
  }
  // whole minutes after shift start, truncated toward zero: 08:10:59 is still 10 (grace), 08:11:00 is 11
  function lateMinutes(timeIn, shiftStart) { return Math.trunc((secs(timeIn) - secs(shiftStart || SHIFT_START)) / 60); }
  function lateRule(m) {
    if (m <= 10) return { band: 'grace', deduct_hours: 0, half_day_absent: false };
    if (m <= 20) return { band: '11-20', deduct_hours: 0.5, half_day_absent: false };
    if (m <= 40) return { band: '21-40', deduct_hours: 1, half_day_absent: false };
    if (m <= 60) return { band: '41-60', deduct_hours: 2, half_day_absent: false };
    return { band: 'half_day', deduct_hours: 4, half_day_absent: true };
  }
  function cutoffFor(date) { return C.periodFor(date, 5); }

  function analyzeRow(r, opts) {
    var shift = (opts && opts.shift_start) || SHIFT_START;
    var rawPunches = String(r['Punch Time'] == null ? '' : r['Punch Time']).split(';').filter(function (s) { return String(s).trim(); });
    var punches = rawPunches.map(function (s) { return normTime(s); }).sort();
    var count = Number(r['Record Counts']);
    var first = normTime(r['Earliest Time'] || punches[0] || ''), last = normTime(r['Latest Time'] || punches[punches.length - 1] || '');
    var flags = [], timeIn = first || null, timeOut = last || null;
    var invalid = rawPunches.some(function (s) { return !validTime(s); }) || !!first && !validTime(r['Earliest Time'] || first) || !!last && !validTime(r['Latest Time'] || last);
    if (invalid) flags.push('invalid_time');
    if (!punches.length) { flags.push('no_punches'); timeIn = timeOut = null; }
    else if (punches.length === 1) {
      if (first >= NOON) { flags.push('missing_time_in'); timeIn = null; timeOut = first; }
      else { flags.push('missing_time_out'); timeIn = first; timeOut = null; }
    } else {
      if (punches.length >= 3) flags.push('extra_punches');
      if ((secs(last) - secs(first)) / 3600 < MIN_SPAN_H) flags.push('short_span');
    }
    if (punches.length && count !== punches.length) flags.push('count_mismatch');
    // owner 2026-10-05 (demo): one punch = PRESENT evidence with an incomplete punch — pending HR validation, never an automatic confirmed full day, never silently absent
    var punchStatus = invalid ? 'invalid' : !punches.length ? 'none' : punches.length === 1 ? 'incomplete' : 'complete';
    var m = timeIn && !invalid ? lateMinutes(timeIn, shift) : null, rule = m == null ? { band: null, deduct_hours: 0, half_day_absent: false } : lateRule(m);
    var pid = String(r['Personnel ID'] == null ? '' : r['Personnel ID']).trim();
    return { personnel_id: pid, name: (String(r['First Name'] || '').trim() + ' ' + String(r['Last Name'] || '').trim()).trim(), first_name: r['First Name'], last_name: r['Last Name'],
      department: r['Department Name'] || null, date: normDate(r['Record Date']), record_counts: count, punches: punches, time_in: timeIn, time_out: timeOut,
      late_minutes: m, late_band: rule.band, deduct_hours: rule.deduct_hours, half_day_absent: rule.half_day_absent, flags: flags,
      punch_status: punchStatus, incomplete_punch: punches.length === 1 };   // one punch = evidence of presence, NOT a confirmed day: HR must decide it (owner 2026-10-05)
  }

  // sheet rows (array of arrays: title row(s), then the header row, then data) → objects keyed by the canonical header.
  // The header is found in the first 20 rows by a cell reading "Personnel ID" (trimmed, any case); header cells are trimmed and re-cased to the
  // canonical ZKTeco names. Any "Time In Second Shift"-style column is DROPPED (owner: ignore the second shift for now) — only Punch Time drives in/out.
  var CANON = ['Personnel ID', 'First Name', 'Last Name', 'Department Name', 'Record Date', 'Record Counts', 'Earliest Time', 'Latest Time', 'Punch Time'];
  function canon(k) { var t = String(k == null ? '' : k).replace(/\s+/g, ' ').trim(), lc = t.toLowerCase(); for (var i = 0; i < CANON.length; i++) if (CANON[i].toLowerCase() === lc) return CANON[i]; return t; }
  function isSecondShift(k) { return /second\s*shift/i.test(String(k || '')); }
  function rowsFromAoa(aoa) {
    var h = -1, col = -1, i, j;
    for (i = 0; i < Math.min(aoa.length, 20) && h < 0; i++) for (j = 0; aoa[i] && j < aoa[i].length; j++) if (canon(aoa[i][j]) === 'Personnel ID') { h = i; col = j; break; }
    if (h < 0) throw new Error('This is not a ZKTeco "Daily Attendance Details" export: no "Personnel ID" header row in the first 20 rows');
    var hdr = aoa[h].map(canon);
    ['Record Date', 'Punch Time'].forEach(function (k) { if (hdr.indexOf(k) < 0) throw new Error('column "' + k + '" missing from the attendance export'); });
    return aoa.slice(h + 1).filter(function (r) { return r && r[col] != null && String(r[col]).trim() !== ''; }).map(function (r) {
      var o = {}; hdr.forEach(function (k, j) { if (k && !isSecondShift(k)) o[k] = r[j] == null ? '' : String(r[j]); }); return o;
    });
  }

  // match order (first hit wins): the employee's stored biometric_id (HR mapped it once) → numeric Personnel ID = numeric emp_no → name
  // (HrCore.matchNameDetailed: exact / loose / fuzzy — a fuzzy hit is flagged for HR). Returns { employee, how }.
  function matchEmployee(a, employees) {
    var i, pid = a.personnel_id;
    for (i = 0; i < employees.length; i++) if (employees[i].biometric_id != null && String(employees[i].biometric_id).trim() === pid) return { employee: employees[i], how: 'biometric_id' };
    var n = /^\d+$/.test(pid) ? Number(pid) : null, claimed = function (e) { return e.biometric_id != null && String(e.biometric_id).trim() !== '' && String(e.biometric_id).trim() !== pid; };
    if (n != null) for (i = 0; i < employees.length; i++) { if (!claimed(employees[i]) && /^\d+$/.test(String(employees[i].emp_no || '').trim()) && Number(employees[i].emp_no) === n) return { employee: employees[i], how: 'emp_no' }; }
    var m = C.matchNameDetailed(a.name, employees.filter(function (e) { return !claimed(e); }));
    return { employee: m.employee, how: m.pass };
  }

  var PUNCH_STATUS_TEXT = { incomplete: 'Present — pending HR validation (incomplete punch)', validated: 'Present — HR validated' };
  // Dispatch Confirmation (biometric stays the attendance truth; dispatch only annotates it — it can never add or remove a day)
  var DISPATCH_TEXT = { confirmed: 'Confirmed deployed', biometric_only: 'Biometric only / not dispatch-confirmed', unavailable: 'Dispatch data unavailable' };

  // HR-facing words for every flag (the review step and the DTR tooltip use these)
  var FLAG_TEXT = { no_punches: 'no punches recorded', missing_time_in: 'only an afternoon punch — time in missing', missing_time_out: 'only a morning punch — time out missing',
    extra_punches: '3 or more punches (second-shift / repeat taps)', short_span: 'in and out less than 4 h apart', count_mismatch: 'Record Counts disagrees with the punch list',
    duplicate_row: 'two rows for the same person and date (merged)', fuzzy_name: 'matched by a similar name — confirm the person', unmatched_employee: 'not matched to an employee',
    not_in_biometric: 'manual day with no punch in the biometric file', invalid_time: 'invalid clock value — HR must correct the attendance evidence' };

  // rows with a real Personnel ID only (a "Total" footer or a note line has letters / blanks); same person + same date twice → one row, punches unioned, flagged
  function mergeDuplicates(rows) {
    var by = {}, out = [];
    rows.forEach(function (r) {
      var pid = String(r['Personnel ID'] == null ? '' : r['Personnel ID']).trim(); if (!/^[0-9A-Za-z-]*\d[0-9A-Za-z-]*$/.test(pid) || /^total$/i.test(pid)) return;
      var k = pid + '|' + normDate(r['Record Date']), cur = by[k];
      if (!cur) { by[k] = cur = Object.assign({}, r); out.push(cur); return; }
      var p = (String(cur['Punch Time'] || '') + ';' + String(r['Punch Time'] || '')).split(';').map(normTime).filter(Boolean);
      p = p.filter(function (x, i) { return p.indexOf(x) === i; }).sort();
      cur['Punch Time'] = p.join(';'); cur['Record Counts'] = String(p.length); cur['Earliest Time'] = p[0] || ''; cur['Latest Time'] = p[p.length - 1] || ''; cur._dup = true;
    });
    return out;
  }

  function analyze(rows, employees, opts) {
    employees = employees || [];
    var out = mergeDuplicates(rows).map(function (r) {
      var a = analyzeRow(r, opts), m = matchEmployee(a, employees), e = m.employee;
      if (r._dup) a.flags.push('duplicate_row');
      a.employee_id = e ? e.id : null; a.employee_name = e ? e.display_name : null; a.match = e ? m.how : null;
      if (!e) a.flags.push('unmatched_employee'); else if (m.how === 'fuzzy') a.flags.push('fuzzy_name');
      return a;
    });
    var byCut = {}, order = [];
    out.forEach(function (a) {
      var c = cutoffFor(a.date), k = c.period_start;
      if (!byCut[k]) { byCut[k] = { period_start: c.period_start, period_end: c.period_end, people: {} }; order.push(k); }
      var p = byCut[k].people[a.personnel_id] || (byCut[k].people[a.personnel_id] = { personnel_id: a.personnel_id, name: a.name, employee_id: a.employee_id, days: 0, late_days: 0, late_deduct_hours: 0, half_day_absences: 0, flagged_days: 0 });
      p.days++; p.late_deduct_hours += a.deduct_hours; if (a.deduct_hours > 0) p.late_days++; if (a.half_day_absent) p.half_day_absences++; if (a.flags.length) p.flagged_days++;
    });
    order.sort();
    return {
      rows: out,
      cutoffs: order.map(function (k) { var c = byCut[k]; c.people = Object.keys(c.people).map(function (id) { return c.people[id]; }).sort(function (x, y) { return x.name < y.name ? -1 : x.name > y.name ? 1 : 0; }); return c; }),
      summary: { rows: out.length, people: Object.keys(out.reduce(function (s, a) { s[a.personnel_id] = 1; return s; }, {})).length,
        flagged: out.filter(function (a) { return a.flags.length; }).length, late: out.filter(function (a) { return a.deduct_hours > 0; }).length,
        half_day_absent: out.filter(function (a) { return a.half_day_absent; }).length, unmatched: out.filter(function (a) { return !a.employee_id; }).length }
    };
  }

  return { FLAG_TEXT: FLAG_TEXT, PUNCH_STATUS_TEXT: PUNCH_STATUS_TEXT, DISPATCH_TEXT: DISPATCH_TEXT, CANON: CANON, SHIFT_START: SHIFT_START, normTime: normTime, normDate: normDate, lateMinutes: lateMinutes, lateRule: lateRule, cutoffFor: cutoffFor, analyzeRow: analyzeRow, rowsFromAoa: rowsFromAoa, analyze: analyze };
});
