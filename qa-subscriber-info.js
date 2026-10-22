// qa-subscriber-info.js — "Subscriber — full info" for the console QA surfaces (owner decision 2026-10-22): the full subscriber /
// JO / VAS record of a job, EXCLUDING the valid-ID photo, payment and crew. Pure: builds HTML strings and decides states; the reads
// live in qa-api.js (existing jobs RLS). Also the Completed-page return state rule and the audit → job lookup chain.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QaSubscriberInfo = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var GROUPS = [
    { title: 'Name & contact', fields: [['first_name', 'First name'], ['middle_name', 'Middle name'], ['last_name', 'Last name'], ['birth_date', 'Birth date', 'date'], ['primary_no', 'Primary no.'], ['other_contact_no', 'Other contact no.'], ['email', 'Email']] },
    { title: 'Address', fields: [['house_no', 'House no.'], ['street_name', 'Street'], ['village', 'Village / subdivision'], ['brgy', 'Barangay'], ['city', 'City'], ['district', 'District'], ['area', 'Area'], ['address', 'Address (as encoded)']] },
    { title: 'Account & JO', fields: [['ibass_acct_no', 'IBASS account no.'], ['job_order_no', 'JO no.'], ['ticket_no', 'Ticket no.'], ['load_type', 'Load type'], ['service_type', 'Service type'], ['load_date', 'Load date', 'date'], ['schedule', 'Schedule'], ['priority', 'Priority'], ['work_account', 'Work account'], ['ref_no', 'Reference no.']] },
    { title: 'Service / VAS & sales', fields: [['plan', 'Plan'], ['current_plan', 'Current plan'], ['play_type', '1P / 2P'], ['add_on', 'Add-on'], ['addon_count', 'Add-ons (2P)'], ['vas_no', 'VAS no.'], ['dwelling_type', 'Dwelling type'], ['install_fee_type', 'Install fee type'], ['wait_time', 'Wait time'], ['source_of_sales', 'Source of sales'], ['referral_name', 'Referral name'], ['special_note', 'Special note'], ['encoded_by', 'Encoded by'], ['created_by', 'Created by']] }
  ];
  var OPTIONAL_COLUMNS = ['vas_no', 'install_fee_type', 'wait_time', 'current_plan'];   // dropped on a second try if the live schema lacks one

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(v) { if (!v) return '—'; var d = new Date(v); if (isNaN(d.getTime())) return String(v); return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' }); }
  function columns(opts) {
    var all = ['id'];
    GROUPS.forEach(function (g) { g.fields.forEach(function (f) { all.push(f[0]); }); });
    if (opts && opts.withoutOptional) all = all.filter(function (c) { return OPTIONAL_COLUMNS.indexOf(c) < 0; });
    return all;
  }
  function value(job, f) { var v = job[f[0]]; if (v == null || v === '') return '—'; return f[2] === 'date' ? fmtDate(v) : String(v); }
  function render(job, opts) {
    opts = opts || {};
    var note = opts.note ? '<div class="qa-sub-note">' + esc(opts.note) + '</div>' : '';
    if (!job) {
      var fb = opts.fallback || {};
      var mini = [['Subscriber', fb.subscriber], ['Mobile no.', fb.mobile_no], ['Address', fb.address], ['Barangay', fb.barangay]].map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1] == null || p[1] === '' ? '—' : p[1]) + '</dd>'; }).join('');
      return '<div class="qa-sub-grid"><div class="qa-sub-col"><h4>From the inspection record</h4><dl>' + mini + '</dl></div></div>' + note;
    }
    var cols = GROUPS.map(function (g) {
      return '<div class="qa-sub-col"><h4>' + esc(g.title) + '</h4><dl>' + g.fields.map(function (f) { return '<dt>' + esc(f[1]) + '</dt><dd>' + esc(value(job, f)) + '</dd>'; }).join('') + '</dl></div>';
    }).join('');
    return '<div class="qa-sub-grid">' + cols + '</div>' + note;
  }
  // Completed page (QA Validation) state of a JO: an open return (qa-05h) = returned to the team; a return the team has already
  // resolved by re-completing, not yet validated = re-submitted; anything else = none.
  function returnState(job) {
    if (!job) return 'none';
    if (job.qa_returned_at && !job.qa_return_resolved_at) return 'returned';
    if (job.qa_returned_at && job.qa_return_resolved_at && !job.validated) return 'resubmitted';
    return 'none';
  }
  // QA Audit detail: job by audit.job_id, else by JO no, else by account no, else the audit's own copy with a note.
  function loadForAudit(api, audit) {
    audit = audit || {};
    var fromAudit = { subscriber: audit.subscriber, mobile_no: audit.mobile_no, address: audit.address, barangay: audit.barangay };
    var none = { job: null, note: 'Sheet-only record — no FieldOps JO found', fromAudit: fromAudit };
    var first = audit.job_id ? api.getJobFullInfo(audit.job_id) : Promise.resolve(null);
    return first.then(function (job) {
      if (job) return { job: job, note: '', fromAudit: fromAudit };
      return api.findJobByJoOrAcct(audit.jo_no, audit.acct_no).then(function (j2) { return j2 ? { job: j2, note: '', fromAudit: fromAudit } : none; });
    }).catch(function (e) { return { job: null, note: 'Subscriber info could not be loaded: ' + (e && e.message || e), fromAudit: fromAudit }; });
  }
  return { GROUPS: GROUPS, OPTIONAL_COLUMNS: OPTIONAL_COLUMNS, columns: columns, render: render, returnState: returnState, loadForAudit: loadForAudit, fmtDate: fmtDate, esc: esc };
});
