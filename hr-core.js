// AHBA FieldOps — HR attendance & payroll pure rules. UMD, no DOM/fetch.
// Shared by hr-sim.js (in-memory backend), console-hr.js (UI) and the node tests.
// hr-02-functions.sql encodes the SAME rules; change both together. Spec: docs/superpowers/specs/2026-09-19-hr-attendance-payroll-design.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HrCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function round2(n) { n = Number(n) || 0; return Math.round((Math.abs(n) + 1e-9) * 100) / 100 * Math.sign(n || 1); }
  var HOURS_PER_DAY = 8;

  var DEFAULT_SETTINGS = {
    week_start_dow: 5, hours_per_day: 8,
    mult_rd_ot: 1.30, mult_lh_worked: 2.00, mult_lh_unworked: 1.00, mult_sh_worked: 1.30,
    contribution_basis: 'prev_month_basic', new_hire_basis_days: 26,
    unworked_lh_requires_prev_day: true /* owner 2026-09-22: unworked legal holiday only when present the day before */, team_prefix: 'AHBA_',
    // owner 2026-09-22: rates / amounts are visible only to these console roles (dashboard_users.role_label, case-insensitive) or usernames — plus is_super always
    rate_viewer_roles: ['HR Manager', 'Admin Head', 'Superadmin', 'President', 'CEO'], rate_viewer_users: ['AHBA_ADMINHEAD', 'AHBA_ADMIN'],   // owner 2026-09-22/23: these console logins may see rates (AHBA_HR01 and AHBA_ADMIN01 deliberately not)
    // owner 2026-10-13: seeing an amount and deciding it are different rights — the President and the Admin Head read
    // payroll, the HR Manager maintains it. is_super passes on its own. SQL: hr.can_edit_rates() / assert_rates_edit()
    rate_editor_roles: ['HR Manager'], rate_editor_users: [],
    lock_requires_verified: false,   // Amendment 1: when true, lock_period refuses while any log in range has no validator ✓ (verified_at null)
    min_daily_rate: 755,             // Owner 2026-10-05 (LOCAL DEMO): minimum daily rate — a rate below it is PAID at it (effective rate); the stored rate is untouched, a higher rate is never reduced; 0 = off
    driver_daily_allowance: 100,     // ₱ per qualifying actual two-person outgoing deployment; labelled legacy/manual daily compatibility remains separate
    phic_round_to: 1000,             // Amendment 3: PhilHealth salary basis = monthly basic rounded (half-up) to the nearest ₱ multiple BEFORE the floor / ceiling clamp; 0 = no rounding (SQL: hr.settings.phic_round_to)
    payroll_groups: ['AHBA', 'FERROTECH'],   // Amendment 4: labels of hr.employees.payroll_group (Settings: comma list). Only the computed_group is attendance-built / computed; other groups exist for the Mandatory summary (manual monthly basis)
    computed_group: 'AHBA',          // Amendment 4: the one payroll_group whose employees enter the builder pool, DTR, Validate, Allowance, Deductions and the Register (SQL: hr.settings.computed_group)
    hdmf_mode: 'flat',               // Owner practice: Pag-IBIG is a FLAT ₱200 EE + ₱200 ER for everyone regardless of basis ('flat', default) — not the 2% table ('table', SSS-style ceiling 10,000 / 1% below 1,500). Per-employee overrides still apply on top either way. SQL: hr.settings.hdmf_mode
    hdmf_flat_amount: 200,           // ₱ EE = ₱ ER when hdmf_mode = 'flat'. SQL: hr.settings.hdmf_flat_amount
    deduction_calendar: { sss: [4], phic: [2], hdmf: [2], gov_loan: [1, 3], weekly: ['cash_advance', 'company_loan'] }
  };
  // SSS Jan-2025 schedule: MSC 5,000..35,000 step 500; EE 5%, ER 10%, EC 10 (MSC ≤ 14,500) else 30. Basis < 5,250 → 5,000; ≥ 34,750 → 35,000.
  var SSS_2025 = { effective_from: '2025-01-01', msc_min: 5000, msc_max: 35000, step: 500, ee_rate: 0.05, er_rate: 0.10, ec_low: 10, ec_high: 30, ec_threshold: 14500 };
  var PHIC_2025 = { effective_from: '2025-01-01', rate: 0.05, floor: 10000, ceiling: 100000 };
  var HDMF_2024 = { effective_from: '2024-02-01', ee_rate: 0.02, ee_rate_low: 0.01, low_threshold: 1500, er_rate: 0.02, ceiling: 10000 };
  var DEDUCTION_KINDS = ['sss', 'phic', 'hdmf', 'sss_loan', 'hdmf_loan', 'cash_advance', 'company_loan', 'partial_payroll', 'others'];
  var LINE_MANUAL_FIELDS = ['allowance', 'adjustment', 'sss', 'phic', 'hdmf', 'partial_payroll', 'others', 'remarks'];   // loan columns are NOT hand-editable: loans live under Employees → Loans so payslip and ledger never diverge

  // Shared by the staged compute and all live log-based allowance displays.
  function driverUnitsForLog(l) {
    l = l || {}; function number(x) { return Number(x) || 0; }
    if (number(l.hours_reg) + number(l.hours_rd) + number(l.hours_lh) + number(l.hours_sh) <= 0) return { actual: 0, legacy: 0, units: 0 };
    var ev = l.evidence || {}, override = ev.driver_override, d = ev.driver_decision;
    if (override && typeof override.value === 'boolean') return { actual: 0, legacy: override.value ? 1 : 0, units: override.value ? 1 : 0 };
    // A historical manually recorded driver flag had once-day semantics before source reconciliation.
    // Preserve that inherited intent explicitly; never extend it to unmarked manual presence.
    if (l.source === 'manual' && ev.legacy_driver_flag && ev.legacy_driver_flag.source === 'historical_manual_log' && ev.legacy_driver_flag.value === true) return { actual: 0, legacy: 1, units: 1 };
    // R8: ambiguous pre-upgrade intent earns nothing until HR decides — the flag IS the review, not a payment (SQL: hr.driver_units_for_log)
    if (ev.driver_legacy_intent_review && !override) return { actual: 0, legacy: 0, units: 0 };
    if (d) return { actual: number(d.driver_deployments), legacy: number(d.legacy_driver_days), units: number(d.driver_units) };
    return { actual: 0, legacy: l.is_driver ? 1 : 0, units: l.is_driver ? 1 : 0 };
  }

  // ---- names ----
  function normName(raw) {
    // apostrophes are dropped (O'brien = Obrien); every other punctuation mark becomes a space;
    // standalone generational suffixes (jr/sr/ii/iii/iv) are stripped so "Ramil Bautista Jr" matches "Bautista, Ramil" ("junior" untouched)
    return String(raw == null ? '' : raw).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ')
      .replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function nameKeys(e) {
    var keys = [];
    (e.aliases || []).forEach(function (a) { keys.push(normName(a)); });
    if (e.display_name) keys.push(normName(e.display_name));
    if (e.first_name && e.last_name) { keys.push(normName(e.first_name + ' ' + e.last_name)); keys.push(normName(e.last_name + ' ' + e.first_name)); }
    return keys.filter(Boolean);
  }
  // HrCore.levenshtein: classic edit distance (insert / delete / substitute, each cost 1) — SQL: extensions.levenshtein (fuzzystrmatch)
  function levenshtein(a, b) {
    a = String(a == null ? '' : a); b = String(b == null ? '' : b);
    if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
    var prev = [], cur = [], i, j, t;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }
  // fuzzy budget: 1 edit when the shorter of the two strings is under 10 chars, else 2 (SQL hr.match_name mirrors this case expression)
  function fuzzyMaxD(a, b) { return Math.min(a.length, b.length) < 10 ? 1 : 2; }
  var NO_MATCH = { employee: null, pass: null, distance: null, matched_key: null };
  // HrCore.matchNameDetailed → { employee, pass: 'exact' | 'loose' | 'fuzzy' | null, distance, matched_key }. Three passes, each only when the
  // previous found nothing (SQL hr.match_name(raw, on_day) OUT emp_id / pass / matched_key — same rules, same order):
  //   1. exact: normName(raw) equals one of the employee's nameKeys (aliases, display_name, "first last", "last first") — first employee in order
  //   2. loose: looseKey(normName(raw)) equals looseKey("first last") of exactly ONE employee (middle names / initials dropped or added)
  //   3. fuzzy: Levenshtein between BOTH normName(raw) and its looseKey and every candidate key (nameKeys + looseKey("first last"));
  //      per employee take the smallest distance d; accept only when 0 < d ≤ fuzzyMaxD (1 if the shorter string has < 10 chars, else 2)
  //      AND that employee is strictly closer than every other employee (a tie at the best distance → no match). A single-token raw never
  //      reaches this pass (looseKey '' rule) and a bare surname is never a candidate key, so a last name alone can never fuzzy-match.
  //      The builder flags a fuzzy hit as daily_logs.flag = 'fuzzy_name' (evidence.matched_as = raw spelling) for the validator to confirm.
  function matchNameDetailed(raw, employees) {
    var k = normName(raw); if (!k) return NO_MATCH;
    var i, j, e;
    // Owner 2026-10-12: TWO employees can carry the same name (or share an alias). Picking the first was a silent guess that credited one
    // person's attendance — and, in the driver candidate, one person's allowance — to another. An exact tie is AMBIGUOUS: nobody is chosen,
    // the spelling goes to Unmatched and HR decides. An HR resolution recorded on unmatched_names still wins, because that is not a guess.
    var hits = [];
    for (i = 0; i < employees.length; i++) { if (nameKeys(employees[i]).indexOf(k) >= 0) hits.push(employees[i]); }
    if (hits.length > 1) return { employee: null, pass: 'ambiguous', distance: 0, matched_key: k, candidates: hits.map(function (x) { return x.id; }) };
    if (hits.length === 1) return { employee: hits[0], pass: 'exact', distance: 0, matched_key: k };
    // second pass: middle-name-tolerant — first token + last token of "first last", unique candidate only
    var lk = looseKey(k); if (!lk) return NO_MATCH;
    var candidates = [];
    for (j = 0; j < employees.length; j++) {
      e = employees[j];
      if (e.first_name && e.last_name && looseKey(normName(e.first_name + ' ' + e.last_name)) === lk) candidates.push(e);
    }
    if (candidates.length === 1) return { employee: candidates[0], pass: 'loose', distance: 0, matched_key: lk };
    // third pass: typo-tolerant — unique best Levenshtein within budget (see the rule above)
    var variants = lk === k ? [k] : [k, lk], best = null, tie = false;
    for (j = 0; j < employees.length; j++) {
      e = employees[j];
      var keys = nameKeys(e), fl = e.first_name && e.last_name ? looseKey(normName(e.first_name + ' ' + e.last_name)) : '';
      if (fl && keys.indexOf(fl) < 0) keys.push(fl);
      var eb = null;   // this employee's closest key: { d, key, ok } — ok = within budget
      for (i = 0; i < keys.length; i++) {
        for (var v = 0; v < variants.length; v++) {
          var d = levenshtein(variants[v], keys[i]), ok = d > 0 && d <= fuzzyMaxD(variants[v], keys[i]);
          if (!eb || d < eb.d || (d === eb.d && ok && !eb.ok)) eb = { d: d, key: keys[i], ok: ok };
        }
      }
      if (!eb) continue;
      if (!best || eb.d < best.d) { best = { d: eb.d, key: eb.key, ok: eb.ok, employee: e }; tie = false; }
      else if (eb.d === best.d) tie = true;
    }
    if (best && best.ok && !tie) return { employee: best.employee, pass: 'fuzzy', distance: best.d, matched_key: best.key };
    return NO_MATCH;
  }
  function matchName(raw, employees) { return matchNameDetailed(raw, employees).employee; }
  // HrCore.looseKey: first token + ' ' + last token of an already-normalised name; single-token input (no middle/last
  // separation possible) returns '' so a bare first or last name never loose-matches.
  function looseKey(norm) {
    var parts = String(norm || '').split(' ').filter(Boolean);
    if (parts.length < 2) return '';
    return parts[0] + ' ' + parts[parts.length - 1];
  }

  // ---- dates ----
  function d(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function iso(dt) { return dt.toISOString().slice(0, 10); }
  function addDays(s, n) { var x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); }
  function periodFor(dateStr, weekStartDow) {
    var wsd = weekStartDow == null ? DEFAULT_SETTINGS.week_start_dow : weekStartDow;
    var back = (d(dateStr).getUTCDay() - wsd + 7) % 7;
    var start = addDays(dateStr, -back);
    return { period_start: start, period_end: addDays(start, 6) };
  }
  function weekOfMonth(periodEnd) { return Math.ceil(d(periodEnd).getUTCDate() / 7); }
  function contributionMonth(payDate) { var x = d(payDate); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() - 1); return iso(x).slice(0, 7); }
  function datesBetween(a, b) { var out = []; for (var s = a; s <= b; s = addDays(s, 1)) out.push(s); return out; }
  function classifyDay(dateStr, holidays) {
    for (var i = 0; i < (holidays || []).length; i++) { var h = holidays[i]; if (h.date === dateStr && !h.deleted_at) return h.kind === 'legal' ? 'legal' : 'special'; }
    return 'regular';
  }
  function hoursForPresence(kind, hours) {
    var h = hours == null ? HOURS_PER_DAY : Number(hours);
    return { hours_reg: kind === 'regular' ? h : 0, hours_rd: 0, hours_lh: kind === 'legal' ? h : 0, hours_sh: kind === 'special' ? h : 0 };
  }

  // ---- contributions ----
  function sssContribution(basis, t) {
    t = t || SSS_2025; basis = Number(basis) || 0;
    var msc = Math.round(basis / t.step) * t.step; msc = Math.max(t.msc_min, Math.min(t.msc_max, msc));
    var ec = msc <= t.ec_threshold ? t.ec_low : t.ec_high;
    return { msc: msc, ee: round2(msc * t.ee_rate), er: round2(msc * t.er_rate + ec), ec: ec };
  }
  // HrCore.phicContribution(basis, rule, roundTo) → { basis, ee, er }: basis rounded half-up to the nearest roundTo (settings.phic_round_to, default 1,000;
  // 0 / negative = no rounding), THEN clamped to floor / ceiling; premium = rate × basis, split in half. The returned basis is the PHIC salary basis
  // the Mandatory summary prints (contribution_ledger.phic_basis). SQL: hr.phic_contribution(basis) reads phic_round_to from hr.settings.
  function phicContribution(basis, r, roundTo) {
    r = r || PHIC_2025; var b = Number(basis) || 0, step = roundTo == null ? DEFAULT_SETTINGS.phic_round_to : Number(roundTo) || 0;
    if (step > 0) b = Math.round(b / step) * step;
    b = Math.max(r.floor, Math.min(r.ceiling, b));
    var half = round2(b * r.rate / 2); return { basis: b, ee: half, er: half };
  }
  // Owner practice: mode 'flat' (default; settings absent = flat) → a fixed ₱ EE = ₱ ER for every basis (settings.hdmf_flat_amount, default 200), no basis
  // dependence. Mode 'table' → the pre-existing 2 % rule (ceiling 10,000; 1 % below 1,500). SQL: hr.hdmf_contribution(basis) reads hr.settings itself.
  function hdmfContribution(basis, r, s) {
    s = s || DEFAULT_SETTINGS;
    var mode = s.hdmf_mode == null ? DEFAULT_SETTINGS.hdmf_mode : s.hdmf_mode;
    if (mode !== 'table') {
      var flat = round2(s.hdmf_flat_amount == null ? DEFAULT_SETTINGS.hdmf_flat_amount : Number(s.hdmf_flat_amount) || 0);
      return { ee: flat, er: flat };
    }
    r = r || HDMF_2024; var b = Math.min(r.ceiling, Number(basis) || 0);
    var eeRate = b <= r.low_threshold ? r.ee_rate_low : r.ee_rate;
    return { ee: round2(b * eeRate), er: round2(b * r.er_rate) };
  }
  function dueThisWeek(kind, wom, cal) {
    cal = cal || DEFAULT_SETTINGS.deduction_calendar;
    if (cal.weekly && cal.weekly.indexOf(kind) >= 0) return true;
    var weeks = cal[kind]; return Array.isArray(weeks) && weeks.indexOf(Number(wom)) >= 0;
  }
  function amortisation(loan) {
    if (!loan || !loan.active) return 0;
    return round2(Math.max(0, Math.min(Number(loan.weekly_amortization) || 0, Number(loan.balance) || 0)));
  }
  function loanKindDue(kind, wom, cal) {
    if (kind === 'sss_loan' || kind === 'hdmf_loan') return dueThisWeek('gov_loan', wom, cal);
    return dueThisWeek(kind, wom, cal);
  }

  // Amendment 4: HrCore.inComputedGroup(employee, settings) — the employee belongs to the computed payroll group (absent payroll_group = 'AHBA'; absent setting = 'AHBA').
  // SQL: e.payroll_group = (select computed_group from hr.settings where id = 1). Used by the builder pool, computeWeek, employees_basic and the UI tabs.
  function inComputedGroup(e, s) {
    var g = s && s.computed_group != null && String(s.computed_group).trim() !== '' ? String(s.computed_group) : DEFAULT_SETTINGS.computed_group;
    return String(e && e.payroll_group != null && String(e.payroll_group).trim() !== '' ? e.payroll_group : DEFAULT_SETTINGS.computed_group) === g;
  }

  // LOCAL DEMO: office / field attendance review groups use the employee's recorded department only.
  function attendanceGroup(e) {
    var group = e && typeof e.department === 'string' ? e.department.trim().toLowerCase() : '';
    return group === 'office' || group === 'field' ? group : 'unknown';
  }

  // LOCAL DEMO: a recorded day, including a zero-hour absence, qualifies independently of payroll amounts.
  // The returned buckets keep the original payroll line references and order; no input is changed.
  function partitionRegisterByLogs(lines, logs, period) {
    var withLogs = [], noLogs = [], days = Object.create(null), counts = {};
    function validDay(day) {
      if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
      var time = Date.parse(day + 'T00:00:00Z');
      return isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
    }
    function employeeKey(id) { return id == null || String(id).trim() === '' ? null : String(id); }
    var start = period && period.period_start, end = period && period.period_end;
    if (validDay(start) && validDay(end) && start <= end) (logs || []).forEach(function (log) {
      var id = log && employeeKey(log.employee_id), day = log && log.work_date;
      if (id == null || !validDay(day) || day < start || day > end) return;
      if (!days[id]) days[id] = Object.create(null);
      days[id][day] = true;
    });
    Object.keys(days).forEach(function (id) { Object.defineProperty(counts, id, { value: Object.keys(days[id]).length, enumerable: true, configurable: true, writable: true }); });
    (lines || []).forEach(function (line) {
      var id = line && employeeKey(line.employee_id);
      (id != null && days[id] ? withLogs : noLogs).push(line);
    });
    return { with_logs: withLogs, no_logs: noLogs, logged_days: counts };
  }

  // Amendment 4: HrCore.contribFor(employee, basis, overrides, settings, tables) → { basis, sss: {msc, ee, er, ec}, phic: {basis, ee, er}, hdmf: {ee, er} } — the per-employee
  // contribution set for ONE monthly basis, used by computeLine (every week, for the ledger) AND by the sim's setLedgerBasis (a manually encoded monthly basis).
  // SQL: hr.contrib_for(e hr.employees, basis numeric) — same rules, same order:
  //   per kind: not enrolled (employee.<kind>_enrolled === false; absent = enrolled) → 0/0 with a null printed basis (msc / basis), even with a stale override.
  //   Enrolled: a fixed override's employee_amount wins; employer_amount null/absent = auto (ER, and EC for SSS, from the table on the same basis);
  //   both amounts typed = fixed pair, no table basis (msc / basis null → the Mandatory summary prints a blank basis).
  // `tables` (optional, tests only): { sss_table, phic_rule, hdmf_rule } — production always uses the 2025 tables + settings.phic_round_to.
  // asOf is optional for callers with no historical cutoff; computeLine always passes the payroll pay_date (or its explicit ctx.as_of).
  // Effective dates, then creation time and id, determine the winning live override; input order is only a fallback for legacy rows without those fields.
  function contribFor(e, basis, overrides, s, tables, asOf) {
    e = e || {}; s = s || DEFAULT_SETTINGS; tables = tables || {}; basis = Number(basis) || 0;
    var ov = {}; (overrides || []).filter(function (o) { return !o.deleted_at && (!asOf || !o.effective_from || o.effective_from <= asOf); })
      .sort(function (a, b) {
        var keys = ['effective_from', 'created_at', 'id'];
        for (var i = 0; i < keys.length; i++) { var av = String(a[keys[i]] || ''), bv = String(b[keys[i]] || ''); if (av !== bv) return av < bv ? -1 : 1; }
        return 0;
      }).forEach(function (o) { ov[o.kind] = o; });
    function contrib(kind, table, zero) {
      if (e[kind + '_enrolled'] === false) return zero;
      var o = ov[kind]; if (!o) return table;
      if (o.employer_amount == null) { var r = Object.assign({}, table); r.ee = round2(o.employee_amount); return r; }
      return Object.assign({}, zero, { ee: round2(o.employee_amount), er: round2(o.employer_amount) });
    }
    // sss.msc / phic.basis are the printed bases (Mandatory summary); null when a fixed override replaces the table or the kind is not enrolled
    var sss = contrib('sss', sssContribution(basis, tables.sss_table), { msc: null, ee: 0, er: 0, ec: 0 });
    var phic = contrib('phic', phicContribution(basis, tables.phic_rule, s.phic_round_to), { basis: null, ee: 0, er: 0 });
    var hdmf = contrib('hdmf', hdmfContribution(basis, tables.hdmf_rule, s), { ee: 0, er: 0 });
    return { basis: round2(basis), sss: sss, phic: phic, hdmf: hdmf };
  }

  // Owner 2026-10-05 (LOCAL DEMO): minimum daily rate. raw = the stored rate, effective = what payroll uses. A missing rate (0) is not invented into pay.
  // Owner 2026-10-10: rates are EFFECTIVE-DATED, because the ₱755 minimum starts 2026-09-26 and a payroll week may straddle it.
  //   rate_history      — the employee's stored daily rate over time; empty → employee.daily_rate (unchanged behaviour)
  //   min_wage_history  — the legal minimum over time. Once ANY row exists the table is authoritative: before the first row there is no
  //                       legal floor, so days that precede the first minimum are paid the rate actually on file. Empty → settings.min_daily_rate.
  // Ties on effective_from resolve to the last row supplied; the caller's arrays are never sorted in place.
  function pickOn(rows, day) {
    var best = null;
    for (var i = 0; i < (rows || []).length; i++) {
      var r = rows[i], ef = r && r.effective_from;
      if (!ef || ef > day) continue;
      if (!best || ef >= best.effective_from) best = r;
    }
    return best;
  }
  function effectiveRateOn(day, c) {
    c = c || {};
    var s = c.settings || DEFAULT_SETTINGS, e = c.employee || {};
    var rh = pickOn(c.rate_history, day);
    var raw = Number(rh ? rh.daily_rate : e.daily_rate) || 0;
    var dated = c.min_wage_history && c.min_wage_history.length;
    var mw = dated ? pickOn(c.min_wage_history, day) : null;
    var floor = dated ? (mw ? Number(mw.daily_rate) || 0 : 0)
                      : Number(s.min_daily_rate == null ? DEFAULT_SETTINGS.min_daily_rate : s.min_daily_rate) || 0;
    var floored = raw > 0 && floor > 0 && raw < floor;
    return { raw: raw, effective: floored ? floor : raw, floored: floored, floor: floor };
  }
  function effectiveRate(raw, s) {
    var r = Number(raw) || 0, floor = Number((s || DEFAULT_SETTINGS).min_daily_rate == null ? DEFAULT_SETTINGS.min_daily_rate : (s || DEFAULT_SETTINGS).min_daily_rate) || 0;
    var floored = r > 0 && floor > 0 && r < floor;
    return { raw: r, effective: floored ? floor : r, floored: floored };
  }

  // ---- the pay line ----
  function computeLine(c) {
    var e = c.employee, s = c.settings || DEFAULT_SETTINGS, p = c.period, hpd = s.hours_per_day || HOURS_PER_DAY;
    // the rate is resolved per work date (see effectiveRateOn); the line reports the rate prevailing at the end of the week
    var rateCache = {};
    function rOn(dy) { return rateCache[dy] || (rateCache[dy] = effectiveRateOn(dy, c)); }
    var er = rOn(p.period_end), rate = er.effective, hourly = rate / hpd;
    var reg = 0, rd = 0, lh = 0, sh = 0, logged = {}, perDay = {};
    function bucket(dy) { return perDay[dy] || (perDay[dy] = { reg: 0, rd: 0, lh: 0, sh: 0 }); }
    function hasHours(l) { return (Number(l.hours_reg) || 0) + (Number(l.hours_rd) || 0) + (Number(l.hours_lh) || 0) + (Number(l.hours_sh) || 0) > 0; }
    // The adapter supplies employment-filtered attendance immediately before the cutoff. It supports Friday's holiday eligibility only;
    // evidence outside this period never enters the pay-hour totals below. Zero-hour absence rows do not establish presence.
    (c.previous_day_logs || []).forEach(function (l) { if (l.work_date < p.period_start && hasHours(l)) logged[l.work_date] = true; });
    (c.logs || []).forEach(function (l) {
      if (l.work_date < p.period_start || l.work_date > p.period_end) return;
      if (hasHours(l)) logged[l.work_date] = true;
      var b = bucket(l.work_date);
      b.reg += Number(l.hours_reg) || 0; b.rd += Number(l.hours_rd) || 0; b.lh += Number(l.hours_lh) || 0; b.sh += Number(l.hours_sh) || 0;
      reg += Number(l.hours_reg) || 0; rd += Number(l.hours_rd) || 0; lh += Number(l.hours_lh) || 0; sh += Number(l.hours_sh) || 0;
    });
    // unworked legal holidays inside the period (employee active on that date)
    var lhUnworked = 0, lhUnworkedDays = [];
    datesBetween(p.period_start, p.period_end).forEach(function (day) {
      if (classifyDay(day, c.holidays) !== 'legal' || logged[day]) return;
      if (e.date_ended && day > e.date_ended) return;
      if (e.date_hired && day < e.date_hired) return;
      if (s.unworked_lh_requires_prev_day && !logged[addDays(day, -1)]) return;
      lhUnworked += 1; lhUnworkedDays.push(day);
    });
    var prev = c.prev || {}, manual = prev.manual_fields || [];
    function keep(field, computed) { return manual.indexOf(field) >= 0 ? round2(prev[field]) : round2(computed); }
    var L = {};
    L.days = Math.round(reg / hpd * 10000) / 10000; /* 4 dp: 7h → 0.875 like the sheet */ L.hours_rd = round2(rd); L.hours_lh_worked = round2(lh); L.lh_unworked_days = lhUnworked; L.hours_sh = round2(sh);
    // Each day is paid at its own effective rate. When every paying day carries the same rate (the usual week, and every week before the
    // first minimum-wage step) the single-rate formula below is used verbatim, so figures already verified against the workbook cannot drift.
    var payDays = Object.keys(perDay).concat(lhUnworkedDays), distinct = {};
    payDays.forEach(function (dy) { distinct[rOn(dy).effective] = true; });
    var rates = Object.keys(distinct);
    L.rate_split = rates.length > 1;
    if (!L.rate_split) {
      var one = payDays.length ? rOn(payDays[0]) : er, oneRate = one.effective, oneHourly = oneRate / hpd;
      L.basic = round2(oneRate * L.days);
      L.rdot = round2(oneHourly * s.mult_rd_ot * rd);
      L.lh_pay = round2(oneHourly * s.mult_lh_worked * lh + oneRate * s.mult_lh_unworked * lhUnworked);
      L.sh_pay = round2(oneHourly * s.mult_sh_worked * sh);
    } else {
      var basic = 0, rdot = 0, lhPay = 0, shPay = 0;
      Object.keys(perDay).forEach(function (dy) {
        var d = perDay[dy], dr = rOn(dy).effective, dh = dr / hpd;
        basic += dr * (d.reg / hpd); rdot += dh * s.mult_rd_ot * d.rd; lhPay += dh * s.mult_lh_worked * d.lh; shPay += dh * s.mult_sh_worked * d.sh;
      });
      lhUnworkedDays.forEach(function (dy) { lhPay += rOn(dy).effective * s.mult_lh_unworked; });
      L.basic = round2(basic); L.rdot = round2(rdot); L.lh_pay = round2(lhPay); L.sh_pay = round2(shPay);
    }
    // Allowance = driver evidence units × configured rate + the period's manual allowance (0 when none).
    // The staged sim supplies distinct actual deployment units plus legacy/manual daily units.
    // SQL and old callers still use ctx.driver_days until their separately reviewed migration.
    // employee.weekly_allowance is legacy and no longer read here. A hand-typed Register cell (manual_fields) still wins through keep().
    var driverDays = Math.max(0, Math.round(Number(c.driver_days) || 0)), manualAllow = round2(c.manual_allowance);
    // Actual outgoing movements and legacy/manual daily decisions are separate evidence units.
    // Older callers that only supply driver_days retain their original daily arithmetic.
    var driverUnits = c.driver_units == null ? driverDays : Math.max(0, Math.round(Number(c.driver_units) || 0));
    var driverRate = s.driver_daily_allowance == null ? DEFAULT_SETTINGS.driver_daily_allowance : Number(s.driver_daily_allowance) || 0;
    L.driver_days = driverDays; L.driver_deployments = Math.max(0, Math.round(Number(c.driver_deployments) || 0));
    L.legacy_driver_days = Math.max(0, Math.round(Number(c.legacy_driver_days) || 0)); L.driver_units = driverUnits;
    L.manual_allowance = manualAllow; L.driver_allowance = round2(driverUnits * driverRate);
    L.rate_raw = er.raw; L.effective_rate = er.effective;
    L.rate_floor_applied = payDays.length ? payDays.some(function (dy) { return rOn(dy).floored; }) : er.floored;
    L.allowance = keep('allowance', round2(driverUnits * driverRate + manualAllow));
    L.adjustment = keep('adjustment', 0);
    L.gross = round2(L.basic + L.rdot + L.lh_pay + L.sh_pay + L.allowance + L.adjustment);

    // LOCAL DEMO (biometric import): attendance deductions. A log may carry late_deduct_hours (company late rule: 0.5 / 1 / 2 h, 4 h = half-day absent,
    // or an HR review decision). Deduction = hours × hourly × the multiplier of the hours column that day is paid in (regular 1.00, LH / SH / RD the worked
    // multiplier), capped at the day's hours. Gross stays the full earned figure; the deduction is its own line in total_deductions (payslip "Late / absence").
    // attendance_deduction_basic = the regular-day part — earned basic = basic − it is the contribution basis and the 13th-month base. Logs without the field → 0
    // (every pre-existing figure unchanged). SQL mirror NOT written yet (demo only) — hr-02-functions.sql compute_week must add it before go-live.
    var attH = 0, attAmt = 0, attBasic = 0, lateDays = 0, halfDays = 0;
    (c.logs || []).forEach(function (l) {
      if (l.work_date < p.period_start || l.work_date > p.period_end) return;
      var dh = Number(l.late_deduct_hours) || 0; if (dh <= 0) return;
      var dayH = (Number(l.hours_reg) || 0) + (Number(l.hours_rd) || 0) + (Number(l.hours_lh) || 0) + (Number(l.hours_sh) || 0); dh = Math.min(dh, dayH); if (dh <= 0) return;
      var mult = Number(l.hours_lh) > 0 ? s.mult_lh_worked : Number(l.hours_sh) > 0 ? s.mult_sh_worked : Number(l.hours_rd) > 0 ? s.mult_rd_ot : 1;
      var dayHourly = rOn(l.work_date).effective / hpd;   // the deduction is worth what that day was paid at
      attH += dh; attAmt += dayHourly * mult * dh; if (mult === 1) attBasic += dayHourly * dh;
      if (dh >= hpd / 2) halfDays++; else lateDays++;
    });
    L.attendance_hours = round2(attH); L.attendance_deduction = round2(attAmt); L.attendance_deduction_basic = round2(attBasic); L.late_days = lateDays; L.half_days = halfDays;

    // contributions (computed every week for the ledger; deducted only on the calendar week)
    var basis = Number(c.basis) || rate * (s.new_hire_basis_days || 26);
    // Amendment 4: the per-kind rules (enrolled flags, overrides, printed bases) live in contribFor — shared with the sim's setLedgerBasis / SQL hr.contrib_for
    // Task 24 follow-up: ctx.ledger = the month's contribution_ledger row when HR encoded it by hand (basis_source 'manual' — the Mandatory summary is the remittance basis,
    // so the payslip deducts the SAME amounts): its basis / EE / ER / EC replace the rate-basis computation (contrib.basis_source 'manual'); the row itself is never rewritten.
    var lg = c.ledger && c.ledger.basis_source === 'manual' ? c.ledger : null, cf;
    if (lg) cf = { basis: round2(lg.basis_amount), sss: { msc: Number(lg.sss_msc) || null, ee: round2(lg.sss_ee), er: round2(lg.sss_er), ec: round2(lg.sss_ec) },
                   phic: { basis: Number(lg.phic_basis) || null, ee: round2(lg.phic_ee), er: round2(lg.phic_er) }, hdmf: { ee: round2(lg.hdmf_ee), er: round2(lg.hdmf_er) } };
    else cf = contribFor(e, basis, c.overrides, s, { sss_table: c.sss_table, phic_rule: c.phic_rule, hdmf_rule: c.hdmf_rule }, c.as_of || p.pay_date);
    var sss = cf.sss, phic = cf.phic, hdmf = cf.hdmf;
    L.contrib = { month: contributionMonth(p.pay_date), basis: cf.basis, basis_source: lg ? 'manual' : 'computed', sss: sss, phic: phic, hdmf: hdmf };
    var cal = s.deduction_calendar, wom = p.week_of_month;
    // Owner 2026-10-05: a ZERO-PAY week (gross ≤ 0 — no attendance, no allowance / adjustment) deducts no contributions. The month's contribution is still
    // computed (L.contrib → ledger), but nothing is withheld, so lock leaves the ledger row "not deducted" for the Mandatory summary. A hand-typed Register value
    // (manual_fields) still wins through keep(). SQL mirror NOT written yet — hr-02-functions.sql compute_week must add the same guard before go-live.
    var noPay = L.gross <= 0, dueAny = dueThisWeek('sss', wom, cal) || dueThisWeek('phic', wom, cal) || dueThisWeek('hdmf', wom, cal);
    L.contrib_skipped = noPay && dueAny;
    // Per employee/month/kind, another locked period's marker suppresses automatic withholding only. Explicit Register overrides stay visible;
    // An overlap that posts a contribution or an explicit due-week zero is refused so it cannot replace another locked month's decision.
    var deducted = c.ledger && c.ledger.deducted_periods || {}; L.contrib_conflicts = [];
    function contributionDeduction(kind, amount) {
      var takenElsewhere = !!deducted[kind] && deducted[kind] !== p.id;
      var value = keep(kind, !noPay && !takenElsewhere && dueThisWeek(kind, wom, cal) ? amount : 0);
      if (takenElsewhere && manual.indexOf(kind) >= 0 && (value !== 0 || (L.gross > 0 && dueThisWeek(kind, wom, cal)))) L.contrib_conflicts.push(kind);
      return value;
    }
    L.sss = contributionDeduction('sss', sss.ee);
    L.phic = contributionDeduction('phic', phic.ee);
    L.hdmf = contributionDeduction('hdmf', hdmf.ee);

    // loans
    var byKind = { sss_loan: 0, hdmf_loan: 0, cash_advance: 0, company_loan: 0 }; L.loan_deductions = [];
    (c.loans || []).forEach(function (ln) {
      if (ln.deleted_at || !ln.active || (ln.started_on && ln.started_on > p.period_end) || !loanKindDue(ln.kind, wom, cal)) return;
      var amt = amortisation(ln); if (!amt) return;
      byKind[ln.kind] = round2(byKind[ln.kind] + amt); L.loan_deductions.push({ loan_id: ln.id, amount: amt });
    });
    L.sss_loan = keep('sss_loan', byKind.sss_loan); L.hdmf_loan = keep('hdmf_loan', byKind.hdmf_loan);
    // Amendment 2 (Task 21): per-period one-off deductions typed in the Deductions tab (hr.deductions row → ctx.deductions {cash_advance, company_loan, others}, 0 when none)
    // add to the scheduled loan amortisations. cash_advance / company_loan are NOT in LINE_MANUAL_FIELDS — the tab is their only manual path; `others` stays a Register override (keep()).
    // The manual parts are stored on the line (manual_cash_advance / manual_company_loan) for display next to the scheduled part.
    var ded = c.deductions || {};
    L.manual_cash_advance = round2(ded.cash_advance); L.manual_company_loan = round2(ded.company_loan);
    L.cash_advance = keep('cash_advance', round2(byKind.cash_advance + L.manual_cash_advance)); L.company_loan = keep('company_loan', round2(byKind.company_loan + L.manual_company_loan));
    L.partial_payroll = keep('partial_payroll', 0); L.others = keep('others', round2(ded.others));
    L.total_deductions = round2(L.attendance_deduction + L.sss + L.phic + L.hdmf + L.sss_loan + L.hdmf_loan + L.cash_advance + L.company_loan + L.partial_payroll + L.others);
    L.net = round2(L.gross - L.total_deductions);
    return L;
  }

  // earned basic of a pay line = basic − the regular-day attendance deduction (late / half-day absent). Lines without the field → basic (unchanged)
  function earnedBasic(l) { return round2((Number(l && l.basic) || 0) - (Number(l && l.attendance_deduction_basic) || 0)); }

  // Amendment 5: 13th month pay = total basic salary earned in the calendar year ÷ 12 (PD 851; pro-rated by construction for new hires / resigned).
  // Month key = the payroll week's period_end month — the same key as the contribution basis (basisFor / hr.contribution_ledger). Per month, the source is:
  //   a manual ledger row (basis_source 'manual': a non-computed group such as FERROTECH, or a hand-set basis) → basis_amount;
  //   else Σ basic of the month's LOCKED lines (includeDraft also counts computed-but-unlocked lines, flagged so the report can say so).
  // SQL: hr.thirteenth_month(p_year, p_include_draft) — same rule, same row shape. Employees with nothing earned in the year are left out.
  function thirteenthMonthRows(ctx, year, includeDraft) {
    var y = String(year), byEmp = {}, periods = {};
    (ctx.periods || []).forEach(function (p) { periods[p.id] = p; });
    function row(e) { return byEmp[e.id] || (byEmp[e.id] = { employee_id: e.id, emp_no: e.emp_no || '', display_name: e.display_name, payroll_group: e.payroll_group || DEFAULT_SETTINGS.computed_group, active: e.active !== false, months: {}, manual_months: [], draft_months: [], total_basic: 0, thirteenth_month: 0 }); }
    var emps = {}; (ctx.employees || []).forEach(function (e) { if (!e.deleted_at) emps[e.id] = e; });
    var manual = {};   // employee_id|YYYY-MM → manual basis
    (ctx.ledger || []).forEach(function (l) { if (l.basis_source === 'manual' && String(l.year_month).slice(0, 4) === y) manual[l.employee_id + '|' + l.year_month] = round2(l.basis_amount); });
    (ctx.lines || []).forEach(function (l) {
      var p = periods[l.period_id], e = emps[l.employee_id]; if (!p || !e || String(p.period_end).slice(0, 4) !== y) return;
      var locked = p.status === 'locked'; if (!locked && !(includeDraft && p.status === 'computed')) return;
      var ym = String(p.period_end).slice(0, 7); if (manual[l.employee_id + '|' + ym] != null) return;
      var r = row(e); r.months[ym] = round2((r.months[ym] || 0) + earnedBasic(l));
      if (!locked && r.draft_months.indexOf(ym) < 0) r.draft_months.push(ym);
    });
    Object.keys(manual).forEach(function (k) { var id = k.split('|')[0], ym = k.split('|')[1], e = emps[id]; if (!e) return; var r = row(e); r.months[ym] = manual[k]; r.manual_months.push(ym); });
    return Object.keys(byEmp).map(function (id) { var r = byEmp[id]; r.total_basic = round2(Object.keys(r.months).reduce(function (a, k) { return a + r.months[k]; }, 0)); r.thirteenth_month = round2(r.total_basic / 12); r.manual_months.sort(); r.draft_months.sort(); return r; })
      .filter(function (r) { return r.total_basic > 0; }).sort(function (a, b) { return a.display_name < b.display_name ? -1 : a.display_name > b.display_name ? 1 : 0; });
  }

  return {
    thirteenthMonthRows: thirteenthMonthRows, earnedBasic: earnedBasic,
    round2: round2, driverUnitsForLog: driverUnitsForLog, normName: normName, nameKeys: nameKeys, matchName: matchName, matchNameDetailed: matchNameDetailed, looseKey: looseKey, levenshtein: levenshtein,
    periodFor: periodFor, weekOfMonth: weekOfMonth, contributionMonth: contributionMonth, addDays: addDays, datesBetween: datesBetween,
    classifyDay: classifyDay, hoursForPresence: hoursForPresence,
    sssContribution: sssContribution, phicContribution: phicContribution, hdmfContribution: hdmfContribution,
    dueThisWeek: dueThisWeek, amortisation: amortisation, computeLine: computeLine, effectiveRate: effectiveRate, effectiveRateOn: effectiveRateOn, contribFor: contribFor, inComputedGroup: inComputedGroup,
    attendanceGroup: attendanceGroup, partitionRegisterByLogs: partitionRegisterByLogs,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS, SSS_2025: SSS_2025, PHIC_2025: PHIC_2025, HDMF_2024: HDMF_2024,
    DEDUCTION_KINDS: DEDUCTION_KINDS, LINE_MANUAL_FIELDS: LINE_MANUAL_FIELDS, HOURS_PER_DAY: HOURS_PER_DAY
  };
});
