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
    ],
    // The payroll Register. Addressed by LINE id, not by employee: hr.set_line takes a line.
    // RATE ON FILE is the stored daily_rate and is editable; RATE PAID is the effective rate after the
    // minimum-wage floor and is NOT, because the Register's screen shows the effective figure and a sheet
    // that offered it for editing would write the floor back as everybody's real rate on any round trip
    // where nobody touched it.
    // Editable = exactly the columns hr.set_line will write, plus the rate, which goes to hr.set_line_rate.
    register: [
      { key: 'employee_id', label: 'ID', kind: 'id', editable: false },
      { key: 'line_id', label: 'LINE', kind: 'id', editable: false },
      { key: 'emp_no', label: 'EMPLOYEE NO.', kind: 'text', editable: false },
      { key: 'display_name', label: 'NAME', kind: 'text', editable: false },
      { key: 'position', label: 'POSITION', kind: 'text', editable: false },
      { key: 'rate_on_file', label: 'RATE ON FILE', kind: 'money', editable: true },
      { key: 'rate_paid', label: 'RATE PAID', kind: 'money', editable: false },
      { key: 'days', label: 'NO. OF DAYS', kind: 'money', editable: false },
      { key: 'basic', label: 'BASIC PAY', kind: 'money', editable: false },
      { key: 'rdot', label: 'R.DOT', kind: 'money', editable: false },
      { key: 'lh_pay', label: 'L.H (PAY)', kind: 'money', editable: false },
      { key: 'sh_pay', label: 'S.H (PAY)', kind: 'money', editable: false },
      { key: 'allowance', label: 'ALLOWANCE', kind: 'money', editable: true },
      { key: 'adjustment', label: 'ADJUSTMENT', kind: 'money', editable: true },
      { key: 'gross', label: 'GROSS PAY', kind: 'money', editable: false },
      { key: 'attendance_deduction', label: 'LATE / ABSENCE', kind: 'money', editable: false },
      { key: 'sss', label: 'SSS', kind: 'money', editable: true },
      { key: 'phic', label: 'PHILHEALTH', kind: 'money', editable: true },
      { key: 'hdmf', label: 'PAGIBIG', kind: 'money', editable: true },
      // The three loan columns are read-only on purpose: they come from Employees → Loans and the Deductions tab, never from
      // this sheet. They are HERE so that TOTAL and NET can be real Excel formulas — with four of the ten deduction
      // components and GROSS PAY missing from the sheet, neither figure could be reconciled from anything on the page, and
      // both stayed frozen at their pre-edit values while the file was edited offline.
      { key: 'cash_advance', label: 'CASH ADVANCE', kind: 'money', editable: false },
      { key: 'gov_loan', label: 'SSS/PAGIBIG LOAN', kind: 'money', editable: false },
      { key: 'company_loan', label: 'COMPANY LOAN', kind: 'money', editable: false },
      { key: 'partial_payroll', label: 'PARTIAL PAYROLL', kind: 'money', editable: true },
      { key: 'others', label: 'OTHERS', kind: 'money', editable: true },
      { key: 'total', label: 'TOTAL', kind: 'money', editable: false },
      { key: 'net', label: 'NET AMOUNT', kind: 'money', editable: false },
      { key: 'remarks', label: 'REMARKS', kind: 'text', editable: true }
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
  // The Allowances and Deductions rows nest the person under `employee`; the Register's rows are flat.
  function currentValue(row, key) {
    if (row.employee) {
      if (key === 'employee_id') return row.employee.id;
      if (key === 'emp_no' || key === 'display_name') return row.employee[key];
    }
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
    // Every id column is required: the Register's LINE is what hr.set_line is addressed by.
    var needed = c.filter(function (x) { return x.editable || x.kind === 'id'; });
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
        if (x.kind === 'id' || at[x.key] === undefined) return;
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
      var parsedRow = { employee_id: id, emp_no: empNo, values: values };
      c.forEach(function (x) { if (x.kind === 'id' && x.key !== 'employee_id') parsedRow[x.key] = str(line[at[x.key]]); });
      rows.push(parsedRow);
    }
    return { rows: rows, provenance: prov, problems: problems };
  }

  function diff(kind, parsed, current) {
    var c = cols(kind), changes = [], ignored = 0, blanked = 0, unknown = [], missing = [], problems = [];
    var byId = Object.create(null);
    (current || []).forEach(function (r) { var id = currentValue(r, 'employee_id'); if (id != null) byId[id] = r; });
    var sheetIds = Object.create(null);

    // One mechanism for every id cross-check: name the ID (and the employee, when the sheet's own number can be trusted)
    // and both values. The caller then skips the row, so nothing from it is applied.
    function crossCheck(row, who, label, noun, sheetVal, curVal) {
      problems.push('Row for ID ' + row.employee_id + (who ? ' (' + who + ')' : '') + ': the sheet says ' + label + ' "' + sheetVal +
        '" but that ID is "' + curVal + '". The ID and the ' + noun + ' do not belong together (was one column sorted on its own?), ' +
        'so nothing from this row was applied.');
    }

    (parsed.rows || []).forEach(function (row) {
      sheetIds[row.employee_id] = true;
      var cur = byId[row.employee_id];
      if (!cur) { unknown.push(row.employee_id); return; }                       // never created, never written
      // EMPLOYEE NO. and LINE are the cross-checks. Sorting ONE column in Excel leaves the ids lined up with the wrong
      // people's numbers or lines, and every edit would then land on the wrong employee while the sheet looks right.
      // So a value that disagrees with the one this id carries is a problem, and the row writes nothing.
      var curNo = str(currentValue(cur, 'emp_no'));
      if (row.emp_no && row.emp_no !== curNo) { crossCheck(row, '', 'employee no.', 'number', row.emp_no, curNo); return; }
      // LINE exists only on the Register: a parsed row of the other sheets carries no line_id and is not checked.
      // The test is equality, not presence: a blank LINE beside an employee who HAS a line is an erased cell and
      // is refused. Blank on both sides is an employee with no payroll line this period: not a mismatch, but
      // nothing can be written to them either, which is reported below if the row carries edits.
      var hasLine = row.line_id !== undefined;
      var curLine = hasLine ? str(currentValue(cur, 'line_id')) : '';
      if (hasLine && row.line_id !== curLine) { crossCheck(row, row.emp_no || curNo, 'line', 'line', row.line_id, curLine); return; }
      var firstChange = changes.length;
      c.forEach(function (x) {
        if (x.key === 'employee_id' || !(x.key in row.values)) return;
        if (x.key === 'emp_no' && row.emp_no) return;                            // matched above; a mismatch never gets here
        var to = row.values[x.key], from = currentValue(cur, x.key);
        if (x.editable) {
          if (x.kind === 'money') {
            if (to === null) {                                                    // blank is "no value", never a zero
              // On the REGISTER that collides with the screen, where blanking the same cell means the opposite: an erased
              // ALLOWANCE calls hr.restore_automatic_allowance and any other erased override writes a manual zero. A sheet
              // can do neither — hr.set_line has no "clear" — and the file itself carries no cue, since the download's blank
              // highlight is painted before the person erases anything. So an erased cell is COUNTED, never dropped in silence.
              // Only where there is a figure to erase: a roster member awaiting Compute exports an all-blank row (no LINE,
              // nothing computed), and that blankness is right. (Unchanged for Allowances / Deductions, where a blank
              // MANUAL really does mean "no manual amount" and the automatic figure stands.)
              if (kind === 'register' && !blank(from)) blanked++;
              return;
            }
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
      if (hasLine && !curLine && changes.length > firstChange) {
        changes.length = firstChange;
        problems.push('Row for ID ' + row.employee_id + ' (' + (row.emp_no || curNo) + ') has no payroll line this period, so there is nothing ' +
          'to write its edits to. Nothing from this row was applied.');
      }
    });

    Object.keys(byId).forEach(function (id) { if (!sheetIds[id]) missing.push(id); });
    return { changes: changes, ignored: ignored, blanked: blanked, unknown: unknown, missing: missing, problems: problems };
  }

  return { SHEETS: SHEETS, build: build, parse: parse, diff: diff };
});
