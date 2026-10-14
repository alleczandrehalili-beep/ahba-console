// AHBA FieldOps — HR real adapter over supabase-js (schema hr). Same HrApi surface as hr-sim.js. Mirrors hr-02-functions.sql RPC names/args.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.HrApi = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function create(sb) {
    var h = function () { return sb.schema('hr'); };
    function ok(p) { return Promise.resolve(p).then(function (r) { if (r.error) { var e = new Error(r.error.message || String(r.error)); e.code = r.error.code; e.details = r.error.details; e.hint = r.error.hint; throw e; } return r.data; }); }
    function rpc(fn, args) { return ok(h().rpc(fn, args || {})); }
    function upsert(table, row) { var r = Object.assign({}, row); delete r.payments; delete r._loans; if (!r.id) delete r.id; return ok(h().from(table).upsert(r, { onConflict: 'id' }).select().single()); }
    return {
      me: function () { return rpc('me'); },
      integrationCapabilities: function () { return rpc('integration_capabilities').catch(function (e) {
        if (e.code !== 'PGRST202' || !/hr\.integration_capabilities\b/.test(e.message)) throw e;
        return { version: 0, restore_allowance: { supported: false, enabled: false, allowed: false }, biometric: { supported: false, enabled: false, allowed: false } };
      }); },
      restoreAutomaticAllowance: function (id) { return rpc('restore_automatic_allowance', { p_line: id }); },
      // Biometric server unit. Parsing stays here (hr-attendance-import.js rowsFromAoa); the SERVER re-derives every
      // decision from the rows it stores, so these pass the file through unchanged and never a client-side verdict.
      importBiometric: function (o) { return rpc('import_biometric', { p: o || {} }); },
      mapBiometricId: function (pid, eid) { return rpc('map_biometric_id', { p_personnel: pid, p_emp: eid }); },
      excludeBiometric: function (periodId, pid, reason) { return rpc('exclude_biometric', { p_period: periodId, p_personnel: pid, p_reason: reason }); },
      reviewMissingBiometric: function (periodId, key, decision) { return rpc('review_missing_biometric', { p_period: periodId, p_key: key, p: decision || {} }); },
      reviewIncompleteBiometric: function (periodId, choice) { return rpc('review_incomplete_biometric', { p_period: periodId, p: choice || {} }); },
      // redacted review read: carries no money, and a validator is authorised for it (hr.biometric_review)
      biometricReview: function (periodId) { return rpc('biometric_review', { p_period: periodId }).then(function (r) {
        // SQL's work_date/name are mapped to the browser contract; decisions still belong to the server.
        var seen = {}, pending = 0, unreviewed = 0;
        r.rows = (r.rows || []).map(function (a) {
          var row = Object.assign({}, a, { date: a.date || a.work_date, employee_name: a.employee_name || a.name });
          if (a.log && !seen[a.log.id]) { seen[a.log.id] = true; if (a.incomplete_pending) pending++; if (a.incomplete_pending || (a.log.flag && !a.log.verified_at)) unreviewed++; }
          return row;
        });
        (r.manual_kept || []).forEach(function (l) { if (!seen[l.id] && l.flag && !l.verified_at) unreviewed++; });
        r.counts = Object.assign({}, r.counts, { incomplete_pending: pending, unreviewed: unreviewed });
        return r;
      }); },
      // own row only (hr.my_punch filters by hr.my_username()). PostgREST renders an empty composite as a row of nulls, a set as [] — both normalise to null.
      myPunch: function (d) { return rpc('my_punch', { p_date: d }).then(function (r) { var row = Array.isArray(r) ? (r[0] || null) : (r || null); return row && row.id != null ? row : null; }); },
      punchIn: function () { return rpc('punch_in'); }, punchOut: function () { return rpc('punch_out'); },
      // rates gate (owner 2026-09-22): hr.employees has no direct access — list / save through definer RPCs that strip / ignore daily_rate + weekly_allowance for a non-rate-viewer
      listEmployees: function (f) { return rpc('employees_list', { p_include_deleted: !!(f && f.include_deleted) }).then(function (rows) { return f && f.active != null ? rows.filter(function (e) { return !!e.active === !!f.active; }) : rows; }); },
      saveEmployee: function (e) { return rpc('save_employee', { p: e }); },
      // Amendment 5: soft delete / restore (definer RPCs — delete refuses an active employee), 13th month report, Validate drag-and-drop move
      deleteEmployee: function (id, o) { return rpc('delete_employee', { p_emp: id, p_effective: (o || {}).effective, p_reason: (o || {}).reason }); }, restoreEmployee: function (id) { return rpc('restore_employee', { p_emp: id }); },
      thirteenthMonth: function (y, d) { return rpc('thirteenth_month', { p_year: Number(y), p_include_draft: !!d }); },
      moveLog: function (id, team) { return rpc('move_log', { p_id: id, p_team: team }); },
      listHolidays: function (y) { var q = h().from('holidays').select('*').is('deleted_at', null).order('date'); if (y) q = q.gte('date', y + '-01-01').lte('date', y + '-12-31'); return ok(q); },
      saveHoliday: function (x) { return upsert('holidays', x); }, deleteHoliday: function (id) { return ok(h().from('holidays').update({ deleted_at: new Date().toISOString() }).eq('id', id)); },
      getSettings: function () { return ok(h().from('settings').select('*').eq('id', 1).single()); }, saveSettings: function (p) { return ok(h().from('settings').update(p).eq('id', 1).select().single()); },
      listOverrides: function (eid) { return ok(h().from('contribution_overrides').select('*').eq('employee_id', eid).is('deleted_at', null)); }, saveOverride: function (o) { return upsert('contribution_overrides', o); },
      // effective-dated rates (owner 2026-10-10): definer RPCs, because a rate step is an amount — the tables themselves are closed to PostgREST
      listMinWage: function () { return rpc('min_wage_list'); },
      saveMinWage: function (r) { return rpc('save_min_wage', { p: r }); },
      deleteMinWage: function (d) { return rpc('delete_min_wage', { p_effective: d }); },
      listEmployeeRates: function (eid) { return rpc('employee_rates_list', { p_emp: eid }); },
      saveEmployeeRate: function (r) { return rpc('save_employee_rate', { p: r }); },
      deleteEmployeeRate: function (eid, d) { return rpc('delete_employee_rate', { p_emp: eid, p_effective: d }); },
      // the Register's rate box: writes a dated step from the period start, then the console computes
      setLineRate: function (lineId, rate, note) { return rpc('set_line_rate', { p_line: lineId, p_rate: rate, p_note: note || null }); },
      // deleting a payroll week: HR asks, a superadmin decides (hr.decide_period_delete)
      listPeriodDeleteRequests: function () { return rpc('period_delete_requests_list'); },
      requestPeriodDelete: function (periodId, reason) { return rpc('request_period_delete', { p_period: periodId, p_reason: reason }); },
      cancelPeriodDelete: function (id) { return rpc('cancel_period_delete', { p_request: id }); },
      decidePeriodDelete: function (id, approve, note) { return rpc('decide_period_delete', { p_request: id, p_approve: !!approve, p_note: note || null }); },
      listLoans: function (f) { var q = h().from('loans').select('*, payments:loan_payments(*)').is('deleted_at', null); if (f && f.employee_id) q = q.eq('employee_id', f.employee_id); if (f && f.active != null) q = q.eq('active', f.active); return ok(q); },
      saveLoan: function (l) { return upsert('loans', l); },
      buildLogs: function (a, b) { return rpc('build_daily_logs', { p_from: a, p_to: b }); },
      listLogs: function (a, b) { return ok(h().from('daily_logs').select('*').gte('work_date', a).lte('work_date', b)); },
      setLog: function (eid, d, p) { return rpc('set_log', { p_emp: eid, p_day: d, p: p }); },
      markPresent: function (ids, ds) { return rpc('mark_present', { p_ids: ids, p_dates: ds }); },
      // Amendment 1 (validators + admins): bulk ✓, and the names-only employee list (definer RPC — validators have no select on hr.employees)
      verifyLogs: function (ids) { return rpc('verify_logs', { p_ids: ids }); },
      listEmployeesBasic: function () { return rpc('employees_basic'); },
      listUnmatched: function () { return ok(h().from('unmatched_names').select('*').is('resolved_employee_id', null).eq('ignored', false).order('count', { ascending: false })); },
      resolveUnmatched: function (n, eid) { return rpc('resolve_unmatched', { p_norm: n, p_emp: eid }); },
      ignoreUnmatched: function (n) { return rpc('ignore_unmatched', { p_norm: n }); },
      listPeriods: function () { return ok(h().from('v_periods').select('*').order('period_start', { ascending: false })); },
      createPeriod: function (p) { return rpc('create_period', { p: p }); },
      // Phase 0 (C2): hr.pay_periods is no longer writable through PostgREST — the lifecycle moves only through these RPCs
      updatePeriod: function (id, p) { return rpc('update_period', { p_period: id, p: p }); },
      // Phase 0 (C1): locked ranges, so Validate can grey out a frozen day before the click (validator-callable)
      lockedRanges: function () { return rpc('locked_ranges'); },
      computePeriod: function (id) { return rpc('compute_week', { p_period: id }); },
      listLines: function (pid) { return ok(h().from('payroll_lines').select('*').eq('period_id', pid).order('display_name')); },
      setLine: function (id, p) { return rpc('set_line', { p_line: id, p: p }); },
      // Amendment 2: per-period manual allowance — direct select (admin RLS), definer upsert RPC that refuses a locked period
      listAllowances: function (pid) { return ok(h().from('allowances').select('*').eq('period_id', pid)); },
      saveAllowance: function (a) { return rpc('save_allowance', { p: a }); },
      // Amendment 2 (Task 21): per-period one-off deductions (cash advance / company loan / others) — direct select (admin RLS), definer upsert RPC that refuses a locked period
      listDeductions: function (pid) { return ok(h().from('deductions').select('*').eq('period_id', pid)); },
      saveDeduction: function (d) { return rpc('save_deduction', { p: d }); },
      lockPeriod: function (id) { return rpc('lock_period', { p_period: id }); }, reopenPeriod: function (id, r) { return rpc('reopen_period', { p_period: id, p_reason: r }); },
      periodStale: function (pid) { return rpc('period_stale', { p_period: pid }); },
      contributionReport: function (ym) { return rpc('contribution_report', { p_ym: ym }); }, attendanceSummary: function (ym) { return rpc('attendance_summary', { p_ym: ym }); },
      // Amendment 4: manual monthly basis (Group B / no locked lines) → definer RPC that upserts the ledger row (basis_source 'manual') and refuses a deducted month
      setLedgerBasis: function (eid, ym, basis) { return rpc('set_ledger_basis', { p_emp: eid, p_ym: ym, p_basis: basis }); },
      // Amendment 4 (Task 24): Mandatory summary per-row edits — "↺ auto" / cleared Basic pay → reset (recomputed from locked lines, or the row removed); inline EE override
      // (saveOverride on hr.contribution_overrides, direct upsert) → recompute the month's row from its own basis. Both return the row, or null (no row / removed — PostgREST
      // renders a null composite as a row of nulls, like my_punch).
      resetLedgerBasis: function (eid, ym) { return rpc('reset_ledger_basis', { p_emp: eid, p_ym: ym }).then(function (r) { return r && r.id != null ? r : null; }); },
      recomputeLedger: function (eid, ym) { return rpc('recompute_ledger', { p_emp: eid, p_ym: ym }).then(function (r) { return r && r.id != null ? r : null; }); },
      // Phase 0 (C4): direct select on hr.audit_log is revoked; the feed redacts by allow-list for anyone who is not a rate viewer
      auditLog: function (f) { return rpc('audit_feed', { p_limit: (f && f.limit) || 200 }); }
    };
  }
  return { create: create };
});
