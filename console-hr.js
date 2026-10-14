// AHBA Console — PAYROLL (HR) page module. Loaded by index.html (production) and hr-demo.html (demo). Mount-only; never touches app.js globals.
// ConsoleHR.mount(rootEl, {api, user, deps:{toast, canEdit, ensureXLSX}, onBadge}) -> {refresh, destroy}
//   mount reads api.me(): payroll admin → all tabs (+ Validate); attendance validator only (page grant `hrvalidate` — owner 2026-09-24: Dispatch schedules, HR validates) → Validate tab alone, no admin RPC ever called.
// ConsoleHR.punchWidget(el, {api, user}) -> {refresh}   (header Time In / Out button, any console user)
(function (root) {
  'use strict';
  var C = root.HrCore;
  var CSS = '.hr{font:13px "DM Sans",system-ui,sans-serif;color:#0e2b27}' +
    '.hr-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;align-items:center}.hr-tabs button{padding:8px 14px;border-radius:10px;border:1px solid #cfe0d8;background:#fff;font-weight:700;cursor:pointer;color:#0e2b27}.hr-tabs button.on{background:#0e2b27;color:#fff;border-color:#0e2b27}.hr-tabs b.n{margin-left:6px;background:#c2503a;color:#fff;border-radius:9px;padding:1px 6px;font-size:10px}' +
    '.hr-card{background:#fff;border:1px solid #e3e8e2;border-radius:12px;padding:14px;margin-bottom:12px}.hr-card h3{margin:0 0 8px;font:800 15px Manrope,system-ui}' +
    '.hr-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.hr-bar input,.hr-bar select{padding:7px 9px;border:1px solid #cfd8d3;border-radius:9px;font-size:12px}' +
    '.hr-btn{padding:7px 12px;border-radius:9px;border:1px solid #cfe0d8;background:#fff;font-weight:700;cursor:pointer;font-size:12px}.hr-btn.p{background:#18a57b;color:#fff;border-color:#18a57b}.hr-btn.d{background:#c2503a;color:#fff;border-color:#c2503a}.hr-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.hr-chip{display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:800}.hr-chip.open{background:#eef1ed;color:#4a5a55}.hr-chip.computed{background:#fff3cd;color:#8a6100}.hr-chip.locked{background:#e7f7ef;color:#0b6b4d}' +
    '.hr-warn{background:#fff3cd;border:1px solid #ffe08a;border-radius:10px;padding:8px 12px;margin-bottom:10px;font-weight:700;color:#7a5200}' +
    'table.hr-t{width:100%;border-collapse:collapse;font-size:12px}.hr-t th,.hr-t td{padding:6px 8px;border-bottom:1px solid #eef1ed;text-align:left;white-space:nowrap}.hr-t th{background:#f6f9f7;font-size:11px;position:sticky;top:0}.hr-t td.r,.hr-t th.r{text-align:right;font-variant-numeric:tabular-nums}.hr-t tr:hover td{background:#f9fbfa}.hr-t td.ed{background:#fffbe6;cursor:text}.hr-t td.ed.m{box-shadow:inset 3px 0 #ffb000}.hr-scroll{overflow:auto;max-height:70vh;border:1px solid #e3e8e2;border-radius:10px}' +
    '.dtr td.c{text-align:center;cursor:pointer;min-width:44px;font-weight:700}.dtr td.c.team{background:#e7f7ef}.dtr td.c.punch{background:#e3f0ff}.dtr td.c.manual{background:#fff3cd}.dtr td.c.legal{outline:2px solid #c2503a;outline-offset:-2px}.dtr td.c.special{outline:2px solid #9a6200;outline-offset:-2px}.dtr td.c.rd{outline:2px solid #6b3fa0;outline-offset:-2px}.dtr td.c.fuzzy{outline:2px dashed #e0891a;outline-offset:-2px}.dtr td.c.flag::after{content:" ⚑";color:#c2503a}.dtr td.c.ov::after{content:" ✎";color:#4a5a55}.dtr td.name{position:sticky;left:0;background:#fff;font-weight:700}' +
    '.hr-pop{position:fixed;z-index:9999;background:#fff;border:1px solid #cfd8d3;border-radius:12px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);width:280px;font-size:12px}.hr-pop label{display:block;margin:6px 0 2px;font-weight:700;font-size:11px}.hr-pop input,.hr-pop select,.hr-pop textarea{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cfd8d3;border-radius:8px}.hr-pop .row{display:flex;gap:6px;margin-top:8px}' +
    '.hr-legend{font-size:11px;color:#4a5a55;display:flex;gap:12px;flex-wrap:wrap;margin:6px 0}.hr-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:3px}' +
    '.hr-modal{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9998;display:flex;align-items:center;justify-content:center}.hr-modal .box{background:#fff;border-radius:14px;padding:16px;width:min(720px,94vw);max-height:90vh;overflow:auto}.hr-modal .box h3{margin:0 0 10px}.hr-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hr-form label{font-size:11px;font-weight:700;display:block}.hr-form input,.hr-form select{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cfd8d3;border-radius:8px}.hr-form .w{grid-column:1/-1}' +
    '.hr-drv{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:7px;background:#e3f0ff;color:#1d4f91;font-size:10px;font-weight:800}.hr-t td.ed.blank{color:#b3bdb8}' +
    '.val tr[draggable]{cursor:grab}.val .hr-card.over{outline:2px dashed #1d4f91;outline-offset:-2px;background:#f2f7ff}.hr-mv{color:#1d4f91;font-weight:600;font-size:11px;margin-left:6px}.hr-chip.deleted{background:#f3e3e3;color:#8a2f2f}' +
    '.hr .mut{font-size:11px;color:#8a9894;margin:4px 0}.hr-miss{margin-top:8px;font-size:12px;line-height:2.2}.hr-miss .hr-chip{font-size:11px;font-weight:600}.dtr td.c small.vk{color:#0b6b4d;margin-right:2px;font-size:10px}.val .hr-t tr.ok td{color:#4a5a55}.val .hr-t td.name{font-weight:700}.hr-fz{color:#b8600a;font-weight:600;font-size:11px;margin-left:6px}' +
    '.hr-steps{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}.hr-step{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1px solid #cfe0d8;background:#fff;font-weight:700;cursor:pointer;color:#0e2b27}.hr-step b{display:inline-flex;width:22px;height:22px;border-radius:50%;align-items:center;justify-content:center;background:#eef1ed;font-size:11px}.hr-step.on{border-color:#0e2b27;box-shadow:0 0 0 2px #0e2b27 inset}.hr-step.ok b{background:#18a57b;color:#fff}.hr-step:disabled{opacity:.45;cursor:not-allowed}.hr-arrow{color:#8a9894}' +
    '.hr-drop{display:block;border:2px dashed #9fc3b4;border-radius:12px;padding:22px;text-align:center;cursor:pointer;background:#f6fbf8;margin-bottom:10px}.hr-drop.over{background:#e7f7ef;border-color:#18a57b}' +
    '.hr-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:8px 0 10px}.hr-kpi{background:#f6f9f7;border:1px solid #e3e8e2;border-radius:10px;padding:8px 10px}.hr-kpi small{display:block;font-size:10px;color:#4a5a55;font-weight:700;text-transform:uppercase;letter-spacing:.02em}.hr-kpi b{font:800 17px Manrope,system-ui;font-variant-numeric:tabular-nums}.hr-kpi b small{display:inline;text-transform:none;font-weight:600}.hr-kpi.warn{background:#fff8e6;border-color:#ffe08a}.hr-kpi.bad{background:#fdeceb;border-color:#f3b8b0}.hr-kpi.good{background:#e7f7ef;border-color:#b5e3cc}' +
    '.hr-days{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.hr-days span{border-radius:9px;padding:5px 9px;font-size:11px;border:1px solid #e3e8e2}.hr-days span small{display:block;color:#4a5a55}.hr-days .on{background:#e7f7ef;border-color:#b5e3cc}.hr-days .off{background:#fdeceb;border-color:#f3b8b0}' +
    '.hr-check{margin:10px 0;font-weight:700;font-size:12px;line-height:1.9}.hr-check .ok{color:#0b6b4d}.hr-check .no{color:#8a2f2f}.hr-newpay{background:#18a57b!important;color:#fff!important;border-color:#18a57b!important}.hr-newpay.on{background:#0b6b4d!important}' +
    '.dtr td.c.biometric{background:#eaf2ff}.dtr td.c small.lt{display:block;color:#b8600a;font-size:9px;font-weight:800}.hr-src{font-size:10px;font-weight:800;padding:1px 6px;border-radius:7px;background:#eaf2ff;color:#1d4f91}' +
    '.hr-batch{border:1px solid #b5daca;border-radius:10px;padding:12px;margin:10px 0;background:#f6fbf8}.hr-batch h4{margin:0 0 8px;font-size:13px}.hr-batch textarea{display:block;width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #cfd8d3;border-radius:8px;min-height:48px;font:inherit}.hr-batch label{font-size:12px}.hr-batch-summary{padding:8px 0;font-size:12px;line-height:1.6}.hr-batch-confirm{padding:10px;border:1px solid #e2c46b;border-radius:8px;background:#fff8e1;margin-top:8px}.hr-batch .hr-scroll{max-height:260px;background:#fff}.hr-batch-error{color:#8a2f2f;font-weight:700}.hr-batch [hidden]{display:none!important}' +
    '@media print{.hr-tabs,.hr-bar,.hr-warn{display:none!important}}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n) || 0; return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDate(s) { if (!s) return '—'; var d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }); }
  function periodLabel(p) {   // workbook style "Aug 21-27,2026"; a week that crosses a month boundary spells both months: "Aug 28-Sep 3,2026"
    var a = new Date(p.period_start + 'T00:00:00'), b = new Date(p.period_end + 'T00:00:00'), md = { month: 'short', day: 'numeric' };
    return a.toLocaleDateString('en-US', md) + '-' + (a.getMonth() === b.getMonth() ? b.getDate() : b.toLocaleDateString('en-US', md)) + ',' + b.getFullYear();
  }
  function dow(s) { return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(s + 'T00:00:00').getDay()]; }
  function hhmm(iso) { return iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }) : '—'; }
  function yesterdayManila() { return new Date(Date.now() + 8 * 3600e3 - 86400e3).toISOString().slice(0, 10); }
  var SRC_ICON = { team: '👥', punch: '⏱', manual: '✍', biometric: '🧬' };

  // Attendance-only preview math, shared by both review views. Backend preflight remains authoritative.
  function incompleteBatchSummary(logs, hoursPerDay, decision, customHours) {
    var hpd = Number(hoursPerDay), h = decision === 'full_day' ? hpd : decision === 'half_day' ? hpd / 2 : decision === 'custom_hours' ? Number(customHours) : NaN;
    if (['full_day', 'half_day', 'custom_hours'].indexOf(decision) < 0) throw new Error('Choose a review decision');
    if (!Number.isFinite(hpd) || hpd <= 0 || hpd > 24) throw new Error('Configured shift hours must be greater than 0 and no more than 24');
    if (!Number.isFinite(h) || h <= 0 || h > hpd) throw new Error('Hours must be greater than 0 and no more than ' + hpd);
    var ids = {}, days = {}, out = { count: 0, employee_days: 0, hours_per_record: h, hours_before: 0, hours_after: 0, late_hours_before: 0, late_hours_after: 0, late_capped_count: 0, effective_hours_after: 0 };
    logs.forEach(function (l) {
      if (ids[String(l.id)]) return; ids[String(l.id)] = true;
      out.count++; days[l.employee_id + '|' + l.work_date] = true;
      out.hours_before += ['hours_reg', 'hours_rd', 'hours_lh', 'hours_sh'].reduce(function (s, k) { return s + (Number(l[k]) || 0); }, 0);
      var late = Number(l.late_deduct_hours) || 0;
      out.hours_after += h; out.late_hours_before += late; out.late_hours_after += Math.min(late, h); if (late > h) out.late_capped_count++;
    });
    out.employee_days = Object.keys(days).length; out.effective_hours_after = out.hours_after - out.late_hours_after;
    ['hours_per_record', 'hours_before', 'hours_after', 'late_hours_before', 'late_hours_after', 'effective_hours_after'].forEach(function (k) { out[k] = Math.round(out[k] * 100) / 100; });
    return out;
  }
  function incompletePending(l) {
    var ev = l.evidence || {}, decision = ev.incomplete_review;
    return !!(ev.incomplete_punch && l.source === 'biometric' && (!l.verified_at || !decision || !decision.by || !decision.at || !String(decision.reason || '').trim()));
  }
  function incompleteIssue(x) {
    if (x.review_only) return null;
    if (!incompletePending(x.l)) return null;
    var issue = x.a && Object.prototype.hasOwnProperty.call(x.a, 'incomplete_issue') ? x.a.incomplete_issue : x.l.incomplete_issue;
    return issue === 'missing_time_out' || issue === 'missing_time_in' ? issue : null;
  }
  function pendingEvidenceLabel(l) {
    if (l.source !== 'biometric' || l.verified_at && !incompletePending(l)) return '';
    var ev = l.evidence || {}, flags = ev.flags || [];
    if (ev.punch_status === 'invalid' || flags.indexOf('invalid_time') >= 0) return 'Invalid clock — attendance correction required';
    if (ev.punch_status === 'none' || flags.indexOf('no_punches') >= 0) return 'No punch evidence — HR review required';
    return '';
  }
  function attendanceDeductionPatch(l, value, holidays, hoursPerDay) {
    if (value === 'absent') return { hours_reg: 0, hours_rd: 0, hours_lh: 0, hours_sh: 0, late_deduct_hours: 0 };
    var presentHours = ['hours_reg', 'hours_rd', 'hours_lh', 'hours_sh'].reduce(function (s, k) { return s + (Number(l[k]) || 0); }, 0);
    // A deduction correction does not alter presence or replace a recorded batch presence decision.
    if (presentHours > 0) return { late_deduct_hours: Number(value) };
    var hpd = hoursPerDay == null ? C.DEFAULT_SETTINGS.hours_per_day : Number(hoursPerDay);
    if (!Number.isFinite(hpd) || hpd <= 0 || hpd > 24) throw new Error('Configured shift hours must be greater than 0 and no more than 24');
    return Object.assign(C.hoursForPresence(l.day_kind || C.classifyDay(l.work_date, holidays), hpd), { late_deduct_hours: Number(value) });
  }

  // Register display only: preserve every computed line and keep the current roster reachable before Compute.
  function registerView(lines, employees, logs, period, settings, section, query) {
    var rows = lines.slice(), byEmployee = Object.create(null), profiles = Object.create(null), awaiting = 0;
    lines.forEach(function (l) { byEmployee[l.employee_id] = true; });
    employees.forEach(function (e) {
      profiles[e.id] = e;
      if (!e.active || e.deleted_at || !C.inComputedGroup(e, settings) || byEmployee[e.id]) return;
      rows.push({ employee_id: e.id, emp_no: e.emp_no, display_name: e.display_name, position: e.position, bank_account: e.bank_account, awaitingCompute: true });
      byEmployee[e.id] = true; awaiting++;
    });
    var groups = C.partitionRegisterByLogs(rows, logs, period), q = String(query || '').trim().toLowerCase();
    function matches(l) {
      var e = profiles[l.employee_id] || {};
      return !q || [l.emp_no, l.display_name, l.position, e.department, l.bank_account, l.remarks].join(' ').toLowerCase().indexOf(q) >= 0;
    }
    var withLogs = groups.with_logs.filter(matches), noLogs = groups.no_logs.filter(matches);
    section = section === 'no_logs' ? 'no_logs' : 'with_logs';
    var visible = section === 'no_logs' ? noLogs : withLogs;
    function totals(items) {
      var out = {};
      ['days', 'basic', 'rdot', 'lh_pay', 'sh_pay', 'allowance', 'adjustment', 'gross', 'attendance_deduction', 'sss', 'phic', 'hdmf', 'cash_advance', 'gov_loan', 'company_loan', 'partial_payroll', 'others', 'total_deductions', 'net'].forEach(function (k) {
        out[k] = items.reduce(function (sum, l) {
          if (l.awaitingCompute) return sum;
          var value = k === 'gov_loan' ? C.round2((+l.sss_loan || 0) + (+l.hdmf_loan || 0)) : +l[k] || 0;
          return C.round2(sum + value);
        }, 0);
      });
      return out;
    }
    return { with_logs: groups.with_logs, no_logs: groups.no_logs, logged_days: groups.logged_days, section: section, visible: visible,
      counts: { with_logs: groups.with_logs.length, no_logs: groups.no_logs.length }, matches: { with_logs: withLogs.length, no_logs: noLogs.length },
      awaiting_compute: awaiting, full_totals: totals(lines), visible_totals: totals(visible) };
  }

  var VALIDATION_GROUP_LABELS = { office: 'Backend/Office', field: 'Field Technician', unknown: 'Unknown department' };
  function validationGroupKey(group) { return Object.prototype.hasOwnProperty.call(VALIDATION_GROUP_LABELS, group) ? group : 'field'; }
  function validationEmployeePool(employees, settings, alreadyScoped) {
    // Validator basic reads already enforce the server's computed pool and omit payroll_group.
    return employees.filter(function (e) { return !e.deleted_at && (alreadyScoped || C.inComputedGroup(e, settings)); });
  }
  function validationWizardRows(review, logs) {
    var rows = [], represented = Object.create(null), period = review.period;
    function storedEvidence(l) {
      var ev = l.evidence || {};
      return { date: l.work_date, personnel_id: ev.personnel_id || '—', employee_name: ev.employee_name || ev.name_on_device || ev.matched_as || null,
        punches: Array.isArray(ev.punches) ? ev.punches : [], time_in: ev.time_in || null, time_out: ev.time_out || null,
        late_minutes: ev.late_minutes == null ? null : ev.late_minutes, incomplete_pending: incompletePending(l), incomplete_issue: null };
    }
    (review.rows || []).forEach(function (a) { if (!a.log) return; represented[String(a.log.id)] = true; rows.push({ a: a, l: a.log }); });
    (review.manual_kept || []).forEach(function (l) { if (represented[String(l.id)]) return; represented[String(l.id)] = true; rows.push({ a: storedEvidence(l), l: l }); });
    (logs || []).forEach(function (l) {
      if (represented[String(l.id)] || l.work_date < period.period_start || l.work_date > period.period_end) return;
      represented[String(l.id)] = true;
      // Preserve actual attendance when current matching no longer represents its identity. It is display-only until corrected.
      var a = storedEvidence(l); a.employee_name = a.employee_name || l.employee_id;
      rows.push({ a: a, l: l, review_only: true });
    });
    return rows;
  }
  // Employee master IDs are the only group authority, including for device rows and missing evidence tasks.
  function validationGroupView(employees, rows, missing, group, directory) {
    group = validationGroupKey(group);
    var employeeById = {}, eligibleIds = {}, counts = {}, groupedRows = {}, groupedMissing = {}, groupedEmployees = {};
    Object.keys(VALIDATION_GROUP_LABELS).forEach(function (g) { counts[g] = { employees: 0, records: 0, pending: 0, missing: 0, missing_pending: 0 }; groupedRows[g] = []; groupedMissing[g] = []; groupedEmployees[g] = []; });
    (directory || employees).forEach(function (e) { employeeById[String(e.id)] = e; });
    employees.forEach(function (e) { eligibleIds[String(e.id)] = true; if (e.active !== false) { var g = C.attendanceGroup(e); groupedEmployees[g].push(e); counts[g].employees++; } });
    rows.forEach(function (x) { var l = x.l || x, g = C.attendanceGroup(employeeById[String(l.employee_id)]); groupedRows[g].push(x); counts[g].records++; if (!l.verified_at || incompletePending(l)) counts[g].pending++; });
    (missing || []).forEach(function (m) { var g = C.attendanceGroup(employeeById[String(m.employee_id)]); groupedMissing[g].push(m); counts[g].missing++; if (m.pending) counts[g].missing_pending++; });
    return { group: group, rows: groupedRows[group], missing: groupedMissing[group], employees: groupedEmployees[group], counts: counts,
      eligible_rows: groupedRows[group].filter(function (x) { var l = x.l || x; return !x.review_only && !!eligibleIds[String(l.employee_id)]; }),
      eligible_missing: groupedMissing[group].filter(function (m) { return !!eligibleIds[String(m.employee_id)]; }) };
  }
  function validationGroupChange(state, group) {
    group = validationGroupKey(group);
    if (validationGroupKey(state.group) === group) { state.group = group; return false; }
    state.group = group; state.selected = {}; state.batch = {}; state.batches = {}; state.confirmation = null; state.confirmKey = null; state.scope = null;
    return true;
  }
  function validationBatchScope(periodId, filter, group) { return JSON.stringify([periodId, filter, validationGroupKey(group)]); }
  function validationSelectedRows(rows, selected, employees, group, issue, directory) {
    var seen = {};
    return validationGroupView(employees, rows, [], group, directory).eligible_rows.filter(function (x) { var id = String(x.l.id); if (seen[id] || !selected[id] || incompleteIssue(x) !== issue) return false; seen[id] = true; return true; });
  }
  function validationBatchPayload(rows, selected, employees, group, issue, decision, hours, note, directory) {
    var chosen = validationSelectedRows(rows, selected, employees, group, issue, directory);
    if (!chosen.length) throw new Error('Select at least one compatible attendance record in this employee group');
    var payload = { ids: chosen.map(function (x) { return x.l.id; }), attendance_group: validationGroupKey(group), issue: issue, decision: decision };
    if (decision === 'custom_hours') payload.hours = Number(hours);
    if (String(note || '').trim()) payload.note = String(note).trim();
    return payload;
  }
  function validationGroupsHtml(prefix, group, counts, showEmployees) {
    return '<div class="hr-tabs" role="group" aria-label="Employee attendance group">' + Object.keys(VALIDATION_GROUP_LABELS).filter(function (g) { var c = counts[g]; return g !== 'unknown' || group === g || c.employees || c.records || c.missing; }).map(function (g) {
      var c = counts[g]; return '<button type="button" class="' + (group === g ? 'on' : '') + '" data-' + prefix + '-group="' + g + '" aria-pressed="' + (group === g) + '">' + VALIDATION_GROUP_LABELS[g] + ' <small>' + (showEmployees ? c.employees + ' employees · ' : '') + c.records + ' shown · ' + c.pending + ' pending' + (c.missing ? ' · ' + c.missing_pending + ' missing pending' : '') + '</small></button>';
    }).join('') + '</div>';
  }

  function driverAllowanceView(employees, logs, lines, allowances, settings, period) {
    settings = settings || {}; period = period || {};
    var rate = settings.driver_daily_allowance == null ? C.DEFAULT_SETTINGS.driver_daily_allowance : Number(settings.driver_daily_allowance) || 0;
    var totals = { deployments: 0, legacy_days: 0, units: 0, automatic: 0, manual: 0, total: 0 }, anyStale = false;
    var rows = employees.filter(function (e) { return !e.deleted_at && C.inComputedGroup(e, settings) && (e.active || e.date_ended && e.date_ended >= period.period_start); }).map(function (e) {
      var ls = logs.filter(function (l) { return l.employee_id === e.id && (!period.period_start || l.work_date >= period.period_start) && (!period.period_end || l.work_date <= period.period_end) && (!e.date_hired || l.work_date >= e.date_hired) && (!e.date_ended || l.work_date <= e.date_ended); }), deployments = 0, legacy = 0, units = 0, evidence = [], unknown = false;
      ls.forEach(function (l) {
        var u = C.driverUnitsForLog(l); deployments += u.actual; legacy += u.legacy; units += u.units;
        var d = l.evidence && l.evidence.driver_decision;
        if (d) { unknown = unknown || !!d.legacy_multiplicity_unknown; (d.deployments || []).filter(function (x) { return x.driver_employee_id === e.id || (x.employee_ids || []).indexOf(e.id) >= 0; }).forEach(function (x) { evidence.push(x); }); }
      });
      var saved = lines.find(function (l) { return l.employee_id === e.id; }), a = allowances.find(function (x) { return x.employee_id === e.id; }) || {};
      var manual = Number(a.amount) || 0, automatic = C.round2(units * rate), override = !!(saved && (saved.manual_fields || []).indexOf('allowance') >= 0);
      var stale = !!(saved && saved.payroll_stale), total = saved && (override || !stale) ? Number(saved.allowance) || 0 : C.round2(automatic + manual);
      anyStale = anyStale || stale;
      var row = { employee: e, days: ls.filter(function (l) { return C.driverUnitsForLog(l).units > 0; }).length, deployments: deployments, legacy_days: legacy, units: units,
        automatic: automatic, manual: manual, note: a.note || '', total: total, override: override, stale: stale, legacy_unknown: unknown, evidence: evidence, line_id: saved && saved.id };
      ['deployments', 'legacy_days', 'units', 'automatic', 'manual', 'total'].forEach(function (k) { totals[k] = C.round2(totals[k] + row[k]); });
      return row;
    });
    return { rows: rows, totals: totals, rate: rate, stale: anyStale };
  }
  function registerAllowanceEdit(raw) { return String(raw).trim() === '' ? { restore: true } : { restore: false, value: Number(String(raw).replace(/,/g, '')) || 0 }; }
  function fieldOpsSnapshot(input, currentOrg, periods, teamPrefix) {
    var m = input && input.extraction, uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    function reject() { throw new Error('Choose a complete, organization-scoped FieldOps export for this demo.'); }
    function dateOK(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d; }
    if (!m || !m.tenant_scoped || !uuid.test(m.org_id || '') || !m.team_prefix || !m.requested_range || !dateOK(m.requested_range.from) || !dateOK(m.requested_range.to) || m.requested_range.from > m.requested_range.to) reject();
    var org = m.org_id.toLowerCase();
    if (currentOrg && String(currentOrg).toLowerCase() !== org) reject();
    if (teamPrefix != null && m.team_prefix !== teamPrefix) reject();
    if ((periods || []).some(function (p) { return p.status !== 'locked' && (p.period_start < m.requested_range.from || p.period_end > m.requested_range.to); })) throw new Error('The dispatch export must cover every open payroll in this demo. Choose an export with the full date range.');
    ['attendance', 'jobs', 'gate_logs'].forEach(function (table) {
      var rows = input[table], info = m.tables && m.tables[table];
      if (!Array.isArray(rows) || !info || info.complete !== true || info.rows !== rows.length) reject();
      rows.forEach(function (r) { if (!r || typeof r !== 'object' || String(r.org_id || '').toLowerCase() !== org || String(table === 'attendance' ? r.username || '' : r.team || '').indexOf(m.team_prefix) !== 0) reject(); });
    });
    return { data: input, org: org, label: m.requested_range.from + ' → ' + m.requested_range.to };
  }
  function loadPayrollPeriod(api, period, options) {
    options = options || {};
    // Viewing a draft is read-only, even when its evidence changed. Compute is an explicit action.
    return (options.rates ? api.listLines(period.id) : Promise.resolve([])).then(function (lines) {
      return api.listLogs(period.period_start, period.period_end).then(function (logs) { return { lines: lines, logs: logs, recomputed: false }; });
    });
  }

  function integrationActionAllowed(o) {
    var c = o.capabilities && o.capabilities[o.action];
    return !!(c && c.supported === true && c.enabled === true && c.allowed === true && o.canEdit && o.me && o.me.can_see_rates && o.period && o.period.status !== 'locked');
  }
  function saveRegisterEdit(api, id, key, raw, canRestore) {
    // The RATE box does not write onto the payroll line. It records a DATED RATE STEP from the start
    // of the period (hr.set_line_rate), and Compute turns that into money — so the register can never
    // show a figure the pay rules did not produce, and the rate has one home, with history.
    if (key === 'daily_rate') {
      var rate = Number(String(raw).replace(/,/g, ''));
      if (!(rate > 0)) return Promise.reject(new Error('Daily rate must be more than zero'));
      return api.setLineRate(id, rate);
    }
    if (key === 'allowance' && registerAllowanceEdit(raw).restore) {
      if (!canRestore || typeof api.restoreAutomaticAllowance !== 'function') return Promise.reject(new Error('Automatic restoration is not available for this week. Enter an explicit amount or retain the current override.'));
      return api.restoreAutomaticAllowance(id);
    }
    var patch = {}; patch[key] = key === 'remarks' ? raw : Number(raw.replace(/,/g, '')) || 0;
    return api.setLine(id, patch);
  }
  // The server hands back the row it just recomputed — hr.set_ledger_basis returns the whole
  // contribution_ledger row, hr.set_line the whole payroll line with gross/total_deductions/net redone.
  // Patching that one row into the cache is therefore not an optimisation, it is using the answer we
  // already have instead of asking for all 106 again. Returns a new array: the tabs render from the
  // cache, and a mutated cache would make a stale render indistinguishable from a fresh one.
  function patchRows(rows, row, key, removeKey) {
    var out = (rows || []).slice();
    if (row == null) { return out.filter(function (x) { return x[key] !== removeKey; }); }
    var i = out.findIndex(function (x) { return x[key] === row[key]; });
    if (i < 0) { out.push(row); return out; }
    out[i] = Object.assign({}, out[i], row);
    return out;
  }
  // The verdict is informational: it decides whether a banner appears, never whether a write worked.
  // Until the migration lands hr.period_stale does not exist and this rejects (PGRST202), so a failure
  // here resolves to null — no banner — instead of making a save that SUCCEEDED look like it failed.
  // It can neither reject nor throw: a synchronous throw or a non-thenable return from periodStale is
  // caught by the same chain, so it cannot reach a save's .catch(fail) either.
  function staleOf(api, pid) {
    if (typeof api.periodStale !== 'function') return Promise.resolve(null);
    return Promise.resolve().then(function () { return api.periodStale(pid); })
      .then(function (st) { return st; }, function () { return null; });
  }
  function mount(rootEl, o) {
    var api = o.api, user = o.user || {}, deps = o.deps || {}, canEdit = deps.canEdit !== false;
    var toast = deps.toast || function (m) { console.log('[hr]', m); };
    var S = { tab: 'periods', me: null, periods: [], period: null, employees: [], holidays: [], settings: null, logs: [], unmatched: [], lines: [], loans: [], repRows: null, stale: null, staleTok: 0, filter: { q: '', dept: '', flags: false }, sel: {}, val: { date: yesterdayManila(), unv: false }, valLogs: [] };
    if (!document.getElementById('hrCss')) { var st = document.createElement('style'); st.id = 'hrCss'; st.textContent = CSS; document.head.appendChild(st); }
    rootEl.innerHTML = '<div class="hr"><div class="hr-tabs" id="hrTabs"></div><div id="hrBody"></div></div>';
    var $ = function (s) { return rootEl.querySelector(s); };
    // A tab sets its body to "Loading…" and then .catch(fail)s. Toasting alone left that placeholder on
    // screen for good, so a failed load looked like a hang instead of an error — which is exactly how the
    // RLS statement timeout reached HR as "the Payroll page never loads". A toast disappears; the card does not.
    function fail(e) {
      var msg = (e && e.message) || String(e);
      toast(msg); if (root.console) root.console.error(e);
      var b = $('#hrBody');
      if (b && /Loading…|Computing payroll…/.test(b.innerHTML)) {
        b.innerHTML = '<div class="hr-card"><h3>Could not load</h3><p>' + esc(msg) + '</p>' +
          (/statement timeout|canceling statement|cancelling statement/i.test(msg)
            ? '<p class="mut">The database gave up on the query. Report this — it is not something a retry fixes on its own.</p>' : '') +
          '<div class="hr-bar"><button class="hr-btn p" id="hrRetry">Try again</button></div></div>';
        var r = $('#hrRetry'); if (r) r.onclick = function () { render(); };
      }
    }
    function ro() { return !canEdit; }
    // A new hire starts at the minimum daily rate in force, not at a number frozen into the source.
    // This was hardcoded 695, which stopped being the minimum on 2026-09-26.
    function defaultRate() {
      var v = S.settings && S.settings.min_daily_rate;
      v = Number(v);
      return isFinite(v) && v > 0 ? v : Number(C.DEFAULT_SETTINGS.min_daily_rate) || 0;
    }
    // Amendment 1: an attendance validator who is not a payroll admin gets the Validate tab only — never a period chip, rate or money (admin RPCs would throw 'payroll admin only')
    function valOnly() { return !!(S.me && !S.me.is_admin && S.me.is_validator); }
    function validationEmployees() { return validationEmployeePool(S.employees, S.settings, valOnly()); }
    // owner 2026-09-22: rates / amounts only for the rate viewers (me().can_see_rates: is_super, or a role / username listed in Settings). A payroll admin without it keeps
    // Periods (no totals) · DTR · Validate · Unmatched · Employees (no rate, no loans) · Reports (attendance / holidays / audit) — the money tabs and fields are not rendered.
    function ratesOK() { return !!(S.me && S.me.can_see_rates); }
    // Owner 2026-10-13: seeing an amount and deciding it are different rights. The server decides
    // this (hr.can_edit_rates, HR Manager by default); the console only reflects it.
    function rateEditOK() { return !!(S.me && S.me.can_edit_rates) && !ro(); }
    var TABS = {};
    // D2: when an input moved after the last Compute, say so where the money is read. The verdict is
    // hr.period_stale's — the same one hr.lock_period refuses on — so it is true for every viewer and
    // survives a reload. It stays dark until that migration is applied (staleOf resolves to null).
    // refresh() RE-READS it rather than clearing it (a freshly computed week answers stale:false), and it is
    // ignored when it belongs to another week.
    // One predicate for "the week on screen has not caught up": the banner and the export/print gate both use it,
    // so a week that shows the warning is exactly the week whose paper is gated, and another week's verdict gates nothing.
    // Verdicts can outrun one another: a ↻ read issued before a cell save commits can land after it, and
    // switching the week can pair a verdict with another week's rows. So every request takes a ticket, and
    // only the latest ticket, still asking about the week on screen, may write S.stale — the shape of guard
    // the Reports month race already uses. A result that loses is dropped, never applied: going dark is what
    // disarms the export gate, and that must not happen by accident.
    function staleRead(pid) {
      var tok = ++S.staleTok;
      if (!pid) { S.stale = null; return Promise.resolve(null); }
      return staleOf(api, pid).then(function (st) {
        if (tok !== S.staleTok || !S.period || S.period.id !== pid) return S.stale;
        S.stale = st; return st;
      });
    }
    function staleHere() {
      if (!S.stale || !S.period || S.stale.period_id !== S.period.id) return false;
      // hr.invalidate_ledger_periods reopens a computed week and NULLS its computed_at whenever a monthly
      // basis is encoded (eighty of them in one sitting), and it leaves hr.payroll_lines untouched — so the
      // week answers never_computed while the Register still shows, exports and prints a full gross and net.
      // "computed_at cleared under a week that has money" is therefore a warning state. A week that was
      // never computed and has no lines shows no money at all, so it stays silent. The lines are already in
      // hand: asking the server per encode is exactly the refetch this slice removed.
      if (S.stale.never_computed) return S.lines.length > 0;
      return !!S.stale.stale;
    }
    // Why the week is behind, in one place, so the banner and the export gate cannot word it differently.
    // An invalidated week names no input at all (reasons is empty), where " changed after the last Compute"
    // would have read as a bug rather than as a warning.
    function staleWhy() {
      var rs = (S.stale && S.stale.reasons || []).filter(Boolean);
      return rs.length ? rs.join(', ') + ' changed after the last Compute' : 'the week was reopened after its last Compute';
    }
    // Asks before a figure that has not caught up leaves the screen: the Register's export and payslips, and the Allowances / Deductions sheets.
    function staleGate(what) {
      if (!staleHere()) return true;
      return confirm('Hindi pa nakuwenta ang linggong ito (' + staleWhy() +
        ').\n\nThe ' + what + ' will carry figures that are not final. Continue anyway?');
    }
    function staleBanner() {
      if (!staleHere()) return '';
      return '<div class="hr-warn">' +
        '<b>Hindi pa nakuwenta ang linggong ito.</b> ' + esc(staleWhy()) +
        ' — press Compute (on the Register or Allowance tab) to update the pay.</div>';
    }

    function loadMe() { return api.me().then(function (m) { S.me = m; if (valOnly()) S.tab = 'validate';
      return typeof api.integrationCapabilities === 'function' ? api.integrationCapabilities() : null;
    }).then(function (c) { S.capabilities = c; }); }
    function restoreOK() { return integrationActionAllowed({ capabilities: S.capabilities, action: 'restore_allowance', canEdit: canEdit, me: S.me, period: S.period }); }
    // Phase 0 (C1): LOCKED = FROZEN. The frozen ranges come from hr.locked_ranges (validator-callable), so the Validate tab can refuse the
    // click before it reaches the server — a validator never sees the Periods tab and cannot call listPeriods.
    function lockedDay(d) { return (S.lockedRanges || []).some(function (r) { return d >= r.period_start && d <= r.period_end; }); }
    function loadBase() {
      if (valOnly()) return Promise.all([api.listEmployeesBasic(), api.listHolidays(), api.lockedRanges()]).then(function (r) { S.employees = r[0]; S.holidays = r[1]; S.lockedRanges = r[2]; });
      // the delete requests ride along with the base load; an older backend simply has none
      return Promise.all([api.listPeriods(), api.listEmployees({}), api.listHolidays(), api.getSettings(), api.listUnmatched(), api.lockedRanges(),
                          typeof api.listPeriodDeleteRequests === 'function' ? api.listPeriodDeleteRequests().catch(function () { return []; }) : []])
        .then(function (r) { S.periods = r[0]; S.employees = r[1]; S.holidays = r[2]; S.settings = r[3]; S.unmatched = r[4]; S.lockedRanges = r[5]; S.delReq = r[6] || []; if (!S.period && S.periods[0]) S.period = S.periods[0]; else if (S.period) S.period = S.periods.find(function (p) { return p.id === S.period.id; }) || S.periods[0]; });
    }
    function loadPeriodData() {
      if (valOnly() || !S.period) { S.logs = []; S.lines = []; return Promise.resolve(); }
      // rates gate: payroll lines are money — a non-rate-viewer never asks for them (listLines would refuse)
      return loadPayrollPeriod(api, S.period, { rates: ratesOK(), editable: !ro() }).then(function (r) {
        S.logs = r.logs; S.lines = r.lines;
        if (r.recomputed) return api.listPeriods().then(function (periods) { S.periods = periods; S.period = periods.find(function (p) { return p.id === S.period.id; }) || S.period; });
      });
    }
    // refresh() is the whole-page reload, and it is where roughly twenty-eight writes end — including
    // api.setLog, markPresent, moveLog, buildLogs, verifyLogs, resolveUnmatched, saveEmployee (a daily rate),
    // saveSettings (the minimum wage) and the employee delete / restore, every one of which makes the week
    // MORE stale. It used to clear S.stale, so one of those writes took the banner down and DISARMED the
    // export gate at the moment the week fell further behind. It reads the verdict instead: the four Compute
    // call sites that also end here get their banner cleared because a computed week answers stale:false,
    // not because this function assumed it. One RPC on a function that already does several reads.
    function refresh() { return loadMe().then(loadBase).then(loadPeriodData).then(function () { return staleRead(S.period && S.period.id); }).then(render).catch(fail); }
    function render() { renderTabs(); (TABS[S.tab] || TABS[valOnly() ? 'validate' : 'periods'])(); if (o.onBadge && !valOnly()) o.onBadge(S.unmatched.length); }
    function renderTabs() {
      var MONEY_TABS = { register: 1, allowance: 1, deductions: 1, newpay: 1 };
      var tabs = valOnly() ? [['validate', 'Validate']] : (bioOK() && !ro() ? [['newpay', '＋ New Payroll']] : []).concat([['periods', 'Periods'], ['dtr', 'DTR'], ['validate', 'Validate'], ['unmatched', 'Unmatched', S.unmatched.length], ['register', 'Register'], ['allowance', 'Allowance'], ['deductions', 'Deductions'], ['employees', 'Employees'], ['reports', 'Reports']]);
      if (!ratesOK()) { tabs = tabs.filter(function (t) { return !MONEY_TABS[t[0]]; }); if (MONEY_TABS[S.tab]) S.tab = 'periods'; }
      $('#hrTabs').innerHTML = tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + (t[0] === 'newpay' ? ' hr-newpay' : '') + '">' + t[1] + (t[2] ? '<b class="n">' + t[2] + '</b>' : '') + '</button>'; }).join('') +
        '<span style="margin-left:auto;font-size:11px;color:#8a9894">' + (valOnly() ? '✓ attendance validator · <b>' + esc(S.me.username) + '</b>' : S.period ? 'Period <b>' + esc(periodLabel(S.period)) + '</b> · week ' + S.period.week_of_month + ' · <span class="hr-chip ' + esc(S.period.status) + '">' + esc(S.period.status) + '</span>' : 'no period') + (ro() ? ' · 👁 view only' : '') + '</span>';
      rootEl.querySelectorAll('#hrTabs button').forEach(function (b) { b.onclick = function () { if (b.dataset.tab === 'newpay' && S.tab !== 'newpay' && S.wiz && S.wiz.review && S.wiz.review.period.status === 'locked') S.wiz = null; S.tab = b.dataset.tab; render(); }; });
    }
    function emp(id) { return S.employees.find(function (e) { return e.id === id; }) || {}; }
    // Amendment 4: the attendance / payroll pool = settings.computed_group ('AHBA'); other payroll groups (Employees → Payroll group) exist only for the Mandatory summary.
    // A validator's employee list (employees_basic) is already the pool; for an admin S.employees carries every group, so every attendance / pay tab filters here.
    function inPool(e) { return C.inComputedGroup(e, S.settings); }
    function groups() { var g = S.settings && Array.isArray(S.settings.payroll_groups) ? S.settings.payroll_groups.filter(Boolean) : []; return g.length ? g : C.DEFAULT_SETTINGS.payroll_groups.slice(); }
    function computedGroup() { return S.settings && S.settings.computed_group ? String(S.settings.computed_group) : C.DEFAULT_SETTINGS.computed_group; }
    function periodSelect() { return '<select id="hrPer">' + S.periods.map(function (p) { return '<option value="' + p.id + '"' + (S.period && S.period.id === p.id ? ' selected' : '') + '>' + esc(periodLabel(p)) + ' · ' + esc(p.status) + '</option>'; }).join('') + '</select>'; }
    function bindPeriodSelect() { var s = $('#hrPer'); if (s) s.onchange = function () { S.period = S.periods.find(function (p) { return p.id === s.value; }); loadPeriodData().then(render).catch(fail); }; }
    // The one trigger for re-reading (owner 2026-10-14: nothing refreshes by itself, the user asks). Register, Allowance, Deductions and
    // Reports each put this button in their bar; only one tab is on screen at a time, so one id cannot collide. On the three period tabs the
    // week's rows and the staleness verdict are read together, or the banner would keep showing a verdict from minutes ago. These tabs stay
    // on screen while the read runs, so a failed read re-enables the button: a dead button would leave no way to retry.
    // It reads the BASE too (periods, employees, settings, unmatched, locked ranges), not only the week's lines
    // and logs — "it re-reads everything", as the trigger's own title promises. The period's STATUS decides the
    // chip, the Lock button and whether the yellow cells are editable at all; S.employees decides which roster
    // members are listed as awaiting Compute (Register) and who has a row (Allowance / Deductions); S.settings
    // carries the computed group and the per-deployment allowance rate the Allowance tab prints. Without the base
    // read, a week someone else had LOCKED kept its computed chip, its Lock button and its editable cells however
    // many times this was pressed — until the whole page was reloaded.
    var REREAD = '<button class="hr-btn" id="hrReread" title="Read every value again from the server — for when someone else has edited, or after a Compute">↻ Update values</button>';
    function bindReread() {
      var rr = $('#hrReread'); if (!rr) return;
      rr.onclick = function () {
        rr.disabled = true;
        loadBase().then(loadPeriodData).then(function () { return staleRead(S.period && S.period.id); })
          .then(function () { render(); })
          .catch(function (e) { rr.disabled = false; fail(e); });
      };
    }

    // ---------- Periods ----------
    TABS.periods = function () {
      var next = S.periods[0] ? C.periodFor(C.addDays(S.periods[0].period_end, 1)) : C.periodFor(new Date().toISOString().slice(0, 10));
      $('#hrBody').innerHTML = '<div class="hr-card"><h3>Pay periods</h3><div class="hr-bar">' +
        (bioOK() && !ro() ? '<button class="hr-btn p hr-newpay" id="hrNewPay" title="Upload the ZKTeco Daily Attendance Details export → match → review → preview → approve">＋ Create New Payroll (upload biometric attendance)</button>' : '') +
        (ro() ? '' : '<button class="hr-btn" id="hrNewPer">+ Empty period (' + esc(fmtDate(next.period_start)) + ' – ' + esc(fmtDate(next.period_end)) + ')</button>') +
        '</div><div class="hr-scroll"><table class="hr-t"><thead><tr><th>Period</th><th>Pay date</th><th>Week of month</th><th>Principal</th><th>Attendance</th><th>Status</th><th class="r">Headcount</th><th class="r">Gross</th><th class="r">Net</th><th></th></tr></thead><tbody>' +
        S.periods.map(function (p) { return '<tr><td><b>' + esc(periodLabel(p)) + '</b></td><td>' + esc(fmtDate(p.pay_date)) + '</td><td>' + (ro() || p.status === 'locked' ? p.week_of_month : '<select data-wom="' + p.id + '">' + [1, 2, 3, 4, 5].map(function (w) { return '<option' + (w === p.week_of_month ? ' selected' : '') + '>' + w + '</option>'; }).join('') + '</select>') + '</td><td>' + esc(p.principal || '') + '</td><td>' + (p.attendance_source === 'biometric' ? '<span class="hr-src" title="' + esc(p.bio ? p.bio.file_name + ' · imported ' + String(p.bio.imported_at || '').slice(0, 16).replace('T', ' ') + ' by ' + p.bio.imported_by : '') + '">🧬 biometric</span>' : '<span class="mut">FieldOps</span>') + '</td><td><span class="hr-chip ' + esc(p.status) + '">' + esc(p.status) + '</span></td><td class="r">' + (p.headcount == null ? '—' : p.headcount) + '</td><td class="r">' + (p.gross == null ? '—' : money(p.gross)) + '</td><td class="r">' + (p.net == null ? '—' : money(p.net)) + '</td><td><button class="hr-btn" data-open="' + p.id + '">Open</button>' + (p.attendance_source === 'biometric' && bioOK() ? ' <button class="hr-btn p" data-wiz="' + p.id + '">Review &amp; approve</button>' : ro() ? '' : ' <button class="hr-btn" data-rebuild="' + p.id + '">Rebuild logs</button>')
            + (ro() || p.status === 'locked' ? '' : ' <button class="hr-btn d" data-delreq="' + p.id + '" title="Ask a superadmin to delete this week so it can be done again. A locked week must be reopened first — reopening is what puts the loan balances and the contribution ledger back.">Request delete</button>') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p style="font-size:11px;color:#8a9894">Week of month = ceil(day of period end ÷ 7); drives the deduction calendar (1st &amp; 3rd gov loans · 2nd PHIC + Pag-IBIG · 4th SSS · weekly CA + company loan). Editable until locked.</p></div>';
      var pend = (S.delReq || []).filter(function (r) { return r.status === 'pending'; });
      if (pend.length) {
        var box = document.createElement('div');
        box.className = 'hr-warn';
        box.innerHTML = '<b>' + pend.length + ' payroll week' + (pend.length > 1 ? 's' : '') + ' waiting to be deleted</b>' +
          '<table class="hr-t" style="margin-top:6px"><thead><tr><th>Week</th><th>Asked by</th><th>Reason</th><th>State</th><th></th></tr></thead><tbody>' +
          pend.map(function (r) {
            return '<tr><td><b>' + esc(r.period || '') + '</b> <span class="hr-chip ' + esc(r.period_status || '') + '">' + esc(r.period_status || '') + '</span></td>' +
              '<td>' + esc(r.requested_by || '') + '<br><small class="mut">' + esc(String(r.requested_at || '').slice(0, 16).replace('T', ' ')) + '</small></td>' +
              '<td style="white-space:normal;max-width:280px">' + esc(r.reason || '') + '</td>' +
              '<td>' + (r.stale ? '<span style="color:#8a2f2f">the week changed since this was asked — ask again</span>' : 'unchanged since asked') + '</td>' +
              '<td style="white-space:nowrap">' +
                (r.can_decide && !r.stale ? '<button class="hr-btn p" data-delok="' + r.id + '">Approve &amp; delete</button> <button class="hr-btn" data-delno="' + r.id + '">Reject</button>' : '') +
                ' <button class="hr-btn" data-delcancel="' + r.id + '">Withdraw</button></td></tr>';
          }).join('') + '</tbody></table>' +
          '<p style="font-size:11px">Deleting keeps a full copy of the week — the period, every line, allowance and deduction — in the audit log. Only the dates are freed, so the week can be done again.</p>';
        $('#hrBody').insertBefore(box, $('#hrBody').firstChild);
      }
      rootEl.querySelectorAll('[data-delreq]').forEach(function (b) { b.onclick = function () {
        var p2 = S.periods.find(function (x) { return x.id === b.dataset.delreq; });
        var why = root.prompt('Why should the week ' + periodLabel(p2) + ' be deleted? A superadmin will see this.');
        if (!why || !why.trim()) return;
        api.requestPeriodDelete(b.dataset.delreq, why.trim()).then(function () { toast('Asked. A superadmin has to approve it.'); return refresh(); }).catch(fail);
      }; });
      rootEl.querySelectorAll('[data-delok]').forEach(function (b) { b.onclick = function () {
        var r = (S.delReq || []).find(function (x) { return x.id === b.dataset.delok; });
        if (!root.confirm('Delete the payroll week ' + (r && r.period) + '?\n\nIts lines, allowances and deductions go. A full copy is kept in the audit log. This cannot be undone from the console.')) return;
        b.disabled = true;
        api.decidePeriodDelete(b.dataset.delok, true, root.prompt('Note for the record (optional):') || null)
          .then(function (x) { toast('Deleted ' + (x && x.period) + ' · ' + (x && x.lines_removed) + ' line(s) · copy kept in the audit log'); S.period = null; return refresh(); })
          .catch(function (e) { b.disabled = false; fail(e); });
      }; });
      rootEl.querySelectorAll('[data-delno]').forEach(function (b) { b.onclick = function () {
        var why = root.prompt('Why is this being refused?'); if (why === null) return;
        api.decidePeriodDelete(b.dataset.delno, false, why).then(function () { toast('Refused'); return refresh(); }).catch(fail);
      }; });
      rootEl.querySelectorAll('[data-delcancel]').forEach(function (b) { b.onclick = function () {
        api.cancelPeriodDelete(b.dataset.delcancel).then(function () { toast('Withdrawn'); return refresh(); }).catch(fail);
      }; });
      var np = $('#hrNewPay'); if (np) np.onclick = function () { wizStart(null, 1); };
      rootEl.querySelectorAll('[data-wiz]').forEach(function (b) { b.onclick = function () { wizStart(b.dataset.wiz, 2); }; });
      var nb = $('#hrNewPer'); if (nb) nb.onclick = function () { api.createPeriod({ period_start: next.period_start, period_end: next.period_end, principal: S.periods[0] ? S.periods[0].principal : 'SKY CABLE' }).then(function (p) { S.period = p; return refresh(); }).then(function () { toast('Period created'); }).catch(fail); };
      rootEl.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { S.period = S.periods.find(function (p) { return p.id === b.dataset.open; }); S.tab = 'dtr'; loadPeriodData().then(render).catch(fail); }; });
      rootEl.querySelectorAll('[data-rebuild]').forEach(function (b) { b.onclick = function () { var p = S.periods.find(function (x) { return x.id === b.dataset.rebuild; }); b.disabled = true; api.buildLogs(p.period_start, p.period_end).then(function (r) { toast('Built ' + r.built + ' logs · ' + r.unmatched + ' unmatched' + (r.skipped_locked ? ' · ' + r.skipped_locked + ' day(s) skipped (locked)' : '')); return refresh(); }).catch(fail); }; });
      rootEl.querySelectorAll('[data-wom]').forEach(function (s) { s.onchange = function () { api.updatePeriod(s.dataset.wom, { week_of_month: Number(s.value) }).then(refresh).catch(fail); }; });
    };

    // ---------- DTR ----------
    function logsFor(eid) { return S.logs.filter(function (l) { return l.employee_id === eid; }); }
    function cellClass(l, day) { if (!l) return ''; var k = l.source + ' ' + (l.hours_rd > 0 ? 'rd' : l.day_kind !== 'regular' ? l.day_kind : '') + (l.flag ? ' flag' : '') + (l.flag === 'fuzzy_name' ? ' fuzzy' : '') + (l.override_at ? ' ov' : ''); return k; }
    // flag → words: fuzzy_name = the builder's typo-tolerant match (evidence.matched_as = the crew's spelling) — a ✓ confirms it and learns the alias
    function flagText(l) { if (!l || !l.flag) return ''; return l.flag === 'fuzzy_name' ? 'similar name: typed ' + String(l.evidence && l.evidence.matched_as || '?') : l.flag; }
    function cellText(l) { if (!l) return ''; var h = Number(l.hours_reg) + Number(l.hours_rd) + Number(l.hours_lh) + Number(l.hours_sh); return h ? String(h) : '0'; }
    TABS.dtr = function () {
      if (!S.period) { $('#hrBody').innerHTML = '<div class="hr-card">Create a period first.</div>'; return; }
      var days = C.datesBetween(S.period.period_start, S.period.period_end), f = S.filter, locked = S.period.status === 'locked';
      var emps = S.employees.filter(function (e) { return e.active && inPool(e) && (!f.dept || e.department === f.dept) && (!f.q || e.display_name.toLowerCase().indexOf(f.q.toLowerCase()) >= 0) && (!f.flags || logsFor(e.id).some(function (l) { return l.flag; })); });
      var html = (S.unmatched.length ? '<div class="hr-warn">⚑ ' + S.unmatched.length + ' unmatched crew name' + (S.unmatched.length > 1 ? 's' : '') + ' — <a href="#" id="hrGoUn">resolve</a> so their days are credited.</div>' : '') +
        '<div class="hr-card"><div class="hr-bar">' + periodSelect() + '<input id="hrQ" placeholder="Search name" value="' + esc(f.q) + '"><select id="hrDept"><option value="">All departments</option><option value="field"' + (f.dept === 'field' ? ' selected' : '') + '>Field</option><option value="office"' + (f.dept === 'office' ? ' selected' : '') + '>Office</option></select><label><input type="checkbox" id="hrFlags"' + (f.flags ? ' checked' : '') + '> flags only</label>' +
        (ro() || locked ? '' : '<button class="hr-btn" id="hrBuild">↻ Rebuild logs</button><button class="hr-btn p" id="hrMark">✓ Mark present (selected)</button>') + '</div>' +
        '<div class="hr-legend"><span><i style="background:#e7f7ef"></i>team declaration</span><span><i style="background:#e3f0ff"></i>console punch</span><span><i style="background:#fff3cd"></i>manual</span><span><i style="background:#eaf2ff"></i>biometric upload (<small style="color:#b8600a">−h</small> = late / half-day deduction)</span><span><i style="outline:2px solid #c2503a;outline-offset:-2px"></i>legal holiday</span><span><i style="outline:2px solid #9a6200;outline-offset:-2px"></i>special holiday</span><span><i style="outline:2px solid #6b3fa0;outline-offset:-2px"></i>rest-day OT</span><span>⚑ flag</span><span><i style="outline:2px dashed #e0891a;outline-offset:-2px"></i>similar name — confirm in Validate</span><span>✎ overridden</span><span><small style="color:#0b6b4d">✓</small> verified</span></div>' +
        '<div class="hr-scroll dtr"><table class="hr-t"><thead><tr><th><input type="checkbox" id="hrAll"></th><th>Employee</th>' + days.map(function (d) { var k = C.classifyDay(d, S.holidays); return '<th class="r" style="text-align:center' + (k !== 'regular' ? ';color:' + (k === 'legal' ? '#c2503a' : '#9a6200') : '') + '">' + dow(d) + '<br>' + esc(fmtDate(d)) + '</th>'; }).join('') + '<th class="r">REG</th><th class="r">RD OT</th><th class="r">L.H</th><th class="r">S.H</th></tr></thead><tbody>' +
        emps.map(function (e) {
          var ls = logsFor(e.id), t = { reg: 0, rd: 0, lh: 0, sh: 0 }; ls.forEach(function (l) { t.reg += +l.hours_reg; t.rd += +l.hours_rd; t.lh += +l.hours_lh; t.sh += +l.hours_sh; });
          return '<tr><td><input type="checkbox" data-sel="' + e.id + '"' + (S.sel[e.id] ? ' checked' : '') + '></td><td class="name">' + esc(e.display_name) + (e.status_tag ? ' <small style="color:#8a9894">[' + esc(e.status_tag) + ']</small>' : '') + '</td>' +
            days.map(function (d) { var l = ls.find(function (x) { return x.work_date === d; }); return '<td class="c ' + cellClass(l, d) + '" data-cell="' + e.id + '|' + d + '" title="' + esc(l ? (l.source + (l.evidence && l.evidence.team ? ' · ' + l.evidence.team : '') + (l.evidence && l.evidence.gate_out ? ' · gate-out ✓' : '') + (l.is_driver ? ' · driver' : '') + (l.flag ? ' · ' + flagText(l) : '') + (l.source === 'biometric' && l.evidence ? ' · in ' + String(l.evidence.time_in || '—').slice(0, 5) + ' out ' + String(l.evidence.time_out || '—').slice(0, 5) + (l.evidence.late_minutes > 0 ? ' · late ' + l.evidence.late_minutes + ' min' : '') : '') + (+l.late_deduct_hours ? ' · deduct ' + l.late_deduct_hours + ' h' : '') + (l.override_reason ? ' · ' + l.override_reason : '') + (l.verified_at ? ' · verified by ' + l.verified_by : ' · unverified')) : 'absent') + '">' + (l && l.verified_at ? '<small class="vk">✓</small>' : '') + cellText(l) + (l && +l.late_deduct_hours ? '<small class="lt">−' + (+l.late_deduct_hours) + 'h</small>' : '') + '</td>'; }).join('') +
            '<td class="r">' + t.reg + '</td><td class="r">' + t.rd + '</td><td class="r">' + t.lh + '</td><td class="r">' + t.sh + '</td></tr>';
        }).join('') + '</tbody></table></div><p style="font-size:11px;color:#8a9894">' + emps.length + ' employees · click a cell to set hours / move to a column · rebuild never overwrites ✎ cells.</p></div>';
      $('#hrBody').innerHTML = html; bindPeriodSelect();
      var g = $('#hrGoUn'); if (g) g.onclick = function (ev) { ev.preventDefault(); S.tab = 'unmatched'; render(); };
      $('#hrQ').oninput = function () { f.q = this.value; TABS.dtr(); }; $('#hrDept').onchange = function () { f.dept = this.value; TABS.dtr(); }; $('#hrFlags').onchange = function () { f.flags = this.checked; TABS.dtr(); };
      $('#hrAll').onchange = function () { var on = this.checked; emps.forEach(function (e) { S.sel[e.id] = on; }); TABS.dtr(); };
      rootEl.querySelectorAll('[data-sel]').forEach(function (cb) { cb.onchange = function () { S.sel[cb.dataset.sel] = cb.checked; }; });
      var bb = $('#hrBuild'); if (bb) bb.onclick = function () { bb.disabled = true; api.buildLogs(S.period.period_start, S.period.period_end).then(function (r) { toast('Built ' + r.built + ' · ' + r.unmatched + ' unmatched' + (r.skipped_locked ? ' · ' + r.skipped_locked + ' day(s) skipped (locked)' : '')); return refresh(); }).catch(fail); };
      var mb = $('#hrMark'); if (mb) mb.onclick = function () {
        var ids = Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); if (!ids.length) return toast('Tick employees first');
        openModal('<h3>Mark present</h3><p>' + ids.length + ' employee(s) · tick the dates:</p>' + days.map(function (d) { return '<label style="display:inline-block;margin:4px 10px 4px 0"><input type="checkbox" name="d" value="' + d + '" checked> ' + dow(d) + ' ' + esc(fmtDate(d)) + '</label>'; }).join('') + '<p style="font-size:11px;color:#8a9894">Creates manual 8-hour logs only where no log exists (holiday dates go to the L.H / S.H column automatically).</p><div class="hr-bar"><button class="hr-btn p" id="mOk">Mark present</button><button class="hr-btn" id="mNo">Cancel</button></div>',
          function (box) { box.querySelector('#mOk').onclick = function () { var ds = Array.prototype.map.call(box.querySelectorAll('[name=d]:checked'), function (x) { return x.value; }); api.markPresent(ids, ds).then(function (n) { toast(n + ' logs created'); S.sel = {}; closeModal(); return refresh(); }).catch(fail); }; box.querySelector('#mNo').onclick = closeModal; });
      };
      if (!ro() && !locked) rootEl.querySelectorAll('[data-cell]').forEach(function (td) { td.onclick = function (ev) { var p = td.dataset.cell.split('|'); openCellPop(ev, p[0], p[1]); }; });
    };
    function openCellPop(ev, eid, day) {
      closePop(); var l = S.logs.find(function (x) { return x.employee_id === eid && x.work_date === day; }) || {}, kind = C.classifyDay(day, S.holidays);
      var cur = l.hours_rd > 0 ? 'rd' : l.hours_lh > 0 ? 'lh' : l.hours_sh > 0 ? 'sh' : 'reg', hours = cellText(l) || '8';
      var pop = document.createElement('div'); pop.className = 'hr-pop'; pop.id = 'hrPop';
      pop.innerHTML = '<b>' + esc(emp(eid).display_name) + '</b><br><small>' + dow(day) + ' ' + esc(fmtDate(day)) + ' · ' + kind + (l.source ? ' · ' + l.source : ' · absent') + (l.evidence && l.evidence.team ? ' · ' + esc(l.evidence.team) : '') + '</small>' +
        '<label>Hours</label><div class="row">' + [8, 4, 0].map(function (h) { return '<button class="hr-btn' + (String(h) === hours ? ' p' : '') + '" data-h="' + h + '">' + h + '</button>'; }).join('') + '<input id="pH" type="number" step="0.5" min="0" max="16" value="' + esc(hours) + '" style="width:70px"></div>' +
        '<label>Column</label><select id="pCol"><option value="reg"' + (cur === 'reg' ? ' selected' : '') + '>Regular</option><option value="rd"' + (cur === 'rd' ? ' selected' : '') + '>Rest day OT (130%)</option><option value="lh"' + (cur === 'lh' ? ' selected' : '') + '>Legal holiday (200%)</option><option value="sh"' + (cur === 'sh' ? ' selected' : '') + '>Special holiday (130%)</option></select>' +
        '<label>Reason (HR discretion)</label><input id="pWhy" value="' + esc(l.override_reason || '') + '" placeholder="e.g. half day — left at noon">' +
        '<div class="row"><button class="hr-btn p" id="pOk">Save</button><button class="hr-btn" id="pNo">Cancel</button></div>';
      document.body.appendChild(pop); var x = Math.min(ev.clientX, window.innerWidth - 300), y = Math.min(ev.clientY, window.innerHeight - 320); pop.style.left = x + 'px'; pop.style.top = y + 'px';
      pop.querySelectorAll('[data-h]').forEach(function (b) { b.onclick = function () { pop.querySelector('#pH').value = b.dataset.h; }; });
      pop.querySelector('#pNo').onclick = closePop;
      pop.querySelector('#pOk').onclick = function () {
        var h = Number(pop.querySelector('#pH').value) || 0, col = pop.querySelector('#pCol').value, patch = { hours_reg: 0, hours_rd: 0, hours_lh: 0, hours_sh: 0, override_reason: pop.querySelector('#pWhy').value || null };
        patch['hours_' + col] = h;
        api.setLog(eid, day, patch).then(function () { closePop(); return loadPeriodData(); }).then(render).catch(fail);
      };
      setTimeout(function () { document.addEventListener('mousedown', outside); }, 0);
      function outside(e) { if (!pop.contains(e.target)) closePop(); }
      pop._outside = outside;
    }
    function closePop() { var p = document.getElementById('hrPop'); if (p) { document.removeEventListener('mousedown', p._outside); p.remove(); } }
    function openModal(html, bind) { closeModal(); var m = document.createElement('div'); m.className = 'hr-modal'; m.id = 'hrModal'; m.innerHTML = '<div class="box">' + html + '</div>'; document.body.appendChild(m); m.onclick = function (e) { if (e.target === m) closeModal(); }; if (bind) bind(m.querySelector('.box')); }
    function closeModal() { var m = document.getElementById('hrModal'); if (m) m.remove(); }

    // Shared inline batch form. Both views constrain the period, current filter and employee master group.
    function renderIncompleteBatch(hostId, cfg) {
      var host = $('#' + hostId), state = cfg.state, seen = {};
      if (!host || !api.reviewIncompleteBiometric || !cfg.act) return;
      var compatible = validationGroupView(validationEmployees(), cfg.rows, [], cfg.group, S.employees).eligible_rows.filter(function (x) { var id = String(x.l.id); if (!incompleteIssue(x) || seen[id]) return false; seen[id] = true; return true; });
      if (state.scope !== cfg.scope) { state.scope = cfg.scope; state.selected = {}; }
      state.selected = state.selected || {}; state.decision = state.decision || 'full_day'; state.note = state.note || '';
      if (!compatible.length) { state.selected = {}; host.innerHTML = ''; return; }
      var counts = { missing_time_out: 0, missing_time_in: 0 };
      compatible.forEach(function (x) { counts[incompleteIssue(x)]++; });
      if (!counts[state.issue]) { state.issue = counts.missing_time_out ? 'missing_time_out' : 'missing_time_in'; state.selected = {}; }
      var visible = compatible.filter(function (x) { return incompleteIssue(x) === state.issue; }), allowed = {};
      visible.forEach(function (x) { allowed[String(x.l.id)] = true; });
      Object.keys(state.selected).forEach(function (id) { if (!allowed[id]) delete state.selected[id]; });
      var shiftHours = cfg.hoursPerDay != null ? cfg.hoursPerDay : visible[0].l.hours_per_day != null ? visible[0].l.hours_per_day : S.settings && S.settings.hours_per_day != null ? S.settings.hours_per_day : C.DEFAULT_SETTINGS.hours_per_day;
      var hpd = Number(shiftHours), p = hostId;
      var labels = { missing_time_out: 'Missing Time Out', missing_time_in: 'Missing Time In' };
      var decisionLabels = { full_day: 'Full day', half_day: 'Half day', custom_hours: 'Custom hours' };
      host.innerHTML = '<form class="hr-batch" id="' + p + 'Form"><h4>Review incomplete punches together · ' + VALIDATION_GROUP_LABELS[validationGroupKey(cfg.group)] + '</h4><p class="mut">Choose one issue, select records, then confirm the hours. The preset records your decision and reviewer details; a shared note is optional.</p>' +
        '<div class="hr-bar"><label for="' + p + 'Issue">Issue</label><select id="' + p + 'Issue">' + ['missing_time_out', 'missing_time_in'].map(function (issue) { return '<option value="' + issue + '"' + (issue === state.issue ? ' selected' : '') + '>' + labels[issue] + ' (' + counts[issue] + ')</option>'; }).join('') + '</select>' +
        '<span class="mut">' + (state.issue === 'missing_time_out' ? 'One valid morning Time In; Time Out missing.' : 'One valid afternoon Time Out; Time In missing and lateness unknown.') + '</span></div>' +
        '<div class="hr-bar"><label><input type="checkbox" id="' + p + 'All"> Select all ' + visible.length + ' compatible records shown</label><span class="mut" id="' + p + 'Count"></span></div>' +
        '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>Select</th><th>Date</th><th>Employee</th><th>Time In</th><th>Time Out</th><th class="r">Provisional hours</th><th class="r">Existing lateness</th></tr></thead><tbody>' + visible.map(function (x) { var l = x.l, ev = l.evidence || {}, a = x.a || ev, name = a.employee_name || emp(l.employee_id).display_name || l.employee_id, h = ['hours_reg', 'hours_rd', 'hours_lh', 'hours_sh'].reduce(function (s, k) { return s + (Number(l[k]) || 0); }, 0); return '<tr><td><input type="checkbox" data-inc-select="' + esc(l.id) + '" aria-label="Select ' + esc(name + ' ' + l.work_date) + '"' + (state.selected[String(l.id)] ? ' checked' : '') + '></td><td>' + esc(fmtDate(l.work_date)) + '</td><td>' + esc(name) + '</td><td>' + esc(t5(a.time_in)) + '</td><td>' + esc(t5(a.time_out)) + '</td><td class="r">' + h + ' h</td><td class="r">' + (Number(l.late_deduct_hours) || 0) + ' h</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="hr-bar" style="margin-top:10px"><label for="' + p + 'Decision">Confirm presence as</label><select id="' + p + 'Decision">' + [['full_day', 'Full day · ' + hpd + ' h'], ['half_day', 'Half day · ' + hpd / 2 + ' h'], ['custom_hours', 'Custom hours']].map(function (v) { return '<option value="' + v[0] + '"' + (state.decision === v[0] ? ' selected' : '') + '>' + v[1] + '</option>'; }).join('') + '</select>' +
        '<label id="' + p + 'CustomWrap"' + (state.decision === 'custom_hours' ? '' : ' hidden') + '>Hours per record <input id="' + p + 'Hours" type="number" min="0.01" max="' + hpd + '" step="0.01" value="' + esc(state.hours == null ? hpd : state.hours) + '"></label></div>' +
        '<label for="' + p + 'Note">Shared note (optional)</label><textarea id="' + p + 'Note" rows="2" placeholder="Additional evidence or context for these records">' + esc(state.note) + '</textarea>' +
        '<div class="hr-batch-summary" id="' + p + 'Summary" aria-live="polite"></div><div class="hr-bar"><button class="hr-btn p" type="button" id="' + p + 'Review">Review selected</button><button class="hr-btn" type="button" id="' + p + 'Clear">Clear selection</button></div>' +
        '<div class="hr-batch-confirm" id="' + p + 'Confirm" hidden><b>Confirm this attendance decision</b><div class="hr-batch-summary" id="' + p + 'Final"></div><div class="hr-bar"><button class="hr-btn p" type="submit" id="' + p + 'Apply">Apply to selected records</button><button class="hr-btn" type="button" id="' + p + 'Cancel">Cancel</button></div></div></form>';
      var form = host.querySelector('form'), find = function (suffix) { return host.querySelector('#' + p + suffix); }, confirmKey = null;
      function selectedRows() { return validationSelectedRows(visible, state.selected, validationEmployees(), cfg.group, state.issue, S.employees); }
      function read() { state.decision = find('Decision').value; state.hours = find('Hours').value; state.note = find('Note').value; }
      function summaryText(s) {
        var change = Math.round((s.hours_after - s.hours_before) * 100) / 100;
        return '<b>' + s.count + ' records · ' + s.employee_days + ' employee-days</b> · ' + decisionLabels[state.decision] + ' (' + s.hours_per_record + ' h each)<br>Presence hours: <b>' + s.hours_before + ' h provisional → ' + s.hours_after + ' h confirmed</b> (' + (change > 0 ? '+' : '') + change + ' h change).<br>Existing lateness: <b>' + s.late_hours_before + ' h → ' + s.late_hours_after + ' h</b>' + (s.late_capped_count ? ' · capped to confirmed hours on <b>' + s.late_capped_count + ' record(s)</b>.' : ' · retained.') + ' Hours after lateness: <b>' + s.effective_hours_after + ' h</b>.';
      }
      function plan() { read(); return incompleteBatchSummary(selectedRows().map(function (x) { return x.l; }), hpd, state.decision, state.hours); }
      function key() { return JSON.stringify([cfg.scope, cfg.group, selectedRows().map(function (x) { return String(x.l.id); }).sort(), state.issue, state.decision, state.hours, state.note.trim()]); }
      function update() {
        confirmKey = null; find('Confirm').hidden = true; read();
        var n = selectedRows().length, all = find('All'); all.checked = n === visible.length; all.indeterminate = n > 0 && n < visible.length;
        find('Count').textContent = n + ' selected'; find('CustomWrap').hidden = state.decision !== 'custom_hours'; find('Hours').disabled = state.decision !== 'custom_hours'; find('Hours').required = state.decision === 'custom_hours';
        try { var s = plan(); find('Summary').innerHTML = summaryText(s); find('Review').disabled = !n; }
        catch (e) { find('Summary').innerHTML = '<span class="hr-batch-error">' + esc(e.message) + '</span>'; find('Review').disabled = true; }
      }
      find('Issue').onchange = function () { read(); state.issue = this.value; state.selected = {}; renderIncompleteBatch(hostId, cfg); };
      host.querySelectorAll('[data-inc-select]').forEach(function (cb) { cb.onchange = function () { state.selected[cb.dataset.incSelect] = cb.checked; update(); }; });
      find('All').onchange = function () { var checked = this.checked; state.selected = {}; visible.forEach(function (x) { state.selected[String(x.l.id)] = checked; }); host.querySelectorAll('[data-inc-select]').forEach(function (cb) { cb.checked = checked; }); update(); };
      find('Decision').onchange = update; find('Hours').oninput = update; find('Note').oninput = update;
      find('Clear').onclick = function () { state.selected = {}; host.querySelectorAll('[data-inc-select]').forEach(function (cb) { cb.checked = false; }); update(); };
      find('Cancel').onclick = function () { confirmKey = null; find('Confirm').hidden = true; };
      find('Review').onclick = function () { try { var s = plan(); if (!s.count) return; confirmKey = key(); find('Final').innerHTML = summaryText(s) + (state.note.trim() ? '<br>Shared note: ' + esc(state.note.trim()) : '<br>No shared note. The preset decision is recorded as the reason.'); find('Confirm').hidden = false; find('Apply').focus(); } catch (e) { fail(e); } };
      form.onsubmit = function (e) {
        e.preventDefault(); read(); if (!confirmKey || confirmKey !== key() || state.busy) return;
        var selected = selectedRows(); if (!selected.length) return;
        var payload; try { payload = validationBatchPayload(visible, state.selected, validationEmployees(), cfg.group, state.issue, state.decision, state.hours, state.note, S.employees); } catch (err) { fail(err); return; }
        state.busy = true; form.querySelectorAll('input,select,textarea,button').forEach(function (input) { input.disabled = true; });
        api.reviewIncompleteBiometric(cfg.periodId, payload).then(function (result) {
          state.selected = {}; state.busy = false; confirmKey = null; S.lines = []; if (S.wiz) { S.wiz.lines = null; if (S.wiz.batch) S.wiz.batch.selected = {}; }
          toast(result.count + ' record(s) confirmed · ' + result.hours_per_record + ' h each' + (result.late_capped_count ? ' · lateness capped on ' + result.late_capped_count : ' · lateness retained'));
          return cfg.after(result);
        }).catch(function (err) { state.busy = false; state.selected = {}; confirmKey = null; fail(err); cfg.reload(); });
      };
      update();
    }

    // ---------- Validate (Amendment 1: validators + admins) ----------
    // One date at a time. Logs grouped by team (evidence.team) / console punches / manual; ✓ per row, "✓ all in team", ✗ = setLog 0 hours + reason,
    // "+ Add present" = markPresent, and a "Who's missing" hint per team (a `team` log for that team in the previous 3 days, no log today).
    // Reads only listLogs / listHolidays / the employee list (names-only for validators) — no rate or money anywhere in this view.
    function loadValidate() { var d = S.val.date; return api.listLogs(C.addDays(d, -3), d).then(function (r) { S.valLogs = r; }); }
    TABS.validate = function () { $('#hrBody').innerHTML = '<div class="hr-card">Loading…</div>'; loadValidate().then(renderValidate).catch(fail); };
    function renderValidate() {
      var d = S.val.date, unvOnly = S.val.unv, frozen = lockedDay(d), act = !ro() && !frozen, kind = C.classifyDay(d, S.holidays);   // Phase 0 (C1): a locked day offers no attendance action at all
      var allToday = S.valLogs.filter(function (l) { return l.work_date === d; }), allPrev = S.valLogs.filter(function (l) { return l.work_date < d; });
      var validationPool = validationEmployees(), view = validationGroupView(validationPool, allToday, [], S.val.group, S.employees), group = S.val.group = view.group, field = group === 'field';
      var today = view.rows, prev = validationGroupView(validationPool, allPrev, [], group, S.employees).rows, eligibleEmployees = {};
      validationPool.forEach(function (e) { eligibleEmployees[String(e.id)] = true; });
      var groupCounts = validationGroupView(validationPool, allToday.filter(function (l) { return !unvOnly || !l.verified_at || incompletePending(l); }), [], group, S.employees).counts;
      var groups = {}, byId = {}, loggedToday = {}, seenMissing = {};
      allToday.forEach(function (l) { loggedToday[l.employee_id] = true; });
      function grp(key, k) { return groups[key] || (groups[key] = { key: key, kind: k, rows: [], missing: [] }); }
      today.forEach(function (l) {
        byId[String(l.id)] = l; loggedToday[l.employee_id] = true;
        if (l.source === 'team') grp((l.evidence && l.evidence.team) || '(no team)', 'team').rows.push(l); else if (l.source === 'punch') grp('punch', 'punch').rows.push(l); else if (l.source === 'biometric') grp('biometric', 'biometric').rows.push(l); else grp('manual', 'manual').rows.push(l);
      });
      prev.forEach(function (l) {
        if (l.source !== 'team' || !l.evidence || !l.evidence.team || loggedToday[l.employee_id]) return;
        var e = validationPool.find(function (x) { return x.id === l.employee_id; }) || {}, k = l.evidence.team + '|' + l.employee_id;
        if (!e.id || e.active === false || seenMissing[k]) return;
        seenMissing[k] = true; grp(l.evidence.team, 'team').missing.push(l.employee_id);
      });
      var ORDER = { team: 0, biometric: 1, punch: 2, manual: 3 };
      var keys = Object.keys(groups).sort(function (a, b) { var g = groups[a], h = groups[b]; return ORDER[g.kind] - ORDER[h.kind] || (a < b ? -1 : a > b ? 1 : 0); });
      function rowHtml(l) {
        var e = emp(l.employee_id), ev = l.evidence || {}, pending = incompletePending(l), problem = pendingEvidenceLabel(l), ver = !!l.verified_at && !pending, rowAct = act && !!eligibleEmployees[String(l.employee_id)];
        // Amendment 2: 🚚 driver tag (crew_driver slot of a crew of 2 or fewer, or toggled by HR) + a checkbox that sends an { is_driver } -only patch (hours and reason untouched)
        var crewNote = ev.slot ? ' <small style="color:#8a9894">' + esc(String(ev.slot).replace('crew_', '')) + (ev.crew_count ? ' · crew of ' + esc(ev.crew_count) : '') + '</small>' : '';
        var drag = rowAct && field && l.source !== 'punch';   // Amendment 5: drag a field person to another team's card (or ⇄ to type the team) — moveLog
        return '<tr' + (ver ? ' class="ok"' : '') + (drag ? ' draggable="true" data-drag="' + esc(l.id) + '" title="drag to another team card to move this person"' : '') + '><td class="name">' + esc(e.display_name || l.employee_id) + (ev.moved_from ? '<span class="hr-mv" title="' + esc(l.override_reason || '') + '">⇄ moved from ' + esc(ev.moved_from) + '</span>' : '') + (l.is_driver ? '<span class="hr-drv" title="driver — recorded deployment allowance with attendance evidence">🚚 driver</span>' : '') + (l.flag === 'fuzzy_name' ? '<span class="hr-fz" title="matched by similarity — ✓ confirms it and saves this spelling as an alias">⚑ similar name: ' + esc(ev.matched_as || '?') + '</span>' : '') + '</td><td>' + (SRC_ICON[l.source] || '') + crewNote +
          (rowAct && field ? ' <label title="driver allowance decision — recorded two-person deployments; tick to make a manual daily decision" style="font-size:10px;color:#8a9894;white-space:nowrap"><input type="checkbox" data-vdrv="' + esc(l.id) + '"' + (l.is_driver ? ' checked' : '') + '> 🚚</label>' : '') + '</td>' +
          '<td>' + esc(l.source === 'biometric' ? t5(ev.time_in) : hhmm(ev.time_in)) + '</td><td>' + (l.source === 'team' ? (ev.gate_out ? '✓ ' + esc(hhmm(ev.gate_out)) : '—') : (ev.time_out ? 'out ' + esc(l.source === 'biometric' ? t5(ev.time_out) : hhmm(ev.time_out)) : '—')) + '</td>' +
          '<td class="r">' + cellText(l) + (problem ? ' <small style="color:#9a6200">unconfirmed</small>' : pending ? ' <small style="color:#9a6200">provisional</small>' : '') + (l.flag ? ' <span title="' + esc(flagText(l)) + '">⚑</span>' : '') + (l.override_at ? ' <span title="' + esc(l.override_reason || '') + '">✎</span>' : '') + '</td>' +
          '<td>' + (problem ? '<span class="hr-chip computed">' + esc(problem) + '</span>' : pending ? '<span class="hr-chip computed">Incomplete punch · pending HR</span>' : ver ? '<span class="hr-chip locked">✓ ' + esc(l.verified_by || '') + ', ' + esc(hhmm(l.verified_at)) + '</span>' : '<span class="hr-chip computed">unverified</span>') + (l.verify_note ? ' <small style="color:#8a9894">' + esc(l.verify_note) + '</small>' : '') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' + (rowAct ? (ver ? '' : pending ? '<span class="mut">' + (l.incomplete_issue ? 'Use grouped review above' : 'Evidence needs individual correction') + '</span> ' : '<button class="hr-btn p" data-vok="' + esc(l.id) + '" title="Confirm this day">✓</button> ') + '<button class="hr-btn d" data-vno="' + esc(l.employee_id) + '" title="Did not report — 0 hours + reason">✗</button>' + (drag ? ' <button class="hr-btn" data-vmv="' + esc(l.id) + '" title="Move to another team (or drag the row onto a team card)">⇄</button>' : '') : act ? '<small class="mut">Stored attendance · employee profile / payroll pool needs correction</small>' : '') + '</td></tr>';
      }
      function groupHtml(g) {
        var rows = unvOnly ? g.rows.filter(function (l) { return !l.verified_at || incompletePending(l); }) : g.rows, unv = g.rows.filter(function (l) { return !l.verified_at || incompletePending(l); }).length, bulk = rows.filter(function (l) { return eligibleEmployees[String(l.employee_id)] && !l.verified_at && !incompletePending(l); });
        if (!rows.length && !g.missing.length) return '';
        var label = g.kind === 'team' ? field ? '👥 ' + esc(g.key) : '👥 Recorded attendance · ' + esc(g.key) : g.kind === 'punch' ? '⏱ Console punches' : g.kind === 'biometric' ? '🧬 Biometric attendance' : '✍ Manual';
        return '<div class="hr-card val"' + (act && field && g.kind === 'team' ? ' data-drop="' + esc(g.key) + '"' : '') + '><div class="hr-bar"><h3 style="margin:0">' + label + '</h3><span style="font-size:11px;color:#8a9894">' + g.rows.length + ' logged · ' + unv + ' unverified</span>' +
          (act && bulk.length ? '<button class="hr-btn p" data-vall="' + esc(g.key) + '">✓ all in ' + (field && g.kind === 'team' ? 'team' : 'group') + ' (' + bulk.length + ')' + (unv > bulk.length ? ' · excludes incomplete / ineligible records' : '') + '</button>' : '') + '</div>' +
          (rows.length ? '<table class="hr-t"><thead><tr><th>Employee</th><th>Source</th><th>Time in</th><th>' + (field ? 'Gate-out / Time out' : 'Time out') + '</th><th class="r">Hours</th><th>Verification</th><th></th></tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table>'
            : '<p class="mut">' + (g.rows.length ? 'all ' + g.rows.length + ' verified' : 'no declaration on this date') + '</p>') +
          (g.missing.length ? '<div class="hr-miss"><b>Who\'s missing</b> <small style="color:#8a9894">— logged with this team in the previous 3 days, no log on this date:</small><br>' +
            g.missing.map(function (id) { return '<span class="hr-chip open">' + esc(emp(id).display_name) + (act ? ' <button class="hr-btn" data-vadd="' + esc(id) + '">+ present</button>' : '') + '</span>'; }).join(' ') + '</div>' : '') + '</div>';
      }
      var unvTotal = today.filter(function (l) { return !l.verified_at || incompletePending(l); }).length;
      var batchRows = today.filter(function (l) { return (!unvOnly || !l.verified_at || incompletePending(l)) && l.biometric_period_id && incompleteIssue({ l: l }); }), batchPeriods = [];
      batchRows.forEach(function (l) { if (batchPeriods.indexOf(l.biometric_period_id) < 0) batchPeriods.push(l.biometric_period_id); });
      $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar"><button class="hr-btn" id="vPrev" title="previous day">‹</button><input type="date" id="vDate" value="' + esc(d) + '"><button class="hr-btn" id="vNext" title="next day">›</button>' +
        '<label><input type="checkbox" id="vUnv"' + (unvOnly ? ' checked' : '') + '> unverified only</label>' +
        (act ? '<button class="hr-btn p" id="vAdd">+ Add present</button><button class="hr-btn" id="vBuild">↻ Rebuild logs</button>' : '') +
        '<span style="font-size:11px;color:#8a9894">' + dow(d) + ' ' + esc(fmtDate(d)) + ' · ' + kind + ' · ' + today.length + ' logs in ' + VALIDATION_GROUP_LABELS[group] + ' · <b>' + unvTotal + ' unverified</b></span></div>' +
        validationGroupsHtml('v', group, groupCounts, true) +
        '<p class="mut">All groups on this date: ' + allToday.length + ' logs · ' + allToday.filter(function (l) { return !l.verified_at || incompletePending(l); }).length + ' unverified. Groups follow the employee master department.' + (group === 'unknown' ? ' Unknown departments and missing employee profiles stay here for HR correction.' : '') + '</p>' +
        (frozen ? '<div class="hr-warn">🔒 This day is inside a <b>locked payroll week</b> — attendance is frozen. Reopen the week in Periods (reason required) before validating or correcting anything.</div>' : '') +
        '<p class="mut">' + (field ? 'FieldOps declarations and scheduled teams support field attendance. <b>Drag</b> a row onto another team\'s card (or <b>⇄</b>) when someone was declared under the wrong team. ' : group === 'office' ? 'Backend/Office attendance uses clock records and HR attendance evidence; dispatch or team confirmation is not required. ' : 'Review attendance using clock records and HR evidence; correct the employee master department when available. ') + '<b>✓</b> confirms the day · <b>✗</b> records "did not report" (0 hours + reason) · <b>+ Add present</b> vouches for an employee in this group. Incomplete biometric punches use the grouped HR review below.</p>' + batchPeriods.map(function (_, i) { return '<div id="vIncompleteBatch' + i + '"></div>'; }).join('') + '</div>' +
        (keys.map(function (k) { return groupHtml(groups[k]); }).join('') || '<div class="hr-card"><p class="mut">No logs in ' + VALIDATION_GROUP_LABELS[group] + ' on this date' + (unvOnly ? ' (or all verified)' : '') + '.' + (act ? ' Use + Add present for attendance supported by HR evidence.' : '') + '</p></div>');
      S.val.batches = S.val.batches || {};
      batchPeriods.forEach(function (pid, i) { var state = S.val.batches[pid] || (S.val.batches[pid] = {}); renderIncompleteBatch('vIncompleteBatch' + i, { state: state, rows: batchRows.filter(function (l) { return l.biometric_period_id === pid; }).map(function (l) { return { l: l }; }), periodId: pid, group: group, scope: validationBatchScope(pid, [d, unvOnly], group), act: act, after: function () { S.val.batches = {}; return loadBase().then(loadValidate).then(renderValidate); }, reload: function () { S.val.batches = {}; TABS.validate(); } }); });
      rootEl.querySelectorAll('[data-v-group]').forEach(function (b) { b.onclick = function () { if (validationGroupChange(S.val, b.dataset.vGroup)) { closeModal(); closePop(); renderValidate(); } }; });
      $('#vDate').onchange = function () { if (this.value) { S.val.batches = {}; S.val.date = this.value; TABS.validate(); } };
      $('#vPrev').onclick = function () { S.val.batches = {}; S.val.date = C.addDays(S.val.date, -1); TABS.validate(); };
      $('#vNext').onclick = function () { S.val.batches = {}; S.val.date = C.addDays(S.val.date, 1); TABS.validate(); };
      $('#vUnv').onchange = function () { S.val.batches = {}; S.val.unv = this.checked; renderValidate(); };
      var ab = $('#vAdd'); if (ab) ab.onclick = function () { openAddPresent(d, loggedToday, group); };
      var vb = $('#vBuild'); if (vb) vb.onclick = function () { vb.disabled = true; api.buildLogs(d, d).then(function (r) { toast('Built ' + r.built + ' · ' + r.unmatched + ' unmatched' + (r.skipped_locked ? ' · ' + r.skipped_locked + ' day(s) skipped (locked)' : '')); return refresh(); }).catch(fail); };
      rootEl.querySelectorAll('[data-vok]').forEach(function (b) { b.onclick = function () { var l = byId[b.dataset.vok]; if (!l || !eligibleEmployees[String(l.employee_id)]) return; b.disabled = true; api.verifyLogs([l.id]).then(function () { return refresh(); }).catch(fail); }; });
      rootEl.querySelectorAll('[data-vall]').forEach(function (b) { b.onclick = function () { var ids = groups[b.dataset.vall].rows.filter(function (l) { return eligibleEmployees[String(l.employee_id)] && !l.verified_at && !incompletePending(l); }).map(function (l) { return l.id; }); b.disabled = true; api.verifyLogs(ids).then(function (n) { toast(n + ' verified'); return refresh(); }).catch(fail); }; });
      rootEl.querySelectorAll('[data-vno]').forEach(function (b) { b.onclick = function () {
        if (!eligibleEmployees[b.dataset.vno]) return;
        var why = prompt('Did not report — ' + (emp(b.dataset.vno).display_name || b.dataset.vno) + ' on ' + fmtDate(d) + '.\nReason (required):'); if (!why || !why.trim()) return;
        api.setLog(b.dataset.vno, d, { hours_reg: 0, hours_rd: 0, hours_lh: 0, hours_sh: 0, override_reason: why.trim() }).then(function () { toast('Marked did-not-report'); return refresh(); }).catch(fail);
      }; });
      rootEl.querySelectorAll('[data-vadd]').forEach(function (b) { b.onclick = function () { if (!eligibleEmployees[b.dataset.vadd]) return; b.disabled = true; api.markPresent([b.dataset.vadd], [d]).then(function (n) { toast(n ? 'Marked present' : 'Already logged'); return refresh(); }).catch(fail); }; });
      // Amendment 5: drag-and-drop between team cards → moveLog(id, team); ⇄ asks for the team name (a team with no card today, keyboard / touch)
      function moveTo(id, team) { team = String(team || '').trim(); if (!team) return; var l = byId[id]; if (!l || !eligibleEmployees[String(l.employee_id)]) return; if (l.evidence && l.evidence.team === team) return toast('Already in ' + team); api.moveLog(id, team).then(function () { toast('Moved to ' + team); return refresh(); }).catch(fail); }
      rootEl.querySelectorAll('[data-drag]').forEach(function (tr) { tr.ondragstart = function (ev) { ev.dataTransfer.setData('text/plain', tr.dataset.drag); ev.dataTransfer.effectAllowed = 'move'; }; });
      rootEl.querySelectorAll('[data-drop]').forEach(function (card) {
        card.ondragover = function (ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; card.classList.add('over'); };
        card.ondragleave = function () { card.classList.remove('over'); };
        card.ondrop = function (ev) { ev.preventDefault(); card.classList.remove('over'); moveTo(ev.dataTransfer.getData('text/plain'), card.dataset.drop); };
      });
      rootEl.querySelectorAll('[data-vmv]').forEach(function (b) { b.onclick = function () { var l = byId[b.dataset.vmv], teams = keys.filter(function (k) { return groups[k].kind === 'team' && k !== (l.evidence || {}).team; }); var t = prompt('Move ' + (emp(l.employee_id).display_name || '') + ' to team:' + (teams.length ? '\n(today: ' + teams.join(', ') + ')' : ''), teams[0] || ''); if (t) moveTo(l.id, t); }; });
      rootEl.querySelectorAll('[data-vdrv]').forEach(function (cb) { cb.onchange = function () { var l = byId[cb.dataset.vdrv]; if (!l || !eligibleEmployees[String(l.employee_id)]) return; cb.disabled = true; api.setLog(l.employee_id, d, { is_driver: cb.checked }).then(function () { toast(cb.checked ? 'Marked as driver' : 'Driver mark removed'); return refresh(); }).catch(fail); }; });
    }
    function openAddPresent(d, logged, group) {
      group = validationGroupKey(group);
      var emps = validationGroupView(validationEmployees(), [], [], group).employees, sel = {};
      openModal('<h3>+ Add present · ' + VALIDATION_GROUP_LABELS[group] + ' · ' + dow(d) + ' ' + esc(fmtDate(d)) + '</h3><input id="apQ" placeholder="Search name / alias" style="width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #cfd8d3;border-radius:9px"><div id="apList" style="max-height:50vh;overflow:auto;margin:8px 0"></div>' +
        '<p class="mut">Creates a verified manual 8-hour log for each ticked employee (holiday dates go to the L.H / S.H column). Employees who already have a log on this date are greyed out.</p>' +
        '<div class="hr-bar"><button class="hr-btn p" id="apOk">Mark present (<span id="apN">0</span>)</button><button class="hr-btn" id="apNo">Cancel</button></div>',
        function (box) {
          function list() {
            var q = box.querySelector('#apQ').value.toLowerCase();
            box.querySelector('#apList').innerHTML = emps.filter(function (e) { return !q || (e.display_name + ' ' + (e.aliases || []).join(' ')).toLowerCase().indexOf(q) >= 0; }).map(function (e) {
              return '<label style="display:block;padding:4px 2px' + (logged[e.id] ? ';opacity:.5' : '') + '"><input type="checkbox" data-ap="' + esc(e.id) + '"' + (sel[e.id] ? ' checked' : '') + (logged[e.id] ? ' disabled' : '') + '> ' + esc(e.display_name) + ' <small style="color:#8a9894">' + esc(e.department || '') + (logged[e.id] ? ' · already logged' : '') + '</small></label>'; }).join('') || '<p class="mut">no match</p>';
            box.querySelectorAll('[data-ap]').forEach(function (cb) { cb.onchange = function () { sel[cb.dataset.ap] = cb.checked; box.querySelector('#apN').textContent = Object.keys(sel).filter(function (k) { return sel[k]; }).length; }; });
          }
          list(); box.querySelector('#apQ').oninput = list; box.querySelector('#apQ').focus();
          box.querySelector('#apNo').onclick = closeModal;
          box.querySelector('#apOk').onclick = function () { var ids = validationGroupView(validationEmployees(), [], [], group).employees.filter(function (e) { return sel[e.id] && !logged[e.id]; }).map(function (e) { return e.id; }); if (!ids.length) return toast('Tick at least one employee'); api.markPresent(ids, [d]).then(function (n) { toast(n + ' marked present'); closeModal(); return refresh(); }).catch(fail); };
        });
    }

    // ---------- Unmatched ----------
    TABS.unmatched = function () {
      var opts = '<option value="">— pick employee —</option>' + S.employees.filter(function (e) { return e.active && inPool(e); }).map(function (e) { return '<option value="' + e.id + '">' + esc(e.display_name) + '</option>'; }).join('');
      $('#hrBody').innerHTML = '<div class="hr-card"><h3>Unmatched crew names</h3><p style="font-size:12px;color:#4a5a55">Spellings typed by technicians in the crew declaration that match no employee. Resolve once — the spelling is saved as an alias and every past and future day with that spelling is credited automatically.</p>' +
        (S.unmatched.length ? '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>As typed</th><th class="r">Days</th><th>Team</th><th>Last seen</th><th>Employee</th><th></th></tr></thead><tbody>' +
          S.unmatched.map(function (u) { return '<tr><td><b>' + esc(u.raw_name) + '</b></td><td class="r">' + u.count + '</td><td>' + esc(u.team || '') + '</td><td>' + esc(fmtDate(u.last_seen)) + '</td><td><select data-pick="' + esc(u.norm_name) + '">' + opts + '</select></td><td>' + (ro() ? '' : '<button class="hr-btn p" data-res="' + esc(u.norm_name) + '">Resolve</button> <button class="hr-btn" data-new="' + esc(u.raw_name) + '">+ New employee</button> <button class="hr-btn" data-ign="' + esc(u.norm_name) + '">Ignore</button>') + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '<p>✅ Nothing to resolve.</p>') + '</div>';
      rootEl.querySelectorAll('[data-res]').forEach(function (b) { b.onclick = function () { var sel = rootEl.querySelector('[data-pick="' + b.dataset.res + '"]'); if (!sel.value) return toast('Pick the employee first'); api.resolveUnmatched(b.dataset.res, sel.value).then(function (r) { toast(r.rebuilt === 0 ? 'Alias saved · no day credited (employee inactive or ended)' : 'Alias saved · ' + r.rebuilt + ' day(s) credited'); return refresh(); }).catch(fail); }; });
      rootEl.querySelectorAll('[data-ign]').forEach(function (b) { b.onclick = function () { if (!confirm('Ignore this spelling? It will never be credited.')) return; api.ignoreUnmatched(b.dataset.ign).then(refresh).catch(fail); }; });
      rootEl.querySelectorAll('[data-new]').forEach(function (b) { b.onclick = function () { S.tab = 'employees'; S.newEmpFrom = b.dataset.new; render(); }; });
    };

    // ---------- Create New Payroll (LOCAL DEMO: ZKTeco "Daily Attendance Details" upload → match → review → preview → approve) ----------
    // Shown only when the backend offers importBiometric (HrSim — no SQL yet) to a rate viewer. The uploaded file is the attendance source of truth for its Fri–Thu week.
    // Step 1 Upload (parsed in the browser, nothing written until "Import") · 2 Match people · 3 Review attendance (late rules + flags) · 4 Preview money → Approve (= lock).
    var Att = root.HrAttendanceImport;
    function bioOK() { return !!(api.importBiometric && Att && integrationActionAllowed({ capabilities: S.capabilities, action: 'biometric', canEdit: true, me: S.me, period: { status: 'open' } })); }
    var DED_OPTS = [['0', 'No deduction'], ['0.5', 'Late 30 min'], ['1', 'Late 1 h'], ['2', 'Late 2 h'], ['4', 'Half-day absent (4 h)'], ['absent', 'Absent — no pay']];
    function dedLabel(h) { h = Number(h) || 0; return h >= 4 ? 'half-day absent' : h ? (h === 0.5 ? '30 min' : h + ' h') : ''; }
    function t5(t) { return t ? String(t).slice(0, 5) : '—'; }
    function wizStart(periodId, step) { S.wiz = { step: step || (periodId ? 2 : 1), periodId: periodId || null, shift: Att ? Att.SHIFT_START : '08:00', filter: 'review', showZero: false }; S.tab = 'newpay'; render(); }
    function readSheet(file) {
      var ensure = deps.ensureXLSX ? deps.ensureXLSX() : (root.XLSX ? Promise.resolve() : Promise.reject(new Error('Excel reader not available — check the connection')));
      return ensure.then(function () { return new Promise(function (ok, ko) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { ko(new Error('could not read ' + file.name)); }; fr.readAsArrayBuffer(file); }); })
        .then(function (buf) { var X = root.XLSX, wb = X.read(buf, { type: 'array' }); return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); });   // content-sniffed: ZKTeco's ".xls" may be xlsx inside
    }
    function wizPool() { return S.employees.filter(function (e) { return e.active && inPool(e) && !e.deleted_at; }); }
    function wizParse() {   // pre-import analysis (in memory only) — re-run when the shift start changes
      var w = S.wiz; if (!w.rows) return;
      w.pre = Att.analyze(w.rows, wizPool(), { shift_start: w.shift });
      if (!w.cut || !w.pre.cutoffs.some(function (c) { return c.period_start === w.cut; })) w.cut = (w.pre.cutoffs.slice().sort(function (a, b) { return b.people.reduce(function (s, p) { return s + p.days; }, 0) - a.people.reduce(function (s, p) { return s + p.days; }, 0); })[0] || {}).period_start;
    }
    function wizLoadReview() { var w = S.wiz; return api.biometricReview(w.periodId).then(function (r) { return api.listLogs(r.period.period_start, r.period.period_end).then(function (logs) { w.review = r; w.reviewLogs = logs; }); }); }
    function stepper(w) {
      var st = [[1, 'Upload attendance'], [2, 'Match people'], [3, 'Review attendance'], [4, 'Preview & approve']], rv = w.review;
      var done = { 1: !!w.periodId, 2: !!(rv && !rv.unmatched.length), 3: !!(rv && !rv.counts.unreviewed), 4: !!(rv && rv.period.status === 'locked') };
      return '<div class="hr-steps">' + st.map(function (s) { var can = s[0] === 1 ? !w.periodId : !!w.periodId; return '<button class="hr-step' + (w.step === s[0] ? ' on' : '') + (done[s[0]] ? ' ok' : '') + '" data-step="' + s[0] + '"' + (can ? '' : ' disabled') + '><b>' + (done[s[0]] ? '✓' : s[0]) + '</b>' + s[1] + '</button>'; }).join('<span class="hr-arrow">›</span>') + '</div>';
    }
    TABS.newpay = function () {
      if (!bioOK()) { $('#hrBody').innerHTML = '<div class="hr-card">Biometric payroll is not available with the current backend or account access.</div>'; return; }
      var w = S.wiz || (S.wiz = { step: 1, shift: Att.SHIFT_START, filter: 'review', showZero: false });
      if (w.periodId && !w.review) { $('#hrBody').innerHTML = '<div class="hr-card">Loading…</div>'; wizLoadReview().then(TABS.newpay).catch(fail); return; }
      var head = '<div class="hr-card hr-wiz"><div class="hr-bar" style="justify-content:space-between"><h3 style="margin:0">＋ Create New Payroll' + (w.review ? ' · <span style="font-weight:600">' + esc(periodLabel(w.review.period)) + '</span> <span class="hr-chip ' + esc(w.review.period.status) + '">' + esc(w.review.period.status) + '</span>' : '') + '</h3>' +
        '<span><button class="hr-btn" id="wNew">Start over with another file</button></span></div>' + stepper(w) + '</div>';
      $('#hrBody').innerHTML = head + '<div id="wBody"></div>';
      $('#wNew').onclick = function () { wizStart(null, 1); };
      rootEl.querySelectorAll('[data-step]').forEach(function (b) { b.onclick = function () { w.step = Number(b.dataset.step); if (w.step === 4) w.lines = null; TABS.newpay(); }; });
      [null, wizUpload, wizMatch, wizReview, wizPreview][w.step]($('#wBody'), w);
    };

    // Step 1 — Upload
    function wizUpload(el, w) {
      var html = '<div class="hr-card"><h3>1 · Upload the ZKTeco “Daily Attendance Details” export</h3>' +
        '<label class="hr-drop" id="wDrop"><input type="file" id="wFile" accept=".xls,.xlsx" style="display:none"><b>' + (w.fileName ? '📄 ' + esc(w.fileName) : 'Drop the .xls / .xlsx here or click to choose') + '</b><br><small>Read in this browser only — nothing is saved until you press Import.</small></label>';
      if (w.err) html += '<div class="hr-warn" style="background:#fdeceb;border-color:#f3b8b0;color:#8a2f2f">✖ ' + esc(w.err) + '</div>';
      if (w.pre) {
        var pre = w.pre, cut = pre.cutoffs.find(function (c) { return c.period_start === w.cut; }) || pre.cutoffs[0], days = C.datesBetween(cut.period_start, cut.period_end);
        var inCut = pre.rows.filter(function (a) { return a.date >= cut.period_start && a.date <= cut.period_end; }), have = {}; inCut.forEach(function (a) { have[a.date] = (have[a.date] || 0) + 1; });
        var ex = S.periods.find(function (p) { return p.period_start === cut.period_start; });
        var late = inCut.filter(function (a) { return a.deduct_hours > 0 && !a.half_day_absent; }).length, half = inCut.filter(function (a) { return a.half_day_absent; }).length, flagged = inCut.filter(function (a) { return a.flags.length; }).length;
        var people = {}; inCut.forEach(function (a) { people[a.personnel_id] = 1; });
        html += (pre.cutoffs.length > 1 ? '<div class="hr-warn">This file spans ' + pre.cutoffs.length + ' payroll weeks — choose the one to pay: ' + pre.cutoffs.map(function (c) { return '<label style="margin-right:12px"><input type="radio" name="wCut" value="' + c.period_start + '"' + (c.period_start === cut.period_start ? ' checked' : '') + '> ' + esc(periodLabel(c)) + ' (' + c.people.reduce(function (s, p) { return s + p.days; }, 0) + ' rows)</label>'; }).join('') + '</div>' : '') +
          '<div class="hr-kpis">' + kpi('Payroll week (Fri → Thu)', esc(periodLabel(cut))) + kpi('Day-rows', inCut.length) + kpi('People', Object.keys(people).length) + kpi('Late (rule applied)', late) + kpi('Half-day absent', half, half ? 'bad' : '') + kpi('Flagged for review', flagged, flagged ? 'warn' : '') + '</div>' +
          '<div class="hr-days">' + days.map(function (d) { return '<span class="' + (have[d] ? 'on' : 'off') + '"><b>' + dow(d) + '</b> ' + esc(fmtDate(d)) + '<small>' + (have[d] ? have[d] + ' rows' : 'no rows') + '</small></span>'; }).join('') + '</div>' +
          (days.some(function (d) { return !have[d]; }) ? '<div class="hr-warn">⚠ The file covers ' + days.filter(function (d) { return have[d]; }).length + ' of 7 days of this week. Days with no rows pay nobody — upload the full-week export before approving (you can re-upload later; HR decisions on unchanged punches are kept).</div>' : '') +
          (ex && ex.status === 'locked' ? '<div class="hr-warn" style="background:#fdeceb;border-color:#f3b8b0;color:#8a2f2f">🔒 ' + esc(periodLabel(ex)) + ' is already approved (locked). Reopen it in the Register before re-importing.</div>' : ex ? '<div class="hr-warn" style="background:#eef4ff;border-color:#c9dbff;color:#1d4f91">This week already exists (' + esc(ex.status) + (ex.attendance_source === 'biometric' ? ', biometric' : ', FieldOps attendance') + '). Importing makes this file its attendance source — ' + (ex.attendance_source === 'biometric' ? 'the previous upload is replaced; HR review decisions on unchanged punches are kept.' : 'FieldOps team-declaration days in this week are removed; manual days are kept and flagged.') + '</div>' : '') +
          '<div class="hr-bar"><label>Shift start <input id="wShift" type="time" value="' + esc(w.shift) + '" style="width:110px"></label>' +
          '<span class="mut">Late rule (minutes after shift start): 0–10 grace · 11–20 → 30 min · 21–40 → 1 h · 41–60 → 2 h · over 60 → half-day absent. Time in = earliest punch, time out = latest punch; Time In Second Shift is ignored.</span></div>' +
          '<div class="hr-bar"><button class="hr-btn p" id="wImport"' + (ex && ex.status === 'locked' ? ' disabled' : '') + '>Import attendance → Match people</button></div>';
      }
      el.innerHTML = html + '</div>';
      var inp = $('#wFile'), drop = $('#wDrop');
      function take(f) {
        if (!f) return; w.err = null; w.fileName = f.name; w.pre = null; w.rows = null;
        readSheet(f).then(function (aoa) { w.rows = Att.rowsFromAoa(aoa); if (!w.rows.length) throw new Error('no attendance rows under the header'); wizParse(); TABS.newpay(); }).catch(function (e) { w.err = e.message; TABS.newpay(); });
      }
      inp.onchange = function () { take(inp.files[0]); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = function () { drop.classList.remove('over'); };
      drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); };
      rootEl.querySelectorAll('[name=wCut]').forEach(function (r) { r.onchange = function () { w.cut = r.value; TABS.newpay(); }; });
      var sh = $('#wShift'); if (sh) sh.onchange = function () { if (!/^\d{2}:\d{2}$/.test(sh.value)) return toast('Shift start must be hh:mm'); w.shift = sh.value; wizParse(); TABS.newpay(); };
      var ib = $('#wImport'); if (ib) ib.onclick = function () {
        ib.disabled = true;
        api.importBiometric({ file_name: w.fileName, rows: w.rows, shift_start: w.shift, period_start: w.cut }).then(function (res) {
          var s = res.summary; w.periodId = res.period.id; w.review = null; w.step = 2; w.imported = res;
          toast('Imported ' + s.logs + ' attendance days · ' + s.flagged + ' flagged · ' + res.unmatched.length + ' unmatched' + (s.removed_fieldops ? ' · ' + s.removed_fieldops + ' FieldOps day(s) replaced' : ''));
          S.period = null; return refresh();   // loadBase picks the newest week (this one) as the current period
        }).catch(function (e) { ib.disabled = false; fail(e); });
      };
    }
    function kpi(label, val, cls) { return '<div class="hr-kpi ' + (cls || '') + '"><small>' + esc(label) + '</small><b>' + val + '</b></div>'; }

    // Step 2 — Match people
    function wizMatch(el, w) {
      var rv = w.review, locked = rv.period.status === 'locked', byPid = {};
      rv.rows.forEach(function (a) { if (!a.employee_id) return; var m = byPid[a.personnel_id] || (byPid[a.personnel_id] = { pid: a.personnel_id, name: a.name, emp: a.employee_name, how: a.match, days: 0 }); m.days++; });
      var matched = Object.keys(byPid).map(function (k) { return byPid[k]; }).sort(function (a, b) { return a.emp < b.emp ? -1 : 1; });
      var how = {}; matched.forEach(function (m) { how[m.how] = (how[m.how] || 0) + 1; });
      var HOW = { biometric_id: 'saved device ID', emp_no: 'Personnel ID = employee no.', exact: 'exact name', loose: 'name (middle name ignored)', fuzzy: 'similar name — check' };
      var opts = '<option value="">— pick employee —</option>' + wizPool().map(function (e) { return '<option value="' + e.id + '">' + esc(e.display_name) + (e.emp_no ? ' · ' + esc(e.emp_no) : '') + '</option>'; }).join('');
      var html = '<div class="hr-card"><h3>2 · Match people on the device to employees</h3>' +
        '<div class="hr-kpis">' + kpi('Matched', matched.length, 'good') + kpi('Not matched', rv.unmatched.length, rv.unmatched.length ? 'bad' : '') + kpi('Excluded', rv.excluded.length) + Object.keys(how).map(function (k) { return kpi('by ' + (HOW[k] || k), how[k], k === 'fuzzy' ? 'warn' : ''); }).join('') + '</div>' +
        (rv.unmatched.length ? '<p class="mut">Map each device person once — the Personnel ID is saved on the employee and every future upload matches automatically. Exclude anyone who should not be paid here (test enrolment, visitor, another payroll group) with a reason.</p><div class="hr-scroll"><table class="hr-t"><thead><tr><th>Personnel ID</th><th>Name on device</th><th>Department</th><th class="r">Days</th><th>Employee</th><th></th></tr></thead><tbody>' +
          rv.unmatched.map(function (u) { return '<tr><td><b>' + esc(u.personnel_id) + '</b></td><td>' + esc(u.name) + '</td><td>' + esc(u.department || '') + '</td><td class="r">' + u.days.length + '</td><td><select data-map="' + esc(u.personnel_id) + '">' + (u.suggestion ? opts.replace('value="' + u.suggestion.employee_id + '"', 'value="' + u.suggestion.employee_id + '" selected') : opts) + '</select>' + (u.suggestion ? ' <small class="mut">suggested (' + esc(u.suggestion.pass) + ')</small>' : '') + '</td><td>' + (locked || ro() ? '' : '<button class="hr-btn p" data-domap="' + esc(u.personnel_id) + '">Map</button> <button class="hr-btn" data-excl="' + esc(u.personnel_id) + '">Exclude…</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<p>✅ Everyone on the device is matched to an employee.</p>') +
        (rv.excluded.length ? '<p class="mut">Excluded: ' + rv.excluded.map(function (x) { return '<b>' + esc(x.personnel_id) + '</b> (' + esc(x.reason) + ' — ' + esc(x.by) + ')'; }).join(' · ') + '</p>' : '') +
        '<details style="margin-top:8px"><summary>Matched people (' + matched.length + ')</summary><div class="hr-scroll" style="max-height:40vh"><table class="hr-t"><thead><tr><th>Personnel ID</th><th>Name on device</th><th>Employee</th><th>Matched by</th><th class="r">Days</th></tr></thead><tbody>' +
          matched.map(function (m) { return '<tr><td>' + esc(m.pid) + '</td><td>' + esc(m.name) + '</td><td><b>' + esc(m.emp) + '</b></td><td>' + (m.how === 'fuzzy' ? '<span class="hr-fz">' + esc(HOW[m.how]) + '</span>' : esc(HOW[m.how] || m.how)) + '</td><td class="r">' + m.days + '</td></tr>'; }).join('') + '</tbody></table></div></details>' +
        '<div class="hr-bar" style="margin-top:10px"><button class="hr-btn p" id="wNext"' + (rv.unmatched.length ? ' disabled title="Map or exclude every unmatched person first"' : '') + '>Next → Review attendance</button></div></div>';
      el.innerHTML = html;
      rootEl.querySelectorAll('[data-domap]').forEach(function (b) { b.onclick = function () { var sel = rootEl.querySelector('[data-map="' + b.dataset.domap + '"]'); if (!sel.value) return toast('Pick the employee first'); b.disabled = true; api.mapBiometricId(b.dataset.domap, sel.value).then(function () { toast('Personnel ID ' + b.dataset.domap + ' saved on the employee'); return refresh(); }).then(function () { return wizLoadReview(); }).then(TABS.newpay).catch(fail); }; });
      rootEl.querySelectorAll('[data-excl]').forEach(function (b) { b.onclick = function () { var why = prompt('Reason for excluding personnel ID ' + b.dataset.excl + ' from this payroll (e.g. test enrolment):'); if (!why || !why.trim()) return; api.excludeBiometric(w.periodId, b.dataset.excl, why).then(wizLoadReview).then(TABS.newpay).catch(fail); }; });
      $('#wNext').onclick = function () { w.step = 3; TABS.newpay(); };
    }

    // Step 3 — Review attendance
    function wizReview(el, w) {
      var rv = w.review, c = rv.counts, locked = rv.period.status === 'locked', act = !locked && !ro(), FT = Att.FLAG_TEXT;
      var rows = validationWizardRows(rv, w.reviewLogs || S.logs), validationPool = validationEmployees();
      var f = w.filter, view = validationGroupView(validationPool, rows, rv.missing || [], w.group, S.employees), group = w.group = view.group, field = group === 'field';
      var groupRows = view.rows, missing = view.missing, eligibleRows = {}, eligibleMissing = {};
      view.eligible_rows.forEach(function (x) { eligibleRows[String(x.l.id)] = true; });
      view.eligible_missing.forEach(function (m) { eligibleMissing[m.key] = true; });
      var filtered = rows.filter(function (x) { var l = x.l; return f === 'all' || (f === 'review' ? incompletePending(l) || (l.flag && !l.verified_at) : f === 'incomplete' ? incompletePending(l) : f === 'flagged' ? !!l.flag : f === 'late' ? Number(l.late_deduct_hours) > 0 : true); });
      var filteredView = validationGroupView(validationPool, filtered, rv.missing || [], group, S.employees), shown = filteredView.rows
        .sort(function (x, y) { return x.a.date < y.a.date ? -1 : x.a.date > y.a.date ? 1 : String(x.a.employee_name) < String(y.a.employee_name) ? -1 : 1; });
      var groupPending = groupRows.filter(function (x) { return incompletePending(x.l) || x.l.flag && !x.l.verified_at; }).length;
      var groupIncomplete = groupRows.filter(function (x) { return incompletePending(x.l); }).length, groupFlagged = groupRows.filter(function (x) { return !!x.l.flag; }).length;
      function pend(l) { return incompletePending(l); }
      function dispCell(d) { return !d ? '<small class="mut">—</small>' : d.status === 'confirmed' ? '<span class="hr-chip open" title="' + esc('Team ' + d.teams.join(', ') + (d.gate_out ? ' · gate-out ' + d.gate_out.slice(11, 16) : '') + ' — supporting evidence only') + '">✓ Confirmed deployed</span>' + '<br><small class="mut">' + esc(d.teams.join(', ')) + '</small>'
        : d.status === 'biometric_only' ? '<span class="hr-chip computed" title="Valid biometric attendance. Dispatch has data for this date but this person is not in any declared crew — corroboration only, hours unchanged.">Biometric only</span><br><small class="mut">not dispatch-confirmed</small>'
        : d.status === 'date_conflict' ? '<span class="hr-chip computed" title="Dispatch dates disagree; HR must confirm the deployment before adding driver allowance.">Dispatch date needs review</span>'
        : d.status === 'pending_identity' ? '<span class="hr-chip computed" title="A similar crew name needs HR confirmation before adding driver allowance.">Similar crew name — HR review required</span>'
        : '<span class="hr-chip" title="No dispatch schedule / team declaration covers this date, so this is not a negative.">Dispatch data unavailable</span><br><small class="mut">unknown</small>'; }
      function status(l) { var problem = pendingEvidenceLabel(l); if (problem) return '<span class="hr-chip computed">' + esc(problem) + '</span>'; return pend(l) ? '<span class="hr-chip computed" title="One valid punch: evidence of presence, not a confirmed day. Hours shown are provisional until HR decides.">⚑ Incomplete punch — HR validation required</span>' : l.flag && !l.verified_at ? '<span class="hr-chip computed">⚑ needs review</span>' : l.override_at ? '<span class="hr-chip locked" title="' + esc(l.override_reason || '') + '">✓ HR · ' + esc(l.override_by) + '</span>' : l.verified_by === 'biometric' ? '<span class="hr-chip open">✓ device</span>' : '<span class="hr-chip locked">✓ ' + esc(l.verified_by || '') + '</span>'; }
      function result(l) { var problem = pendingEvidenceLabel(l); if (problem) return '<b style="color:#9a6200">' + esc(problem) + '</b><br><small class="mut">Attendance hours remain unconfirmed</small>'; if (pend(l)) return '<b style="color:#9a6200">Present — pending HR validation</b><br><small style="color:#b8600a">incomplete punch · ' + (Number(l.hours_reg) + Number(l.hours_rd) + Number(l.hours_lh) + Number(l.hours_sh)) + ' h provisional, not confirmed</small>';
        var h = Number(l.hours_reg) + Number(l.hours_rd) + Number(l.hours_lh) + Number(l.hours_sh); if (!h) return '<b style="color:#c2503a">absent</b>'; var d = Number(l.late_deduct_hours) || 0; if (l.evidence && l.evidence.incomplete_review) return '<b>' + h + ' h confirmed</b>' + (d ? '<br><small style="color:#9a6200">− ' + d + ' h existing lateness</small>' : !l.evidence.time_in ? '<br><small style="color:#b8600a">late unknown (no time-in)</small>' : ''); return d ? '<b style="color:' + (d >= 4 ? '#c2503a' : '#9a6200') + '">− ' + esc(dedLabel(d)) + '</b>' : l.evidence && l.evidence.punches && !l.evidence.time_in ? 'full day <small style="color:#b8600a">· late unknown (no time-in)</small>' : 'full day'; }
      function lateCell(m) { return m == null ? '—' : m <= 0 ? '<small class="mut">on time</small>' : m <= 10 ? m + ' <small class="mut">grace</small>' : '<b>' + m + '</b>'; }
      function cur(l) { var h = Number(l.hours_reg) + Number(l.hours_rd) + Number(l.hours_lh) + Number(l.hours_sh); return h ? String(Number(l.late_deduct_hours) || 0) : 'absent'; }
      function decisionCell(x) {
        var a = x.a, l = x.l;
        if (!eligibleRows[String(l.id)]) return '<small class="mut">Correct the employee profile / identity or payroll pool before reviewing this stored day.</small>';
        return (pend(l) ? api.reviewIncompleteBiometric && incompleteIssue(x) ? '<button class="hr-btn p" data-inc="' + esc(l.id) + '" title="Select this record in the grouped HR review">Review in group</button> ' : '<small class="mut">Individual correction required</small> ' : l.flag && !l.verified_at ? '<button class="hr-btn p" data-acc="' + esc(l.id) + '">✓ Accept</button> ' : '') + '<select data-ded="' + esc(l.id) + '" aria-label="Advanced deduction for ' + esc(a.employee_name || emp(l.employee_id).display_name) + '">' + DED_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (cur(l) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
      }
      var bulk = shown.filter(function (x) { return eligibleRows[String(x.l.id)] && !pend(x.l); });
      var html = '<div class="hr-card"><h3>3 · Review attendance</h3>' +
        '<p class="mut">Payroll-wide totals below include every employee group. Approval waits for all pending records and missing evidence.</p>' +
        '<div class="hr-kpis">' + kpi('Day-rows', c.rows) + kpi('People', c.people) + kpi('Late (deducted)', c.late, c.late ? 'warn' : '') + kpi('Half-day absent', c.half_day, c.half_day ? 'bad' : '') + kpi('Flagged', c.flagged) + kpi('Incomplete punches pending HR', c.incomplete_pending, c.incomplete_pending ? 'bad' : 'good') + kpi('Still to review', c.unreviewed, c.unreviewed ? 'bad' : 'good') + '</div>' +
        validationGroupsHtml('w', group, filteredView.counts, false) +
        '<p class="mut">Showing ' + VALIDATION_GROUP_LABELS[group] + '. Groups follow employee master department.' + (field ? ' Scheduled dispatch and team information provide supporting evidence; biometrics remains the attendance source.' : group === 'office' ? ' Clock records and HR attendance evidence are sufficient; dispatch or team confirmation is not required.' : ' Unknown departments and missing employee profiles stay visible for HR correction.') + '</p>' +
        (field ? '<p class="mut" style="margin:4px 0">Field dispatch support: <b>' + groupRows.filter(function (x) { return x.a.dispatch && x.a.dispatch.status === 'confirmed'; }).length + '</b> confirmed deployed · <b>' + groupRows.filter(function (x) { return x.a.dispatch && x.a.dispatch.status === 'biometric_only'; }).length + '</b> biometric only · <b>' + groupRows.filter(function (x) { return x.a.dispatch && x.a.dispatch.status === 'unknown'; }).length + '</b> dispatch data unavailable</p>' : '') +
        (c.incomplete_pending ? '<div class="hr-warn">⚠ ' + c.incomplete_pending + ' incomplete biometric record(s) remain pending HR review. A <b>valid single clock</b> provides evidence of presence; its hours stay <b>provisional</b> until HR decides. Review compatible missing Time Out or missing Time In records together with a full-day, half-day, or custom-hours preset. A shared note is optional. <b>Invalid clocks require individual correction.</b> Approval waits for every pending day.</div>' : '') +
        '<div class="hr-bar"><select id="wFilt" aria-label="Attendance filter for ' + VALIDATION_GROUP_LABELS[group] + '">' + [['review', 'Needs review (' + groupPending + ')'], ['incomplete', 'Incomplete punches pending (' + groupIncomplete + ')'], ['flagged', 'All flagged (' + groupFlagged + ')'], ['late', 'Late / half-day'], ['all', 'Everything']].map(function (o) { return '<option value="' + o[0] + '"' + (f === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
        (act && f === 'review' && bulk.length ? '<button class="hr-btn" id="wAcceptAll" title="Stamp compatible non-incomplete rows shown as reviewed by you, keeping the computed result. Incomplete punches use grouped review below; stored days without a current identity require correction.">✓ Accept ' + bulk.length + ' shown as computed' + (shown.length > bulk.length ? ' (' + (shown.length - bulk.length) + ' pending / identity correction excluded)' : '') + '</button>' : '') +
        '<span class="mut">Accept keeps the rule result; advanced deduction changes still require a reason. Every decision records who / when / why.</span></div><div id="wIncompleteBatch"></div>' +
        (shown.length ? '<div class="hr-scroll" style="max-height:58vh"><table class="hr-t"><thead><tr><th>Date</th><th>ID</th><th>Employee</th><th>In</th><th>Out</th><th>Punches</th><th class="r">Late min</th><th>Result</th><th>Flag</th><th>' + (field ? 'Dispatch support' : 'Attendance evidence') + '</th><th>Status</th>' + (act ? '<th>Decision</th>' : '') + '</tr></thead><tbody>' +
          shown.map(function (x) { var a = x.a, l = x.l; return '<tr><td>' + dow(a.date) + ' ' + esc(fmtDate(a.date)) + '</td><td>' + esc(a.personnel_id) + '</td><td class="name">' + esc(a.employee_name || emp(l.employee_id).display_name || l.employee_id) + (x.review_only ? '<br><small class="mut">Stored attendance · employee profile / identity needs correction</small>' : '') + '</td><td>' + t5(a.time_in) + '</td><td>' + t5(a.time_out) + '</td><td><small>' + esc((a.punches || []).map(t5).join(' · ')) + '</small></td><td class="r">' + lateCell(a.late_minutes) + '</td><td>' + result(l) + '</td><td><small>' + esc((l.evidence && l.evidence.flags || (l.flag ? [l.flag] : [])).map(function (k) { return FT[k] || k; }).join('; ')) + '</small></td><td>' + (field ? dispCell(a.dispatch) : '<small class="mut">Clock records / HR evidence</small>') + '</td><td>' + status(l) + '</td>' +
            (act ? '<td style="white-space:nowrap">' + decisionCell(x) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>'
          : '<p>' + (f === 'review' ? '✅ Nothing left to review in ' + VALIDATION_GROUP_LABELS[group] + '.' : 'No rows in ' + VALIDATION_GROUP_LABELS[group] + '.') + '</p>') +
        '<p class="mut">Missing biometric evidence across all groups: <b>' + (+c.missing_pending || 0) + ' pending HR validation</b>.</p>' +
        (missing.length ? '<div class="hr-warn" style="margin-top:12px"><b>Missing biometric evidence · ' + VALIDATION_GROUP_LABELS[group] + ' · ' + missing.filter(function (m) { return m.pending; }).length + ' pending HR validation</b><p>Missing records remain pending. For attendance supported by other evidence, add and validate the day in DTR. Record a no-pay decision only after HR has checked it.</p><div class="hr-scroll"><table class="hr-t"><thead><tr><th>Employee</th><th>Coverage</th>' + (field ? '<th>Scheduled team support</th>' : '') + '<th>Status / reason</th>' + (act ? '<th>HR decision</th>' : '') + '</tr></thead><tbody>' + missing.map(function (m) { return '<tr><td>' + esc(m.display_name || emp(m.employee_id).display_name || m.employee_id) + '</td><td>' + (m.date ? esc(fmtDate(m.date)) : 'No records in this upload') + '</td>' + (field ? '<td>' + esc((m.teams || []).join(', ') || '—') + '</td>' : '') + '<td>' + (m.pending ? 'Pending HR validation' : m.decision === 'manual' ? 'Attendance confirmed by HR' : 'HR reviewed · ' + esc(m.reason || '')) + '</td>' + (act ? '<td>' + (m.pending && eligibleMissing[m.key] ? '<button class="hr-btn" data-miss="' + esc(m.key) + '">Confirm no pay…</button>' : '') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div></div>' : '') +
        '<div class="hr-bar" style="margin-top:10px"><button class="hr-btn" id="wBack">← Match people</button><button class="hr-btn p" id="wNext">Next → Preview payroll</button>' + (c.unreviewed ? '<span class="mut">You can preview now; approval waits until every flagged day is reviewed.</span>' : '') + '</div></div>';
      el.innerHTML = html;
      rootEl.querySelectorAll('[data-w-group]').forEach(function (b) { b.onclick = function () { if (validationGroupChange(w, b.dataset.wGroup)) { closeModal(); closePop(); TABS.newpay(); } }; });
      $('#wFilt').onchange = function () { if (w.batch) w.batch.selected = {}; w.filter = this.value; TABS.newpay(); };
      $('#wBack').onclick = function () { w.step = 2; TABS.newpay(); }; $('#wNext').onclick = function () { w.step = 4; w.lines = null; TABS.newpay(); };
      function reloadReview() { if (w.batch) w.batch.selected = {}; w.lines = null; return loadBase().then(loadPeriodData).then(wizLoadReview).then(render); }
      function after(msg) { return function () { toast(msg); return reloadReview(); }; }
      w.batch = w.batch || {};
      renderIncompleteBatch('wIncompleteBatch', { state: w.batch, rows: shown, periodId: w.periodId, group: group, scope: validationBatchScope(w.periodId, f, group), hoursPerDay: S.settings && S.settings.hours_per_day, act: act, after: reloadReview, reload: function () { wizLoadReview().then(TABS.newpay).catch(fail); } });
      rootEl.querySelectorAll('[data-miss]').forEach(function (b) { b.onclick = function () {
        var m = missing.find(function (x) { return x.key === b.dataset.miss; }); if (!m || !eligibleMissing[m.key]) return;
        var why = prompt('HR no-pay decision for ' + m.display_name + (m.date ? ' · ' + fmtDate(m.date) : ' · this upload') + '\nMissing biometrics alone is not an absence decision. Enter the reason/evidence after checking attendance:');
        if (!why || !why.trim()) return; b.disabled = true;
        api.reviewMissingBiometric(w.periodId, m.key, { decision: 'no_pay', reason: why.trim() }).then(after('Missing evidence reviewed by HR')).catch(function (e) { b.disabled = false; fail(e); });
      }; });
      var aa = $('#wAcceptAll'); if (aa) aa.onclick = function () { if (!confirm('Accept all ' + bulk.length + ' rows shown, keeping the computed result?')) return; api.verifyLogs(bulk.map(function (x) { return x.l.id; })).then(after(bulk.length + ' day(s) reviewed')).catch(fail); };
      rootEl.querySelectorAll('[data-inc]').forEach(function (b) {
        b.onclick = function () {
          var x = shown.find(function (r) { return String(r.l.id) === b.dataset.inc; }); if (!x || !incompleteIssue(x)) return;
          w.batch.issue = incompleteIssue(x); w.batch.selected = {}; w.batch.selected[String(x.l.id)] = true; TABS.newpay();
          var group = $('#wIncompleteBatch'); if (group) group.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        };
      });
      rootEl.querySelectorAll('[data-acc]').forEach(function (b) { b.onclick = function () { var x = shown.find(function (r) { return String(r.l.id) === b.dataset.acc; }); if (!x || !eligibleRows[String(x.l.id)] || pend(x.l)) return; b.disabled = true; api.verifyLogs([x.l.id]).then(after('Reviewed')).catch(fail); }; });
      rootEl.querySelectorAll('[data-ded]').forEach(function (s) {
        var prev = s.value;
        s.onchange = function () {
          var x = shown.find(function (r) { return String(r.l.id) === s.dataset.ded; }); if (!x || !eligibleRows[String(x.l.id)]) return; var l = x.l, v = s.value;
          var why = prompt('Reason for "' + DED_OPTS.find(function (o) { return o[0] === v; })[1] + '" on ' + (x.a.employee_name || emp(l.employee_id).display_name) + ' · ' + fmtDate(l.work_date) + ':'); if (!why || !why.trim()) { s.value = prev; return; }
          var patch; try { patch = attendanceDeductionPatch(l, v, S.holidays, S.settings && S.settings.hours_per_day); } catch (e) { s.value = prev; fail(e); return; }
          patch.override_reason = why.trim();
          api.setLog(l.employee_id, l.work_date, patch).then(after('Saved · ' + (v === 'absent' ? 'absent' : v === '0' ? 'no deduction' : dedLabel(v)))).catch(function (e) { s.value = prev; fail(e); });
        };
      });
    }

    // Step 4 — Preview & approve
    function wizPreview(el, w) {
      var rv = w.review, p = rv.period, locked = p.status === 'locked';
      if (!w.lines) {
        el.innerHTML = '<div class="hr-card">' + (locked ? 'Loading…' : 'Computing payroll…') + '</div>';
        (locked ? Promise.resolve() : api.computePeriod(p.id)).then(function () { return api.listLines(p.id); }).then(function (ls) { w.lines = ls; return refresh(); }).then(wizLoadReview).then(TABS.newpay).catch(fail); return;
      }
      var all = w.lines, paid = all.filter(function (l) { return (+l.days || 0) > 0 || (+l.gross || 0) > 0; }), list = w.showZero ? all : paid;
      function other(l) { return C.round2((+l.sss_loan || 0) + (+l.hdmf_loan || 0) + (+l.cash_advance || 0) + (+l.company_loan || 0) + (+l.partial_payroll || 0) + (+l.others || 0)); }
      function tot(fn) { return C.round2(all.reduce(function (s, l) { return s + (typeof fn === 'function' ? fn(l) : +l[fn] || 0); }, 0)); }
      var cal = (S.settings && S.settings.deduction_calendar) || C.DEFAULT_SETTINGS.deduction_calendar, wom = p.week_of_month, due = [];
      [['sss', 'SSS'], ['phic', 'PhilHealth'], ['hdmf', 'Pag-IBIG'], ['gov_loan', 'SSS / Pag-IBIG loans']].forEach(function (k) { if (C.dueThisWeek(k[0], wom, cal)) due.push(k[1]); });
      var cm = C.contributionMonth(p.pay_date), lastDay = rv.rows.reduce(function (m, a) { return a.date > m ? a.date : m; }, ''), partial = lastDay < p.period_end;
      // every line counts (the Register locks all of them). Owner 2026-10-05: a zero-pay week withholds no contribution (HrCore contrib_skipped), so a 0-day line nets 0;
      // a negative net can still come from a hand-typed Register value or deductions larger than a small week's pay
      var neg = all.filter(function (l) { return (+l.net || 0) < 0; }), skipped = all.filter(function (l) { return l.contrib_skipped; });
      var checks = [[!rv.unmatched.length, 'Everyone on the device matched or excluded', rv.unmatched.length + ' not matched'], [!rv.counts.missing_pending, 'Missing biometric evidence reviewed by HR', rv.counts.missing_pending + ' missing record(s) pending HR validation'], [!rv.counts.incomplete_pending, 'Every incomplete punch validated by HR', rv.counts.incomplete_pending + ' incomplete punch day(s) pending HR validation — their hours in this preview are PROVISIONAL'], [!rv.counts.unreviewed, 'Every flagged day reviewed', rv.counts.unreviewed + ' flagged day(s) to review'],
        [!neg.length, 'No negative net pay', neg.length + ' employee(s) with negative net (₱' + money(C.round2(neg.reduce(function (s, l) { return s + (+l.net || 0); }, 0))) + ') — deductions exceed this week\'s pay; adjust in the Register / Deductions tab']];
      var blocked = checks.some(function (x) { return !x[0]; });
      var html = '<div class="hr-card"><h3>4 · Payroll preview' + (locked ? ' — APPROVED' : ' — DRAFT, not approved') + '</h3>' +
        '<div class="hr-kpis">' + kpi('Employees paid', paid.length + ' <small>of ' + all.length + '</small>') + kpi('Gross pay', '₱' + money(tot('gross'))) + kpi('Attendance deductions', '₱' + money(tot('attendance_deduction')) + ' <small>' + tot('attendance_hours') + ' h</small>', 'warn') +
          kpi('SSS', '₱' + money(tot('sss'))) + kpi('PhilHealth', '₱' + money(tot('phic'))) + kpi('Pag-IBIG / HDMF', '₱' + money(tot('hdmf'))) + kpi('Other deductions', '₱' + money(tot(other))) + kpi('Net pay', '₱' + money(tot('net')), 'good') + '</div>' +
        '<p class="mut">Week ' + wom + ' of the month · pay date ' + esc(fmtDate(p.pay_date)) + ' · contributions for <b>' + esc(cm) + '</b> — deducted this week: <b>' + (due.length ? due.join(', ') : 'none') + '</b>' + (skipped.length ? ' — except the <b>' + skipped.length + '</b> employee(s) with no pay this week: nothing is withheld from them and their month stays “not deducted” in the Mandatory summary' : '') + (all.filter(function (l) { return l.rate_floor_applied; }).length ? ' <b>' + all.filter(function (l) { return l.rate_floor_applied; }).length + '</b> employee(s) are paid at the ₱' + money((S.settings && S.settings.min_daily_rate) || C.DEFAULT_SETTINGS.min_daily_rate) + ' minimum daily rate (marked ▲ min; the rate on file is unchanged).' : '') + ' Driver allowance = ₱' + money(S.settings && S.settings.driver_daily_allowance != null ? S.settings.driver_daily_allowance : C.DEFAULT_SETTINGS.driver_daily_allowance) + ' per unique qualifying two-person deployment with attendance evidence; three-person crews get zero. Historical daily / solo compatibility remains separately recorded.' + ' (deduction calendar; amounts from the contribution tables, per-employee overrides and any manual ledger basis — unchanged rules). Other deductions = loans + cash advance + company loan + partial payroll + others.</p>' +
        '<div class="hr-bar"><label><input type="checkbox" id="wZero"' + (w.showZero ? ' checked' : '') + '> show employees with 0 days (' + (all.length - paid.length) + ')</label></div>' +
        '<div class="hr-scroll" style="max-height:52vh"><table class="hr-t"><thead><tr><th>Emp no.</th><th>Name</th><th class="r">Days</th><th class="r">Rate</th><th class="r" title="Driver allowance per unique qualifying two-person deployment; legacy daily units separate + any manual allowance">Allowance</th><th class="r">Gross pay</th><th class="r">Late / absence</th><th class="r">SSS</th><th class="r">PhilHealth</th><th class="r">Pag-IBIG</th><th class="r">Other ded.</th><th class="r">Total ded.</th><th class="r">Net pay</th></tr></thead><tbody>' +
          list.map(function (l) { var ad = +l.attendance_deduction || 0; return '<tr' + ((+l.net || 0) < 0 ? ' style="background:#fdeceb"' : '') + '><td>' + esc(l.emp_no || '') + '</td><td class="name">' + esc(l.display_name) + '</td><td class="r">' + (+l.days) + '</td><td class="r"' + (l.rate_floor_applied ? ' style="color:#9a6700;font-weight:700" title="Minimum daily rate applied: ₱' + money(l.daily_rate) + ' on file → paid at ₱' + money(effRate(l)) + '"' : '') + '>' + money(effRate(l)) + (l.rate_floor_applied ? ' <small>▲ min</small>' : '') + '</td><td class="r"' + (+l.driver_days ? ' title="' + (+l.driver_deployments || 0) + ' recorded deployment(s) + ' + (+l.legacy_driver_days || 0) + ' legacy / HR day(s); automatic ₱' + money(l.driver_allowance) + '"' : '') + '>' + (+l.allowance ? money(l.allowance) : '—') + '</td><td class="r">' + money(l.gross) + '</td><td class="r" title="' + (+l.attendance_hours || 0) + ' h · ' + (l.late_days || 0) + ' late day(s) · ' + (l.half_days || 0) + ' half-day(s)">' + (ad ? money(ad) + ' <small class="mut">' + (+l.attendance_hours) + 'h</small>' : '—') + '</td><td class="r">' + money(l.sss) + '</td><td class="r">' + money(l.phic) + '</td><td class="r">' + money(l.hdmf) + '</td><td class="r">' + money(other(l)) + '</td><td class="r">' + money(l.total_deductions) + '</td><td class="r"><b>' + money(l.net) + '</b></td></tr>'; }).join('') +
          '<tr style="font-weight:800"><td></td><td>TOTAL' + (list.length < all.length ? ' <small class="mut">— all ' + all.length + ' Register lines, incl. ' + (all.length - list.length) + ' with 0 days (tick above to list them)</small>' : '') + '</td><td class="r">' + C.round2(tot('days')) + '</td><td></td><td class="r">' + money(tot('allowance')) + '</td><td class="r">' + money(tot('gross')) + '</td><td class="r">' + money(tot('attendance_deduction')) + '</td><td class="r">' + money(tot('sss')) + '</td><td class="r">' + money(tot('phic')) + '</td><td class="r">' + money(tot('hdmf')) + '</td><td class="r">' + money(tot(other)) + '</td><td class="r">' + money(tot('total_deductions')) + '</td><td class="r">' + money(tot('net')) + '</td></tr></tbody></table></div>' +
        (locked ? '<div class="hr-bar" style="margin-top:10px"><span class="hr-chip locked">🔒 approved by ' + esc(p.locked_by || '') + '</span><button class="hr-btn" id="wXlsx">⬇ Excel</button><button class="hr-btn" id="wSlips">🖨 Payslips</button><button class="hr-btn" id="wReg">Open in Register</button></div>'
          : '<div class="hr-check">' + checks.map(function (x) { return '<div class="' + (x[0] ? 'ok' : 'no') + '">' + (x[0] ? '✓ ' + esc(x[1]) : '✖ ' + esc(x[2])) + '</div>'; }).join('') +
            (partial ? '<label class="no" style="display:block"><input type="checkbox" id="wPartial"> ⚠ The file’s last day is ' + esc(fmtDate(lastDay)) + ' but the week ends ' + esc(fmtDate(p.period_end)) + ' — I confirm this file is the complete attendance for the week</label>' : '') + '</div>' +
            '<div class="hr-bar"><button class="hr-btn" id="wBack">← Review attendance</button><button class="hr-btn" id="wXlsx">⬇ Excel (DRAFT)</button><button class="hr-btn" id="wReg">Open in Register</button>' +
            (ro() ? '' : '<button class="hr-btn p" id="wApprove"' + (blocked ? ' disabled title="Clear the ✖ items first"' : '') + '>✅ Approve payroll</button>') + '</div>') + '</div>';
      el.innerHTML = html;
      $('#wZero').onchange = function () { w.showZero = this.checked; TABS.newpay(); };
      var b = $('#wBack'); if (b) b.onclick = function () { w.step = 3; TABS.newpay(); };
      $('#wXlsx').onclick = function () { api.listLogs(p.period_start, p.period_end).then(function (logs) { return exportXlsx(p, all, logs); }).catch(fail); };
      $('#wReg').onclick = function () { S.period = S.periods.find(function (x) { return x.id === p.id; }) || S.period; S.tab = 'register'; loadPeriodData().then(render).catch(fail); };
      var sl = $('#wSlips'); if (sl) sl.onclick = function () { printPayslips(p, all); };
      var ap = $('#wApprove'); if (ap) ap.onclick = function () {
        if (partial && !$('#wPartial').checked) return toast('Tick the confirmation: the file does not reach the end of the week');
        if (!confirm('Approve payroll ' + periodLabel(p) + '?\n\n' + paid.length + ' employees · gross ₱' + money(tot('gross')) + ' · net ₱' + money(tot('net')) + '\n\nThe week is locked: attendance is frozen, loan balances are reduced and the contributions are marked deducted. Reopening needs a reason.')) return;
        ap.disabled = true;
        api.lockPeriod(p.id).then(function () { toast('Payroll approved and locked'); w.lines = null; w.review = null; return refresh(); }).catch(function (e) { ap.disabled = false; fail(e); });
      };
    }

    // ---------- Register ----------
    var REG_COLS = [['emp_no', 'EMPLOYEE NO.'], ['display_name', 'NAME'], ['position', 'POSITION'], ['daily_rate', 'RATE', 'r', 'rate'], ['days', 'NO. OF DAYS', 'r'], ['basic', 'BASIC PAY', 'r'], ['rdot', 'R.DOT', 'r'], ['lh_pay', 'L.H (PAY)', 'r'], ['sh_pay', 'S.H (PAY)', 'r'],
      ['allowance', 'ALLOWANCE', 'r', 1], ['adjustment', 'ADJUSTMENT', 'r', 1], ['gross', 'TOTAL', 'r'], ['attendance_deduction', 'LATE / ABSENCE', 'r'], ['sss', 'SSS', 'r', 1], ['phic', 'PHILHEALTH', 'r', 1], ['hdmf', 'PAGIBIG', 'r', 1], ['cash_advance', 'CASH ADVANCE', 'r'], ['gov_loan', 'SSS/PAGIBIG LOAN', 'r'], ['company_loan', 'COMPANY LOAN', 'r'],
      ['partial_payroll', 'PARTIAL PAYROLL', 'r', 1], ['others', 'OTHERS', 'r', 1], ['total_deductions', 'TOTAL', 'r'], ['net', 'NET AMOUNT', 'r'], ['bank_account', 'PSBANK ACCOUNT'], ['remarks', 'REMARKS', '', 1]];
    // Owner 2026-10-05 (demo): the RATE shown / exported is the EFFECTIVE rate (minimum PHP 755 floor); the stored rate stays on l.daily_rate for audit
    function effRate(l) { return l.effective_rate != null ? +l.effective_rate : +l.daily_rate; }
    function rateLabel(l) { return 'Daily rate' + (l.rate_floor_applied ? ' (minimum rate applied; on file ' + money(l.daily_rate) + ')' : ''); }
    function lineVal(l, k) { return k === 'daily_rate' ? effRate(l) : k === 'gov_loan' ? C.round2((+l.sss_loan || 0) + (+l.hdmf_loan || 0)) : l[k]; }
    TABS.register = function () {
      if (!S.period) { $('#hrBody').innerHTML = '<div class="hr-card">Create a period first.</div>'; return; }
      S.regView = S.regView === 'no_logs' ? 'no_logs' : 'with_logs'; S.regQ = S.regQ || '';
      var p = S.period, locked = p.status === 'locked', unv = S.logs.filter(function (l) { return !l.verified_at; });
      var view = registerView(S.lines, S.employees, S.logs, p, S.settings, S.regView, S.regQ), sectionName = view.section === 'no_logs' ? 'No attendance logs / HR review' : 'Recorded attendance';
      function sectionCount(key) { return S.regQ.trim() ? view.matches[key] + ' of ' + view.counts[key] : view.counts[key]; }
      function totalRow(label, totals) { return '<tr style="font-weight:800"><td colspan="5">' + label + '</td>' + REG_COLS.slice(3).map(function (c) { return '<td class="' + (c[2] || '') + '">' + (totals[c[0]] != null ? (c[0] === 'days' ? totals[c[0]] : money(totals[c[0]])) : '') + '</td>'; }).join('') + '</tr>'; }
      function summary(totals) { return '<div class="hr-kpis">' + [['gross', 'Gross pay'], ['total_deductions', 'Deductions'], ['net', 'Net pay']].map(function (x) { return '<div class="hr-kpi"><small>' + x[1] + '</small><b>₱' + money(totals[x[0]]) + '</b></div>'; }).join('') + '</div>'; }
      $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar">' + periodSelect() + '<span class="hr-chip ' + esc(p.status) + '">' + esc(p.status) + '</span><span style="font-size:11px;color:#8a9894">week ' + p.week_of_month + ' · contributions for ' + esc(C.contributionMonth(p.pay_date)) + '</span>' +
        (unv.length && !locked ? '<button class="hr-btn" id="rUnv" title="Open the Validate tab on the first unverified date' + (S.settings && S.settings.lock_requires_verified ? ' — Lock is refused until every log is verified' : '') + '"><span class="hr-chip computed">' + unv.length + ' unverified</span></button>' : '') +
        (ro() ? '' : (locked ? '<button class="hr-btn d" id="rReopen">Reopen…</button>' : '<button class="hr-btn p" id="rCompute">⟳ Compute</button>' + (p.status === 'computed' ? '<button class="hr-btn d" id="rLock">🔒 Lock</button><span style="font-size:11px;color:#8a9894">Lock is refused if anything changed since the last Compute.</span>' : ''))) +
        '<button class="hr-btn" id="rXlsx" title="Export every computed line in the full register, across both sections"' + (S.lines.length ? '' : ' disabled') + '>⬇ Excel · full register' + (locked ? '' : ' (DRAFT)') + '</button><button class="hr-btn" id="rSlips" title="Print eligible payslips from the full register, across both sections"' + (S.lines.length ? '' : ' disabled') + '>🖨 Payslips · full register</button>' + REREAD + '</div>' +
        (S.unmatched.length && !locked ? '<div class="hr-warn">⚑ ' + S.unmatched.length + ' unmatched crew names — their days are NOT in this register yet.</div>' : '') +
        '<h3>Full-register totals <span class="mut">· ' + S.lines.length + ' computed line(s)</span></h3>' + summary(view.full_totals) +
        (view.awaiting_compute ? '<p class="mut">' + view.awaiting_compute + ' active roster member(s) awaiting Compute. Their amounts are blank until a payroll line is computed.</p>' : '') +
        '<div class="hr-bar"><div class="hr-tabs" role="tablist" aria-label="Register attendance sections" style="margin:0"><button type="button" data-reg-view="with_logs" role="tab" aria-controls="rSection" aria-selected="' + (view.section === 'with_logs') + '" class="' + (view.section === 'with_logs' ? 'on' : '') + '">Recorded attendance (' + sectionCount('with_logs') + ')</button><button type="button" data-reg-view="no_logs" role="tab" aria-controls="rSection" aria-selected="' + (view.section === 'no_logs') + '" class="' + (view.section === 'no_logs' ? 'on' : '') + '">No attendance logs / HR review (' + sectionCount('no_logs') + ')</button></div><input id="rQ" type="search" aria-label="Search register employees" placeholder="Search name, no., position, department…" value="' + esc(S.regQ) + '" style="min-width:250px;flex:1"></div>' +
        '<div id="rSection" role="tabpanel"><h3>' + sectionName + '</h3><p class="mut">' + (view.section === 'no_logs' ? 'No attendance log was recorded in this period. Review these employees with HR; holiday pay and manual amounts remain in the register.' : 'Employees with at least one attendance log in this period, including recorded zero-hour absences. Logged days describe records, not paid days.') + '</p>' +
        '<h3 style="font-size:13px">Visible-section subtotal <span class="mut">· ' + view.visible.length + ' shown' + (S.regQ.trim() ? ' · search applied' : '') + '</span></h3>' + summary(view.visible_totals) +
        (view.visible.length ? '<div class="hr-scroll" id="rTable"><table class="hr-t"><thead><tr><th>#</th><th>ATTENDANCE RECORDS</th>' + REG_COLS.map(function (c) { return '<th class="' + (c[2] || '') + '">' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
          view.visible.map(function (l, i) { var count = view.logged_days[l.employee_id] || 0; return '<tr><td>' + (i + 1) + '</td><td><span class="hr-chip ' + (count ? 'locked' : 'computed') + '">' + (count ? count + ' logged day(s)' : 'HR review') + '</span>' + (l.awaitingCompute ? '<br><small>Awaiting Compute</small>' : '') + '</td>' + REG_COLS.map(function (c) { var v = l.awaitingCompute ? (c[2] === 'r' ? '—' : l[c[0]]) : lineVal(l, c[0]), ed = !l.awaitingCompute && c[3] && !locked && (c[3] === 'rate' ? rateEditOK() : !ro()), m = (l.manual_fields || []).indexOf(c[0]) >= 0; return '<td class="' + (c[2] || '') + (ed ? ' ed' : '') + (m ? ' m' : '') + '"' + (ed ? ' contenteditable data-ln="' + esc(l.id) + '" data-k="' + c[0] + '"' : '') + (!l.awaitingCompute && c[0] === 'allowance' ? ' title="' + (Number(l.driver_deployments) || 0) + ' recorded deployment(s) + ' + (Number(l.legacy_driver_days) || 0) + ' legacy / HR day(s) × rate + manual ' + money(l.manual_allowance) + (m ? ' — hand-typed override' : '') + '"' : !l.awaitingCompute && (c[0] === 'cash_advance' || c[0] === 'company_loan') ? ' title="scheduled (Employees → Loans) ' + money(C.round2((+v || 0) - (+l['manual_' + c[0]] || 0))) + ' + Deductions tab ' + money(l['manual_' + c[0]]) + '"' : '') + '>' + (l.awaitingCompute ? esc(v) : c[2] === 'r' ? (c[0] === 'days' ? String(+v) : money(v)) : esc(v)) + '</td>'; }).join('') + '</tr>'; }).join('') +
          totalRow('Visible-section subtotal', view.visible_totals) + totalRow('Full-register totals · all computed lines', view.full_totals) + '</tbody></table></div>' : '<p>' + (S.regQ.trim() ? 'No search matches in this section. Check the other section’s match count.' : 'No employees in this section. Check the other section for the rest of the roster.') + '</p>') +
        '</div><p class="mut">Excel and payslips use the full register across both sections. Payslips retain the usual eligibility rules.</p>' +
        (S.lines.length ? '<p style="font-size:11px;color:#8a9894">Yellow cells are editable (Enter / click away to save); an orange bar marks a manually edited cell that recompute will keep. Loan columns are computed from Employees → Loans (add / stop / change amortisation there), never typed here.</p>' : '<p>No computed lines yet — click <b>Compute</b>.</p>') + '</div>';
      bindPeriodSelect(); bindReread();
      rootEl.querySelectorAll('[data-reg-view]').forEach(function (b) { b.onclick = function () { S.regView = b.dataset.regView; TABS.register(); }; });
      $('#rQ').oninput = function () {
        S.regQ = this.value; var start = this.selectionStart, end = this.selectionEnd;
        TABS.register(); var input = $('#rQ'); input.focus(); input.setSelectionRange(start, end);
      };
      var ub = $('#rUnv'); if (ub) ub.onclick = function () { S.val.date = unv.map(function (l) { return l.work_date; }).sort()[0]; S.val.unv = true; S.tab = 'validate'; render(); };
      var cb = $('#rCompute'); if (cb) cb.onclick = function () { cb.disabled = true; api.computePeriod(p.id).then(function (r) { toast(r.lines + ' lines computed' + (r.ignored_out_of_window ? ' · ' + r.ignored_out_of_window + ' log(s) ignored — outside the employment window' : '')); return refresh(); }).catch(fail); };
      var lb = $('#rLock'); if (lb) lb.onclick = function () { if (!confirm('Lock ' + periodLabel(p) + '?\nLoan balances will be reduced and payslips finalised. Reopen needs a reason.')) return; api.lockPeriod(p.id).then(function () { toast('Locked'); return refresh(); }).catch(fail); };
      var rb = $('#rReopen'); if (rb) rb.onclick = function () { var why = prompt('Reason for reopening ' + periodLabel(p) + ':'); if (!why) return; api.reopenPeriod(p.id, why).then(function () { toast('Reopened'); return refresh(); }).catch(fail); };
      // D2: a figure that has not caught up must not leave the screen looking final. This is where an old number
      // reaches paper, and paper is what people get paid against. Dark until hr.period_stale exists (S.stale is null).
      $('#rXlsx').onclick = function () { if (staleGate('Excel export')) exportXlsx(p, S.lines, S.logs).catch(fail); };
      $('#rSlips').onclick = function () { if (staleGate('payslips')) printPayslips(p, S.lines); };
      rootEl.querySelectorAll('td[contenteditable]').forEach(function (td) {
        var orig = td.textContent;
        td.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); td.blur(); } if (e.key === 'Escape') { td.textContent = orig; td.blur(); } };
        td.onblur = function () {
          var raw = td.textContent.trim(); if (raw === orig) return;
          var k = td.dataset.k, request = saveRegisterEdit(api, td.dataset.ln, k, raw, restoreOK());
          if (k === 'daily_rate') {
            // a rate step changes nothing until the week is recomputed, so do it here rather than
            // leaving the register showing the old pay beside the new rate
            $('#hrBody').innerHTML = '<div class="hr-card">Recomputing the week at the new rate…</div>';
            request.then(function (r) {
              if (r && r.lifted_to_minimum) toast('Saved ₱' + money(r.daily_rate) + ' — paid at the ₱' + money(r.effective_rate) + ' minimum in force');
              else if (r) toast('Rate set to ₱' + money(r.daily_rate) + ' from ' + fmtDate(r.effective_from));
              return api.computePeriod(S.period.id);
            }).then(refresh).catch(function (e) { fail(e); });
            return;
          }
          // hr.set_line recomputes gross, total_deductions and net for THIS line and returns the whole
          // row, so the register redraws from it instead of refetching the week's lines AND logs and
          // re-rendering every tab for one typed cell.
          // A restore is different and must not be patched: hr.restore_automatic_allowance also returns
          // a payroll line, but it runs compute_week for the WHOLE period, so every line may have moved —
          // redrawing only this one would leave the rest of the week showing pre-recompute figures.
          var isRestore = (k === 'allowance' && registerAllowanceEdit(raw).restore);
          request.then(function (line) {
            if (!isRestore && line && line.id) { S.lines = patchRows(S.lines, line, 'id'); TABS.register(); }
            else { return loadPeriodData().then(render); }
          }).catch(function (e) { td.textContent = orig; fail(e); });
        };
      });
    };
    function exportXlsx(p, lines, logs) {
      var ensure = deps.ensureXLSX ? deps.ensureXLSX() : (root.XLSX ? Promise.resolve() : Promise.reject(new Error('Excel library not available')));
      return ensure.then(function () {
        var X = root.XLSX, wb = X.utils.book_new(), days = C.datesBetween(p.period_start, p.period_end), draft = p.status !== 'locked';
        // DTR sheet: same block layout as the workbook (name row, 7 date rows, sum row, blank)
        var dtr = [[p.principal || '', 'REG. HOURS', 'REST DAY O.T', 'L. HOLIDAY', 'S. HOLIDAY'], [periodLabel(p) + (draft ? ' — DRAFT' : '')], []];
        lines.forEach(function (l) {
          var e = emp(l.employee_id); dtr.push([l.display_name + (e.status_tag ? ' [' + e.status_tag + ']' : '')]);
          var t = [0, 0, 0, 0];
          days.forEach(function (d) { var g = logs.find(function (x) { return x.employee_id === l.employee_id && x.work_date === d; }) || {}; var r = [new Date(d + 'T00:00:00'), +g.hours_reg || '', +g.hours_rd || '', +g.hours_lh || '', +g.hours_sh || '']; t[0] += +g.hours_reg || 0; t[1] += +g.hours_rd || 0; t[2] += +g.hours_lh || 0; t[3] += +g.hours_sh || 0; dtr.push(r); });
          dtr.push(['', t[0], t[1], t[2], t[3]]); dtr.push([]);
        });
        var wsD = X.utils.aoa_to_sheet(dtr, { cellDates: true }); wsD['!cols'] = [{ wch: 28 }, { wch: 11 }, { wch: 13 }, { wch: 11 }, { wch: 11 }]; X.utils.book_append_sheet(wb, wsD, 'DTR (Payroll)');
        // Payroll sheet: header rows + columns A..Z exactly like the workbook (blank column N sits between earnings TOTAL and SSS)
        var pay = [['', 'AHBA DEVELOPMENT'], ['', 'PAYROLL' + (draft ? ' — DRAFT' : '')], ['', 'PERIOD COVERED: ', periodLabel(p)], [], ['NO.'].concat(REG_COLS.map(function (c) { return c[1]; }).slice(0, 12), [''], REG_COLS.map(function (c) { return c[1]; }).slice(12))];
        lines.forEach(function (l, i) { var row = [i + 1]; REG_COLS.forEach(function (c, j) { if (j === 12) row.push(''); row.push(lineVal(l, c[0])); }); pay.push(row); });
        var tot = ['', '', '', '', '']; REG_COLS.slice(4).forEach(function (c, j) { if (j + 4 === 12) tot.push(''); tot.push(c[2] === 'r' ? C.round2(lines.reduce(function (a, l) { return a + (+lineVal(l, c[0]) || 0); }, 0)) : ''); }); pay.push(tot);
        var wsP = X.utils.aoa_to_sheet(pay); wsP['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 22 }].concat(REG_COLS.slice(3).map(function () { return { wch: 12 }; })); X.utils.book_append_sheet(wb, wsP, 'Payroll');
        // Payslip sheet: 2 across × 2 down per page, values (not VLOOKUPs) so it prints standalone
        var slips = [], cm = C.contributionMonth(p.pay_date).replace(/(\d{4})-(\d{2})/, function (_, y, m) { return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+m - 1] + ' ' + y; });
        function slipRows(l) { return l ? [['AHBA DEVELOPMENT'], [], ['PAYSLIP' + (draft ? ' — DRAFT' : '')], ["Employee's No.", ':', l.emp_no || ''], ["Employee's Name", ':', l.display_name], ['Period Covered', ':', periodLabel(p)], ['Position', ':', l.position || ''], [rateLabel(l), ':', effRate(l)], [], ['EARNINGS:'], ['  No. of days worked', ':', l.days], ['  Basic Pay', ':', l.basic], ['  Rest Day Pay', ':', l.rdot], ['  Legal Holiday Pay', ':', l.lh_pay], ['  Special Holiday Pay', ':', l.sh_pay], ['  Allowance', ':', l.allowance], ['  Adjustment', ':', l.adjustment], [], ['GROSS PAY', ':', l.gross], [], ['DEDUCTIONS:'], ['Late / Absence (' + (+l.attendance_hours || 0) + ' h)', ':', +l.attendance_deduction || 0], ['SSS (' + cm + ')', ':', l.sss], ['PHIC (' + cm + ')', ':', l.phic], ['PAGIBIG (' + cm + ')', ':', l.hdmf], ['Cash Advance', ':', l.cash_advance], ['SSS/PAGIBIG Loan', ':', lineVal(l, 'gov_loan')], ['Company Loan', ':', l.company_loan], ['Partial Payroll', ':', l.partial_payroll], ['  Others', ':', l.others], [], ['Total Deductions', ':', l.total_deductions], [], ['NET SALARY', '', l.net]] : []; }
        var sl = slipLines(lines);   // Amendment 5: zero-day employees get no payslip
        for (var i = 0; i < sl.length; i += 2) { var a = slipRows(sl[i]), b = slipRows(sl[i + 1]); for (var r = 0; r < 35; r++) slips.push((a[r] || []).concat(['', ''], b[r] || [])); }
        X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(slips), 'Payslip');
        var pd = new Date(p.pay_date + 'T00:00:00'), fn = 'PAYROLL-' + String(pd.getMonth() + 1).padStart(2, '0') + '-' + String(pd.getDate()).padStart(2, '0') + '-' + String(pd.getFullYear()).slice(-2) + (draft ? '-DRAFT' : '') + '.xlsx';
        X.writeFile(wb, fn);
      });
    }
    // Amendment 5 (owner): no payslip for an employee with zero days and nothing to pay — the Register / Payroll sheet still list the row (the workbook does)
    function slipLines(lines) { return lines.filter(function (l) { return (+l.days || 0) > 0 || (+l.gross || 0) > 0; }); }
    function printPayslips(p, all) {
      var lines = slipLines(all); if (!lines.length) return toast('No payslips: every line has zero days'); if (lines.length < all.length) toast(lines.length + ' payslips · ' + (all.length - lines.length) + ' zero-day employee(s) skipped');
      var cm = C.contributionMonth(p.pay_date), mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+cm.slice(5) - 1] + ' ' + cm.slice(0, 4);
      function row(k, v, b) { return '<tr' + (b ? ' class="b"' : '') + '><td>' + esc(k) + '</td><td>:</td><td class="r">' + (typeof v === 'number' ? money(v) : esc(v)) + '</td></tr>'; }
      var html = lines.map(function (l) {
        return '<div class="slip"><h4>AHBA DEVELOPMENT</h4><h5>PAYSLIP' + (p.status !== 'locked' ? ' — DRAFT' : '') + '</h5><table>' + row("Employee's No.", l.emp_no || '') + row("Employee's Name", l.display_name) + row('Period Covered', periodLabel(p)) + row('Position', l.position || '') + row(rateLabel(l), effRate(l)) +
          '<tr><td colspan=3><b>EARNINGS:</b></td></tr>' + row('  No. of days worked', String(+l.days)) + row('  Basic Pay', +l.basic) + row('  Rest Day Pay', +l.rdot) + row('  Legal Holiday Pay', +l.lh_pay) + row('  Special Holiday Pay', +l.sh_pay) + row('  Allowance', +l.allowance) + row('  Adjustment', +l.adjustment) + row('GROSS PAY', +l.gross, 1) +
          '<tr><td colspan=3><b>DEDUCTIONS:</b></td></tr>' + (+l.attendance_deduction ? row('Late / Absence (' + (+l.attendance_hours) + ' h)', +l.attendance_deduction) : '') + row('SSS (' + mon + ')', +l.sss) + row('PHIC (' + mon + ')', +l.phic) + row('PAGIBIG (' + mon + ')', +l.hdmf) + row('Cash Advance', +l.cash_advance) + row('SSS/PAGIBIG Loan', lineVal(l, 'gov_loan')) + row('Company Loan', +l.company_loan) + row('Partial Payroll', +l.partial_payroll) + row('  Others', +l.others) + row('Total Deductions', +l.total_deductions, 1) + row('NET SALARY', +l.net, 1) + '</table></div>';
      }).join('');
      var w = window.open('', '_blank'); if (!w) return toast('Allow pop-ups to print');
      w.document.write('<!doctype html><title>Payslips ' + esc(periodLabel(p)) + '</title><style>body{font:11px Arial,sans-serif;margin:10mm}.slip{display:inline-block;width:48%;vertical-align:top;box-sizing:border-box;padding:6px 10px;border:1px dashed #999;margin:0 1% 8px 0;page-break-inside:avoid}.slip h4,.slip h5{margin:2px 0;text-align:center}table{width:100%;border-collapse:collapse}td{padding:1px 2px}td.r{text-align:right;font-variant-numeric:tabular-nums}tr.b td{font-weight:800;border-top:1px solid #000}@page{size:A4;margin:8mm}</style>' + html + '<script>window.onload=function(){window.print()}<\/script>');
      w.document.close();
    }
    // ---------- Allowance (Amendment 2, admin only) ----------
    // Per period: recorded deployment units plus separate legacy / HR daily units × allowance rate, plus a manual
    // amount / note typed here (hr.allowances, saved on Enter / blur through saveAllowance). Compute adds both into the Register's ALLOWANCE cell
    // (a hand-typed Register cell still overrides). Read-only once the period is locked.
    TABS.allowance = function (pre) {
      if (!S.period) { $('#hrBody').innerHTML = '<div class="hr-card">Create a period first.</div>'; return; }
      var p = S.period, locked = p.status === 'locked', act = !ro() && !locked, rate = S.settings && S.settings.driver_daily_allowance != null ? Number(S.settings.driver_daily_allowance) : C.DEFAULT_SETTINGS.driver_daily_allowance;
      if (isNaN(rate)) rate = C.DEFAULT_SETTINGS.driver_daily_allowance;
      $('#hrBody').innerHTML = '<div class="hr-card">Loading…</div>';
      // pre = the rows an upload just patched from the server's answer: nothing is asked for again
      (pre && pre.period_id === p.id ? Promise.resolve(pre.rows) : api.listAllowances(p.id)).then(function (rows) {
        var byEmp = {}; rows.forEach(function (r) { byEmp[r.employee_id] = r; });
        var view = driverAllowanceView(S.employees, S.logs, S.lines, rows, S.settings, p), emps = view.rows.map(function (r) { return r.employee; }), tot = view.totals;
        var reasonLabels = { three_person_crew: 'Three-person crew · no allowance', actual_event_coverage: 'Recorded departure used', not_driver: 'Crew member is not the driver', crew_discrepancy: 'Security crew discrepancy · review required', fuzzy_crew_identity: 'Similar crew name · review required', ambiguous_crew_identity: 'Ambiguous crew identity', unresolved_crew_identity: 'Unmatched crew identity', event_date_conflict: 'Departure dates disagree', dispatch_date_conflict: 'Dispatch dates disagree', conflicting_event_id: 'Conflicting copies of one departure', conflicting_event_evidence: 'Conflicting departure evidence', missing_event_id: 'Departure identity missing', invalid_event_timestamp: 'Departure time invalid', invalid_work_date: 'Departure date invalid', outside_employment_window: 'Outside employment dates', missing_driver: 'Driver identity missing', invalid_crew_count: 'Crew size needs review', excluded_event: 'Departure excluded' };
        function evidenceHtml(r) {
          var text = r.legacy_unknown ? '<small class="mut">Daily declaration / historical solo rule · number of trips unconfirmed.</small>' : '';
          if (!r.evidence.length) return text || '<small class="mut">No qualifying departure evidence.</small>';
          return '<details><summary>' + r.evidence.length + ' departure record(s)</summary>' + r.evidence.map(function (x) {
            var t = Date.parse(x.checked_at), time = isFinite(t) ? new Date(t + 8 * 3600e3).toISOString().slice(11, 16) : '—';
            return '<div style="margin:5px 0"><b>' + esc(x.team) + ' · ' + esc(x.date) + ' ' + time + '</b><br>Departure ' + esc((x.source_ids || [x.source_id]).join(', ')) + ' · ' + x.crew_count + ' people<br>' + (x.eligible ? 'Eligible two-person driver deployment' : esc((x.reasons || []).map(function (reason) { return reasonLabels[reason] || reason; }).join('; ') || 'Historical solo compatibility')) + '</div>';
          }).join('') + '</details>' + text;
        }
        var body = view.rows.map(function (r) {
          var e = r.employee;
          return '<tr><td>' + esc(e.emp_no || '') + '</td><td class="name"><b>' + esc(e.display_name) + '</b>' + (e.position ? ' <small class="mut">' + esc(e.position) + '</small>' : '') + '</td><td class="r">' + r.deployments + '</td><td class="r">' + r.legacy_days + '</td><td class="r">' + money(r.automatic) + '</td>' +
            '<td class="r' + (act ? ' ed' : '') + (r.manual ? '' : ' blank') + '"' + (act ? ' contenteditable data-alw="' + esc(e.id) + '" data-k="amount"' : '') + '>' + (r.manual ? money(r.manual) : (act ? '0.00' : '')) + '</td>' +
            '<td class="' + (act ? 'ed' : '') + '"' + (act ? ' contenteditable data-alw="' + esc(e.id) + '" data-k="note"' : '') + ' style="white-space:normal;min-width:140px">' + esc(r.note) + '</td><td class="r"><b>' + money(r.total) + '</b>' + (r.override ? '<br><small>Register override</small>' + (act && restoreOK() ? '<br><button class="hr-btn" data-alw-auto="' + esc(r.line_id) + '">Use automatic</button>' : '') : '') + (r.stale ? '<br><small>Draft needs Compute</small>' : '') + '</td><td style="min-width:180px;white-space:normal">' + evidenceHtml(r) + '</td></tr>';
        }).join('');
        $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar">' + periodSelect() + '<span class="hr-chip ' + esc(p.status) + '">' + esc(p.status) + '</span>' +
          '<span class="mut">₱' + money(rate) + ' per qualifying two-person deployment · ' + rows.length + ' manual amount(s)</span>' +
          (act ? '<button class="hr-btn p" id="alwCompute">⟳ Compute allowances</button><button class="hr-btn" id="alwCopy" title="Fill blank manual amounts from the previous period">⧉ Copy manual amounts from previous period</button>' : '') + sheetButtons(locked) +
          (locked ? '<span class="hr-chip locked">🔒 locked — read only</span>' : '') + REREAD + '</div>' + staleBanner() +
          (view.stale ? '<div class="hr-warn">Dispatch evidence changed. Compute the draft to update Register and payslips; explicit manual overrides remain.</div>' : '') +
          '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>No.</th><th>Employee</th><th class="r">Recorded deployments</th><th class="r">Legacy / HR days</th><th class="r">Automatic allowance</th><th class="r">Manual amount</th><th>Note</th><th class="r">Allowance</th><th>Deployment evidence</th></tr></thead><tbody>' + body +
          '<tr style="font-weight:800"><td></td><td>TOTAL · ' + emps.length + ' employees</td><td class="r">' + tot.deployments + '</td><td class="r">' + tot.legacy_days + '</td><td class="r">' + money(tot.automatic) + '</td><td class="r">' + money(tot.manual) + '</td><td></td><td class="r">' + money(tot.total) + '</td><td></td></tr></tbody></table></div>' +
          '<p class="mut">A two-person driver earns ₱' + money(rate) + ' for each unique recorded deployment with attendance evidence; three-person crews earn zero automatically. Several work orders on one trip count once. Older daily declarations and historical solo / HR driver decisions stay separate because they cannot establish trip multiplicity. Manual amounts add per period; an explicit Register override, including zero, remains until <b>Use automatic</b>. Compute refreshes drafts without approving attendance.</p></div>';
        bindPeriodSelect(); bindReread(); bindSheet('allowance', p, view.rows);
        var compute = $('#alwCompute'); if (compute) compute.onclick = function () { compute.disabled = true; api.computePeriod(p.id).then(refresh).catch(fail); };
        rootEl.querySelectorAll('[data-alw-auto]').forEach(function (b) { b.onclick = function () { b.disabled = true; api.restoreAutomaticAllowance(b.dataset.alwAuto).then(refresh).catch(fail); }; });
        rootEl.querySelectorAll('td[data-alw]').forEach(function (td) {
          var orig = td.textContent;
          td.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); td.blur(); } if (ev.key === 'Escape') { td.textContent = orig; td.blur(); } };
          td.onblur = function () {
            var raw = td.textContent.trim(); if (raw === orig) return;
            var cur = byEmp[td.dataset.alw] || {}, patch = { period_id: p.id, employee_id: td.dataset.alw, amount: Number(cur.amount) || 0, note: cur.note || null };
            if (td.dataset.k === 'amount') patch.amount = Number(raw.replace(/,/g, '')) || 0; else patch.note = raw || null;
            // hr.save_allowance writes an allowances row; only compute_week folds it into the line, so
            // the week becomes "not computed yet" rather than being recomputed behind one typed cell.
            api.saveAllowance(patch).then(function () {
              return staleRead(p.id);
            }).then(function () { TABS.allowance(); }).catch(fail);
          };
        });
        var cp = $('#alwCopy'); if (cp) cp.onclick = function () {
          var prev = S.periods.filter(function (x) { return x.period_start < p.period_start; }).sort(function (a, b) { return a.period_start < b.period_start ? 1 : -1; })[0];
          if (!prev) return toast('No previous period');
          cp.disabled = true;
          api.listAllowances(prev.id).then(function (old) {
            var todo = old.filter(function (r) { return Number(r.amount) > 0 && !(Number((byEmp[r.employee_id] || {}).amount) > 0) && emps.some(function (e) { return e.id === r.employee_id; }); });   // blanks only, active employees only
            return Promise.all(todo.map(function (r) { return api.saveAllowance({ period_id: p.id, employee_id: r.employee_id, amount: Number(r.amount), note: (byEmp[r.employee_id] || {}).note || r.note || null }); })).then(function () { return todo.length; });
          }).then(function (n) { toast(n ? n + ' manual amount' + (n === 1 ? '' : 's') + ' copied from ' + periodLabel(prev) : 'Nothing to copy — previous period has no manual amounts for blank rows'); return n ? staleRead(p.id) : null; }).then(function () { TABS.allowance(); }).catch(fail);
        };
      }).catch(fail);
    };

    // ---------- Deductions (Amendment 2 / Task 21, admin only) ----------
    // Per period: one row per active employee (plus anyone who already has a row) — scheduled cash advance / company loan (read-only, this week's amortisation of the
    // employee's active loans under Employees → Loans) next to a one-off Cash advance / Company loan / Others / Note typed here (hr.deductions, saved on Enter / blur through
    // saveDeduction). Compute adds scheduled + typed into the Register's CASH ADVANCE / COMPANY LOAN cells and takes Others as OTHERS (a hand-typed Register OTHERS
    // cell still overrides; CASH ADVANCE / COMPANY LOAN are never typed on the Register). Read-only once the period is locked.
    TABS.deductions = function (pre) {
      if (!S.period) { $('#hrBody').innerHTML = '<div class="hr-card">Create a period first.</div>'; return; }
      var p = S.period, locked = p.status === 'locked', act = !ro() && !locked;
      $('#hrBody').innerHTML = '<div class="hr-card">Loading…</div>';
      // pre = the rows an upload just patched from the server's answer (loans are unchanged by it): nothing is asked for again
      (pre && pre.period_id === p.id ? Promise.resolve([pre.rows, pre.loans]) : Promise.all([api.listDeductions(p.id), api.listLoans({ active: true })])).then(function (r) {
        var rows = r[0], byEmp = {}, sched = dedSched(r[1], p);
        rows.forEach(function (x) { byEmp[x.employee_id] = x; });
        // scheduled part (dedSched) = HrCore.computeLine's loan pass for the two weekly kinds; dedRows is the build the Excel sheet shares
        var emps = dedEmps(byEmp), view = dedRows(emps, byEmp, sched), tot = { sca: 0, ca: 0, scl: 0, cl: 0, oth: 0, total: 0 };
        function cell(e, k, v) { return '<td class="r' + (act ? ' ed' : '') + (v ? '' : ' blank') + '"' + (act ? ' contenteditable data-ded="' + e.id + '" data-k="' + k + '"' : '') + '>' + (v ? money(v) : (act ? '0.00' : '')) + '</td>'; }
        var body = view.map(function (vr) {
          var e = vr.employee, d = byEmp[e.id] || {}, sc = vr.sched, ca = vr.cash_advance, cl = vr.company_loan, oth = vr.others, total = vr.total;
          tot.sca = C.round2(tot.sca + sc.cash_advance); tot.ca = C.round2(tot.ca + ca); tot.scl = C.round2(tot.scl + sc.company_loan); tot.cl = C.round2(tot.cl + cl); tot.oth = C.round2(tot.oth + oth); tot.total = C.round2(tot.total + total);
          return '<tr' + (e.active ? '' : ' style="opacity:.6"') + '><td>' + esc(e.emp_no || '') + '</td><td class="name"><b>' + esc(e.display_name) + '</b>' + (e.position ? ' <small style="color:#8a9894">' + esc(e.position) + '</small>' : '') + (e.active ? '' : ' <small style="color:#9a6200">inactive</small>') + '</td>' +
            '<td class="r" style="color:#4a5a55">' + money(sc.cash_advance) + '</td>' + cell(e, 'cash_advance', ca) + '<td class="r" style="color:#4a5a55">' + money(sc.company_loan) + '</td>' + cell(e, 'company_loan', cl) + cell(e, 'others', oth) +
            '<td class="' + (act ? 'ed' : '') + '"' + (act ? ' contenteditable data-ded="' + e.id + '" data-k="note"' : '') + ' style="white-space:normal;min-width:160px">' + esc(d.note || '') + '</td><td class="r"><b>' + money(total) + '</b></td></tr>';
        }).join('');
        $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar">' + periodSelect() + '<span class="hr-chip ' + esc(p.status) + '">' + esc(p.status) + '</span>' +
          '<span style="font-size:11px;color:#8a9894">week ' + p.week_of_month + ' · ' + rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' typed</span>' +
          (act ? '<button class="hr-btn" id="dedCopy" title="Fill blank rows from the previous period">⧉ Copy from previous period</button>' : '') + sheetButtons(locked) +
          (locked ? '<span class="hr-chip locked">🔒 locked — read only</span>' : '') + REREAD + '</div>' + staleBanner() +
          '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>No.</th><th>Employee</th><th class="r" title="this week\'s amortisation of active cash-advance loans (Employees → Loans)">Scheduled CA</th><th class="r">Cash advance</th><th class="r" title="this week\'s amortisation of active company loans (Employees → Loans)">Scheduled company loan</th><th class="r">Company loan</th><th class="r">Others</th><th>Note</th><th class="r">Total</th></tr></thead><tbody>' + body +
          '<tr style="font-weight:800"><td></td><td>TOTAL · ' + emps.length + ' employees</td><td class="r">' + money(tot.sca) + '</td><td class="r">' + money(tot.ca) + '</td><td class="r">' + money(tot.scl) + '</td><td class="r">' + money(tot.cl) + '</td><td class="r">' + money(tot.oth) + '</td><td></td><td class="r">' + money(tot.total) + '</td></tr></tbody></table></div>' +
          '<p style="font-size:11px;color:#8a9894">Scheduled amounts come from Employees → Loans; type one-off amounts here. Yellow cells are editable (Enter / click away to save) · amounts are per period · <b>Compute</b> on the Register adds scheduled + typed into CASH ADVANCE / COMPANY LOAN and takes Others as OTHERS (a hand-typed Register OTHERS cell still overrides).</p></div>';
        bindPeriodSelect(); bindReread(); bindSheet('deduction', p, view);
        rootEl.querySelectorAll('td[data-ded]').forEach(function (td) {
          var orig = td.textContent;
          td.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); td.blur(); } if (ev.key === 'Escape') { td.textContent = orig; td.blur(); } };
          td.onblur = function () {
            var raw = td.textContent.trim(); if (raw === orig) return;
            var cur = byEmp[td.dataset.ded] || {}, patch = { period_id: p.id, employee_id: td.dataset.ded, cash_advance: Number(cur.cash_advance) || 0, company_loan: Number(cur.company_loan) || 0, others: Number(cur.others) || 0, note: cur.note || null };
            if (td.dataset.k === 'note') patch.note = raw || null; else patch[td.dataset.k] = Number(raw.replace(/,/g, '')) || 0;
            api.saveDeduction(patch).then(function () {
              return staleRead(p.id);
            }).then(function () { TABS.deductions(); }).catch(fail);
          };
        });
        var cp = $('#dedCopy'); if (cp) cp.onclick = function () {
          var prev = S.periods.filter(function (x) { return x.period_start < p.period_start; }).sort(function (a, b) { return a.period_start < b.period_start ? 1 : -1; })[0];
          if (!prev) return toast('No previous period');
          cp.disabled = true;
          function any(x) { return (Number(x.cash_advance) || 0) !== 0 || (Number(x.company_loan) || 0) !== 0 || (Number(x.others) || 0) !== 0; }
          api.listDeductions(prev.id).then(function (old) {
            var todo = old.filter(function (x) { return any(x) && !(byEmp[x.employee_id] && any(byEmp[x.employee_id])) && emps.some(function (e) { return e.id === x.employee_id && e.active; }); });   // blanks only, active employees only
            return Promise.all(todo.map(function (x) { return api.saveDeduction({ period_id: p.id, employee_id: x.employee_id, cash_advance: Number(x.cash_advance) || 0, company_loan: Number(x.company_loan) || 0, others: Number(x.others) || 0, note: (byEmp[x.employee_id] || {}).note || x.note || null }); })).then(function () { return todo.length; });
          }).then(function (n) { toast(n ? n + ' row' + (n === 1 ? '' : 's') + ' copied from ' + periodLabel(prev) : 'Nothing to copy — previous period has no amounts for blank rows'); return n ? staleRead(p.id) : null; }).then(function () { TABS.deductions(); }).catch(fail);
        };
      }).catch(fail);
    };

    // ---------- Allowances & Deductions: Excel download and upload ----------
    // Owner 2026-10-15: "para pwede gawin kahit offline". The pure rules (what a sheet is, what an upload may change) are HrSheets;
    // this is the wiring. The sheet is built from the tab's OWN view rows (driverAllowanceView / dedRows, the same ones the screen
    // renders) so the file and the screen cannot disagree. Reading a file, parsing it and diffing it never writes; only the preview's
    // confirm button calls the API, once, and the tab is then patched from what the server returned instead of being refetched.
    var Sheets = root.HrSheets;
    function sheetButtons(locked) {
      if (!Sheets) return '';   // hr-sheets.js not loaded: no buttons rather than a button that cannot work
      return '<button class="hr-btn" id="shExport">⬇ Excel</button>' +
        (ro() || locked ? '' : '<label class="hr-btn" style="cursor:pointer">⬆ Upload<input type="file" id="shImport" accept=".xlsx,.xls" hidden></label>');
    }
    // Deductions: the scheduled amortisation (HrCore.computeLine's loan pass for the two weekly kinds: active, not deleted, due this week,
    // min(weekly, balance)), who has a row, and the rows themselves — extracted from the tab so the screen and the sheet share one build.
    function dedSched(loans, p) {
      var cal = (S.settings && S.settings.deduction_calendar) || C.DEFAULT_SETTINGS.deduction_calendar, sched = {};
      loans.forEach(function (ln) { if (ln.deleted_at || !ln.active || (ln.kind !== 'cash_advance' && ln.kind !== 'company_loan') || !C.dueThisWeek(ln.kind, p.week_of_month, cal)) return; var sc = sched[ln.employee_id] || (sched[ln.employee_id] = { cash_advance: 0, company_loan: 0 }); sc[ln.kind] = C.round2(sc[ln.kind] + C.amortisation(ln)); });
      return sched;
    }
    function dedEmps(byEmp) { return S.employees.filter(function (e) { return (e.active && inPool(e)) || byEmp[e.id]; }); }
    function dedRows(emps, byEmp, sched) {
      return emps.map(function (e) {
        var d = byEmp[e.id] || {}, sc = sched[e.id] || { cash_advance: 0, company_loan: 0 }, ca = Number(d.cash_advance) || 0, cl = Number(d.company_loan) || 0, oth = Number(d.others) || 0;
        return { employee: e, sched: sc, cash_advance: ca, company_loan: cl, others: oth, note: d.note || '', total: C.round2(sc.cash_advance + ca + sc.company_loan + cl + oth) };
      });
    }
    // Everything that differs between the two tabs. read() takes the server's rows NOW and builds the view rows from them; whole() is a
    // server row's current value for every field the bulk function replaces; field() maps a sheet column to that field.
    function sheetCfg(kind, p) {
      if (kind === 'allowance') return {
        tab: 'allowance', noun: 'allowance', file: 'ALLOWANCES', title: 'Allowances',
        read: function () { return api.listAllowances(p.id).then(function (rows) { return { server: rows, view: driverAllowanceView(S.employees, S.logs, S.lines, rows, S.settings, p).rows }; }); },
        whole: function (cur) { return { amount: Number(cur.amount) || 0, note: cur.note || null }; },
        field: function (col) { return col === 'manual' ? 'amount' : col; },
        save: function (rows) { return api.saveAllowancesBulk(p.id, rows); }
      };
      return {
        tab: 'deductions', noun: 'deduction', file: 'DEDUCTIONS', title: 'Deductions',
        read: function () { return Promise.all([api.listDeductions(p.id), api.listLoans({ active: true })]).then(function (r) { var byEmp = {}; r[0].forEach(function (x) { byEmp[x.employee_id] = x; }); return { server: r[0], loans: r[1], view: dedRows(dedEmps(byEmp), byEmp, dedSched(r[1], p)) }; }); },
        whole: function (cur) { return { cash_advance: Number(cur.cash_advance) || 0, company_loan: Number(cur.company_loan) || 0, others: Number(cur.others) || 0, note: cur.note || null }; },
        field: function (col) { return col; },
        save: function (rows) { return api.saveDeductionsBulk(p.id, rows); }
      };
    }
    // The styled writer (xlsx-js-style) arrives through deps.ensureXLSXStyle — it resolves with the library, or leaves it on root.XLSX.
    // When it is absent or fails, the plain writer is used and the toast says so: the sheet is still correct, only the colours are missing.
    function sheetWriter() {
      function plain() { return (deps.ensureXLSX ? deps.ensureXLSX() : (root.XLSX ? Promise.resolve() : Promise.reject(new Error('Excel library not available')))).then(function () { return { X: root.XLSX, styled: false }; }); }
      if (typeof deps.ensureXLSXStyle !== 'function') return plain();
      return Promise.resolve().then(function () { return deps.ensureXLSXStyle(); }).then(function (lib) {
        var X = lib && lib.utils ? lib : root.XLSX; if (!X || !X.utils) throw new Error('styled Excel writer did not load');
        return { X: X, styled: true };
      }).catch(function () { return plain(); });
    }
    function sheetDownload(kind, p, viewRows) {
      var cols = Sheets.SHEETS[kind], cfg = sheetCfg(kind, p), n = viewRows.length;
      var built = Sheets.build(kind, viewRows, { period: p, exported_at: new Date().toISOString(), exported_by: user.username || (S.me && S.me.username) || '' });
      return sheetWriter().then(function (w) {
        var X = w.X, A = X.utils.encode_cell, L = X.utils.encode_col, aoa = built.aoa.slice();
        // Row 1 provenance · row 2 totals · row 3 header · rows 4.. one per employee. The totals sit ABOVE the header on purpose: parse() reads
        // everything under the header as an employee, so a totals row below it would be refused as a row with no ID.
        var first = 4, last = 3 + n, colIx = {}; cols.forEach(function (x, i) { colIx[x.key] = i; });
        var totals = cols.map(function (x) { if (x.key === 'display_name') return 'TOTALS'; if (x.kind !== 'money') return ''; var s = 0; viewRows.forEach(function (r, i) { s += Number(aoa[2 + i][colIx[x.key]]) || 0; }); return C.round2(s); });
        aoa.splice(1, 0, totals);
        var ws = X.utils.aoa_to_sheet(aoa), FILL = { edit: 'FFF2CC', ro: 'E7E6E6', blank: 'F4B183' };
        function put(r, c, patch) { var a = A({ r: r, c: c }), cell = ws[a] || (ws[a] = { t: 's', v: '' }); Object.keys(patch).forEach(function (k) { cell[k] = patch[k]; }); return cell; }
        function style(fill, extra) { var s = { fill: { patternType: 'solid', fgColor: { rgb: fill } } }; Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; }); return s; }
        function fmt(x) { return x.key === 'deployments' ? '0' : '#,##0.00'; }
        put(0, 0, { s: { font: { italic: true, color: { rgb: '7F7F7F' } } } });
        cols.forEach(function (x, c) {
          var fill = x.editable ? FILL.edit : FILL.ro, col = L(c), money = x.kind === 'money';
          put(2, c, { s: style(fill, { font: { bold: true }, alignment: { horizontal: money ? 'right' : 'left' } }) });
          var t = put(1, c, { s: style(FILL.ro, { font: { bold: true } }) });
          if (money) { t.z = fmt(x); if (n) t.f = 'SUM(' + col + first + ':' + col + last + ')'; }
          for (var i = 0; i < n; i++) {
            var r = 3 + i, cell = ws[A({ r: r, c: c })], empty = !cell || cell.v === '' || cell.v == null;
            // a blank that is not a note is a decision still to be made (a missing employee number, an amount left empty)
            var patch = { s: style(empty && x.key !== 'note' ? FILL.blank : fill) }; if (money) patch.z = fmt(x);
            put(r, c, patch);
          }
        });
        // TOTAL as a real formula, so it moves while the file is edited offline. Only where it is exactly what the screen shows: an allowance
        // under a Register override keeps its figure whatever MANUAL says, and a deduction's total also carries the scheduled loan amortisation,
        // which is not in the sheet, so that part rides in the formula as a constant.
        viewRows.forEach(function (row, i) {
          var r = 3 + i, xl = r + 1, cell = ws[A({ r: r, c: colIx.total })], f = null;
          if (kind === 'allowance') { if (!row.override && Math.abs(row.total - C.round2(row.automatic + row.manual)) < 0.005) f = L(colIx.automatic) + xl + '+' + L(colIx.manual) + xl; }
          else f = L(colIx.cash_advance) + xl + '+' + L(colIx.company_loan) + xl + '+' + L(colIx.others) + xl + ((row.sched.cash_advance + row.sched.company_loan) ? '+' + C.round2(row.sched.cash_advance + row.sched.company_loan) : '');
          if (f && cell) cell.f = f;
        });
        ws['!cols'] = cols.map(function (x) { return x.key === 'employee_id' ? { hidden: true, wch: 8 } : { wch: x.key === 'display_name' ? 30 : x.key === 'note' ? 36 : x.key === 'emp_no' ? 14 : 15 }; });
        var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, cfg.title);
        var fn = cfg.file + '-' + p.period_start + '_' + p.period_end + '.xlsx';
        X.writeFile(wb, fn);
        return 'Downloaded ' + fn + (w.styled ? '' : ' — without colours: the styled Excel writer is not available, so this is the plain sheet (it uploads the same)');
      });
    }
    // Where a file row sits in Excel, by employee id — the server counts positions in the array it was sent, which a person cannot find.
    function sheetRowsOf(aoa) {
      var at = {}, idCol = -1;
      for (var i = 0; i < aoa.length; i++) {
        var cells = (aoa[i] || []).map(function (v) { return String(v == null ? '' : v).trim().toUpperCase(); });
        if (idCol < 0) { if (cells.indexOf('ID') >= 0 && cells.indexOf('NOTE') >= 0) idCol = cells.indexOf('ID'); continue; }
        var id = String((aoa[i] || [])[idCol] == null ? '' : aoa[i][idCol]).trim();
        if (id && !(id in at)) at[id] = i + 1;
      }
      return at;
    }
    function stamp(iso) { var d = new Date(iso); return isFinite(d) ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : String(iso); }
    // What changed between the download and now. The file is the authority (D5), so overwriting somebody else's work has to be a decision.
    function sheetMoved(prov, server, verdict, p, noun) {
      var t = Date.parse(prov.exported_at), why = [];
      if (!isFinite(t)) return ['the file does not say when it was downloaded, so edits made since cannot be ruled out'];
      var ca = (verdict && verdict.computed_at) || p.computed_at;
      if (ca && Date.parse(ca) > t) why.push('the week was computed again at ' + stamp(ca));
      var edited = server.filter(function (r) { return r.updated_at && Date.parse(r.updated_at) > t; }), by = [];
      edited.forEach(function (r) { if (r.updated_by && by.indexOf(r.updated_by) < 0) by.push(r.updated_by); });
      if (edited.length) why.push(edited.length + ' ' + noun + ' row' + (edited.length === 1 ? ' was' : 's were') + ' edited after the download' + (by.length ? ' (by ' + by.join(', ') + ')' : ''));
      return why;
    }
    function bindSheet(kind, p, viewRows) {
      var ex = $('#shExport'); if (ex) ex.onclick = function () { if (!staleGate('Excel sheet')) return; ex.disabled = true; sheetDownload(kind, p, viewRows).then(function (msg) { ex.disabled = false; toast(msg); }).catch(function (e) { ex.disabled = false; fail(e); }); };
      var im = $('#shImport'); if (im) im.onchange = function () {
        var f = this.files && this.files[0]; this.value = ''; if (!f) return;
        var cfg = sheetCfg(kind, p), parsed, aoa;
        readSheet(f).then(function (a) {
          aoa = a; parsed = Sheets.parse(kind, a);
          return Promise.all([cfg.read(), staleOf(api, p.id)]);
        }).then(function (r) {
          var d = Sheets.diff(kind, parsed, r[0].view);
          showUploadPreview(kind, p, { parsed: parsed, d: d, aoa: aoa, cur: r[0], verdict: r[1], cfg: cfg });      // never writes — the modal's button does
        }).catch(fail);
      };
    }
    function showUploadPreview(kind, p, x) {
      var cols = Sheets.SHEETS[kind], cfg = x.cfg, prov = x.parsed.provenance, d = x.d, label = {}, who = {}, rowOf = sheetRowsOf(x.aoa);
      cols.forEach(function (c) { label[c.key] = c; });
      x.cur.view.forEach(function (r) { who[r.employee.id] = (r.employee.emp_no ? r.employee.emp_no + ' · ' : '') + r.employee.display_name; });
      // a partly-understood sheet is not a basis for writing payroll: any problem refuses the whole upload
      var refused = x.parsed.problems.concat(d.problems);
      var sameWeek = prov.period_id != null && String(prov.period_id) === String(p.id);
      var sheetWeek = prov.period_start && prov.period_end ? periodLabel({ period_start: prov.period_start, period_end: prov.period_end }) : 'a week the file does not name';
      if (!sameWeek && !x.parsed.problems.length) refused.push('This sheet was exported for ' + sheetWeek + ', not for the week on screen (' + periodLabel(p) + '). A sheet for another week is not an edit, so nothing can be applied from it. Open that week, or download this week\'s sheet.');
      var moved = refused.length ? [] : sheetMoved(prov, x.cur.server, x.verdict, p, cfg.noun);
      var byEmp = {}, order = []; d.changes.forEach(function (c) { if (!byEmp[c.employee_id]) { byEmp[c.employee_id] = []; order.push(c.employee_id); } byEmp[c.employee_id].push(c); });
      function val(c, v) { return label[c.col].kind === 'money' ? (v == null || v === '' ? '—' : money(v)) : (v === '' || v == null ? '<i>(blank)</i>' : esc(v)); }
      var rows = order.map(function (id) {
        return byEmp[id].map(function (c, i) {
          var m = label[c.col].kind === 'money';
          return '<tr>' + (i ? '<td></td>' : '<td>' + esc(who[id] || id) + '</td>') + '<td>' + esc(label[c.col].label) + '</td><td class="' + (m ? 'r' : '') + '">' + val(c, c.from) + '</td><td class="' + (m ? 'r' : '') + '"><b>' + val(c, c.to) + '</b></td></tr>';
        }).join('');
      }).join('');
      var canApply = !refused.length && d.changes.length > 0, ignoredCols = cols.filter(function (c) { return !c.editable && c.key !== 'employee_id'; }).map(function (c) { return c.label; }).join(', ');
      var html = '<h3>' + esc(cfg.title) + ' upload · ' + esc(periodLabel(p)) + '</h3>' +
        '<p class="mut">' + (prov.exported_at ? 'File downloaded ' + esc(stamp(prov.exported_at)) + (prov.exported_by ? ' by ' + esc(prov.exported_by) : '') + ' for ' + esc(sheetWeek) + '.' : 'The file does not say when it was downloaded.') + ' Nothing has been saved yet.</p>' +
        (refused.length ? '<div class="hr-warn" style="background:#fdecea;border-color:#f0b4ac;color:#8a2f2f"><b>This sheet cannot be applied — nothing was saved.</b><ul style="margin:6px 0 0 18px">' + refused.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>' : '') +
        (moved.length ? '<div class="hr-warn" id="shMoved"><b>The week has moved since this file was downloaded:</b><ul style="margin:6px 0 0 18px">' + moved.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul><span id="shArm">Applying will overwrite those with what is in the file.</span></div>' : '') +
        '<ul style="margin:0 0 8px 18px;font-size:12px;line-height:1.6"><li><b>' + d.changes.length + '</b> cell' + (d.changes.length === 1 ? '' : 's') + ' would change, across <b>' + order.length + '</b> employee' + (order.length === 1 ? '' : 's') + '</li>' +
        '<li><b>' + d.ignored + '</b> cell' + (d.ignored === 1 ? '' : 's') + ' in read-only columns (' + esc(ignoredCols) + ') were edited in the file and are ignored</li>' +
        (d.unknown.length ? '<li><b>' + d.unknown.length + '</b> row' + (d.unknown.length === 1 ? '' : 's') + ' with an ID that is not in this week — never created: ' + d.unknown.slice(0, 10).map(function (id) { return esc(id); }).join(', ') + (d.unknown.length > 10 ? ' … +' + (d.unknown.length - 10) : '') + '</li>' : '') +
        (d.missing.length ? '<li><b>' + d.missing.length + '</b> employee' + (d.missing.length === 1 ? ' is' : 's are') + ' no longer in the file — left as they are, never deleted: ' + d.missing.slice(0, 10).map(function (id) { return esc(who[id] || id); }).join('; ') + (d.missing.length > 10 ? ' … +' + (d.missing.length - 10) : '') + '</li>' : '') + '</ul>' +
        (order.length ? '<div class="hr-scroll" style="max-height:38vh"><table class="hr-t"><thead><tr><th>Employee</th><th>Column</th><th class="r">Now</th><th class="r">File</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : (refused.length ? '' : '<p>Nothing in this file differs from what is saved. Nothing to apply.</p>')) +
        '<div id="shErr" class="hr-batch-error" style="margin-top:8px"></div>' +
        '<div class="hr-bar" style="margin-top:10px">' + (canApply ? '<button class="hr-btn p" id="shApply">Apply ' + d.changes.length + ' change' + (d.changes.length === 1 ? '' : 's') + '</button>' : '') + '<button class="hr-btn" id="shCancel">' + (canApply ? 'Cancel' : 'Close') + '</button></div>';
      openModal(html, function (box) {
        var apply = box.querySelector('#shApply'), cancel = box.querySelector('#shCancel'), err = box.querySelector('#shErr'), armed = false;
        cancel.onclick = closeModal;
        if (!apply) return;
        apply.onclick = function () {
          if (moved.length && !armed) {      // the second, explicit confirm: the file wins over whatever moved
            armed = true; apply.textContent = 'Yes — overwrite and apply ' + d.changes.length;
            box.querySelector('#shArm').innerHTML = '<b>Click once more to overwrite them with what is in the file.</b>'; return;
          }
          apply.disabled = true; cancel.disabled = true; err.textContent = '';
          sheetApply(kind, p, x, rowOf).then(function (msg) { closeModal(); toast(msg); }).catch(function (e) {
            apply.disabled = false; cancel.disabled = false; err.textContent = (e && e.message) || String(e); toast('Upload not applied — nothing was saved');
          });
        };
      });
    }
    // The only writer. One call. Each element replaces the WHOLE server row (hr.save_allowances_bulk / save_deductions_bulk), so every row
    // carries the server's CURRENT value for each field the file did not change — read again right now, not remembered from when the tab drew.
    function sheetApply(kind, p, x, rowOf) {
      var cfg = x.cfg;
      return cfg.read().then(function (now) {
        if (!S.period || S.period.id !== p.id) throw new Error('The week on screen changed while this preview was open. Nothing was saved — upload again.');
        var cur = {}, rows = {}, order = [], drift = [];
        now.server.forEach(function (r) { cur[r.employee_id] = r; });
        function name(c) { var v = x.cur.view.filter(function (r) { return r.employee.id === c.employee_id; })[0]; return (v ? v.employee.emp_no || v.employee.display_name : c.employee_id) + ' ' + c.col; }
        x.d.changes.forEach(function (c) {
          var sv = cur[c.employee_id] || {}, held = cfg.whole(sv)[cfg.field(c.col)];
          // the preview said "from X"; if the server no longer holds X, someone edited it in between and the preview is no longer what would happen
          if (c.col === 'note' ? String(c.from == null ? '' : c.from).trim() !== String(held || '').trim() : Math.round((Number(c.from) || 0) * 100) !== Math.round(held * 100)) drift.push(name(c));
          var row = rows[c.employee_id];      // one element per employee: a repeated employee_id would apply both and the last would win
          if (!row) { row = rows[c.employee_id] = Object.assign({ employee_id: c.employee_id }, cfg.whole(sv)); order.push(c.employee_id); }
          if (c.col === 'note') row.note = c.to === '' || c.to == null ? null : String(c.to); else row[cfg.field(c.col)] = Number(c.to);
        });
        if (drift.length) throw new Error('Changed on the server since this preview was built: ' + drift.slice(0, 5).join(', ') + (drift.length > 5 ? ' … +' + (drift.length - 5) : '') + '. Nothing was saved — upload the file again to see the current picture.');
        var send = order.map(function (id) { return rows[id]; });
        send.forEach(function (r) {      // the shape guard would refuse these anyway; refusing here names the row in the person's file
          Object.keys(r).forEach(function (k) { if (k !== 'employee_id' && k !== 'note' && !(typeof r[k] === 'number' && isFinite(r[k]))) throw new Error('Not a number for ' + (rowOf[r.employee_id] ? 'Excel row ' + rowOf[r.employee_id] : r.employee_id) + ' (' + k + '). Nothing was saved.'); });
        });
        return cfg.save(send).then(function (res) {
          var out = now.server;
          ((res && res.rows) || []).forEach(function (row) { out = patchRows(out, row, 'employee_id'); });
          return staleRead(p.id).then(function () {
            if (S.tab === cfg.tab && S.period && S.period.id === p.id) TABS[cfg.tab]({ period_id: p.id, rows: out, loans: now.loans });
            var n = res && res.applied;
            return n + ' row' + (n === 1 ? '' : 's') + ' saved from the Excel file' + (n !== send.length ? ' (' + send.length + ' sent)' : '');
          });
        }, function (e) {
          // the server counts positions in the array it was sent; the person needs the row in their file
          throw new Error(String((e && e.message) || e).replace(/Row (\d+) of this upload/g, function (m, i) { var id = order[Number(i) - 1]; return id && rowOf[id] ? 'Excel row ' + rowOf[id] + ' of your file' : m; }));
        });
      });
    }

    // ---------- Employees ----------
    // Amendment 2: masterlist identity fields (middle name, name extension, team, date regularized); weekly_allowance is legacy (unused by compute) and hidden — the value is carried through untouched
    // Amendment 4: payroll_group options come from settings.payroll_groups at render time (f[3] null → groups()); only the computed group is attendance-built / computed
    var EMP_FIELDS = [['emp_no', 'Employee no.'], ['last_name', 'Last name'], ['first_name', 'First name'], ['middle_name', 'Middle name'], ['name_ext', 'Name extension (Jr / Sr / III)'], ['status_tag', 'Tag', 'select', ['', 'R', 'T', 'P']], ['position', 'Position'], ['department', 'Department', 'select', ['field', 'office']], ['payroll_group', 'Payroll group', 'select', null], ['team', 'Team (masterlist)'], ['daily_rate', 'Daily rate', 'number'],
      ['date_hired', 'Date hired', 'date'], ['date_regularized', 'Date regularized', 'date'], ['date_ended', 'Date ended', 'date'], ['bank_name', 'Bank'], ['bank_account', 'Bank account'], ['sss_no', 'SSS no.'], ['phic_no', 'PhilHealth no.'], ['hdmf_no', 'Pag-IBIG no.'], ['tin', 'TIN'], ['console_username', 'Console username (Time In/Out link)'], ['rest_day', 'Rest day (info only)', 'select', ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']]];
    TABS.employees = function () {
      var q = (S.empQ || '').toLowerCase(), showInactive = !!S.empInactive, showDeleted = !!S.empDeleted, grp = S.empGroup || '', cg = computedGroup();
      function groupOf(e) { return e.payroll_group || C.DEFAULT_SETTINGS.computed_group; }
      // Amendment 5: "show deleted" = the full masterlist (soft-deleted rows included, fetched on demand into S.empAll); the search also matches crew-name aliases
      if (showDeleted && !S.empAll) { $('#hrBody').innerHTML = '<div class="hr-card">Loading the full masterlist…</div>'; api.listEmployees({ include_deleted: true }).then(function (all) { S.empAll = all; TABS.employees(); }).catch(fail); return; }
      var src = showDeleted ? S.empAll : S.employees;
      var rows = src.filter(function (e) { return (showInactive || showDeleted || e.active) && (!grp || groupOf(e) === grp) && (!q || (e.display_name + ' ' + (e.emp_no || '') + ' ' + (e.position || '') + ' ' + (e.team || '') + ' ' + (e.aliases || []).join(' ')).toLowerCase().indexOf(q) >= 0); });
      var allGroups = groups().slice(); S.employees.forEach(function (e) { if (allGroups.indexOf(groupOf(e)) < 0) allGroups.push(groupOf(e)); });
      $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar"><input id="eQ" placeholder="🔍 Search name / no. / position / alias" style="min-width:260px" value="' + esc(S.empQ || '') + '" autofocus>' +
        '<select id="eGrp" title="Payroll group — only ' + esc(cg) + ' is attendance-built and computed; other groups appear on the Mandatory summary only"><option value="">All groups</option>' + allGroups.map(function (g) { return '<option value="' + esc(g) + '"' + (grp === g ? ' selected' : '') + '>' + esc(g) + (g === cg ? ' (computed)' : '') + '</option>'; }).join('') + '</select>' +
        '<label><input type="checkbox" id="eInact"' + (showInactive ? ' checked' : '') + '> show inactive</label><label title="Full masterlist — soft-deleted (disconnected) employees included"><input type="checkbox" id="eDel"' + (showDeleted ? ' checked' : '') + '> show deleted</label>' + (ro() ? '' : '<button class="hr-btn p" id="eNew">+ Employee</button>') + '<span style="font-size:11px;color:#8a9894">' + rows.length + ' shown</span></div>' +
        '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>No.</th><th>Name</th><th>Tag</th><th>Position</th><th>Dept</th><th>Group</th><th>Team</th>' + (ratesOK() ? '<th class="r">Rate</th>' : '') + '<th>Aliases</th><th>Console</th><th>Source</th><th></th></tr></thead><tbody>' +
        rows.map(function (e) { return '<tr' + (e.active ? '' : ' style="opacity:.55"') + '><td>' + esc(e.emp_no || '') + '</td><td><b>' + esc(e.display_name) + '</b>' + (e.name_ext ? ' <small style="color:#8a9894">' + esc(e.name_ext) + '</small>' : '') + (e.deleted_at ? ' <span class="hr-chip deleted" title="' + esc('deleted by ' + (e.deleted_by || '?') + ' on ' + fmtDate(String(e.deleted_at).slice(0, 10)) + (e.date_ended ? ' · effective ' + fmtDate(e.date_ended) : '') + (e.delete_reason ? ' · ' + e.delete_reason : '')) + '">deleted ' + esc(fmtDate(String(e.deleted_at).slice(0, 10))) + ' by ' + esc(e.deleted_by || '?') + (e.date_ended ? ' · eff. ' + esc(fmtDate(e.date_ended)) : '') + '</span>' + (e.delete_reason ? ' <small style="color:#8a2f2f">' + esc(e.delete_reason) + '</small>' : '') : e.active ? '' : ' <span class="hr-chip computed">inactive' + (e.date_ended ? ' · ended ' + esc(fmtDate(e.date_ended)) : '') + '</span>') + '</td><td>' + esc(e.status_tag || '') + '</td><td>' + esc(e.position || '') + '</td><td>' + esc(e.department || '') + '</td><td>' + (groupOf(e) === cg ? esc(groupOf(e)) : '<span class="hr-chip computed" title="not attendance-built / computed here — Mandatory summary only (basic pay encoded per month)">' + esc(groupOf(e)) + '</span>') + '</td><td>' + esc(e.team || '') + '</td>' + (ratesOK() ? '<td class="r">' + money(e.daily_rate) + '</td>' : '') + '<td style="white-space:normal;max-width:220px;font-size:11px">' + (e.aliases || []).map(esc).join(', ') + '</td><td>' + esc(e.console_username || '') + '</td><td>' + (e.source ? '<span class="hr-chip ' + (e.source === 'masterlist' ? 'locked' : 'computed') + '" title="seeded from the ' + esc(e.source) + '">' + esc(e.source) + '</span>' : '') + '</td><td style="white-space:nowrap">' + (ro() ? '' : e.deleted_at ? '<button class="hr-btn" data-restore="' + e.id + '">↺ Restore</button> ' : '<button class="hr-btn" data-edit="' + e.id + '">Edit</button> ') + (e.deleted_at ? '' : (ratesOK() ? '<button class="hr-btn" data-rates="' + e.id + '" title="Daily rate over time — a step takes effect from its date onward and never restates an earlier week">Rates</button> <button class="hr-btn" data-loans="' + e.id + '">Loans / contributions</button>' : '') + (ro() ? '' : ' <button class="hr-btn d" data-del="' + e.id + '" title="Disconnection — asks for the effectivity date and remarks; soft delete, kept in the masterlist (show deleted), restorable">Delete</button>')) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="mut"><b>Delete</b> = the disconnection: it asks for the effectivity date and remarks, records who deleted and when, makes the employee inactive from that date (paid through it, nothing after) and hides the row everywhere — it stays in the masterlist under <b>show deleted</b>, with its history, and can be restored.</p></div>';
      $('#eQ').oninput = function () { S.empQ = this.value; var v = this.value; TABS.employees(); var q2 = $('#eQ'); q2.focus(); q2.setSelectionRange(v.length, v.length); }; $('#eInact').onchange = function () { S.empInactive = this.checked; TABS.employees(); }; $('#eDel').onchange = function () { S.empDeleted = this.checked; TABS.employees(); };
      rootEl.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { openDisconnect(emp(b.dataset.del)); }; });
      rootEl.querySelectorAll('[data-restore]').forEach(function (b) { b.onclick = function () { api.restoreEmployee(b.dataset.restore).then(function () { S.empAll = null; toast('Restored (still inactive — tick Active in Edit to include in payroll)'); return refresh(); }).catch(fail); }; }); $('#eGrp').onchange = function () { S.empGroup = this.value; TABS.employees(); };
      var nb = $('#eNew'); if (nb) nb.onclick = function () { openEmpForm({ active: true, department: 'field', payroll_group: cg, daily_rate: defaultRate(), weekly_allowance: 0, aliases: S.newEmpFrom ? [S.newEmpFrom] : [] }); };
      if (S.newEmpFrom) { var raw = S.newEmpFrom; S.newEmpFrom = null; var parts = raw.split(' '); openEmpForm({ active: true, department: 'field', payroll_group: cg, daily_rate: defaultRate(), weekly_allowance: 0, aliases: [raw], first_name: parts.slice(0, -1).join(' '), last_name: parts.slice(-1)[0] }); }
      rootEl.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { openEmpForm(emp(b.dataset.edit)); }; });
      rootEl.querySelectorAll('[data-loans]').forEach(function (b) { b.onclick = function () { openLoans(b.dataset.loans); }; });
      rootEl.querySelectorAll('[data-rates]').forEach(function (b) { b.onclick = function () { openRates(b.dataset.rates); }; });
    };
    // Amendment 5 (owner): Delete = disconnection form — effectivity date + remarks required; who / when recorded by deleteEmployee (deleted_by / deleted_at)
    function openDisconnect(e) {
      var today = new Date().toISOString().slice(0, 10);
      openModal('<h3>Delete (disconnect) · ' + esc(e.display_name) + '</h3><div class="hr-form"><div><label>Effectivity of disconnection</label><input type="date" id="dcEff" value="' + today + '"></div><div class="w"><label>Remarks (required)</label><input id="dcWhy" placeholder="e.g. resigned / end of contract / AWOL"></div></div>' +
        '<p class="mut">Soft delete: the employee becomes inactive from the effectivity date (matched and paid through that date, nothing after), disappears from every list and pool, and stays in the masterlist under <b>show deleted</b> with who deleted, when and why. Restorable.</p>' +
        '<div class="hr-bar" style="margin-top:12px"><button class="hr-btn d" id="dcOk">Delete</button><button class="hr-btn" id="dcNo">Cancel</button></div>',
        function (box) {
          box.querySelector('#dcNo').onclick = closeModal; box.querySelector('#dcWhy').focus();
          box.querySelector('#dcOk').onclick = function () {
            var eff = box.querySelector('#dcEff').value, why = box.querySelector('#dcWhy').value.trim();
            if (!eff) return toast('Effectivity date required'); if (!why) return toast('Remarks required');
            api.deleteEmployee(e.id, { effective: eff, reason: why }).then(function () { closeModal(); S.empAll = null; toast('Deleted (soft) — effective ' + fmtDate(eff)); return refresh(); }).catch(fail);
          };
        });
    }
    var ENROLLED = [['sss_enrolled', 'SSS'], ['phic_enrolled', 'PhilHealth'], ['hdmf_enrolled', 'Pag-IBIG']];   // Amendment 1: per kind, false = no EE/ER until HR ticks the box (DB default true)
    function openEmpForm(e) {
      var lock = ro(), cg = computedGroup();
      var RATE_FIELDS = { daily_rate: 1, weekly_allowance: 1 }, fields = EMP_FIELDS.filter(function (f) { return ratesOK() || !RATE_FIELDS[f[0]]; });   // rates gate
      openModal('<h3>' + (e.id ? 'Edit employee' : 'New employee') + '</h3><div class="hr-form">' + fields.map(function (f) {
          var v = e[f[0]] == null ? '' : e[f[0]], opts = f[3];
          if (f[0] === 'payroll_group') { opts = groups().slice(); if (v === '') v = cg; if (opts.indexOf(String(v)) < 0) opts.push(String(v)); }   // Amendment 4: the settings list (+ the row's own value if it is no longer listed)
          return '<div' + (f[0] === 'console_username' ? ' class="w"' : '') + '><label>' + f[1] + (f[0] === 'payroll_group' ? ' <small style="color:#8a9894;font-weight:400">— only ' + esc(cg) + ' is attendance-built / computed</small>' : '') + '</label>' + (f[2] === 'select' ? '<select name="' + f[0] + '"' + (lock ? ' disabled' : '') + '>' + opts.map(function (o) { return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + (esc(o) || '—') + '</option>'; }).join('') + '</select>' : '<input name="' + f[0] + '" type="' + (f[2] || 'text') + '" value="' + esc(v) + '"' + (f[2] === 'number' ? ' step="0.01"' : '') + (lock ? ' disabled' : '') + '>') + '</div>'; }).join('') +
        '<div class="w"><label>Aliases (crew-name spellings, comma-separated)</label><input name="aliases" value="' + esc((e.aliases || []).join(', ')) + '"' + (lock ? ' disabled' : '') + '></div><div class="w"><label>Notes</label><input name="notes" value="' + esc(e.notes || '') + '"' + (lock ? ' disabled' : '') + '></div><div class="w"><label><input type="checkbox" name="active"' + (e.active !== false ? ' checked' : '') + (lock ? ' disabled' : '') + '> Active (included in payroll)</label></div>' +
        ENROLLED.map(function (f) { return '<div><label><input type="checkbox" name="' + f[0] + '"' + (e[f[0]] !== false ? ' checked' : '') + (lock ? ' disabled' : '') + '> ' + f[1] + ' enrolled — deduct</label></div>'; }).join('') +
        '<div class="w" style="font-size:11px;color:#8a9894">Untick while the number is not yet issued: no employee or employer share is computed for that kind until enrolled.</div></div>' +
        '<div class="hr-bar" style="margin-top:12px">' + (lock ? '' : '<button class="hr-btn p" id="fOk">Save</button>') + '<button class="hr-btn" id="fNo">Cancel</button></div>',
        function (box) {
          box.querySelector('#fNo').onclick = closeModal;
          var ok = box.querySelector('#fOk'); if (ok) ok.onclick = function () {
            var out = Object.assign({}, e); fields.forEach(function (f) { var el = box.querySelector('[name=' + f[0] + ']'); out[f[0]] = el.value === '' ? null : (f[2] === 'number' ? Number(el.value) : el.value); });
            out.aliases = box.querySelector('[name=aliases]').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); out.notes = box.querySelector('[name=notes]').value || null; out.active = box.querySelector('[name=active]').checked;
            ENROLLED.forEach(function (f) { out[f[0]] = box.querySelector('[name=' + f[0] + ']').checked; });
            if (!out.last_name || !out.first_name) return toast('Name required'); out.display_name = out.last_name + ', ' + out.first_name;
            if (!out.payroll_group) out.payroll_group = cg;
            if (out.active === false && !out.date_ended) out.date_ended = new Date().toISOString().slice(0, 10);
            api.saveEmployee(out).then(function () { closeModal(); toast('Saved'); return refresh(); }).catch(fail);
          };
        });
    }
    // ---------- Daily rate over time (owner 2026-10-13: the HR Manager maintains the amount) ----------
    // A rate STEP, not an overwrite. hr.effective_rate_on takes the newest step on or before a work date and
    // falls back to the employee's stored daily_rate when no step covers it, so a step dated today leaves every
    // earlier week exactly as it was paid. That is the whole point: changing employees.daily_rate instead would
    // re-rate history the moment any old period were recomputed.
    // The server refuses a step whose date falls inside a locked week (hr.assert_day_unlocked) — reopen first.
    function openRates(eid) {
      Promise.all([api.listEmployeeRates(eid), api.listMinWage()]).then(function (r) {
        var steps = r[0] || [], floors = r[1] || [], e = emp(eid), today = new Date().toISOString().slice(0, 10);
        function floorOn(d) { var f = floors.filter(function (x) { return x.effective_from <= d; }).sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; })[0]; return f ? Number(f.daily_rate) : null; }
        function rateOn(d) {
          var st = steps.filter(function (x) { return x.effective_from <= d; }).sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; })[0];
          var raw = st ? Number(st.daily_rate) : Number(e.daily_rate) || 0, fl = floorOn(d);
          return { raw: raw, eff: (raw > 0 && fl > 0 && raw < fl) ? fl : raw, lifted: !!(raw > 0 && fl > 0 && raw < fl) };
        }
        var now = rateOn(today);
        openModal('<h3>' + esc(e.display_name) + ' — daily rate over time</h3>' +
          '<p class="mut">Paid today: <b>₱' + money(now.eff) + '</b>' +
          (now.lifted ? ' — the rate on file is ₱' + money(now.raw) + ', lifted to the ₱' + money(floorOn(today)) + ' minimum in force. Add a step to make the figure on file the real one.' : '') +
          '<br>Rate on file (no step covers the date): <b>₱' + money(e.daily_rate) + '</b> — edit that one in the employee profile; it applies to every date no step covers, including past weeks.</p>' +
          '<table class="hr-t"><thead><tr><th>Effective from</th><th class="r">Daily rate</th><th>Note</th><th>Last changed</th><th></th></tr></thead><tbody>' +
          (steps.length ? steps.slice().sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; }).map(function (x) {
            return '<tr><td><b>' + esc(fmtDate(x.effective_from)) + '</b></td><td class="r"><b>₱' + money(x.daily_rate) + '</b></td><td style="white-space:normal;max-width:260px;font-size:11px">' + esc(x.note || '') + '</td><td style="font-size:11px;color:#8a9894">' + esc(String(x.updated_at || '').slice(0, 10)) + (x.updated_by ? ' · ' + esc(x.updated_by) : '') + '</td><td>' + (ro() ? '' : '<button class="hr-btn" data-rstep="' + esc(x.effective_from) + '">Edit</button> <button class="hr-btn d" data-rdel="' + esc(x.effective_from) + '">Delete</button>') + '</td></tr>';
          }).join('') : '<tr><td colspan=5>No steps yet — every date uses the rate on file.</td></tr>') + '</tbody></table>' +
          (ro() ? '' : '<h4 style="margin:14px 0 4px">Add or replace a step</h4><div class="hr-form">' +
            '<div><label>Effective from</label><input id="rFrom" type="date" value="' + esc(today) + '"></div>' +
            '<div><label>Daily rate</label><input id="rAmt" type="number" step="0.01" min="0" value="' + esc(now.eff) + '"></div>' +
            '<div class="w"><label>Note (why it changed)</label><input id="rNote" placeholder="e.g. minimum wage step, promotion, correction"></div>' +
            '<div class="w"><button class="hr-btn p" id="rAdd">Save step</button> <span class="mut" style="font-size:11px">A step on a date that already has one replaces it. A date inside a locked week is refused — reopen the week first.</span></div></div>') +
          '<div class="hr-bar" style="margin-top:12px"><button class="hr-btn" id="rNo">Close</button></div>',
          function (box) {
            box.querySelector('#rNo').onclick = closeModal;
            box.querySelectorAll('[data-rstep]').forEach(function (b) { b.onclick = function () {
              var x = steps.find(function (y) { return y.effective_from === b.dataset.rstep; });
              box.querySelector('#rFrom').value = x.effective_from; box.querySelector('#rAmt').value = x.daily_rate; box.querySelector('#rNote').value = x.note || '';
              box.querySelector('#rAmt').focus();
            }; });
            box.querySelectorAll('[data-rdel]').forEach(function (b) { b.onclick = function () {
              if (!root.confirm('Delete the step effective ' + fmtDate(b.dataset.rdel) + '? Dates it covered fall back to the previous step, or to the rate on file.')) return;
              api.deleteEmployeeRate(eid, b.dataset.rdel).then(refresh).then(function () { toast('Step deleted'); openRates(eid); }).catch(fail);
            }; });
            var add = box.querySelector('#rAdd'); if (add) add.onclick = function () {
              var from = box.querySelector('#rFrom').value, amt = Number(box.querySelector('#rAmt').value);
              if (!from) return toast('Effective date required');
              if (!(amt > 0)) return toast('Daily rate must be more than zero');
              var fl = floorOn(from);
              if (fl > 0 && amt < fl && !root.confirm('₱' + money(amt) + ' is below the ₱' + money(fl) + ' minimum in force on ' + fmtDate(from) + '. Payroll will lift it to the minimum anyway. Save it as typed?')) return;
              api.saveEmployeeRate({ employee_id: eid, effective_from: from, daily_rate: amt, note: box.querySelector('#rNote').value || null })
                .then(refresh).then(function () { toast('Rate step saved'); openRates(eid); }).catch(fail);
            };
          });
      }).catch(fail);
    }
    function openLoans(eid) {
      Promise.all([api.listLoans({ employee_id: eid }), api.listOverrides(eid)]).then(function (r) {
        var loans = r[0], ovs = r[1], e = emp(eid), KINDS = [['cash_advance', 'Cash advance (weekly)'], ['company_loan', 'Company loan (weekly)'], ['sss_loan', 'SSS loan (1st & 3rd wk)'], ['hdmf_loan', 'Pag-IBIG loan (1st & 3rd wk)']];
        openModal('<h3>' + esc(e.display_name) + ' — loans &amp; contributions</h3>' +
          '<h4 style="margin:8px 0 4px">Loans</h4><table class="hr-t"><thead><tr><th>Kind</th><th class="r">Principal</th><th class="r">Weekly</th><th class="r">Balance</th><th>Started</th><th>Active</th><th>Payments</th></tr></thead><tbody>' +
          (loans.length ? loans.map(function (l) { return '<tr><td>' + esc(l.kind) + '</td><td class="r">' + money(l.principal) + '</td><td class="r">' + money(l.weekly_amortization) + '</td><td class="r"><b>' + money(l.balance) + '</b></td><td>' + esc(fmtDate(l.started_on)) + '</td><td>' + (l.active ? '✓' : '—') + (ro() || !l.active ? '' : ' <button class="hr-btn" data-stop="' + l.id + '">Stop</button>') + '</td><td style="font-size:11px">' + (l.payments || []).length + ' × paid</td></tr>'; }).join('') : '<tr><td colspan=7>none</td></tr>') + '</tbody></table>' +   // no closing </div> here: it closed the modal .box early and unbound every button below (Close / Add loan / Save overrides)
          (ro() ? '' : '<div class="hr-form" style="margin-top:8px"><div><label>Kind</label><select id="lKind">' + KINDS.map(function (k) { return '<option value="' + k[0] + '">' + k[1] + '</option>'; }).join('') + '</select></div><div><label>Principal</label><input id="lPrin" type="number" step="0.01"></div><div><label>Weekly amortisation</label><input id="lAmt" type="number" step="0.01"></div><div><label>Started on</label><input id="lOn" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div><div class="w"><button class="hr-btn p" id="lAdd">+ Add loan</button></div></div>') +
          '<h4 style="margin:14px 0 4px">Contribution overrides (fixed amounts; blank = computed from the table)</h4>' +
          ENROLLED.filter(function (f) { return e[f[0]] === false; }).map(function (f) { return '<div style="font-size:11px;color:#9a6200">' + f[1] + ': not enrolled — nothing is deducted or reported until the box is ticked in the employee profile.</div>'; }).join('') +
          '<div class="hr-form">' + ['sss', 'phic', 'hdmf'].map(function (k) { var o = ovs.find(function (x) { return x.kind === k; }) || {}; return '<div><label>' + k.toUpperCase() + ' employee share</label><input data-ov="' + k + '" data-side="employee_amount" type="number" step="0.01" value="' + esc(o.employee_amount == null ? '' : o.employee_amount) + '"' + (ro() ? ' disabled' : '') + '></div><div><label>' + k.toUpperCase() + ' employer share</label><input data-ov="' + k + '" data-side="employer_amount" type="number" step="0.01" placeholder="auto (table)" value="' + esc(o.employer_amount == null ? '' : o.employer_amount) + '"' + (ro() ? ' disabled' : '') + '></div>'; }).join('') + '</div>' +
          '<div class="hr-bar" style="margin-top:12px">' + (ro() ? '' : '<button class="hr-btn p" id="ovSave">Save overrides</button>') + '<button class="hr-btn" id="lNo">Close</button></div>',
          function (box) {
            box.querySelector('#lNo').onclick = closeModal;
            var add = box.querySelector('#lAdd'); if (add) add.onclick = function () { var prin = Number(box.querySelector('#lPrin').value), amt = Number(box.querySelector('#lAmt').value); if (!(prin > 0 && amt > 0)) return toast('Principal and weekly amount required'); api.saveLoan({ employee_id: eid, kind: box.querySelector('#lKind').value, principal: prin, weekly_amortization: amt, balance: prin, started_on: box.querySelector('#lOn').value, active: true }).then(function () { toast('Loan added'); openLoans(eid); }).catch(fail); };
            box.querySelectorAll('[data-stop]').forEach(function (b) { b.onclick = function () { var l = loans.find(function (x) { return x.id === b.dataset.stop; }); api.saveLoan(Object.assign({}, l, { active: false, payments: undefined })).then(function () { openLoans(eid); }).catch(fail); }; });
            var sv = box.querySelector('#ovSave'); if (sv) sv.onclick = function () {
              var ps = ['sss', 'phic', 'hdmf'].map(function (k) { var ee = box.querySelector('[data-ov=' + k + '][data-side=employee_amount]').value, er = box.querySelector('[data-ov=' + k + '][data-side=employer_amount]').value, cur = ovs.find(function (x) { return x.kind === k; });
                if (ee === '' && er === '') return cur ? api.saveOverride(Object.assign({}, cur, { deleted_at: new Date().toISOString() })) : null;
                // employer blank → null = auto from the table (never 0: an explicit 0 is a fixed company share)
                return api.saveOverride(Object.assign({}, cur || { employee_id: eid, kind: k, effective_from: new Date().toISOString().slice(0, 10) }, { employee_amount: Number(ee) || 0, employer_amount: er === '' ? null : Number(er) || 0, deleted_at: null })); });
              Promise.all(ps).then(function () { toast('Overrides saved'); closeModal(); }).catch(fail);
            };
          });
      }).catch(fail);
    }
    // ---------- Reports ----------
    // The month the Reports tab is showing right now. One rule, read by TABS.reports to pick its month and by
    // the in-flight save handlers to ask whether that month has moved since they started.
    function repMonthNow() { return S.repMonth || (S.period ? C.contributionMonth(S.period.pay_date) : new Date().toISOString().slice(0, 7)); }
    // `cached` lets an edit re-draw from rows we already hold. No caller passes an event (checked: every
    // call site is `TABS.reports()`), so the extra parameter is safe.
    TABS.reports = function (cached) {
      var MONEY_REPS = { contrib: 1, m13: 1, loans: 1, set: 1 };   // rates gate: Mandatory summary / 13th month / Loan balances / Settings (multipliers, rate viewers) are money
      S.rep = S.rep || (ratesOK() ? 'contrib' : 'att'); if (!ratesOK() && MONEY_REPS[S.rep]) S.rep = 'att';
      var ym = repMonthNow();
      $('#hrBody').innerHTML = '<div class="hr-card"><div class="hr-bar">' + [['contrib', 'Mandatory summary (SSS · PHIC · Pag-IBIG)'], ['m13', '13th month'], ['loans', 'Loan balances'], ['att', 'Attendance summary'], ['hol', 'Holiday calendar'], ['set', 'Settings'], ['audit', 'Audit log']].filter(function (r) { return ratesOK() || !MONEY_REPS[r[0]]; }).map(function (r) { return '<button class="hr-btn' + (S.rep === r[0] ? ' p' : '') + '" data-rep="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '<input type="month" id="repM" value="' + esc(ym) + '"' + (S.rep === 'contrib' || S.rep === 'att' ? '' : ' hidden') + '>' +
        REREAD + (S.rep === 'm13' ? '<input type="number" id="repY" min="2020" max="2099" style="width:80px" value="' + esc(S.repYear || ym.slice(0, 4)) + '"><label title="Also count computed-but-unlocked weeks (marked d)"><input type="checkbox" id="repDraft"' + (S.repDraft ? ' checked' : '') + '> include unlocked weeks</label>' : '') + '</div><div id="repBody">Loading…</div></div>';
      // Coming back to the Mandatory summary is not a request to re-read it (owner 2026-10-14: only ↻ re-reads),
      // and S.repRows is this month's rows — asking for all ~106 again would undo the point of the cache.
      rootEl.querySelectorAll('[data-rep]').forEach(function (b) { b.onclick = function () { S.rep = b.dataset.rep; TABS.reports(S.rep === 'contrib' ? S.repRows : null); }; });
      $('#repM').onchange = function () { S.repMonth = this.value; TABS.reports(); };
      // A real read: no cache is passed, so TABS.reports asks the server. S.repRows is left alone on purpose —
      // not as a safety argument (either order is possible: a save still in flight can patch the cache and this
      // read then lands over it, and a read issued first can land after the patch and redraw the pre-save basis
      // under a "Basic pay saved" toast), but because clearing it would make an in-flight save's patchRows(null, …)
      // draw a one-row report. Both orders end with the server's own figures once this read lands.
      // `this.disabled = true` guarded nothing: TABS.reports() replaces #hrBody synchronously, so the button being
      // clicked is thrown away and a fresh ENABLED one drawn in its place — two quick clicks meant two
      // contribution_report reads racing into the same table. The flag outlives the redraw; the read clears it,
      // on success and on failure alike, so the "Could not load" card's Try again still works.
      $('#hrReread').onclick = function () {
        if (S.repBusy) return;
        if (S.rep === 'contrib') S.repBusy = true;   // the only report kind with a read heavy enough to collide with
        TABS.reports();
        var fresh = $('#hrReread'); if (fresh) fresh.disabled = S.repBusy;
      };
      var ry = $('#repY'); if (ry) ry.onchange = function () { S.repYear = this.value; TABS.reports(); }; var rd = $('#repDraft'); if (rd) rd.onchange = function () { S.repDraft = this.checked; TABS.reports(); };
      var body = $('#repBody');
      function xlsx(name, aoa) { var ensure = deps.ensureXLSX ? deps.ensureXLSX() : Promise.resolve(); ensure.then(function () { var X = root.XLSX, wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), 'Sheet1'); X.writeFile(wb, name + '.xlsx'); }).catch(fail); }
      // Amendment 3 (Task 22): the owner's Monthly Mandatory Summary — one row per employee (sorted by name), columns in the sheet's order,
      // blank cells for a kind the employee is not enrolled in (never 0.00), footer totals + the "SSS · PHIC · PAGIBIG" line, Excel in the template layout.
      // Ledger sss_er already includes EC (HrCore.sssContribution er = MSC × 10% + EC) — the sheet prints ER and EC apart, so SSS ER here = sss_er − sss_ec.
      // Amendment 4 (Task 23): the report covers EVERY payroll group (contributionReport left-joins the ledger to every active employee). Group filter above the
      // table; rows sectioned per group (settings order) with a subtotal row each, then the grand TOTAL + summary line. The Basic pay cell is editable (yellow) for a
      // row of another group and for any row without locked lines that month (and not yet deducted) — it calls setLedgerBasis, which recomputes the row's amounts
      // from that basis and marks it `manual` (never overwritten by Compute). Excel: same A–Q layout, every group sorted by name, plus column R GROUP.
      // Task 24 (owner decision 2026-09-22, "may base na, manual update kung sakali"): EVERY row is hand-adjustable in the report while its month is not yet deducted —
      //   Basic pay (computed-group rows with locked lines too) → setLedgerBasis (manual chip + "↺ auto" link → resetLedgerBasis: recomputed from the locked lines, or the row
      //   removed); clearing the cell = the same reset. SSS EE / PHIC EE / Pag-IBIG EE cells → a fixed contribution override for that employee & kind (employee_amount fixed,
      //   employer_amount null = auto, or the existing fixed ER pair kept) saved through saveOverride (update the effective row the report carries in r.overrides[kind], else insert) + recomputeLedger; clearing
      //   soft-deletes the override and recomputes. Overridden cells: yellow + orange bar like the Register. Once deducted_in_period_id is set the row is read-only (🔒).
      if (S.rep === 'contrib') (cached ? Promise.resolve(cached) : api.contributionReport(ym)).then(function (rows) {
        S.repRows = rows;
        // the ↻ trigger disabled the button it drew for the duration of this read; the read has landed
        S.repBusy = false; if (S.tab === 'reports') { var rrBtn = $('#hrReread'); if (rrBtn) rrBtn.disabled = false; }
        var MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        var monthLabel = MONTHS[+ym.slice(5, 7) - 1] + '-' + ym.slice(0, 4), cg = computedGroup(), act = !ro();
        function nameOf(r) { var n = r.last_name && r.first_name ? r.last_name + ', ' + r.first_name : (r.display_name || ''); return r.status_tag ? n + ' [' + r.status_tag + ']' : n; }
        function groupOf(r) { return r.payroll_group || cg; }
        rows = rows.slice().sort(function (a, b) { var x = nameOf(a).toLowerCase(), y = nameOf(b).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; });
        var allGroups = groups().slice(); rows.forEach(function (r) { if (allGroups.indexOf(groupOf(r)) < 0) allGroups.push(groupOf(r)); });
        var grp = S.repGroup && allGroups.indexOf(S.repGroup) >= 0 ? S.repGroup : '';
        var shown = rows.filter(function (r) { return !grp || groupOf(r) === grp; });
        // per-row cell values: null = blank (kind not enrolled, a basis the table did not supply, or — Amendment 4 — no ledger row yet: r.id null); numbers are 2 dp
        var NONE = { basic: null, phic_basis: null, sss_msc: null, sss_er: null, sss_ee: null, sss_ec: null, phic_er: null, phic_ee: null, hdmf_er: null, hdmf_ee: null };
        function cells(r) {
          if (r.id == null) return NONE;
          var sss = r.sss_enrolled !== false, phic = r.phic_enrolled !== false, hdmf = r.hdmf_enrolled !== false;
          function v(on, x, blankZero) { if (!on) return null; x = +x || 0; return blankZero && !x ? null : C.round2(x); }
          return { basic: C.round2(r.basis_amount), phic_basis: v(phic, r.phic_basis, true), sss_msc: v(sss, r.sss_msc, true),
            sss_er: v(sss, (+r.sss_er || 0) - (+r.sss_ec || 0)), sss_ee: v(sss, r.sss_ee), sss_ec: v(sss, r.sss_ec),
            phic_er: v(phic, r.phic_er), phic_ee: v(phic, r.phic_ee), hdmf_er: v(hdmf, r.hdmf_er), hdmf_ee: v(hdmf, r.hdmf_ee) };
        }
        var KEYS = ['basic', 'phic_basis', 'sss_msc', 'sss_er', 'sss_ee', 'sss_ec', 'phic_er', 'phic_ee', 'hdmf_er', 'hdmf_ee'];
        function totals(list) { var t = {}; KEYS.forEach(function (k) { t[k] = C.round2(list.reduce(function (a, c) { return a + (c[k] || 0); }, 0)); }); t.sss = C.round2(t.sss_er + t.sss_ee + t.sss_ec); t.phic = C.round2(t.phic_er + t.phic_ee); t.hdmf = C.round2(t.hdmf_er + t.hdmf_ee); return t; }
        var byRow = {}; rows.forEach(function (r) { byRow[r.employee_id] = cells(r); });
        var t = totals(shown.map(function (r) { return byRow[r.employee_id]; }));
        // Task 24: every row until deducted (the lock rule); the EE cells also need a ledger row to recompute (type the Basic pay first) and the kind enrolled
        function editable(r) { return act && r.deducted_in_period_id == null; }
        var EE = { sss_ee: ['sss', 'SSS'], phic_ee: ['phic', 'PhilHealth'], hdmf_ee: ['hdmf', 'Pag-IBIG'] };
        function eeCell(r, k, x) {
          var kind = EE[k][0], on = r[kind + '_enrolled'] !== false, ov = (r.overrides || {})[kind], ed = editable(r) && r.id != null && on;
          if (!ed) return '<td class="r"' + (!on ? ' title="not enrolled — tick the box in the employee profile first"' : '') + '>' + (x == null ? '' : money(x)) + '</td>';
          var tip = ov ? (ov.employer_amount == null ? 'fixed employee share — employer share auto' : 'fixed employee share + fixed employer share (Employees → Loans / contributions — an edit here keeps that employer share)') + ' · clear the cell to go back to the table' : 'type a fixed ' + EE[k][1] + ' employee share (Enter / click away to save) — employer share stays auto; clear to go back to the table';
          return '<td class="r ed' + (ov ? ' m' : '') + '" contenteditable data-ee="' + esc(r.employee_id) + '" data-k="' + kind + '" title="' + esc(tip) + '">' + (x == null ? '' : money(x)) + '</td>';
        }
        function cell(x) { return '<td class="r">' + (x == null ? '' : money(x)) + '</td>'; }
        var no = 0, manualCount = rows.filter(function (r) { return r.basis_source === 'manual'; }).length;
        var sections = allGroups.filter(function (g) { return shown.some(function (r) { return groupOf(r) === g; }); }).map(function (g) {
          var list = shown.filter(function (r) { return groupOf(r) === g; }), st = totals(list.map(function (r) { return byRow[r.employee_id]; }));
          return '<tr><td colspan="13" style="background:#f6f9f7;font-weight:800">' + esc(g) + (g === cg ? ' <small style="font-weight:400;color:#8a9894">computed payroll</small>' : ' <small style="font-weight:400;color:#8a9894">basic pay encoded per month</small>') + ' · ' + list.length + '</td></tr>' +
            list.map(function (r) {
              var c = byRow[r.employee_id], p = S.periods.find(function (x) { return x.id === r.deducted_in_period_id; }), ed = editable(r), manual = r.basis_source === 'manual';
              var none = r.sss_enrolled === false && r.phic_enrolled === false && r.hdmf_enrolled === false;
              var lockTip = r.deducted_in_period_id ? 'deducted in ' + (p ? periodLabel(p) : 'a locked period') + ' — reopen that period to change this row' : '';
              return '<tr><td>' + (++no) + '</td><td>' + (r.deducted_in_period_id ? '<span title="' + esc(lockTip) + '">🔒</span> ' : '') + esc(nameOf(r)) +
                (manual ? ' <span class="hr-chip computed" title="basic pay encoded by HR — Compute never overwrites it">manual</span>' + (ed ? ' <a href="#" data-reset="' + esc(r.employee_id) + '" style="font-size:11px;color:#4a5a55" title="back to auto — recomputed from the month\'s locked payroll lines, or the row removed when there are none">↺ auto</a>' : '') : '') + '</td>' +
                '<td class="r' + (ed ? ' ed' : '') + (ed && !c.basic ? ' blank' : '') + '"' + (ed ? ' contenteditable data-basis="' + esc(r.employee_id) + '" title="type the monthly basic pay (Enter / click away to save) — recomputes SSS · PHIC · Pag-IBIG from it' + (r.id != null ? '; clear the cell to go back to auto' : '') + (r.id != null && groupOf(r) === cg && !manual && Number(r.locked_lines) > 0 ? ' · currently Σ basic of the month\'s locked payroll lines' : '') + '"' : (r.deducted_in_period_id ? ' title="' + esc(lockTip) + '"' : '')) + '>' + (c.basic != null ? money(c.basic) : ed ? '0.00' : '') + '</td>' +
                KEYS.slice(1).map(function (k) { return EE[k] ? eeCell(r, k, c[k]) : cell(c[k]); }).join('') +
                '<td>' + (none ? '' : p ? esc(periodLabel(p)) : r.id == null ? '<span style="color:#9a6200">' + (groupOf(r) === cg ? 'not computed' : 'no basis') + '</span>' : groupOf(r) === cg ? '<span style="color:#9a6200">pending</span>' : '—') + '</td></tr>'; }).join('') +
            (grp ? '' : '<tr style="font-weight:700;color:#4a5a55"><td></td><td>Subtotal · ' + esc(g) + '</td>' + KEYS.map(function (k) { return cell(st[k]); }).join('') + '<td></td></tr>');
        }).join('');
        body.innerHTML = '<div class="hr-bar"><b>' + esc(monthLabel) + '</b> · <select id="repG"><option value="">All groups</option>' + allGroups.map(function (g) { return '<option value="' + esc(g) + '"' + (grp === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select> · ' + shown.length + ' employees' + (manualCount ? ' · ' + manualCount + ' manual' : '') + ' · <button class="hr-btn" id="repX">⬇ Excel</button>' +
          '<span style="font-size:11px;color:#8a9894">Basic pay = Σ basic of the month’s locked payroll lines (new hire: rate × ' + esc(S.settings && S.settings.new_hire_basis_days || 26) + ') for the <b>' + esc(cg) + '</b> group; other groups get their basic pay typed in the yellow cell → SSS · PHIC · Pag-IBIG follow · <b>any row</b> can be hand-adjusted until its month is deducted (🔒): Basic pay (↺ auto to go back), and the three EE cells (a fixed employee share; employer share stays auto) · PhilHealth basis = basic rounded to the nearest ₱' + esc(Number(S.settings && S.settings.phic_round_to != null ? S.settings.phic_round_to : C.DEFAULT_SETTINGS.phic_round_to).toLocaleString('en-PH')) + ' (floor 10,000 / ceiling 100,000) · SSS MSC = nearest ₱500 (5,000–35,000) · blank = not enrolled · "Deducted" = the payroll week the EE share was taken.</span></div>' +
          '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>#</th><th>Name</th><th class="r">Basic pay</th><th class="r">PhilHealth basis</th><th class="r">SSS MSC</th><th class="r">SSS ER</th><th class="r">SSS EE</th><th class="r">EC</th><th class="r">PHIC ER</th><th class="r">PHIC EE</th><th class="r">Pag-IBIG ER</th><th class="r">Pag-IBIG EE</th><th>Deducted</th></tr></thead><tbody>' +
          sections +
          '<tr style="font-weight:800"><td></td><td>TOTAL' + (grp ? ' · ' + esc(grp) : '') + '</td>' + KEYS.map(function (k) { return cell(t[k]); }).join('') + '<td></td></tr>' +
          '<tr style="font-weight:800"><td></td><td colspan="12">SSS ₱' + money(t.sss) + ' · PHIC ₱' + money(t.phic) + ' · Pag-IBIG ₱' + money(t.hdmf) + '</td></tr></tbody></table></div>';
        // a group filter is a view of rows already in hand, not a reason to read all ~106 again
        $('#repG').onchange = function () { S.repGroup = this.value; TABS.reports(S.repRows); };
        rootEl.querySelectorAll('td[data-basis]').forEach(function (td) {
          var orig = td.textContent;
          td.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); td.blur(); } if (ev.key === 'Escape') { td.textContent = orig; td.blur(); } };
          td.onblur = function () {
            var raw = td.textContent.trim(); if (raw === orig) return;
            if (raw === '') { var row = rows.find(function (x) { return x.employee_id === td.dataset.basis; }); if (!row || row.id == null) { td.textContent = orig; return; } return reset(td.dataset.basis, function () { td.textContent = orig; }); }   // cleared → back to auto (Task 24); nothing to reset without a ledger row
            var n = Number(raw.replace(/,/g, '')); if (isNaN(n) || n < 0) { td.textContent = orig; return toast('Basic pay must be a number ≥ 0'); }
            api.setLedgerBasis(td.dataset.basis, ym, C.round2(n)).then(function (led) {
              toast('Basic pay saved · contributions recomputed');
              // hr.set_ledger_basis returns the recomputed ledger row, so the table is redrawn from it
              // rather than asking for the whole report again.
              // `ym` is the month this edit was made in. If the month input moved while the save was in flight, S.repRows
              // now belongs to another month and merging this row into it would print it under the wrong heading: re-read.
              if (ym !== repMonthNow()) return TABS.reports();
              TABS.reports(patchRows(S.repRows, led, 'employee_id'));
            }).catch(function (e) { td.textContent = orig; fail(e); });
          };
        });
        // Task 24: "↺ auto" / cleared Basic pay → resetLedgerBasis (recomputed from the month's locked lines, or the row removed = "no basis" / "not computed")
        function reset(eid, undo) {
          api.resetLedgerBasis(eid, ym).then(function (r) {
            toast(r ? 'Back to auto · recomputed from the month\'s locked payroll lines' : 'Manual basis removed · no basis for this month');
            if (ym !== repMonthNow()) return TABS.reports();   // the month moved while this was in flight: S.repRows is another month's
            // null = the ledger row is gone. The employee STAYS on the report with no basis (the report
            // left-joins the ledger to every active employee), so blank the amounts, do not drop the row.
            TABS.reports(patchRows(S.repRows, r || { employee_id: eid, id: null, basis_amount: null,
              basis_source: null, sss_ee: null, sss_er: null, sss_ec: null, phic_ee: null, phic_er: null,
              hdmf_ee: null, hdmf_er: null, sss_msc: null, phic_basis: null }, 'employee_id'));
          }).catch(function (e) { if (undo) undo(); fail(e); });
        }
        rootEl.querySelectorAll('a[data-reset]').forEach(function (a) { a.onclick = function (ev) { ev.preventDefault(); reset(a.dataset.reset); }; });
        // Task 24: inline EE override — a number → fixed employee share for that kind (employer share auto: employer_amount null) through saveOverride (the report row carries the
        // effective override in r.overrides[kind] → update it, else insert) then recomputeLedger; blank → soft-delete the override + recompute (back to the table)
        rootEl.querySelectorAll('td[data-ee]').forEach(function (td) {
          var orig = td.textContent, eid = td.dataset.ee, kind = td.dataset.k, r = rows.find(function (x) { return x.employee_id === eid; }) || {}, cur = (r.overrides || {})[kind] || null;
          td.onkeydown = function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); td.blur(); } if (ev.key === 'Escape') { td.textContent = orig; td.blur(); } };
          td.onblur = function () {
            var raw = td.textContent.trim(); if (raw === orig) return;
            var base = { employee_id: eid, kind: kind, effective_from: cur && cur.effective_from ? cur.effective_from : new Date().toISOString().slice(0, 10) };
            if (cur) base.id = cur.id;
            var save;
            if (raw === '') { if (!cur) { td.textContent = orig; return; } save = api.saveOverride(Object.assign(base, { employee_amount: cur.employee_amount, employer_amount: cur.employer_amount == null ? null : cur.employer_amount, deleted_at: new Date().toISOString() })); }
            else { var n = Number(raw.replace(/,/g, '')); if (isNaN(n) || n < 0) { td.textContent = orig; return toast('Employee share must be a number ≥ 0'); } save = api.saveOverride(Object.assign(base, { employee_amount: C.round2(n), employer_amount: cur && cur.employer_amount != null ? cur.employer_amount : null, deleted_at: null })); }   // a fixed ER pair typed in the profile is kept; otherwise ER stays auto
            save.then(function () { return api.recomputeLedger(eid, ym); }).then(function () { toast(raw === '' ? 'Override removed · back to the table' : cur && cur.employer_amount != null ? 'Employee share fixed · fixed employer share kept' : 'Employee share fixed · employer share auto');
              // The ONE path that still re-reads for real, and it must: the override cells read
              // r.overrides[kind] to decide insert-versus-update, and recompute_ledger does not return
              // that list. Patching the amounts while leaving a stale overrides list would make the next
              // edit of the same cell see cur == null and INSERT A DUPLICATE override — a second fixed
              // employee share for the same kind — and would make clearing the cell silently revert.
              // An override edit is rare; the 80-row monthly encode is what had to stop refetching.
              TABS.reports();
            }).catch(function (e) { td.textContent = orig; fail(e); });
          };
        });
        // Excel: the owner's template, column for column — A # · B NAME · C blank · D BASIC PAY · E PHILHEALTH (basis) · F SSS (MSC) · G–H blank · I SSS ER · J EE · K EC ·
        // L blank · M PHILHEALTH ER · N EE · O blank · P PAGIBIG ER · Q EE · R GROUP (Amendment 4 — after Q, A–Q untouched). Row 1 = group headers, row 2 = ER / EE / EC,
        // data from row 3 (every group, sorted by name — the on-screen group filter does not apply), totals row, then the summary line.
        $('#repX').onclick = function () {
          var B = null, tAll = totals(rows.map(function (r) { return byRow[r.employee_id]; }));   // blank cell; totals over every group
          var aoa = [['#', 'NAME', B, 'BASIC PAY', 'PHILHEALTH ', 'SSS', B, B, 'SSS', B, B, B, 'PHILHEALTH', B, B, 'PAGIBIG', B, 'GROUP'],
                     [B, B, B, B, B, B, B, B, 'ER', 'EE', 'EC', B, 'ER', 'EE', B, 'ER', 'EE', B]];
          function line(no, name, c, g) { return [no, name, B, c.basic, c.phic_basis, c.sss_msc, B, B, c.sss_er, c.sss_ee, c.sss_ec, B, c.phic_er, c.phic_ee, B, c.hdmf_er, c.hdmf_ee, g == null ? B : g]; }
          rows.forEach(function (r, i) { aoa.push(line(i + 1, nameOf(r), byRow[r.employee_id], groupOf(r))); });
          aoa.push(line(B, 'TOTAL', tAll, null));
          aoa.push([B, 'SSS ' + money(tAll.sss) + ' · PHIC ' + money(tAll.phic) + ' · PAGIBIG ' + money(tAll.hdmf)]);
          var ensure = deps.ensureXLSX ? deps.ensureXLSX() : Promise.resolve();
          ensure.then(function () {
            var X = root.XLSX, wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa);
            Object.keys(ws).forEach(function (k) { if (k[0] !== '!' && ws[k].t === 'n') ws[k].z = '#,##0.00'; });
            ws['!cols'] = [{ wch: 4 }, { wch: 32 }, { wch: 2 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 2 }, { wch: 2 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 2 }, { wch: 14 }, { wch: 10 }, { wch: 2 }, { wch: 12 }, { wch: 10 }, { wch: 10 }];
            X.utils.book_append_sheet(wb, ws, 'Sheet1'); X.writeFile(wb, monthLabel + '-MANDATORY-SUMMARY.xlsx');
          }).catch(fail);
        };
      }).catch(function (e) { S.repBusy = false; fail(e); });   // a refused read must leave the trigger pressable (fail draws its own Try again)
      // Amendment 5: 13th month pay — Σ basic salary of the calendar year ÷ 12 per employee (HrCore.thirteenthMonthRows / hr.thirteenth_month). Months as columns; a
      // month from a hand-encoded ledger basis (FERROTECH / manual) carries ᵐ, an unlocked week ᵈ (only with "include unlocked weeks"). Sectioned per payroll group with
      // subtotals, grand total, Excel 13TH-MONTH-<YYYY>.xlsx. Pro-rated by construction: a new hire simply has fewer months.
      if (S.rep === 'm13') api.thirteenthMonth(S.repYear || ym.slice(0, 4), !!S.repDraft).then(function (rows) {
        var yr = String(S.repYear || ym.slice(0, 4)), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], yms = MON.map(function (_, i) { return yr + '-' + String(i + 1).padStart(2, '0'); });
        var gl = groups().slice(); rows.forEach(function (r) { if (gl.indexOf(r.payroll_group) < 0) gl.push(r.payroll_group); });
        function sumRow(list, label, cls) { var t = yms.map(function (m) { return C.round2(list.reduce(function (a, r) { return a + (+r.months[m] || 0); }, 0)); }); return '<tr class="' + cls + '" style="font-weight:800"><td colspan=3>' + esc(label) + ' (' + list.length + ')</td>' + t.map(function (v) { return '<td class="r">' + (v ? money(v) : '') + '</td>'; }).join('') + '<td class="r">' + money(list.reduce(function (a, r) { return a + r.total_basic; }, 0)) + '</td><td class="r">' + money(list.reduce(function (a, r) { return a + r.thirteenth_month; }, 0)) + '</td></tr>'; }
        var html = '', aoa = [['13TH MONTH PAY — ' + yr + (S.repDraft ? ' (includes unlocked weeks — DRAFT)' : ''), ''], [], ['NO.', 'EMPLOYEE NO.', 'NAME', 'GROUP'].concat(MON.map(function (m) { return m.toUpperCase(); }), ['TOTAL BASIC', '13TH MONTH (÷12)'])], n = 0;
        gl.forEach(function (g) {
          var list = rows.filter(function (r) { return r.payroll_group === g; }); if (!list.length) return;
          html += '<tr><td colspan="17" style="background:#eef3f1;font-weight:800">' + esc(g) + '</td></tr>' + list.map(function (r) { n++; aoa.push([n, r.emp_no, r.display_name, g].concat(yms.map(function (m) { return r.months[m] == null ? '' : r.months[m]; }), [r.total_basic, r.thirteenth_month])); return '<tr' + (r.active ? '' : ' style="opacity:.6"') + '><td>' + n + '</td><td>' + esc(r.emp_no) + '</td><td><b>' + esc(r.display_name) + '</b>' + (r.active ? '' : ' <span class="hr-chip computed">inactive</span>') + '</td>' + yms.map(function (m) { var v = r.months[m]; return '<td class="r">' + (v == null ? '' : money(v) + (r.manual_months.indexOf(m) >= 0 ? '<sup title="hand-encoded monthly basic (Mandatory summary)">m</sup>' : '') + (r.draft_months.indexOf(m) >= 0 ? '<sup title="includes an unlocked week">d</sup>' : '')) + '</td>'; }).join('') + '<td class="r">' + money(r.total_basic) + '</td><td class="r"><b>' + money(r.thirteenth_month) + '</b></td></tr>'; }).join('') + sumRow(list, 'Subtotal ' + g, 'sub');
          var st = ['', '', 'SUBTOTAL ' + g, ''].concat(yms.map(function (m) { return C.round2(list.reduce(function (a, r) { return a + (+r.months[m] || 0); }, 0)); }), [C.round2(list.reduce(function (a, r) { return a + r.total_basic; }, 0)), C.round2(list.reduce(function (a, r) { return a + r.thirteenth_month; }, 0))]); aoa.push(st);
        });
        aoa.push(['', '', 'TOTAL', ''].concat(yms.map(function (m) { return C.round2(rows.reduce(function (a, r) { return a + (+r.months[m] || 0); }, 0)); }), [C.round2(rows.reduce(function (a, r) { return a + r.total_basic; }, 0)), C.round2(rows.reduce(function (a, r) { return a + r.thirteenth_month; }, 0))]));
        body.innerHTML = '<div class="hr-bar"><span style="font-size:11px;color:#8a9894">13th month = total basic salary earned in ' + esc(yr) + ' ÷ 12 (locked weeks' + (S.repDraft ? ' + unlocked weeks marked ᵈ' : '; tick "include unlocked weeks" to preview the current week') + '; ᵐ = hand-encoded monthly basic). Payable on or before Dec 24; a mid-year release is half of the amount to date.</span><button class="hr-btn" id="m13X"' + (rows.length ? '' : ' disabled') + '>⬇ Excel</button></div>' +
          (rows.length ? '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>#</th><th>No.</th><th>Employee</th>' + MON.map(function (m) { return '<th class="r">' + m + '</th>'; }).join('') + '<th class="r">Total basic</th><th class="r">13th month</th></tr></thead><tbody>' + html + sumRow(rows, 'TOTAL', 'tot') + '</tbody></table></div>' : '<p class="mut">No basic pay recorded for ' + esc(yr) + ' yet — lock a payroll week (or tick "include unlocked weeks").</p>');
        var xb = $('#m13X'); if (xb) xb.onclick = function () { xlsx('13TH-MONTH-' + yr + (S.repDraft ? '-DRAFT' : ''), aoa); };
      }).catch(fail);
      if (S.rep === 'loans') api.listLoans({ active: true }).then(function (loans) {
        body.innerHTML = '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>Employee</th><th>Kind</th><th class="r">Principal</th><th class="r">Weekly</th><th class="r">Balance</th><th>Started</th><th class="r">Paid</th></tr></thead><tbody>' + loans.map(function (l) { return '<tr><td>' + esc(emp(l.employee_id).display_name) + '</td><td>' + esc(l.kind) + '</td><td class="r">' + money(l.principal) + '</td><td class="r">' + money(l.weekly_amortization) + '</td><td class="r"><b>' + money(l.balance) + '</b></td><td>' + esc(fmtDate(l.started_on)) + '</td><td class="r">' + money((l.payments || []).reduce(function (a, p) { return a + (+p.amount || 0); }, 0)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).catch(fail);
      if (S.rep === 'att') api.attendanceSummary(ym).then(function (rows) {
        body.innerHTML = '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>Employee</th><th class="r">Days</th><th class="r">L.H hrs</th><th class="r">S.H hrs</th><th class="r">RD OT hrs</th></tr></thead><tbody>' + rows.sort(function (a, b) { return a.display_name < b.display_name ? -1 : 1; }).map(function (r) { return '<tr><td>' + esc(r.display_name) + '</td><td class="r">' + r.days + '</td><td class="r">' + r.hours_lh + '</td><td class="r">' + r.hours_sh + '</td><td class="r">' + r.hours_rd + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).catch(fail);
      if (S.rep === 'hol') { var yr = ym.slice(0, 4);
        body.innerHTML = '<div class="hr-bar">' + (ro() ? '' : '<input id="hD" type="date"><input id="hN" placeholder="Name"><select id="hK"><option value="legal">Legal (regular) holiday</option><option value="special">Special non-working</option></select><button class="hr-btn p" id="hAdd">+ Add</button>') + '</div><div class="hr-scroll"><table class="hr-t"><thead><tr><th>Date</th><th>Name</th><th>Kind</th><th>Scope</th><th></th></tr></thead><tbody>' + S.holidays.filter(function (h) { return h.date.slice(0, 4) === yr; }).map(function (h) { return '<tr><td>' + esc(h.date) + ' ' + dow(h.date) + '</td><td>' + esc(h.name) + '</td><td style="color:' + (h.kind === 'legal' ? '#c2503a' : '#9a6200') + '">' + esc(h.kind) + '</td><td>' + esc(h.scope) + '</td><td>' + (ro() ? '' : '<button class="hr-btn" data-hdel="' + h.id + '">Remove</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        var ha = $('#hAdd'); if (ha) ha.onclick = function () { var d = $('#hD').value, n = $('#hN').value; if (!d || !n) return toast('Date and name required'); api.saveHoliday({ date: d, name: n, kind: $('#hK').value, scope: 'company' }).then(refresh).catch(fail); };
        rootEl.querySelectorAll('[data-hdel]').forEach(function (b) { b.onclick = function () { if (confirm('Remove this holiday?')) api.deleteHoliday(b.dataset.hdel).then(refresh).catch(fail); }; });
      }
      if (S.rep === 'set') { var s = S.settings, cal = s.deduction_calendar;
        body.innerHTML = '<div class="hr-form">' + [['mult_rd_ot', 'Rest-day OT multiplier'], ['mult_lh_worked', 'Legal holiday worked'], ['mult_lh_unworked', 'Legal holiday unworked (× daily rate)'], ['mult_sh_worked', 'Special holiday worked'], ['hours_per_day', 'Hours per day'], ['new_hire_basis_days', 'New-hire basis days (rate × n)']].map(function (f) { return '<div><label>' + f[1] + '</label><input data-set="' + f[0] + '" type="number" step="0.01" value="' + esc(s[f[0]]) + '"' + (ro() ? ' disabled' : '') + '></div>'; }).join('') +
          '<div><label>SSS weeks</label><input data-cal="sss" value="' + esc(cal.sss.join(',')) + '"></div><div><label>PhilHealth weeks</label><input data-cal="phic" value="' + esc(cal.phic.join(',')) + '"></div><div><label>Pag-IBIG weeks</label><input data-cal="hdmf" value="' + esc(cal.hdmf.join(',')) + '"></div><div><label>Gov loan weeks</label><input data-cal="gov_loan" value="' + esc(cal.gov_loan.join(',')) + '"></div>' +
          '<div><label>Team prefix for attendance evidence</label><input id="setPrefix" value="' + esc(s.team_prefix || 'AHBA_') + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div><label>Driver allowance per deployment (₱, two-person driver; legacy daily compatibility)</label><input id="setDrv" type="number" step="0.01" min="0" value="' + esc(s.driver_daily_allowance == null ? 100 : s.driver_daily_allowance) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div><label>PhilHealth basis rounding (₱ nearest; 0 = none)</label><input id="setPhicRound" type="number" step="1" min="0" value="' + esc(s.phic_round_to == null ? C.DEFAULT_SETTINGS.phic_round_to : s.phic_round_to) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div><label>Pag-IBIG rule</label><select id="setHdmfMode"' + (ro() ? ' disabled' : '') + '><option value="flat"' + ((s.hdmf_mode || 'flat') === 'flat' ? ' selected' : '') + '>Flat ₱200 (default)</option><option value="table"' + (s.hdmf_mode === 'table' ? ' selected' : '') + '>2% table</option></select></div>' +
          '<div><label>Pag-IBIG flat amount (₱ EE = ₱ ER, when rule = Flat)</label><input id="setHdmfFlat" type="number" step="0.01" min="0.01" value="' + esc(s.hdmf_flat_amount == null ? C.DEFAULT_SETTINGS.hdmf_flat_amount : s.hdmf_flat_amount) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div><label>Payroll groups (comma list)</label><input id="setGroups" value="' + esc(groups().join(', ')) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div><label>Computed group (attendance-built · Register)</label><select id="setCG"' + (ro() ? ' disabled' : '') + '>' + groups().concat(groups().indexOf(computedGroup()) < 0 ? [computedGroup()] : []).map(function (g) { return '<option value="' + esc(g) + '"' + (g === computedGroup() ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></div>' +
          '<div class="w"><label><input type="checkbox" id="setPrev"' + (s.unworked_lh_requires_prev_day ? ' checked' : '') + (ro() ? ' disabled' : '') + '> Unworked legal holiday paid only if present the day before</label></div>' +
          '<div class="w"><label>Rate viewers — console roles (comma-separated; dashboard_users role label, case-insensitive)</label><input id="setRateRoles" value="' + esc((s.rate_viewer_roles || []).join(', ')) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div class="w"><label>Rate viewers — usernames (comma-separated; e.g. the President\'s login). Superadmins always see rates. Everyone else with the payroll grant works attendance, validation and profiles without rates or amounts.</label><input id="setRateUsers" value="' + esc((s.rate_viewer_users || []).join(', ')) + '"' + (ro() ? ' disabled' : '') + '></div>' +
          '<div class="w"><label><input type="checkbox" id="setVer"' + (s.lock_requires_verified ? ' checked' : '') + (ro() ? ' disabled' : '') + '> Lock requires all logs verified (Validate tab ✓ on every log in the period before Lock)</label></div></div>' + (ro() ? '' : '<div class="hr-bar" style="margin-top:10px"><button class="hr-btn p" id="setSave">Save settings</button><span style="font-size:11px;color:#8a9894">Applies on the next Compute. Locked periods are unaffected.</span></div>');
        var ss = $('#setSave'); if (ss) ss.onclick = function () {
          var setEls = rootEl.querySelectorAll('[data-set]'), patch = {};
          for (var i = 0; i < setEls.length; i++) { var v = setEls[i].value; if (v === '' || Number(v) <= 0) return toast('All multipliers, hours per day and basis days must be greater than 0'); patch[setEls[i].dataset.set] = Number(v); }
          var c2 = Object.assign({}, cal), calEls = rootEl.querySelectorAll('[data-cal]');
          for (var j = 0; j < calEls.length; j++) {
            var nums = calEls[j].value.split(',').map(Number).filter(Boolean);
            for (var k = 0; k < nums.length; k++) { if (nums[k] < 1 || nums[k] > 5) return toast('Deduction weeks must be between 1 and 5'); }
            c2[calEls[j].dataset.cal] = nums;
          }
          var prefix = $('#setPrefix').value.trim(); if (!prefix) return toast('Team prefix is required (e.g. AHBA_) — the builder reads only attendance rows of teams starting with it');
          var drv = $('#setDrv').value; if (drv === '' || Number(drv) < 0) return toast('Driver allowance rate must be 0 or more'); patch.driver_daily_allowance = Number(drv);   // Amendment 2: 0 switches the auto allowance off
          var pr = $('#setPhicRound').value; if (pr === '' || Number(pr) < 0) return toast('PhilHealth basis rounding must be 0 or more'); patch.phic_round_to = Number(pr);   // Amendment 3: 0 = raw basis, no rounding
          var hf = $('#setHdmfFlat').value; if (hf === '' || Number(hf) <= 0) return toast('Pag-IBIG flat amount must be greater than 0'); patch.hdmf_flat_amount = Number(hf); patch.hdmf_mode = $('#setHdmfMode').value;   // owner practice: flat ₱200 default, 2% table fallback
          // Amendment 4: group labels (deduped, trimmed, non-empty) + the computed group, which must be one of them
          var gl = [], gseen = {}; $('#setGroups').value.split(',').forEach(function (g) { g = g.trim(); if (g && !gseen[g.toLowerCase()]) { gseen[g.toLowerCase()] = true; gl.push(g); } });
          if (!gl.length) return toast('At least one payroll group is required (e.g. AHBA, FERROTECH)');
          var cgv = $('#setCG').value; if (gl.indexOf(cgv) < 0) return toast('The computed group must be one of the payroll groups');
          patch.payroll_groups = gl; patch.computed_group = cgv;
          patch.team_prefix = prefix; patch.deduction_calendar = c2; patch.unworked_lh_requires_prev_day = $('#setPrev').checked; patch.lock_requires_verified = $('#setVer').checked;
          function csv(id) { return $(id).value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
          patch.rate_viewer_roles = csv('#setRateRoles'); patch.rate_viewer_users = csv('#setRateUsers');
          api.saveSettings(patch).then(function () { toast('Settings saved'); return refresh(); }).catch(fail);
        };
      }
      if (S.rep === 'audit') api.auditLog({ limit: 200 }).then(function (rows) {
        body.innerHTML = '<div class="hr-scroll"><table class="hr-t"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Table</th><th>Row</th><th>Change</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(new Date(r.at).toLocaleString('en-PH')) + '</td><td>' + esc(r.actor) + '</td><td>' + esc(r.action) + '</td><td>' + esc(r.table_name) + '</td><td style="font-size:10px">' + esc(r.row_id) + '</td><td style="font-size:10px;white-space:normal;max-width:420px">' + esc(JSON.stringify(r.after || r.before || {}).slice(0, 240)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).catch(fail);
    };

    refresh();
    return { refresh: refresh, destroy: function () { closePop(); closeModal(); rootEl.innerHTML = ''; } };
  }
  // Header button: any console user. Shows "Time In" / "Time Out · in 07:58". Disabled when the username is not linked to an employee.
  function punchWidget(el, o) {
    var api = o.api, st = { me: null, punch: null };
    function today() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
    function render() {   // hhmm = the module-level helper (Manila, '—' when null)
      if (!st.me || !st.me.employee_id) { el.innerHTML = '<button class="hr-btn" disabled title="This console username is not linked to an employee profile (Payroll → Employees)">⏱ Time In</button>'; return; }
      var p = st.punch;
      if (!p) el.innerHTML = '<button class="hr-btn p" id="hrPunch">⏱ Time In</button>';
      else if (!p.time_out) el.innerHTML = '<button class="hr-btn" id="hrPunch">⏱ Time Out <small>· in ' + hhmm(p.time_in) + '</small></button>';
      else el.innerHTML = '<button class="hr-btn" disabled>✓ ' + hhmm(p.time_in) + ' – ' + hhmm(p.time_out) + '</button>';
      var b = el.querySelector('#hrPunch'); if (b) b.onclick = function () { b.disabled = true; (p ? api.punchOut() : api.punchIn()).then(refresh).catch(function (e) { alert(e.message); refresh(); }); };
    }
    function refresh() { return api.me().then(function (m) { st.me = m; return m.employee_id ? api.myPunch(today()) : null; }).then(function (p) { st.punch = p; render(); }).catch(function () { el.innerHTML = ''; }); }
    if (!document.getElementById('hrCss')) { var s = document.createElement('style'); s.id = 'hrCss'; s.textContent = CSS; document.head.appendChild(s); }
    refresh(); return { refresh: refresh };
  }
  root.ConsoleHR = { _integrationActionAllowed: integrationActionAllowed, _saveRegisterEdit: saveRegisterEdit, _patchRows: patchRows, _staleOf: staleOf, mount: mount, punchWidget: punchWidget, _esc: esc, _money: money, _periodLabel: periodLabel, _incompleteBatchSummary: incompleteBatchSummary, _attendanceDeductionPatch: attendanceDeductionPatch, _registerView: registerView, _validationGroupView: validationGroupView, _validationGroupChange: validationGroupChange, _validationBatchScope: validationBatchScope, _validationBatchPayload: validationBatchPayload, _validationEmployeePool: validationEmployeePool, _validationWizardRows: validationWizardRows, _driverAllowanceView: driverAllowanceView, _registerAllowanceEdit: registerAllowanceEdit, _loadPayrollPeriod: loadPayrollPeriod, _fieldOpsSnapshot: fieldOpsSnapshot };
})(typeof self !== 'undefined' ? self : this);
