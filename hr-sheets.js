// AHBA FieldOps — HR round-trip sheet: the column contract, build, parse and diff. UMD, no DOM/fetch/XLSX.
// It deals in arrays of arrays only; reading and writing real .xlsx files belongs to the console. It exists as
// its own file so the rule that decides what an upload may change is testable on its own.
// Spec: docs/superpowers/plans/2026-10-15-hr-allowance-deduction-roundtrip.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HrSheets = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SHEETS = {
    // The employee id is the key an upload matches on; emp no. is the cross-check a human reads.
    // AUTOMATIC is read-only because it is computed from two-person driver deployments: a blank MANUAL
    // beside it means "no manual amount", so the automatic stands. Writing a zero there because a cell
    // was left alone would stop ninety-eight real allowances at once.
    allowance: [
      { key: 'employee_id', label: 'ID', kind: 'id', editable: false },
      { key: 'emp_no', label: 'EMPLOYEE NO.', kind: 'text', editable: false },
      { key: 'display_name', label: 'NAME', kind: 'text', editable: false },
      { key: 'deployments', label: 'DEPLOYMENTS', kind: 'money', editable: false },
      { key: 'automatic', label: 'AUTOMATIC', kind: 'money', editable: false },
      { key: 'manual', label: 'MANUAL', kind: 'money', editable: true },
      { key: 'note', label: 'NOTE', kind: 'text', editable: true },
      { key: 'total', label: 'TOTAL', kind: 'money', editable: false }
    ],
    deduction: [
      { key: 'employee_id', label: 'ID', kind: 'id', editable: false },
      { key: 'emp_no', label: 'EMPLOYEE NO.', kind: 'text', editable: false },
      { key: 'display_name', label: 'NAME', kind: 'text', editable: false },
      { key: 'cash_advance', label: 'CASH ADVANCE', kind: 'money', editable: true },
      { key: 'company_loan', label: 'COMPANY LOAN', kind: 'money', editable: true },
      { key: 'others', label: 'OTHERS', kind: 'money', editable: true },
      { key: 'note', label: 'NOTE', kind: 'text', editable: true },
      { key: 'total', label: 'TOTAL', kind: 'money', editable: false }
    ]
  };

  // The first row of the sheet: a marker, the sheet kind, then key/value pairs. parse() looks for the marker
  // rather than for row 0, so a row inserted above the table does not hide it.
  var MARK = 'AHBA HR SHEET';
  var PROV_KEYS = ['period_id', 'period_start', 'period_end', 'exported_at', 'exported_by'];

  function cols(kind) {
    var c = SHEETS[kind];
    if (!c) throw new Error('unknown sheet kind: ' + kind);
    return c;
  }
  function blank(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }
  function str(v) { return blank(v) ? '' : String(v).trim(); }
  function cents(n) { return Math.round(n * 100); }

  // The value the tab's own view row holds for a sheet column.
  function currentValue(row, key) {
    if (key === 'employee_id') return row.employee && row.employee.id;
    if (key === 'emp_no' || key === 'display_name') return row.employee && row.employee[key];
    return row[key];
  }

  function build(kind, rows, meta) {
    var c = cols(kind), m = meta || {}, p = m.period || {};
    var aoa = [[MARK, kind,
      'period_id', p.id == null ? '' : p.id, 'period_start', p.period_start || '', 'period_end', p.period_end || '',
      'exported_at', m.exported_at || '', 'exported_by', m.exported_by || '']];
    aoa.push(c.map(function (x) { return x.label; }));
    (rows || []).forEach(function (r) {
      aoa.push(c.map(function (x) {
        var v = currentValue(r, x.key);
        return v === null || v === undefined ? '' : v;
      }));
    });
    var editableCols = [];
    c.forEach(function (x, i) { if (x.editable) editableCols.push(i); });
    return { aoa: aoa, editableCols: editableCols, provenance: { kind: kind, period_id: p.id == null ? null : p.id, period_start: p.period_start || null, period_end: p.period_end || null, exported_at: m.exported_at || null, exported_by: m.exported_by || null } };
  }

  // A money cell: empty is null (blank, which is NOT zero); a number is itself; "₱1,250.50" is 1250.5.
  // A comma is accepted only as a well-formed thousands separator (groups of three). "12,50" is a decimal comma
  // from another locale, and stripping it would read 12.50 as 1250 — a hundredfold payroll error — so it, and
  // "1.250,50", are reported as not-a-number instead of being reinterpreted.
  // Anything else is not a number, and the caller is told so — it must never fall through as 0.
  function money(v) {
    if (blank(v)) return { value: null };
    if (typeof v === 'number') return isFinite(v) ? { value: v } : { bad: true };
    var s = String(v).replace(/[\s₱]/g, '');
    if (s.indexOf(',') >= 0) {
      if (!/^[-+]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) return { bad: true };
      s = s.replace(/,/g, '');
    }
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return { bad: true };
    return { value: Number(s) };
  }

  function parse(kind, aoa) {
    var c = cols(kind), problems = [], rows = [], rowsIn = aoa || [];
    var prov = { kind: null, period_id: null, period_start: null, period_end: null, exported_at: null, exported_by: null };

    var markAt = -1;
    for (var i = 0; i < rowsIn.length && markAt < 0; i++) if (rowsIn[i] && str(rowsIn[i][0]) === MARK) markAt = i;
    if (markAt < 0) problems.push('The provenance row is missing, so this sheet cannot be tied to a period. Re-download the sheet.');
    else {
      var pr = rowsIn[markAt];
      prov.kind = str(pr[1]) || null;
      for (var k = 2; k + 1 < pr.length; k += 2) {
        var key = str(pr[k]);
        if (PROV_KEYS.indexOf(key) >= 0) prov[key] = str(pr[k + 1]) || null;
      }
      if (prov.kind !== kind) problems.push('This sheet is for "' + (prov.kind || 'unknown') + '", not "' + kind + '".');
    }

    // The header is found by its labels, wherever it sits. The ID column and every editable column are required:
    // without them there is nothing safe to read. A missing read-only column only means less to cross-check.
    var needed = c.filter(function (x) { return x.editable || x.key === 'employee_id'; });
    var headAt = -1, at = {};
    for (var r = 0; r < rowsIn.length && headAt < 0; r++) {
      var cells = (rowsIn[r] || []).map(function (v) { return str(v).toUpperCase(); });
      var found = {}, ok = true;
      c.forEach(function (x) { var ix = cells.indexOf(x.label); if (ix >= 0) found[x.key] = ix; });
      needed.forEach(function (x) { if (found[x.key] === undefined) ok = false; });
      if (ok) { headAt = r; at = found; }
    }
    if (headAt < 0) {
      problems.push('The header row was not found. Expected the columns: ' + needed.map(function (x) { return x.label; }).join(', ') + '.');
      return { rows: rows, provenance: prov, problems: problems };
    }

    var seen = Object.create(null);           // keyed by sheet-supplied ids: no inherited names like "constructor"
    for (var n = headAt + 1; n < rowsIn.length; n++) {
      var line = rowsIn[n] || [];
      if (!line.some(function (v) { return !blank(v); })) continue;           // an empty row is not a row
      var id = str(line[at.employee_id]);
      var empNo = at.emp_no === undefined ? '' : str(line[at.emp_no]);
      var who = 'Row ' + (n + 1) + (empNo ? ' (' + empNo + ')' : '');
      if (!id) { problems.push(who + ' has no ID, so it cannot be matched to an employee.'); continue; }
      if (seen[id]) { problems.push(who + ' repeats an employee that is already on row ' + seen[id] + '.'); continue; }
      seen[id] = n + 1;
      var values = {};
      c.forEach(function (x) {
        if (x.key === 'employee_id' || at[x.key] === undefined) return;
        var raw = line[at[x.key]];
        if (x.kind === 'money') {
          var mv = money(raw);
          if (mv.bad) {
            // A read-only cell is ignored on upload, so a bad one there is not worth refusing the sheet for.
            if (x.editable) problems.push(who + ': ' + x.label + ' "' + str(raw) + '" is not a number.');
            values[x.key] = x.editable ? null : str(raw);
          } else values[x.key] = mv.value;
        } else values[x.key] = blank(raw) ? null : String(raw).trim();
      });
      rows.push({ employee_id: id, emp_no: empNo, values: values });
    }
    return { rows: rows, provenance: prov, problems: problems };
  }

  function diff(kind, parsed, current) {
    var c = cols(kind), changes = [], ignored = 0, unknown = [], missing = [], problems = [];
    var byId = Object.create(null);
    (current || []).forEach(function (r) { var id = currentValue(r, 'employee_id'); if (id != null) byId[id] = r; });
    var sheetIds = Object.create(null);

    (parsed.rows || []).forEach(function (row) {
      sheetIds[row.employee_id] = true;
      var cur = byId[row.employee_id];
      if (!cur) { unknown.push(row.employee_id); return; }                       // never created, never written
      // EMPLOYEE NO. is the human cross-check. Sorting ONE column in Excel leaves the ids lined up with the wrong
      // people's numbers, and every edit would then write to the wrong employee while the sheet looks right.
      // So a number that disagrees with the one this id carries is a problem, and the row writes nothing.
      var curNo = str(currentValue(cur, 'emp_no'));
      if (row.emp_no && row.emp_no !== curNo) {
        problems.push('Row for ID ' + row.employee_id + ': the sheet says employee no. "' + row.emp_no + '" but that ID is "' + curNo + '". ' +
          'The ID and the number do not belong together (was one column sorted on its own?), so nothing from this row was applied.');
        return;
      }
      c.forEach(function (x) {
        if (x.key === 'employee_id' || !(x.key in row.values)) return;
        if (x.key === 'emp_no' && row.emp_no) return;                            // matched above; a mismatch never gets here
        var to = row.values[x.key], from = currentValue(cur, x.key);
        if (x.editable) {
          if (x.kind === 'money') {
            if (to === null) return;                                              // blank is "no value", never a zero
            // null and 0 are deliberately the same here: hr.compute_week reads the manual allowance as
            // coalesce(hr.round2(al.amount), 0) and ADDS it to the automatic one, so "no row" and "a row of 0"
            // change no money. (Suppressing an automatic allowance is the Register's ALLOWANCE cell, not this sheet.)
            if (cents(to) === cents(Number(from) || 0)) return;
            changes.push({ employee_id: row.employee_id, emp_no: row.emp_no, col: x.key, from: from == null ? null : from, to: to });
          } else {
            if (str(to) === str(from)) return;                                    // a blank note clears a note
            changes.push({ employee_id: row.employee_id, emp_no: row.emp_no, col: x.key, from: from == null ? '' : from, to: str(to) });
          }
        } else if (x.kind === 'money' && to !== null) {
          // read-only: never a write, but an edit is reported rather than silently dropped
          if (typeof to !== 'number' || cents(to) !== cents(Number(from) || 0)) ignored++;
        } else if (x.kind === 'text') {
          if (str(to) !== str(from)) ignored++;
        }
      });
    });

    Object.keys(byId).forEach(function (id) { if (!sheetIds[id]) missing.push(id); });
    return { changes: changes, ignored: ignored, unknown: unknown, missing: missing, problems: problems };
  }

  return { SHEETS: SHEETS, build: build, parse: parse, diff: diff };
});
