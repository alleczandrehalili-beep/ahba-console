// AHBA Console — FLEET (FMS) page module (Rev 2 + Rev 3). Loaded by index.html (production) and fms-demo.html (demo). Mount-only; never touches app.js globals.
// ConsoleFMS.mount(rootEl, {api, user, deps:{toast, canEdit, ensureXLSX, compressImage}, onBadge}) -> {refresh, destroy}
(function (root) {
  'use strict';
  var Core = root.FmsCore;
  var CSS = '.fm{font:13px "DM Sans",system-ui,sans-serif;color:#0e2b27}' +
    '.fm-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.fm-top button{padding:8px 14px;border-radius:10px;border:1px solid #cfe0d8;background:#fff;font-weight:700;cursor:pointer;color:#0e2b27}.fm-top button.on{background:#0e2b27;color:#fff;border-color:#0e2b27}.fm-top b.n{margin-left:6px;background:#c2503a;color:#fff;border-radius:9px;padding:1px 6px;font-size:10px}.fm-top b.n.amber{background:#9a6200}' +
    '.fm-grid{display:grid;grid-template-columns:290px 1fr;gap:14px;align-items:start}@media(max-width:900px){.fm-grid{grid-template-columns:1fr}}' +
    '.fm-list{background:#fff;border:1px solid #e3e8e2;border-radius:12px;overflow:hidden}.fm-list .hd{padding:10px;border-bottom:1px solid #e3e8e2;display:flex;gap:6px;flex-wrap:wrap}.fm-list input,.fm-list select{padding:7px 9px;border:1px solid #cfd8d3;border-radius:9px;font-size:12px;flex:1;min-width:90px}' +
    '.fm-row{padding:9px 12px;border-bottom:1px solid #eef1ed;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px}.fm-row:hover{background:#f6f9f7}.fm-row.on{background:#e7f7ef}.fm-row b{font:800 13px Manrope,system-ui}.fm-row small{display:block;color:#8a9894;font-size:10px}' +
    '.fm-main{background:#fff;border:1px solid #e3e8e2;border-radius:12px;padding:14px;min-height:400px}' +
    '.fm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}.fm-tabs button{padding:7px 12px;border-radius:9px;border:1px solid #cfe0d8;background:#fff;font-weight:700;cursor:pointer;font-size:12px}.fm-tabs button.on{background:#18a57b;color:#fff;border-color:#18a57b}' +
    '.fm-btn{padding:7px 12px;border-radius:9px;border:1px solid #cfd8d3;background:#fff;font-weight:700;cursor:pointer;font-size:12px;color:#0e2b27}.fm-btn.p{background:#18a57b;color:#fff;border-color:#18a57b}.fm-btn.d{color:#c2503a;border-color:#f0c3ba}.fm-btn.v{background:#7b2d8a;color:#fff;border-color:#7b2d8a}.fm-btn:disabled{opacity:.45;cursor:not-allowed}' +
    '.fm table{width:100%;border-collapse:collapse;font-size:12px}.fm th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#8a9894;text-align:left;padding:8px;border-bottom:1px solid #e3e8e2}.fm td{padding:8px;border-bottom:1px solid #eef1ed;vertical-align:top}.fm tr.lnk{cursor:pointer}.fm tr.lnk:hover{background:#f6f9f7}' +
    '.fm-pill{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:9px;background:#eef2ec;color:#3a4a45;white-space:nowrap}.fm-pill.overdue,.fm-pill.rejected,.fm-pill.urgent,.fm-pill.retired,.fm-pill.reported{background:#fde8e4;color:#b23a25}.fm-pill.due,.fm-pill.for_canvass,.fm-pill.for_approval,.fm-pill.in_shop{background:#fff3d6;color:#9a6200}.fm-pill.ok,.fm-pill.closed,.fm-pill.done,.fm-pill.active,.fm-pill.paid,.fm-pill.funded{background:#e7f7ef;color:#11825f}.fm-pill.approved,.fm-pill.ongoing,.fm-pill.filed{background:#e8ecff;color:#2d3fa8}.fm-pill.over{background:#7b2d8a;color:#fff}.fm-pill.k{background:#0e2b27;color:#fff}' +
    '.fm-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.fm-stat{background:#f7f9f7;border:1px solid #e3e8e2;border-radius:12px;padding:10px 14px;min-width:130px}.fm-stat span{display:block;font-size:10px;color:#8a9894;text-transform:uppercase;letter-spacing:.06em}.fm-stat strong{font:800 18px Manrope,system-ui}.fm-stat.hi{background:#0e2b27;border-color:#0e2b27}.fm-stat.hi span{color:#9fd5c0}.fm-stat.hi strong{color:#fff;font-size:22px}' +
    '.fm-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 14px;margin-bottom:12px}.fm-kv div{font-size:12px}.fm-kv span{display:block;color:#8a9894;font-size:10px;text-transform:uppercase;letter-spacing:.05em}' +
    '.fm-alert{padding:8px 10px;border-radius:9px;margin-bottom:6px;font-size:12px;display:flex;justify-content:space-between;gap:8px}.fm-alert.overdue{background:#fde8e4;color:#b23a25}.fm-alert.due{background:#fff3d6;color:#9a6200}.fm-alert.ok{background:#f2f5f2;color:#3a4a45}' +
    '.fm-modal{position:fixed;inset:0;background:rgba(8,28,24,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}.fm-modal>form{background:#fff;border-radius:14px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:18px;font:13px "DM Sans",system-ui,sans-serif;color:#0e2b27}.fm-modal h3{margin:0 0 12px;font:800 15px Manrope,system-ui}' +
    '.fm-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.fm-form label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#5a6b66;font-weight:700}.fm-form label.w{grid-column:1/-1}.fm-form input,.fm-form select,.fm-form textarea{padding:8px 9px;border:1px solid #cfd8d3;border-radius:9px;font-size:12px;font-family:inherit}.fm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}' +
    '.fm-empty{padding:30px;text-align:center;color:#8a9894}.fm-sec{font:800 11px Manrope,system-ui;letter-spacing:.06em;text-transform:uppercase;color:#107b5e;margin:14px 0 6px}.fm-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.fm-bar input,.fm-bar select{padding:7px 9px;border:1px solid #cfd8d3;border-radius:9px;font-size:12px}.fm-bar label{font-size:11px;color:#5a6b66;font-weight:700}' +
    '.fm-parts{grid-column:1/-1}.fm-parts input{width:100%;box-sizing:border-box;padding:6px;border:1px solid #cfd8d3;border-radius:7px;font-size:12px}.fm-doc{display:inline-flex;align-items:center;gap:6px;border:1px solid #e3e8e2;border-radius:9px;padding:6px 9px;margin:0 6px 6px 0;font-size:12px}.fm-doc a{color:#127b5d;font-weight:700}.fm-warn{background:#fde8e4;color:#b23a25;border-radius:9px;padding:8px 10px;font-size:12px;margin-bottom:10px}.fm-note{background:#fff8e1;border-radius:9px;padding:8px 10px;font-size:12px;margin-bottom:10px;color:#6b5300}';

  var MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(d) { if (!d) return '—'; var s = String(d); return new Date(s.length === 10 ? s + 'T00:00:00+08:00' : s).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }); }
  function pill(s, label) { return '<span class="fm-pill ' + esc(s) + '">' + esc(label || Core.STATUS_LABEL[s] || String(s || '').replace(/_/g, ' ')) + '</span>'; }
  function kindPill(k) { return '<span class="fm-pill k">' + esc(Core.KIND_LABEL[k] || k) + '</span>'; }
  function opts(list, cur, labelFn) { return list.map(function (v) { var val = typeof v === 'object' ? v.value : v, lab = typeof v === 'object' ? v.label : (labelFn ? labelFn(v) : v); return '<option value="' + esc(val) + '"' + (String(val) === String(cur == null ? '' : cur) ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join(''); }
  function field(name, label, type, value, x) {
    x = x || {}; var w = x.wide ? ' class="w"' : '', req = x.required ? ' required' : '';
    if (type === 'select') return '<label' + w + '>' + esc(label) + '<select name="' + name + '"' + req + '>' + x.options + '</select></label>';
    if (type === 'textarea') return '<label' + w + '>' + esc(label) + '<textarea name="' + name + '" rows="3"' + req + '>' + esc(value == null ? '' : value) + '</textarea></label>';
    return '<label' + w + '>' + esc(label) + '<input name="' + name + '" type="' + type + '" value="' + esc(value == null ? '' : value) + '"' + req + (x.step ? ' step="' + x.step + '"' : '') + (x.accept ? ' accept="' + x.accept + '"' : '') + '></label>';
  }
  function num(v) { return v === '' || v == null ? null : Number(v); }
  function dueText(a) { return (a.due_on ? fmtDate(a.due_on) + ' (' + (a.due_in_days < 0 ? Math.abs(a.due_in_days) + 'd overdue' : 'in ' + a.due_in_days + 'd') + ')' : '') + (a.due_in_km != null ? ' ' + (a.due_in_km < 0 ? Math.abs(a.due_in_km) + ' km overdue' : a.due_in_km + ' km left') : ''); }
  var peso = Core.peso;

  function mount(rootEl, o) {
    var api = o.api, user = o.user || {}, deps = o.deps || {}, canEdit = deps.canEdit !== false;
    var toast = deps.toast || function (m) { console.log('[fm]', m); };
    var S = { role: 'viewer', title: null, view: 'alerts', viewTouched: false, vehicles: [], alerts: [], counts: null, settings: null, sel: null, det: null, tab: 'overview', report: null, mon: { group: 'open', kind: '', priority: '', from: '', to: '' }, sel_ids: {} };
    if (!document.getElementById('fmCss')) { var st = document.createElement('style'); st.id = 'fmCss'; st.textContent = CSS; document.head.appendChild(st); }
    rootEl.innerHTML = '<div class="fm"><div class="fm-top" id="fmTop"></div><div class="fm-grid"><div class="fm-list"><div class="hd"><input id="fmQ" placeholder="Search plate / SVC code / model / team"><select id="fmStatus"><option value="">All status</option><option value="active">Active</option><option value="in_shop">In shop</option><option value="retired">Retired</option></select><button class="fm-btn p" id="fmAdd">+ Vehicle</button></div><div id="fmRows"></div></div><div class="fm-main" id="fmMain"></div></div></div>';
    var $ = function (s) { return rootEl.querySelector(s); };
    function isAdmin() { return canEdit && Core.isAdminRole(S.role); }
    function canApprove() { return canEdit && Core.canApprove(S.title); }
    function canReject() { return canEdit && Core.canReject(S.role, S.title); }
    function can(table) { return canEdit && Core.canWrite(S.role, table); }
    function fail(e) { toast((e && e.message) || String(e)); if (root.console) console.error(e); }
    var TABS = {}, VIEWS = {};

    function loadFleet() { return Promise.all([api.listVehicles(), api.alertCounts(), api.listAlerts(), api.getSettings()]).then(function (r) { S.vehicles = r[0]; S.counts = r[1]; S.alerts = r[2]; S.settings = r[3]; }); }
    function load() { return Promise.all([api.myRole(), api.myTitle()]).then(function (r) { S.role = r[0]; S.title = r[1]; if (!S.viewTouched && Core.canApprove(S.title) && !Core.isAdminRole(S.role)) S.view = 'requests'; return loadFleet(); }).then(render).catch(fail); }
    function openVehicle(id, tab) { S.sel = id; S.det = null; if (tab) S.tab = tab; renderMain(); return api.getVehicle(id).then(function (d) { S.det = d; render(); }).catch(fail); }
    function refreshVehicle() { return loadFleet().then(function () { return S.sel ? api.getVehicle(S.sel).then(function (d) { S.det = d; }) : null; }).then(render).catch(fail); }
    function refreshAll() { return loadFleet().then(render).catch(fail); }
    function badge() { if (o.onBadge && S.counts) o.onBadge((S.counts.overdue || 0) + (S.counts.due_soon || 0) + (S.counts.for_approval || 0)); }

    function render() { renderTop(); renderList(); renderMain(); badge(); }
    function renderTop() {
      var c = S.counts || {};
      $('#fmTop').innerHTML = [['alerts', 'Alerts', (c.overdue || 0) + (c.due_soon || 0), ''], ['requests', 'Requests', c.for_approval || 0, 'amber'], ['reports', 'Reports', 0, ''], ['summary', 'Executive summary', 0, ''], ['settings', 'Settings', 0, '']]
        .filter(function (v) { return v[0] !== 'settings' || isAdmin(); })
        .map(function (v) { return '<button data-view="' + v[0] + '" class="' + (!S.sel && S.view === v[0] ? 'on' : '') + '">' + v[1] + (v[2] ? '<b class="n ' + v[3] + '">' + v[2] + '</b>' : '') + '</button>'; }).join('') +
        '<span style="margin-left:auto;font-size:11px;color:#8a9894">' + esc(user.display_name || user.username || '') + ' · ' + esc(S.title || S.role) + (S.role === 'superadmin' ? ' · superadmin' : '') + (canEdit ? '' : ' · 👁 view only') + '</span>';
      rootEl.querySelectorAll('#fmTop button').forEach(function (b) { b.onclick = function () { S.viewTouched = true; S.view = b.dataset.view; S.sel = null; S.det = null; render(); }; });
    }
    function renderList() {
      var q = ($('#fmQ').value || '').toLowerCase(), sf = $('#fmStatus').value;
      var rows = S.vehicles.filter(function (v) { return (!sf || v.status === sf) && (!q || (v.plate + ' ' + (v.svc_code || '') + ' ' + v.make + ' ' + v.model + ' ' + (v.assigned_team || '')).toLowerCase().indexOf(q) >= 0); });
      var byV = {}; S.alerts.forEach(function (a) { if (a.state !== 'ok') { byV[a.vehicle_id] = byV[a.vehicle_id] || { overdue: 0, due: 0 }; byV[a.vehicle_id][a.state]++; } });
      $('#fmRows').innerHTML = rows.length ? rows.map(function (v) { var b = byV[v.id] || {};
        return '<div class="fm-row ' + (S.sel === v.id ? 'on' : '') + '" data-id="' + v.id + '"><div><b>' + esc(v.plate) + (v.svc_code ? ' <span class="fm-pill">' + esc(v.svc_code) + '</span>' : '') + '</b><small>' + esc(v.make + ' ' + v.model) + ' · ' + esc(v.assigned_team || 'unassigned') + '</small></div><div style="white-space:nowrap">' +
          (b.overdue ? '<span title="overdue">🔴' + b.overdue + '</span> ' : '') + (b.due ? '<span title="due soon">🟡' + b.due + '</span> ' : '') + (v.open_requests ? '<span title="open requests">🔧' + v.open_requests + '</span> ' : '') + (v.equipment_missing ? '<span title="equipment missing">🧰' + v.equipment_missing + '</span> ' : '') + (v.status !== 'active' ? pill(v.status) : '') + '</div></div>'; }).join('') : '<div class="fm-empty">No vehicles</div>';
      rootEl.querySelectorAll('.fm-row').forEach(function (r) { r.onclick = function () { openVehicle(r.dataset.id); }; });
      $('#fmAdd').style.display = can('vehicles') ? '' : 'none';
    }
    $('#fmQ').oninput = renderList; $('#fmStatus').onchange = renderList;
    $('#fmAdd').onclick = function () { vehicleForm(null); };

    function renderMain() {
      var m = $('#fmMain');
      if (S.sel) { if (!S.det) { m.innerHTML = '<div class="fm-empty">Loading…</div>'; return; } renderVehicle(m); return; }
      var v = VIEWS[S.view]; if (v) v(m); else m.innerHTML = '<div class="fm-empty">Select a vehicle</div>';
    }
    function renderVehicle(m) {
      var d = S.det, v = d.vehicle, tabs = [['overview', 'Overview'], ['requests', 'Requests'], ['repairs', 'Repairs / PMS'], ['registration', 'Registration'], ['insurance', 'Insurance'], ['incidents', 'Incidents'], ['checks', 'Daily checks'], ['equipment', 'Equipment'], ['expenses', 'Expenses'], ['documents', 'Documents']];
      m.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><div><span style="font:800 20px Manrope,system-ui">' + esc(v.plate) + '</span> ' + (v.svc_code ? '<span class="fm-pill k">' + esc(v.svc_code) + '</span> ' : '') + pill(v.status) +
        '<div style="color:#8a9894;font-size:12px">' + esc([v.make, v.model, v.year].filter(Boolean).join(' ')) + ' · ' + esc(v.assigned_team || 'unassigned') + ' · Odometer ' + (d.odometer ? esc(d.odometer.km) + ' km <small>(' + esc(d.odometer.source || 'gate log') + ' ' + fmtDate(d.odometer.at) + ')</small>' : '— no reading in 30 days') + '</div></div><button class="fm-btn" id="fmBack">← Fleet</button></div>' +
        '<div class="fm-tabs">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="fmTab"></div>';
      $('#fmBack').onclick = function () { S.sel = null; S.det = null; render(); };
      rootEl.querySelectorAll('.fm-tabs button').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; renderVehicle(m); }; });
      var t = TABS[S.tab]; if (t) t($('#fmTab'), d); else $('#fmTab').innerHTML = '<div class="fm-empty">' + esc(S.tab) + '</div>';
    }

    // ---- generic modal form ----
    function modal(title, html, onSubmit, submitLabel) {
      var wrap = document.createElement('div'); wrap.className = 'fm-modal';
      wrap.innerHTML = '<form><h3>' + esc(title) + '</h3><div class="fm-form">' + html + '</div><div class="fm-actions"><button type="button" class="fm-btn" data-x>Cancel</button><button type="submit" class="fm-btn p">' + esc(submitLabel || 'Save') + '</button></div></form>';
      document.body.appendChild(wrap);
      var close = function () { wrap.remove(); };
      wrap.querySelector('[data-x]').onclick = close; wrap.onclick = function (e) { if (e.target === wrap) close(); };
      var form = wrap.querySelector('form');
      form.onsubmit = function (e) {
        e.preventDefault(); var vals = {}; new FormData(form).forEach(function (v, k) { vals[k] = v; });
        var btn = form.querySelector('[type=submit]'); btn.disabled = true;
        Promise.resolve(onSubmit(vals, form)).then(function (keep) { if (!keep) close(); else btn.disabled = false; }).catch(function (err) { fail(err); btn.disabled = false; });
      };
      wrap.close = close; return wrap;
    }
    function delBtn(table, id, label) { return '<button class="fm-btn d" data-del="' + table + ':' + id + '">' + (label || 'Delete') + '</button>'; }
    function bindDel(el) { el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var p = b.dataset.del.split(':'); if (confirm('Delete this record? It is hidden, not erased (soft delete).')) api.softDelete(p[0], p[1]).then(refreshVehicle).catch(fail); }; }); }
    function bindOpen(m, tab) { m.querySelectorAll('[data-open]').forEach(function (r) { r.onclick = function (e) { e.stopPropagation(); openVehicle(r.dataset.open, tab); }; }); }
    function exportXlsx(name, sheets) {
      var ensure = deps.ensureXLSX ? deps.ensureXLSX() : (root.XLSX ? Promise.resolve() : Promise.reject(new Error('Excel library not available')));
      return Promise.resolve(ensure).then(function () { var X = root.XLSX, wb = X.utils.book_new(); sheets.forEach(function (s) { X.utils.book_append_sheet(wb, X.utils.json_to_sheet(s.rows), s.name); }); X.writeFile(wb, name + '.xlsx'); }).catch(fail);
    }
    function printWindow(title, bodyHtml, landscape) {
      var w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to print'); return; }
      w.document.write('<!doctype html><title>' + esc(title) + '</title><style>body{font:12px Arial,sans-serif;margin:24px;color:#000}h1{font-size:18px;margin:0}h3{margin:14px 0 4px;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:6px}td,th{border:1px solid #000;padding:5px;text-align:left;font-size:11px;vertical-align:top}.kv td{border:0;padding:3px 0}.sig{margin-top:40px;display:flex;justify-content:space-between}.sig div{width:45%;border-top:1px solid #000;padding-top:4px;text-align:center}.big{font-size:14px;font-weight:bold}.fm-pill{font-weight:bold}@page{size:A4 ' + (landscape ? 'landscape' : 'portrait') + '}@media print{button{display:none}}</style>' + bodyHtml + '<p style="margin-top:16px"><button onclick="print()">Print</button></p>');
      w.document.close(); w.focus();
    }

    // ---- vehicle master ----
    function vehicleForm(v) {
      v = v || {};
      modal(v.id ? 'Edit vehicle' : 'Add vehicle',
        field('plate', 'Plate no.', 'text', v.plate, { required: true }) + field('svc_code', 'SVC code (fleet id)', 'text', v.svc_code) + field('make', 'Make', 'text', v.make, { required: true }) + field('model', 'Model', 'text', v.model, { required: true }) + field('year', 'Year', 'number', v.year) + field('color', 'Color', 'text', v.color) +
        field('vehicle_type', 'Vehicle type', 'text', v.vehicle_type) + field('fuel', 'Fuel', 'select', null, { options: opts(['', 'GAS', 'DIESEL'], v.fuel || '', function (k) { return k || '—'; }) }) +
        field('engine_no', 'Engine no.', 'text', v.engine_no) + field('chassis_no', 'Chassis no.', 'text', v.chassis_no) + field('mv_file_no', 'MV file no.', 'text', v.mv_file_no) + field('acquired_date', 'Acquired', 'date', v.acquired_date) +
        field('assigned_team', 'Assigned team (FieldOps code)', 'text', v.assigned_team) + field('status', 'Status', 'select', null, { options: opts(Core.VEHICLE_STATUS, v.status || 'active') }) + field('notes', 'Notes', 'textarea', v.notes, { wide: true }),
        function (f) {
          return api.saveVehicle({ id: v.id, plate: f.plate, svc_code: f.svc_code.trim().toUpperCase() || null, make: f.make, model: f.model, year: num(f.year), color: f.color, vehicle_type: f.vehicle_type || null, fuel: f.fuel || null, engine_no: f.engine_no, chassis_no: f.chassis_no, mv_file_no: f.mv_file_no, acquired_date: f.acquired_date || null,
            assigned_team: f.assigned_team.trim() ? f.assigned_team.trim().toUpperCase() : null, status: f.status, notes: f.notes })
            .then(function (saved) { toast('Vehicle saved'); return loadFleet().then(function () { return openVehicle(saved.id); }); });
        });
    }
    TABS.overview = function (el, d) {
      var v = d.vehicle, mine = S.alerts.filter(function (a) { return a.vehicle_id === v.id; }), open = d.requests.filter(function (q) { return Core.OPEN_STATUS.indexOf(q.status) >= 0; });
      el.innerHTML = '<div class="fm-kv">' + [['SVC code', v.svc_code], ['Make / model', [v.make, v.model, v.year].filter(Boolean).join(' ')], ['Type / fuel', [v.vehicle_type, v.fuel].filter(Boolean).join(' · ')], ['Color', v.color], ['Engine no.', v.engine_no], ['Chassis no.', v.chassis_no], ['MV file no.', v.mv_file_no], ['Acquired', fmtDate(v.acquired_date)], ['Assigned team', v.assigned_team], ['Registration due', fmtDate(d.registration_due)], ['Open requests', open.length ? open.length + ' (oldest ' + Math.max.apply(null, open.map(function (q) { return q.aging || 0; })) + 'd)' : '0'], ['Notes', v.notes]]
          .map(function (kv) { return '<div><span>' + kv[0] + '</span>' + esc(kv[1] || '—') + '</div>'; }).join('') + '</div>' +
        (can('vehicles') ? '<button class="fm-btn" id="fmEditV">Edit vehicle</button> ' : '') + (isAdmin() && v.status !== 'retired' ? '<button class="fm-btn d" id="fmRetire">Retire vehicle</button>' : '') +
        '<div class="fm-sec">Alerts</div>' + (mine.length ? mine.map(function (a) { return '<div class="fm-alert ' + a.state + '"><span>' + esc(a.label) + '</span><span>' + dueText(a) + '</span></div>'; }).join('') : '<div class="fm-alert ok">No alerts</div>') +
        '<div class="fm-sec">PMS status (every 5,000 km or 6 months · notice at 1,000 km / 30 days)</div><table><thead><tr><th>Item</th><th>Last done</th><th>Current km</th><th>Due in</th><th>State</th></tr></thead><tbody>' +
        d.pms.map(function (p) { return '<tr><td>' + esc(p.label) + '</td><td>' + (p.last_done_on ? fmtDate(p.last_done_on) + (p.last_done_km != null ? ' @ ' + p.last_done_km + ' km' : '') : '<i>never logged</i>') + '</td><td>' + (p.current_km != null ? p.current_km + ' km' : '—') + '</td><td>' + (p.due_in_km != null ? p.due_in_km + ' km' : '') + (p.due_in_km != null && p.due_in_days != null ? ' / ' : '') + (p.due_in_days != null ? p.due_in_days + ' d' : '') + (p.due_in_km == null && p.due_in_days == null ? '—' : '') + '</td><td>' + pill(p.state) + '</td></tr>'; }).join('') + '</tbody></table>';
      var e = el.querySelector('#fmEditV'); if (e) e.onclick = function () { vehicleForm(v); };
      var r = el.querySelector('#fmRetire'); if (r) r.onclick = function () { if (confirm('Retire ' + v.plate + '? It stays in the records but drops out of alerts.')) api.saveVehicle(Object.assign({}, v, { status: 'retired' })).then(refreshVehicle).catch(fail); };
    };

    // ---- registration / insurance ----
    function registrationForm(v, r, requestId) {
      r = r || {}; var month = Core.renewalMonthFromPlate(v.plate);
      modal(requestId ? 'Encode renewal (closes the registration request)' : (r.id ? 'Edit renewal' : 'Add renewal'),
        field('last_renewed_on', 'Renewed on (OR date)', 'date', r.last_renewed_on || (requestId ? Core.today() : ''), { required: true }) + field('renewal_month', 'Renewal month (suggested from plate)', 'select', null, { options: opts(MONTHS.map(function (m, i) { return { value: i, label: m }; }).slice(1), r.renewal_month || month) }) +
        field('or_cr_expiry', 'Next registration / OR-CR expiry', 'date', r.or_cr_expiry, { required: !!requestId }) + field('amount', 'Amount paid', 'number', r.amount, { step: '0.01' }) + field('notes', 'Notes', 'textarea', r.notes, { wide: true }),
        function (f) { return api.saveRegistration({ id: r.id, vehicle_id: v.id, request_id: requestId || r.request_id || null, last_renewed_on: f.last_renewed_on, renewal_month: num(f.renewal_month), or_cr_expiry: f.or_cr_expiry || null, amount: num(f.amount) || 0, notes: f.notes }).then(function () { toast(requestId ? 'Renewal encoded — registration request closed' : 'Registration saved'); return refreshVehicle(); }); });
    }
    TABS.registration = function (el, d) {
      var v = d.vehicle, month = Core.renewalMonthFromPlate(v.plate);
      el.innerHTML = '<div class="fm-bar"><span>Renewal month from plate: <b>' + (month ? MONTHS[month] : '—') + '</b> · Next due: <b>' + fmtDate(d.registration_due) + '</b> · notice 60 days before</span>' + (can('registrations') ? '<button class="fm-btn p" id="fmAddReg">+ Add renewal</button>' : '') + '</div>' +
        '<table><thead><tr><th>Renewed on</th><th>Month</th><th>Next / OR-CR expiry</th><th>Amount</th><th>Request</th><th>Notes</th><th></th></tr></thead><tbody>' +
        (d.registrations.length ? d.registrations.map(function (r) { var q = r.request_id ? d.requests.filter(function (x) { return x.id === r.request_id; })[0] : null; return '<tr><td>' + fmtDate(r.last_renewed_on) + '</td><td>' + MONTHS[r.renewal_month] + '</td><td>' + fmtDate(r.or_cr_expiry) + '</td><td>' + peso(r.amount) + '</td><td>' + (q ? pill(q.status) : '—') + '</td><td>' + esc(r.notes || '') + '</td><td>' + (can('registrations') ? '<button class="fm-btn" data-edit="' + r.id + '">Edit</button> ' + delBtn('registrations', r.id) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="fm-empty">No renewals recorded — encode the last OR date so the reminders start</td></tr>') + '</tbody></table>';
      var a = el.querySelector('#fmAddReg'); if (a) a.onclick = function () { registrationForm(v, null, null); };
      el.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { registrationForm(v, d.registrations.filter(function (r) { return r.id === b.dataset.edit; })[0], null); }; });
      bindDel(el);
    };
    TABS.insurance = function (el, d) {
      var v = d.vehicle;
      el.innerHTML = '<div class="fm-bar">' + (can('insurance') ? '<button class="fm-btn p" id="fmAddIns">+ Add policy</button>' : '') + '<span style="color:#8a9894;font-size:11px">CTPL and comprehensive — to follow per owner; blank until encoded.</span></div>' +
        '<table><thead><tr><th>Kind</th><th>Provider</th><th>Policy no.</th><th>Starts</th><th>Expires</th><th>Premium</th><th>State</th><th></th></tr></thead><tbody>' +
        (d.insurance.length ? d.insurance.map(function (i) { var s = Core.dateState(i.expires_on); return '<tr><td>' + esc(i.kind.toUpperCase()) + '</td><td>' + esc(i.provider || '') + '</td><td>' + esc(i.policy_no || '') + '</td><td>' + fmtDate(i.starts_on) + '</td><td>' + fmtDate(i.expires_on) + '</td><td>' + peso(i.premium) + '</td><td>' + pill(s.state, s.state === 'overdue' ? 'expired' : s.state === 'due' ? 'expiring' : 'valid') + '</td><td>' + (can('insurance') ? '<button class="fm-btn" data-edit="' + i.id + '">Edit</button> ' + delBtn('insurance', i.id) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="fm-empty">No policies on file</td></tr>') + '</tbody></table>';
      function form(i) { i = i || {}; modal(i.id ? 'Edit policy' : 'Add policy',
        field('kind', 'Kind', 'select', null, { options: opts(Core.INS_KINDS, i.kind || 'ctpl', function (k) { return k.toUpperCase(); }) }) + field('provider', 'Provider', 'text', i.provider) + field('policy_no', 'Policy no.', 'text', i.policy_no) +
        field('starts_on', 'Starts', 'date', i.starts_on) + field('expires_on', 'Expires', 'date', i.expires_on, { required: true }) + field('premium', 'Premium', 'number', i.premium, { step: '0.01' }),
        function (f) { return api.saveInsurance({ id: i.id, vehicle_id: v.id, kind: f.kind, provider: f.provider, policy_no: f.policy_no, starts_on: f.starts_on || null, expires_on: f.expires_on, premium: num(f.premium) || 0 }).then(function () { toast('Policy saved'); return refreshVehicle(); }); }); }
      var a = el.querySelector('#fmAddIns'); if (a) a.onclick = function () { form(null); };
      el.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { form(d.insurance.filter(function (i) { return i.id === b.dataset.edit; })[0]); }; });
      bindDel(el);
    };

    // ---- requests: actions by status × role/title (Rev 3) ----
    function requestForm(vehicleId, incident) {
      modal('New repair request', field('description', 'What needs repair?', 'textarea', incident ? 'Incident ' + fmtDate(incident.happened_on) + ': ' + incident.description : '', { wide: true, required: true }) +
        field('priority', 'Priority', 'select', null, { options: opts(Core.PRIORITIES, 'normal') }),
        function (f) { return api.createRequest({ vehicle_id: vehicleId, kind: 'repair', description: f.description, priority: f.priority, incident_id: incident ? incident.id : null }).then(function () { toast('Request recorded — start canvassing when ready'); return refreshVehicle(); }); }, 'Submit');
    }
    function signed(q) { return (q.approvals || []).some(function (a) { return a.username === user.username; }); }
    function requestActions(q) {
      var b = [];
      if (q.status === 'reported' && isAdmin()) b.push(['canvass', 'Start canvass', 'p']);
      if (q.status === 'for_canvass' && isAdmin()) b.push(['estimate', 'Enter estimate', 'p']);
      if (q.status === 'for_approval') { if (canApprove()) b.push(signed(q) ? ['signed', '✓ You signed', ''] : ['approve', 'Approve (sign)', 'p']); else if (isAdmin()) b.push(['waiting', 'Waiting for approvers', '']); }
      if ((q.status === 'reported' || q.status === 'for_approval') && canReject()) b.push(['reject', 'Reject', 'd']);
      if (q.status === 'approved' && isAdmin()) b.push(['fund', 'Mark funded', 'p']);
      if (q.status === 'funded' && isAdmin()) { if (q.kind === 'registration') b.push(['renew', 'Encode renewal', 'p']); else b.push(['print', 'Print JO', ''], ['start', 'JO given → Ongoing', 'p']); }
      if (q.status === 'ongoing' && isAdmin()) b.push(['print', 'Print JO', ''], ['done', 'Mark done', 'p']);
      if (q.status === 'done' && isAdmin()) b.push(['close', 'Close', 'p']);
      if (q.status === 'closed' && q.jo_no && isAdmin()) b.push(['print', 'Print JO', '']);
      if (isAdmin() && Core.OVERRIDES[q.status]) b.push(['override', 'Override…', 'v']);
      b.push(['log', 'History', '']);
      return b.map(function (x) { return (x[0] === 'signed' || x[0] === 'waiting') ? '<span class="fm-pill ' + (x[0] === 'signed' ? 'ok' : 'for_approval') + '">' + x[1] + '</span>' : '<button class="fm-btn ' + x[2] + '" data-act="' + x[0] + '" data-id="' + q.id + '" data-vid="' + q.vehicle_id + '" data-status="' + q.status + '">' + x[1] + '</button>'; }).join(' ');
    }
    function bindRequestActions(el, after) {
      el.querySelectorAll('[data-act]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var id = b.dataset.id, act = b.dataset.act, done = function (msg) { return function () { toast(msg); return after(); }; };
          if (act === 'priority') modal('Change urgency', field('priority', 'Urgency', 'select', null, { options: opts(Core.PRIORITIES, b.dataset.prio) }) + field('reason', 'Reason (goes to History)', 'text', '', { wide: true }), function (f) { return api.setPriority(id, { priority: f.priority, reason: f.reason }).then(done('Urgency set to ' + f.priority)); }, 'Save');
          if (act === 'canvass') api.startCanvass(id).then(done('Canvassing — enter the estimate when ready')).catch(fail);
          if (act === 'estimate') modal('Canvassed estimate', field('est_cost', 'Estimate (₱)', 'number', '', { step: '0.01', required: true }) + field('canvass_notes', 'Canvass notes (shops / quotes)', 'textarea', '', { wide: true }), function (f) { return api.submitEstimate(id, { est_cost: num(f.est_cost), canvass_notes: f.canvass_notes }).then(done('Sent for approval — needs CEO/President + COO or Procurement')); }, 'Send for approval');
          if (act === 'approve') api.recordApproval([id]).then(function (r) { toast(r.approved ? 'Approved — both signatures complete, now for funding' : 'Your signature recorded — waiting for the second approver'); return after(); }).catch(fail);
          if (act === 'reject') modal('Reject request', field('reason', 'Reason (required)', 'textarea', '', { wide: true, required: true }), function (f) { return api.rejectRequest(id, { reason: f.reason }).then(done('Request rejected')); }, 'Reject');
          if (act === 'fund') modal('Mark funded (cash released to admin)', field('funded_on', 'Release date', 'date', Core.today(), { required: true }) + field('funded_amount', 'Amount released (₱)', 'number', b.dataset.est || '', { step: '0.01', required: true }), function (f) { return api.markFunded(id, { funded_on: f.funded_on, funded_amount: num(f.funded_amount) }).then(done('Funded — ' + (b.dataset.kind === 'registration' ? 'encode the renewal when done' : 'print the JO for the mechanic'))); }, 'Funded');
          if (act === 'start') modal('JO handed to the mechanic', field('odometer_km', 'Odometer now (km, optional)', 'number', ''), function (f) { return api.startWork(id, { odometer_km: num(f.odometer_km) }).then(done('Ongoing — encode the work in Repairs / PMS')); }, 'Ongoing');
          if (act === 'done') modal('Mark done', field('finished_on', 'Finished on', 'date', Core.today(), { required: true }), function (f) { return api.markDone(id, { finished_on: f.finished_on }).then(done('Done — upload the receipt + signed JO, then Close')); }, 'Done');
          if (act === 'close') closeModal(id, b.dataset.vid, after);
          if (act === 'renew') api.getVehicle(b.dataset.vid).then(function (d) { registrationForm(d.vehicle, null, id); }).catch(fail);
          if (act === 'override') modal('Override status', field('to', 'Move to', 'select', null, { options: opts(Core.OVERRIDES[b.dataset.status] || [], (Core.OVERRIDES[b.dataset.status] || [])[0], function (s) { return Core.STATUS_LABEL[s]; }) }) + field('reason', 'Reason (required, e.g. backjob / cash not released)', 'textarea', '', { wide: true, required: true }), function (f) { return api.overrideRequest(id, { to: f.to, reason: f.reason }).then(done('Status overridden — logged in History')); }, 'Override');
          if (act === 'print') api.joPrintData(id).then(printJo).catch(fail);
          if (act === 'log') Promise.all([api.requestLog(id), api.listApprovals(id)]).then(function (r) { modal('Request history', '<div style="grid-column:1/-1">' + (r[1].length ? '<div class="fm-sec">Approvals</div>' + r[1].map(function (a) { return esc(a.username) + ' — ' + esc(a.role_title) + ' · ' + fmtDate(a.at); }).join('<br>') : '') + '<div class="fm-sec">Status history</div><table><thead><tr><th>When</th><th>From</th><th>To</th><th>By</th><th>Reason</th></tr></thead><tbody>' + r[0].map(function (l) { return '<tr><td>' + fmtDate(l.at) + '</td><td>' + (l.from_status ? pill(l.from_status) : '—') + '</td><td>' + pill(l.to_status) + '</td><td>' + esc(l.by_user || '') + '</td><td>' + esc(l.reason || '') + '</td></tr>'; }).join('') + '</tbody></table></div>', function () { return Promise.resolve(); }, 'OK'); }).catch(fail);
        };
      });
    }
    function requestRow(q, withPlate, withCheck) {
      var age = q.aging != null ? '<span class="fm-pill ' + (q.aging >= 7 ? 'overdue' : q.aging >= 3 ? 'due' : '') + '" title="days since reported">' + q.aging + 'd</span>' : '';
      var appr = q.status === 'for_approval' ? '<br><small>' + Core.approvalProgress(q.approvals) + (q.approvals && q.approvals.length ? ' · ' + q.approvals.map(function (a) { return esc(a.role_title); }).join(', ') : '') + '</small>' : '';
      return '<tr>' + (withCheck ? '<td>' + (q.status === 'for_approval' && canApprove() && !signed(q) ? '<input type="checkbox" data-sel="' + q.id + '"' + (S.sel_ids[q.id] ? ' checked' : '') + '>' : '') + '</td>' : '') +
        '<td>' + (withPlate ? '<b data-open="' + q.vehicle_id + '" style="cursor:pointer;color:#127b5d">' + esc(q.plate) + '</b>' + (q.svc_code ? ' <small>' + esc(q.svc_code) + '</small>' : '') + '<br>' : '') + kindPill(q.kind) + ' ' + fmtDate(q.requested_on) + ' ' + age + '<br><small style="color:#8a9894">' + esc(q.requested_by || '') + ' · ' + esc(q.source || 'admin') + '</small></td>' +
        '<td>' + esc(q.description) + (q.incident_id ? ' <span class="fm-pill">incident</span>' : '') + (q.canvass_notes ? '<br><small>' + esc(q.canvass_notes) + '</small>' : '') + (q.rejected_reason ? '<br><small style="color:#b23a25">' + esc(q.rejected_reason) + '</small>' : '') + (q.override_reason ? '<br><small style="color:#7b2d8a">override: ' + esc(q.override_reason) + '</small>' : '') + '</td>' +
        '<td>' + pill(q.priority) + (isAdmin() && Core.OPEN_STATUS.indexOf(q.status) >= 0 ? '<br><button class="fm-btn" style="padding:3px 8px;font-size:10px;margin-top:4px" data-act="priority" data-id="' + q.id + '" data-vid="' + q.vehicle_id + '" data-prio="' + q.priority + '">change</button>' : '') + '</td>' +
        '<td>' + (q.aging != null ? '<b style="font-size:14px;color:' + (q.aging >= 7 ? '#b23a25' : q.aging >= 3 ? '#9a6200' : '#11825f') + '">' + q.aging + ' d</b><br><small style="color:#8a9894">since ' + fmtDate(q.requested_on) + '</small>' : '<small style="color:#8a9894">' + (q.status === 'closed' ? 'closed ' + fmtDate(q.closed_at) : 'rejected') + '</small>') + '</td>' +
        '<td>' + (q.est_cost != null ? peso(q.est_cost) : '—') + (q.funded_amount != null ? '<br><small>funded ' + peso(q.funded_amount) + ' ' + fmtDate(q.funded_on) + '</small>' : '') + (q.over_estimate ? '<br><span class="fm-pill over">over estimate</span>' : '') + '</td>' +
        '<td>' + pill(q.status) + appr + (q.jo_no ? '<br><small>' + esc(q.jo_no) + '</small>' : '') + (q.approved_by && q.status !== 'for_approval' ? '<br><small style="color:#8a9894">' + esc(q.approved_by) + '</small>' : '') + '</td><td style="white-space:nowrap">' + requestActions(q).replace(/data-act="fund"/g, 'data-act="fund" data-est="' + (q.est_cost == null ? '' : q.est_cost) + '" data-kind="' + q.kind + '"') + '</td></tr>';
    }
    TABS.requests = function (el, d) {
      el.innerHTML = '<div class="fm-bar">' + (isAdmin() ? '<button class="fm-btn p" id="fmNewReq">+ New repair request</button>' : '') + '<span style="color:#8a9894;font-size:11px">Reported → For canvass → For approval (2 signatures) → For funding → Funded → Ongoing (JO) → Done → Closed · PMS and registration requests are raised automatically</span></div>' +
        '<table><thead><tr><th>Kind / requested</th><th>Description</th><th>Urgency</th><th>Aging</th><th>Estimate</th><th>Status</th><th></th></tr></thead><tbody>' + (d.requests.length ? d.requests.map(function (q) { return requestRow(q, false, false); }).join('') : '<tr><td colspan="7" class="fm-empty">No requests</td></tr>') + '</tbody></table>';
      var n = el.querySelector('#fmNewReq'); if (n) n.onclick = function () { requestForm(d.vehicle.id, null); };
      bindRequestActions(el, refreshVehicle);
    };
    function closeModal(id, vid, after) {
      api.getVehicle(vid).then(function (d) {
        var q = d.requests.filter(function (x) { return x.id === id; })[0]; var rep = d.repairs.filter(function (r) { return r.request_id === id; })[0] || null;
        var blockers = Core.closeBlockers(q, rep, d.documents), docs = d.documents.filter(function (x) { return x.request_id === id; });
        var w = modal('Close ' + (q.jo_no || 'request') + ' — confirm actual cost',
          '<div style="grid-column:1/-1;font-size:12px"><b>' + esc(rep ? rep.work_done : q.description) + '</b><br>Estimate ' + (q.est_cost != null ? peso(q.est_cost) : '—') + ' · Funded ' + (q.funded_amount != null ? peso(q.funded_amount) : '—') + ' · Actual so far ' + (rep ? peso(rep.total_cost) : '—') + (rep && Core.overEstimate(q.est_cost, rep.total_cost) ? ' <span class="fm-pill over">over estimate</span>' : '') +
          (rep && rep.parts && rep.parts.length ? '<br>Parts: ' + rep.parts.map(function (p) { return esc(p.part_name) + ' ×' + p.qty; }).join(', ') : '') +
          '<br>Documents on this request: ' + (docs.length ? docs.map(function (x) { return pill('ok', x.kind.replace('_', ' ')) + ' ' + esc(x.label); }).join(', ') : '<i>none yet</i>') +
          (blockers.filter(function (x) { return x !== 'odometer at repair not entered'; }).length ? '<div class="fm-alert overdue" style="margin-top:8px">Cannot close yet: ' + esc(blockers.filter(function (x) { return x !== 'odometer at repair not entered'; }).join('; ')) + '</div>' : '<div class="fm-alert ok" style="margin-top:8px">Documents complete — enter the odometer from the signed JO and close</div>') + '</div>' +
          field('odometer_km', 'Odometer at repair (km) — from the signed JO', 'number', rep && rep.odometer_km != null ? rep.odometer_km : '', { required: true }) + field('labor_cost', 'Labor cost (₱) — actual', 'number', rep ? rep.labor_cost : 0, { step: '0.01' }) +
          '<div style="grid-column:1/-1;border-top:1px dashed #e3e8e2;padding-top:8px"><div class="fm-bar" id="fmCloseUp"><select id="fmCuKind"><option value="receipt">Receipt</option><option value="signed_jo">Signed JO</option></select><input id="fmCuFile" type="file" accept="image/*,application/pdf"><button type="button" class="fm-btn" id="fmCuBtn">Upload to this request</button></div></div>',
          function (f) { return api.closeRequest(id, { odometer_km: num(f.odometer_km), labor_cost: num(f.labor_cost) }).then(function () { toast('Closed — ' + (rep ? peso(Number(f.labor_cost || 0) + Number(rep.parts_cost || 0)) : '') + ' recorded as a vehicle expense'); return after(); }); }, 'Close request');
        w.querySelector('#fmCuBtn').onclick = function () { var file = w.querySelector('#fmCuFile').files[0]; if (!file) { toast('Choose a file'); return; } var kind = w.querySelector('#fmCuKind').value;
          var prep = (deps.compressImage && /^image\//.test(file.type)) ? Promise.resolve(deps.compressImage(file, 1600, 300)) : Promise.resolve(file);
          prep.then(function (blob) { if (blob && !blob.name) { try { blob = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }); } catch (_) { blob = file; } } return api.uploadDocument(vid, kind, blob, (kind === 'receipt' ? 'Receipt ' : 'Signed JO ') + (q.jo_no || ''), id); })
            .then(function () { toast('Uploaded'); w.close(); closeModal(id, vid, after); }).catch(fail); };
      }).catch(fail);
    }
    function printJo(p) {
      // Mechanic copy: what to do and which parts — no estimate, no funded amount, no unit costs (owner rule 2026-09-18).
      var q = p.request, v = p.vehicle, r = p.repair;
      var rows = function (n) { var s = ''; for (var i = 0; i < n; i++) s += '<tr><td>&nbsp;</td><td></td><td></td></tr>'; return s; };
      var pmsRule = q.kind === 'pms' ? ((S.settings && S.settings.pms_rules) || []).filter(function (x) { return x.active !== false; })[0] : null;
      var work = '<div style="border:1px solid #000;padding:8px;min-height:60px">' + (pmsRule ? '<b>' + esc(pmsRule.label) + '</b> — every ' + esc(pmsRule.every_km) + ' km / ' + esc(pmsRule.every_months) + ' months<br>' : '') + esc(q.description) + '</div>';
      var parts = r && r.parts && r.parts.length ? r.parts.map(function (x) { return '<tr><td>' + esc(x.part_name) + '</td><td>' + esc(x.qty) + '</td><td></td></tr>'; }).join('') : '';
      printWindow(q.jo_no || 'JO', '<div style="display:flex;justify-content:space-between;align-items:center"><div><h1>AHBA Fleet — Job Order</h1><div class="big">' + esc(q.jo_no || 'NOT YET APPROVED') + ' · ' + esc(Core.KIND_LABEL[q.kind] || q.kind) + '</div></div><div>Date: ' + esc(fmtDate(q.funded_on || q.approved_at || q.requested_on)) + '</div></div>' +
        '<table class="kv"><tr><td><b>Plate</b> ' + esc(v.plate) + '</td><td><b>SVC code</b> ' + esc(v.svc_code || '—') + '</td><td><b>Team</b> ' + esc(v.assigned_team || '—') + '</td></tr><tr><td><b>Vehicle</b> ' + esc([v.make, v.model, v.year].filter(Boolean).join(' ')) + '</td><td><b>Odometer (last known)</b> ' + (p.odometer ? esc(p.odometer.km) + ' km' : '—') + '</td><td><b>Priority</b> ' + esc(q.priority) + '</td></tr>' +
        '<tr><td colspan="2"><b>Reported by</b> ' + esc(q.requested_by || '') + ' (' + esc(q.source || 'admin') + ') on ' + fmtDate(q.requested_on) + '</td><td><b>Approved</b> ' + (q.approved_at ? fmtDate(q.approved_at) : '—') + '</td></tr></table>' +
        '<h3>Work to be done</h3>' + work +
        '<h3>Parts to be used</h3><table><thead><tr><th style="width:55%">Part</th><th style="width:15%">Qty</th><th>Remarks</th></tr></thead><tbody>' + parts + rows(parts ? 4 : 7) + '</tbody></table>' +
        '<table class="kv"><tr><td><b>Shop (if outside)</b> ________________</td><td class="big"><b>ODOMETER AT REPAIR:</b> ______________ km</td></tr></table>' +
        '<h3>Work done / mechanic notes</h3><div style="border:1px solid #000;min-height:90px"></div>' +
        '<div class="sig"><div>Mechanic (name, signature, date)</div><div>Fleet admin (name, signature, date)</div></div>' +
        '<p style="margin-top:20px;font-size:10px">Return this signed JO with the receipts. The admin encodes the parts, labor and the odometer at repair, uploads this JO and the receipts, then closes the request.</p>', false);
    }

    // ---- repairs / PMS log ----
    function repairForm(vehicle, rep) {
      rep = rep || {}; var parts = (rep.parts || []).map(function (p) { return Object.assign({}, p); }); if (!parts.length) parts.push({});
      var rules = (S.settings && S.settings.pms_rules) || [];
      function partsHtml() { return '<table><thead><tr><th>Part</th><th style="width:70px">Qty</th><th style="width:110px">Unit cost</th><th style="width:30px"></th></tr></thead><tbody>' + parts.map(function (p, i) { return '<tr><td><input name="pn' + i + '" value="' + esc(p.part_name || '') + '" placeholder="Part name"></td><td><input name="pq' + i + '" type="number" step="0.01" value="' + esc(p.qty == null ? 1 : p.qty) + '"></td><td><input name="pc' + i + '" type="number" step="0.01" value="' + esc(p.unit_cost == null ? '' : p.unit_cost) + '"></td><td><button type="button" class="fm-btn d" data-rm="' + i + '">×</button></td></tr>'; }).join('') + '</tbody></table><button type="button" class="fm-btn" id="fmAddPart">+ part</button>'; }
      var wrap = modal(rep.id ? 'Edit repair / PMS' : 'Add repair / PMS',
        field('kind', 'Kind', 'select', null, { options: opts(Core.REPAIR_KINDS, rep.kind || 'repair') }) + field('pms_rule_id', 'PMS package (when kind = pms)', 'select', null, { options: '<option value="">—</option>' + opts(rules.map(function (r) { return { value: r.id, label: r.label }; }), rep.pms_rule_id) }) +
        field('odometer_km', 'Odometer at repair (km)', 'number', rep.odometer_km) + field('started_on', 'Started', 'date', rep.started_on || Core.today()) + field('finished_on', 'Finished (blank = still open)', 'date', rep.finished_on) +
        field('performed_by', 'Performed by', 'select', null, { options: opts(['inhouse', 'outside'], rep.performed_by || 'inhouse', function (k) { return k === 'inhouse' ? 'In-house mechanic' : 'Outside shop'; }) }) + field('shop_name', 'Shop name (outside)', 'text', rep.shop_name) +
        field('labor_cost', 'Labor cost (₱)', 'number', rep.labor_cost, { step: '0.01' }) + field('work_done', 'Work done', 'textarea', rep.work_done, { wide: true, required: true }) + field('mechanic_notes', 'Mechanic notes', 'textarea', rep.mechanic_notes, { wide: true }) +
        '<div class="fm-parts" id="fmParts">' + partsHtml() + '</div>',
        function (f) {
          var out = []; parts.forEach(function (_, i) { if (f['pn' + i]) out.push({ part_name: f['pn' + i], qty: num(f['pq' + i]) || 1, unit_cost: num(f['pc' + i]) || 0 }); });
          return api.saveRepair({ id: rep.id, vehicle_id: vehicle.id, request_id: rep.request_id || null, kind: f.kind, pms_rule_id: f.kind === 'pms' ? num(f.pms_rule_id) : null, odometer_km: num(f.odometer_km), started_on: f.started_on || null, finished_on: f.finished_on || null,
            performed_by: f.performed_by, shop_name: f.shop_name, labor_cost: num(f.labor_cost) || 0, work_done: f.work_done, mechanic_notes: f.mechanic_notes, photo_paths: rep.photo_paths || [] }, out)
            .then(function () { toast('Repair saved'); return refreshVehicle(); });
        });
      function syncParts() { parts.forEach(function (p, i) { var g = function (n) { var e = wrap.querySelector('[name=' + n + i + ']'); return e ? e.value : ''; }; p.part_name = g('pn'); p.qty = g('pq'); p.unit_cost = g('pc'); }); }
      function bindParts() { var box = wrap.querySelector('#fmParts');
        box.querySelector('#fmAddPart').onclick = function () { syncParts(); parts.push({}); box.innerHTML = partsHtml(); bindParts(); };
        box.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { syncParts(); parts.splice(Number(b.dataset.rm), 1); if (!parts.length) parts.push({}); box.innerHTML = partsHtml(); bindParts(); }; }); }
      bindParts();
    }
    TABS.repairs = function (el, d) {
      var ruleLabel = function (id) { return ((S.settings && S.settings.pms_rules) || []).filter(function (x) { return x.id === id; }).map(function (x) { return x.label; })[0] || ''; };
      el.innerHTML = '<div class="fm-bar">' + (can('repairs') ? '<button class="fm-btn p" id="fmAddRep">+ Add repair / PMS</button>' : '') + '<span style="color:#8a9894;font-size:11px">Work started from a request is linked to its JO. The odometer at repair (from the signed JO) starts the next PMS cycle.</span></div>' +
        '<table><thead><tr><th>Dates</th><th>Kind</th><th>Odometer</th><th>Work done</th><th>By</th><th>Labor</th><th>Parts</th><th>Total</th><th></th></tr></thead><tbody>' +
        (d.repairs.length ? d.repairs.map(function (r) { var q = r.request_id ? d.requests.filter(function (x) { return x.id === r.request_id; })[0] : null;
          return '<tr><td>' + fmtDate(r.started_on) + (r.finished_on ? '<br>→ ' + fmtDate(r.finished_on) : '<br>' + pill('ongoing', 'open')) + '</td><td>' + pill(r.kind) + (r.pms_rule_id ? '<br><small>' + esc(ruleLabel(r.pms_rule_id)) + '</small>' : '') + '</td><td>' + (r.odometer_km != null ? r.odometer_km + ' km' : '—') + '</td>' +
            '<td>' + esc(r.work_done) + (q ? '<br><small style="color:#8a9894">' + esc(q.jo_no || 'request') + ' ' + pill(q.status) + '</small>' : '') + (r.mechanic_notes ? '<br><small>' + esc(r.mechanic_notes) + '</small>' : '') + '</td><td>' + (r.performed_by === 'outside' ? esc(r.shop_name || 'outside shop') : 'in-house') + '</td><td>' + peso(r.labor_cost) + '</td>' +
            '<td>' + peso(r.parts_cost) + (r.parts && r.parts.length ? '<br><small>' + r.parts.map(function (p) { return esc(p.part_name) + ' ×' + p.qty; }).join(', ') + '</small>' : '') + '</td><td><b>' + peso(r.total_cost) + '</b></td><td style="white-space:nowrap">' + (can('repairs') ? '<button class="fm-btn" data-edit="' + r.id + '">Edit</button> ' + delBtn('repairs', r.id) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="9" class="fm-empty">No repairs logged</td></tr>') + '</tbody></table>';
      var a = el.querySelector('#fmAddRep'); if (a) a.onclick = function () { repairForm(d.vehicle, null); };
      el.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { repairForm(d.vehicle, d.repairs.filter(function (r) { return r.id === b.dataset.edit; })[0]); }; });
      bindDel(el);
    };
    TABS.incidents = function (el, d) {
      el.innerHTML = '<div class="fm-bar">' + (can('incidents') ? '<button class="fm-btn p" id="fmAddInc">+ Report damage / incident</button>' : '') + '<span style="color:#8a9894;font-size:11px">Photos: Documents tab (kind: photo).</span></div>' +
        '<table><thead><tr><th>Date</th><th>Driver / where</th><th>Description</th><th>Police / claim</th><th>Status</th><th></th></tr></thead><tbody>' +
        (d.incidents.length ? d.incidents.map(function (i) { var linked = d.requests.filter(function (q) { return q.incident_id === i.id; });
          return '<tr><td>' + fmtDate(i.happened_on) + '</td><td>' + esc(i.driver || '—') + '<br><small>' + esc(i.location || '') + '</small></td><td>' + esc(i.description) + (linked.length ? '<br><small>requests: ' + linked.map(function (q) { return pill(q.status); }).join(' ') + '</small>' : '') + '</td>' +
            '<td>' + (i.police_report_no ? 'PR ' + esc(i.police_report_no) + '<br>' : '') + (i.insurance_claim_no ? 'Claim ' + esc(i.insurance_claim_no) + ' ' : '') + pill(i.claim_status) + '</td><td>' + (i.resolved ? pill('ok', 'resolved') : pill('due', 'open')) + '</td>' +
            '<td style="white-space:nowrap">' + (isAdmin() && !linked.length ? '<button class="fm-btn p" data-req="' + i.id + '">Create repair request</button> ' : '') + (can('incidents') ? '<button class="fm-btn" data-edit="' + i.id + '">Edit</button> ' + delBtn('incidents', i.id) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="fm-empty">No incidents</td></tr>') + '</tbody></table>';
      function form(i) { i = i || {}; modal(i.id ? 'Edit incident' : 'Report damage / incident',
        field('happened_on', 'Date', 'date', i.happened_on || Core.today(), { required: true }) + field('driver', 'Driver', 'text', i.driver) + field('location', 'Location', 'text', i.location) + field('description', 'What happened / damage', 'textarea', i.description, { wide: true, required: true }) +
        field('police_report_no', 'Police report no.', 'text', i.police_report_no) + field('insurance_claim_no', 'Insurance claim no.', 'text', i.insurance_claim_no) + field('claim_status', 'Claim status', 'select', null, { options: opts(Core.CLAIM_STATUS, i.claim_status || 'none') }) +
        field('resolved', 'Resolved?', 'select', null, { options: opts([{ value: '0', label: 'No — open' }, { value: '1', label: 'Yes' }], i.resolved ? '1' : '0') }),
        function (f) { return api.saveIncident({ id: i.id, vehicle_id: d.vehicle.id, happened_on: f.happened_on, driver: f.driver, location: f.location, description: f.description, police_report_no: f.police_report_no, insurance_claim_no: f.insurance_claim_no, claim_status: f.claim_status, resolved: f.resolved === '1', damage_photos: i.damage_photos || [] }).then(function () { toast('Incident saved'); return refreshVehicle(); }); }); }
      var a = el.querySelector('#fmAddInc'); if (a) a.onclick = function () { form(null); };
      el.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { form(d.incidents.filter(function (i) { return i.id === b.dataset.edit; })[0]); }; });
      el.querySelectorAll('[data-req]').forEach(function (b) { b.onclick = function () { requestForm(d.vehicle.id, d.incidents.filter(function (i) { return i.id === b.dataset.req; })[0]); }; });
      bindDel(el);
    };
    TABS.checks = function (el, d) {
      el.innerHTML = '<div class="fm-bar"><span style="color:#8a9894;font-size:11px">B.L.O.W.B.A.G.E.T.S. declared by the driver on the mobile app before the first load. Not OK items raise repair requests automatically.</span></div>' +
        '<table><thead><tr><th>Date</th><th>Team / driver</th><th>Odometer</th><th>Fuel</th><th>BLOWBAGETS</th><th>Equipment</th><th>Confirmed</th></tr></thead><tbody>' +
        ((d.checks || []).length ? d.checks.map(function (c) { var bad = (c.items || []).filter(function (i) { return !i.ok; }), miss = Core.equipmentMissing(c.equipment); return '<tr><td>' + fmtDate(c.work_date) + '</td><td>' + esc(c.team) + '<br><small>' + esc(c.driver || '') + '</small></td><td>' + c.odometer_km + ' km</td><td>' + esc(c.fuel_level) + '</td><td>' + (bad.length ? bad.map(function (i) { return '<span class="fm-pill overdue">' + esc(i.label) + '</span> ' + esc(i.remarks || ''); }).join('<br>') : pill('ok', 'all 10 OK')) + '</td><td>' + (c.equipment ? (miss.length ? miss.map(function (i) { return '<span class="fm-pill overdue">' + esc(i.label) + '</span> ' + esc(i.remarks || ''); }).join('<br>') : pill('ok', 'all on board')) : '—') + '</td><td>' + esc(String(c.confirmed_at).slice(11, 16)) + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="fm-empty">No daily checks yet</td></tr>') + '</tbody></table>';
    };
    // ---- equipment inventory: issued list (admin), today's driver declaration, admin-only audits ----
    TABS.equipment = function (el, d) {
      var v = d.vehicle, todayC = (d.checks || []).filter(function (c) { return c.work_date === Core.today(); })[0], issued = d.equipment.filter(function (e) { return e.issued !== false; });
      var declared = {}; if (todayC && todayC.equipment) todayC.equipment.forEach(function (i) { declared[i.key] = i; });
      var lastA = (d.equipment_audits || [])[0]; var audited = {}; if (lastA) lastA.items.forEach(function (i) { audited[i.key] = i; });
      el.innerHTML = '<div class="fm-bar">' + (isAdmin() ? '<button class="fm-btn p" id="fmAudit">Record audit</button><button class="fm-btn" id="fmIssued">Edit issued items</button>' : '') + '<span style="color:#8a9894;font-size:11px">Standard items issued to the vehicle. The driver declares them daily on the mobile app (default: all on board). Only the fleet admin can audit.</span></div>' +
        (d.equipment_missing.length ? '<div class="fm-warn">Missing: ' + esc(d.equipment_missing.map(function (m) { return m.label + (m.remarks ? ' (' + m.remarks + ')' : ''); }).join(', ')) + '</div>' : '<div class="fm-alert ok">All issued equipment accounted for' + (todayC ? ' (driver declaration today)' : lastA ? ' (last audit ' + fmtDate(lastA.audited_on) + ')' : '') + '</div>') +
        '<table><thead><tr><th>Item</th><th>Issued</th><th>Status</th><th>Driver today</th><th>Last audit' + (lastA ? ' (' + fmtDate(lastA.audited_on) + ')' : '') + '</th><th>Notes</th><th></th></tr></thead><tbody>' + d.equipment.map(function (e) { var dc = declared[e.key], au = audited[e.key], missing = e.status === 'missing';
          return '<tr><td>' + esc(e.label) + '</td><td>' + (e.issued === false ? pill('rejected', 'not issued') : pill('ok', 'issued')) + '</td><td>' + (e.issued === false ? '—' : missing ? pill('overdue', 'MISSING') + '<br><small>since ' + fmtDate(e.missing_since) + (e.missing_by ? ' · by ' + esc(e.missing_by) : '') + (e.missing_remarks ? '<br>' + esc(e.missing_remarks) : '') + '</small>' : pill('ok', 'equipped')) + '</td><td>' + (e.issued === false ? '—' : dc ? (dc.present ? pill('ok', 'on board') : pill('overdue', 'missing') + (dc.remarks ? ' <small>' + esc(dc.remarks) + '</small>' : '')) : '<small style="color:#8a9894">no check today</small>') + '</td><td>' + (e.issued === false ? '—' : au ? (au.ok ? pill('ok', 'OK') : pill('overdue', 'missing') + (au.remarks ? ' <small>' + esc(au.remarks) + '</small>' : '')) : '<small style="color:#8a9894">never audited</small>') + '</td><td>' + esc(e.notes || '') + '</td><td style="white-space:nowrap">' + (isAdmin() && e.issued !== false ? (missing ? '<button class="fm-btn p" data-restore="' + e.key + '">Mark equipped</button>' : '<button class="fm-btn d" data-missing="' + e.key + '">Tag missing</button>') : '') + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="fm-note">A missing tag stays on the vehicle record and the driver is not asked again about that item; only the fleet admin returns it to <b>equipped</b> (here or through an audit marked OK).</div>' +
        '<div class="fm-sec">Audit history (admin)</div>' + ((d.equipment_audits || []).length ? '<table><thead><tr><th>Date</th><th>By</th><th>Result</th><th>Remarks</th></tr></thead><tbody>' + d.equipment_audits.map(function (a) { var miss = Core.equipmentMissing(a.items); return '<tr><td>' + fmtDate(a.audited_on) + '</td><td>' + esc(a.audited_by) + '</td><td>' + (miss.length ? pill('overdue', miss.length + ' missing') + ' <small>' + esc(miss.map(function (m) { return m.label; }).join(', ')) + '</small>' : pill('ok', 'complete')) + '</td><td>' + esc(a.remarks || '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="fm-empty">No audits yet</div>');
      el.querySelectorAll('[data-restore]').forEach(function (b) { b.onclick = function () { modal('Mark equipped — ' + Core.equipmentLabel(b.dataset.restore), field('remarks', 'Remarks (replaced / returned / found)', 'text', '', { wide: true }), function (f) { return api.setEquipmentStatus(v.id, b.dataset.restore, 'equipped', f.remarks).then(function () { toast('Restored to equipped'); return refreshVehicle(); }); }, 'Mark equipped'); }; });
      el.querySelectorAll('[data-missing]').forEach(function (b) { b.onclick = function () { modal('Tag missing — ' + Core.equipmentLabel(b.dataset.missing), field('remarks', 'Remarks (required)', 'text', '', { wide: true, required: true }), function (f) { return api.setEquipmentStatus(v.id, b.dataset.missing, 'missing', f.remarks).then(function () { toast('Tagged missing'); return refreshVehicle(); }); }, 'Tag missing'); }; });
      var a = el.querySelector('#fmAudit'); if (a) a.onclick = function () {
        modal('Equipment audit — ' + v.plate, field('audited_on', 'Audit date', 'date', Core.today(), { required: true }) + '<div style="grid-column:1/-1"><table><thead><tr><th>Item</th><th>Result</th><th>Remarks</th></tr></thead><tbody>' + issued.map(function (e, i) { return '<tr><td>' + esc(e.label) + '</td><td><select name="ok' + i + '"><option value="1">OK — in vehicle</option><option value="0">Missing</option></select></td><td><input name="rm' + i + '" placeholder="remarks"></td></tr>'; }).join('') + '</tbody></table></div>' + field('remarks', 'Audit remarks', 'textarea', '', { wide: true }),
          function (f) { return api.saveEquipmentAudit(v.id, { audited_on: f.audited_on, remarks: f.remarks, items: issued.map(function (e, i) { return { key: e.key, label: e.label, ok: f['ok' + i] === '1', remarks: f['rm' + i] || '' }; }) }).then(function () { toast('Audit recorded'); return refreshVehicle(); }); }, 'Save audit');
      };
      var b = el.querySelector('#fmIssued'); if (b) b.onclick = function () {
        modal('Issued equipment — ' + v.plate, '<div style="grid-column:1/-1"><table><thead><tr><th>Item</th><th>Issued to this vehicle</th><th>Notes</th></tr></thead><tbody>' + d.equipment.map(function (e, i) { return '<tr><td>' + esc(e.label) + '</td><td><select name="is' + i + '"><option value="1"' + (e.issued !== false ? ' selected' : '') + '>Issued</option><option value="0"' + (e.issued === false ? ' selected' : '') + '>Not issued</option></select></td><td><input name="nt' + i + '" value="' + esc(e.notes || '') + '"></td></tr>'; }).join('') + '</tbody></table></div>',
          function (f) { return api.saveEquipment(v.id, d.equipment.map(function (e, i) { return { key: e.key, issued: f['is' + i] === '1', notes: f['nt' + i] || null }; })).then(function () { toast('Issued list saved'); return refreshVehicle(); }); });
      };
    };
    TABS.documents = function (el, d) {
      var kinds = isAdmin() ? Core.DOC_KINDS : [];
      var groups = {}; d.documents.forEach(function (x) { (groups[x.kind] = groups[x.kind] || []).push(x); });
      var joOf = function (x) { var q = x.request_id ? d.requests.filter(function (r) { return r.id === x.request_id; })[0] : null; return q ? ' <span class="fm-pill">' + esc(q.jo_no || Core.KIND_LABEL[q.kind]) + '</span>' : ''; };
      el.innerHTML = (kinds.length ? '<form class="fm-bar" id="fmUp"><select name="kind">' + opts(kinds, 'or_cr', function (k) { return k.replace('_', ' ').toUpperCase(); }) + '</select><input name="label" placeholder="Label (e.g. OR/CR 2026)"><input name="file" type="file" required accept="image/*,application/pdf"><button class="fm-btn p" type="submit">Upload</button><span style="color:#8a9894;font-size:11px">max 10 MB; images are compressed. Receipts and signed JOs are attached to their request from the Close screen.</span></form>' : '') +
        (d.documents.length ? Core.DOC_KINDS.filter(function (k) { return groups[k]; }).map(function (k) { return '<div class="fm-sec">' + k.replace('_', ' ') + '</div>' + groups[k].map(function (x) { return '<span class="fm-doc"><a href="#" data-doc="' + x.id + '">📄 ' + esc(x.label) + '</a>' + joOf(x) + '<small style="color:#8a9894">' + fmtDate(x.created_at) + '</small>' + (isAdmin() ? ' ' + delBtn('documents', x.id, '×') : '') + '</span>'; }).join(''); }).join('') : '<div class="fm-empty">No documents</div>');
      var f = el.querySelector('#fmUp'); if (f) f.onsubmit = function (e) {
        e.preventDefault(); var file = f.file.files[0]; if (!file) return; var btn = f.querySelector('button'); btn.disabled = true;
        var prep = (deps.compressImage && /^image\//.test(file.type)) ? Promise.resolve(deps.compressImage(file, 1600, 300)) : Promise.resolve(file);
        prep.then(function (blob) { if (blob && !blob.name) { try { blob = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }); } catch (_) { blob = file; } } return api.uploadDocument(d.vehicle.id, f.kind.value, blob, f.label.value || file.name); })
          .then(function () { toast('Uploaded'); return refreshVehicle(); }).catch(function (err) { fail(err); btn.disabled = false; });
      };
      el.querySelectorAll('[data-doc]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); api.documentUrl(d.documents.filter(function (x) { return x.id === a.dataset.doc; })[0]).then(function (u) { if (u && u !== '#') window.open(u, '_blank'); else toast('Demo: file preview not available for seeded documents'); }).catch(fail); }; });
      bindDel(el);
    };
    TABS.expenses = function (el, d) {
      var byKind = {}; d.expenses.forEach(function (e) { byKind[e.kind] = (byKind[e.kind] || 0) + Number(e.amount); });
      var total = d.expenses.reduce(function (a, e) { return a + Number(e.amount); }, 0), year = Core.today().slice(0, 4);
      var ytd = d.expenses.filter(function (e) { return e.spent_on >= year + '-01-01'; }).reduce(function (a, e) { return a + Number(e.amount); }, 0);
      el.innerHTML = '<div class="fm-stats"><div class="fm-stat"><span>All time</span><strong>' + peso(total) + '</strong></div><div class="fm-stat"><span>' + year + ' YTD</span><strong>' + peso(ytd) + '</strong></div>' + Core.EXP_KINDS.map(function (k) { return '<div class="fm-stat"><span>' + k + '</span><strong>' + peso(byKind[k] || 0) + '</strong></div>'; }).join('') + '</div>' +
        '<div class="fm-bar">' + (isAdmin() ? '<button class="fm-btn p" id="fmAddExp">+ Other expense</button>' : '') + '<button class="fm-btn" id="fmExpX">Export Excel</button><span style="color:#8a9894;font-size:11px">Closed JOs, registrations and insurance are recorded automatically and mirrored into the FieldOps Expenses tab as "Vehicle". Fuel is not tracked here.</span></div>' +
        '<table><thead><tr><th>Date</th><th>Kind</th><th>Description</th><th>Amount</th><th></th></tr></thead><tbody>' + (d.expenses.length ? d.expenses.map(function (e) { return '<tr><td>' + fmtDate(e.spent_on) + '</td><td>' + pill(e.kind) + '</td><td>' + esc(e.description) + '</td><td><b>' + peso(e.amount) + '</b></td><td>' + (isAdmin() && e.kind === 'other' ? delBtn('expenses', e.id) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="fm-empty">No expenses</td></tr>') + '</tbody></table>';
      var a = el.querySelector('#fmAddExp'); if (a) a.onclick = function () { modal('Other expense', field('spent_on', 'Date', 'date', Core.today(), { required: true }) + field('amount', 'Amount (₱)', 'number', '', { step: '0.01', required: true }) + field('description', 'Description', 'text', '', { wide: true, required: true }),
        function (f) { return api.addExpense({ vehicle_id: d.vehicle.id, spent_on: f.spent_on, amount: num(f.amount), description: f.description }).then(function () { toast('Expense recorded'); return refreshVehicle(); }); }); };
      el.querySelector('#fmExpX').onclick = function () { exportXlsx('FMS-' + d.vehicle.plate + '-expenses', [{ name: 'Expenses', rows: d.expenses.map(function (e) { return { PLATE: d.vehicle.plate, DATE: e.spent_on, KIND: e.kind.toUpperCase(), DESCRIPTION: e.description, AMOUNT: Number(e.amount) }; }) }]); };
      bindDel(el);
    };

    // ---- fleet-wide views ----
    VIEWS.alerts = function (m) {
      var c = S.counts || {}, rows = S.alerts.filter(function (a) { return a.state !== 'ok'; });
      m.innerHTML = '<div class="fm-stats"><div class="fm-stat"><span>Overdue</span><strong style="color:#b23a25">' + (c.overdue || 0) + '</strong></div><div class="fm-stat"><span>Due soon</span><strong style="color:#9a6200">' + (c.due_soon || 0) + '</strong></div><div class="fm-stat"><span>For approval</span><strong>' + (c.for_approval || 0) + '</strong></div><div class="fm-stat"><span>Open requests</span><strong>' + (c.open_requests || 0) + '</strong></div><div class="fm-stat"><span>Vehicles</span><strong>' + S.vehicles.length + '</strong></div></div>' +
        '<div class="fm-note">Registration: notice 60 days before expiry · PMS: 1,000 km or 30 days before due · CTPL / comprehensive: 30 days. Due items become automatic requests through the daily job.</div>' +
        '<table><thead><tr><th>Vehicle</th><th>Item</th><th>Due</th><th>State</th></tr></thead><tbody>' + (rows.length ? rows.map(function (a) { return '<tr class="lnk" data-open="' + a.vehicle_id + '"><td><b>' + esc(a.plate) + '</b></td><td>' + esc(a.label) + '</td><td>' + dueText(a) + '</td><td>' + pill(a.state) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="fm-empty">Nothing due</td></tr>') + '</tbody></table>' +
        '<div class="fm-sec">Upcoming</div><table><thead><tr><th>Vehicle</th><th>Item</th><th>Due</th></tr></thead><tbody>' + S.alerts.filter(function (a) { return a.state === 'ok' && a.due_on; }).slice(0, 40).map(function (a) { return '<tr class="lnk" data-open="' + a.vehicle_id + '"><td>' + esc(a.plate) + '</td><td>' + esc(a.label) + '</td><td>' + fmtDate(a.due_on) + ' (in ' + a.due_in_days + 'd)</td></tr>'; }).join('') + '</tbody></table>';
      bindOpen(m);
    };
    var GROUPS = { open: Core.OPEN_STATUS, for_approval: ['for_approval'], approved: ['approved'], funded: ['funded', 'ongoing', 'done'], closed: ['closed'], rejected: ['rejected'], all: Core.REQ_STATUS };
    VIEWS.requests = function (m) {
      var f = S.mon;
      m.innerHTML = '<div id="fmMonTot" class="fm-stats"></div>' +
        '<div class="fm-bar"><label>Requested from <input type="date" id="fmMf" value="' + f.from + '"></label><label>to <input type="date" id="fmMt" value="' + f.to + '"></label>' +
        '<select id="fmMg">' + opts([{ value: 'open', label: 'All open' }, { value: 'for_approval', label: 'For approval' }, { value: 'approved', label: 'For funding' }, { value: 'funded', label: 'Funded / in work' }, { value: 'closed', label: 'Closed' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'Everything' }], f.group) + '</select>' +
        '<select id="fmMk"><option value="">All kinds</option>' + opts(Core.REQ_KINDS, f.kind, function (k) { return Core.KIND_LABEL[k]; }) + '</select><select id="fmMp"><option value="">All urgency</option>' + opts(Core.PRIORITIES, f.priority) + '</select>' +
        (canApprove() ? '<button class="fm-btn p" id="fmBulk" disabled>Approve selected (0)</button>' : '') + '<button class="fm-btn" id="fmMonX">Export Excel</button></div><div id="fmMon" class="fm-empty">Loading…</div>';
      ['fmMf', 'fmMt', 'fmMg', 'fmMk', 'fmMp'].forEach(function (id) { m.querySelector('#' + id).onchange = function () { f.from = m.querySelector('#fmMf').value; f.to = m.querySelector('#fmMt').value; f.group = m.querySelector('#fmMg').value; f.kind = m.querySelector('#fmMk').value; f.priority = m.querySelector('#fmMp').value; VIEWS.requests(m); }; });
      Promise.all([api.monitoringTotals(), api.listRequests({ status: GROUPS[f.group] || Core.OPEN_STATUS, kind: f.kind || null, priority: f.priority || null, from: f.from || null, to: f.to || null })]).then(function (r) {
        var t = r[0], rows = r[1]; S.monRows = rows;
        m.querySelector('#fmMonTot').innerHTML = '<div class="fm-stat hi"><span>Total to be released</span><strong>' + peso(t.total) + '</strong></div><div class="fm-stat"><span>For approval</span><strong>' + peso(t.for_approval) + '</strong><small style="color:#8a9894">' + (t.count_for_approval || 0) + ' request(s)</small></div><div class="fm-stat"><span>For funding (approved)</span><strong>' + peso(t.approved) + '</strong><small style="color:#8a9894">' + (t.count_approved || 0) + ' request(s)</small></div>' +
          Core.REQ_KINDS.map(function (k) { return '<div class="fm-stat"><span>' + Core.KIND_LABEL[k] + '</span><strong>' + peso((t.by_kind || {})[k] || 0) + '</strong></div>'; }).join('') + '<div class="fm-stat"><span>Funded this month</span><strong>' + peso(t.funded_month) + '</strong></div>';
        var q = m.querySelector('#fmMon'); if (!q) return;
        q.outerHTML = '<div id="fmMon" style="overflow:auto"><table><thead><tr>' + (canApprove() ? '<th></th>' : '') + '<th>Vehicle / kind / requested</th><th>Description</th><th>Urgency</th><th>Aging</th><th>Estimate</th><th>Status</th><th></th></tr></thead><tbody>' + (rows.length ? rows.map(function (x) { return requestRow(x, true, canApprove()); }).join('') : '<tr><td colspan="8" class="fm-empty">No requests in this filter</td></tr>') + '</tbody></table></div>';
        bindRequestActions(m, function () { return loadFleet().then(function () { renderTop(); renderList(); badge(); VIEWS.requests(m); }); });
        bindOpen(m, 'requests');
        var bulk = m.querySelector('#fmBulk');
        if (bulk) { var upd = function () { var n = m.querySelectorAll('[data-sel]:checked').length; bulk.disabled = !n; bulk.textContent = 'Approve selected (' + n + ')'; };
          m.querySelectorAll('[data-sel]').forEach(function (cb) { cb.onchange = function () { S.sel_ids[cb.dataset.sel] = cb.checked; upd(); }; }); upd();
          bulk.onclick = function () { var ids = Array.prototype.map.call(m.querySelectorAll('[data-sel]:checked'), function (x) { return x.dataset.sel; }); if (!ids.length) return;
            api.recordApproval(ids).then(function (r) { S.sel_ids = {}; toast(r.approved + ' approved (both signatures) · ' + r.partial + ' waiting for the second approver'); return loadFleet().then(function () { renderTop(); badge(); VIEWS.requests(m); }); }).catch(fail); }; }
        m.querySelector('#fmMonX').onclick = function () { exportXlsx('FMS-requests-' + Core.today(), [{ name: 'Requests', rows: (S.monRows || []).map(function (x) { return { PLATE: x.plate, SVC: x.svc_code || '', KIND: x.kind, REQUESTED: x.requested_on, AGING_DAYS: x.aging == null ? '' : x.aging, BY: x.requested_by || '', SOURCE: x.source, DESCRIPTION: x.description, URGENCY: x.priority, ESTIMATE: x.est_cost == null ? '' : Number(x.est_cost), STATUS: Core.STATUS_LABEL[x.status], APPROVALS: (x.approvals || []).map(function (a) { return a.role_title; }).join(' + '), JO: x.jo_no || '', FUNDED_ON: x.funded_on || '', FUNDED_AMOUNT: x.funded_amount == null ? '' : Number(x.funded_amount), OVER_ESTIMATE: x.over_estimate ? 'YES' : '' }; }) }]); };
      }).catch(fail);
    };
    VIEWS.reports = function (m) {
      var t = Core.today(), r = S.report || (S.report = { from: t.slice(0, 4) + '-01-01', to: t });
      m.innerHTML = '<div class="fm-bar"><label>From <input type="date" id="fmRf" value="' + r.from + '"></label><label>To <input type="date" id="fmRt" value="' + r.to + '"></label><button class="fm-btn p" id="fmRun">Run</button><button class="fm-btn" id="fmRx">Export Excel</button></div><div id="fmRep" class="fm-empty">Loading…</div>';
      var box = m.querySelector('#fmRep');
      function run() {
        r.from = m.querySelector('#fmRf').value; r.to = m.querySelector('#fmRt').value;
        return api.listExpenses({ from: r.from, to: r.to }).then(function (rows) {
          var rep = Core.aggregateReport(rows, S.vehicles, r.from, r.to); S.reportData = rep;
          box.className = ''; box.innerHTML = '<div class="fm-stats"><div class="fm-stat hi"><span>Total spend</span><strong>' + peso(rep.total) + '</strong></div><div class="fm-stat"><span>Vehicles with spend</span><strong>' + rep.perVehicle.length + '</strong></div><div class="fm-stat"><span>Top spender</span><strong>' + (rep.perVehicle[0] ? esc(rep.perVehicle[0].plate) : '—') + '</strong></div></div>' +
            '<div class="fm-sec">Per vehicle</div><table><thead><tr><th>Vehicle</th>' + Core.EXP_KINDS.map(function (k) { return '<th>' + k + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>' + rep.perVehicle.map(function (v) { return '<tr class="lnk" data-open="' + v.vehicle_id + '"><td><b>' + esc(v.plate) + '</b></td>' + Core.EXP_KINDS.map(function (k) { return '<td>' + peso(v.byKind[k] || 0) + '</td>'; }).join('') + '<td><b>' + peso(v.total) + '</b></td></tr>'; }).join('') + '</tbody></table>' +
            '<div class="fm-sec">Per month</div><table><thead><tr><th>Month</th><th>Total</th></tr></thead><tbody>' + rep.byMonth.map(function (x) { return '<tr><td>' + x.month + '</td><td>' + peso(x.total) + '</td></tr>'; }).join('') + '</tbody></table>';
          bindOpen(box, 'expenses');
        }).catch(fail);
      }
      m.querySelector('#fmRun').onclick = run;
      m.querySelector('#fmRx').onclick = function () { var rep = S.reportData; if (!rep) return; exportXlsx('FMS-report-' + r.from + '_' + r.to, [
        { name: 'Per vehicle', rows: rep.perVehicle.map(function (v) { var o = { PLATE: v.plate }; Core.EXP_KINDS.forEach(function (k) { o[k.toUpperCase()] = v.byKind[k] || 0; }); o.TOTAL = v.total; return o; }) },
        { name: 'Per month', rows: rep.byMonth.map(function (x) { return { MONTH: x.month, TOTAL: x.total }; }) }]); };
      run();
    };
    VIEWS.summary = function (m) {
      m.innerHTML = '<div class="fm-bar"><button class="fm-btn" id="fmSumX">Export Excel</button><button class="fm-btn" id="fmSumP">Print (A4 landscape)</button><span style="color:#8a9894;font-size:11px">One row per vehicle · latest repair, open requests with aging, repair spend, next PMS, registration due</span></div><div id="fmSum" class="fm-empty">Loading…</div>';
      api.executiveSummary().then(function (rows) {
        S.summaryRows = rows;
        m.querySelector('#fmSum').outerHTML = '<div id="fmSum" style="overflow:auto"><table id="fmSumT"><thead><tr><th>Vehicle</th><th>Make / model / year</th><th>Fuel</th><th>Team</th><th>Status</th><th>Last repair</th><th>Open req.</th><th>Oldest</th><th>This month</th><th>YTD</th><th>Next PMS</th><th>Registration due</th><th>Equipment</th><th>Over est.</th></tr></thead><tbody>' +
          rows.map(function (r) { return '<tr class="lnk" data-open="' + r.vehicle_id + '"><td><b>' + esc(r.plate) + '</b>' + (r.svc_code ? ' <small>' + esc(r.svc_code) + '</small>' : '') + '</td><td>' + esc([r.make, r.model, r.year].filter(Boolean).join(' ') || '—') + (r.vehicle_type ? '<br><small>' + esc(r.vehicle_type) + '</small>' : '') + '</td><td>' + esc(r.fuel || '—') + '</td><td>' + esc(r.team || '—') + '</td><td>' + pill(r.status) + '</td><td>' + (r.last_repair ? fmtDate(r.last_repair.on) + '<br><small>' + esc(String(r.last_repair.work).slice(0, 60)) + ' · ' + peso(r.last_repair.cost) + '</small>' : '—') + '</td><td>' + (r.open_requests || 0) + '</td><td>' + (r.oldest_aging != null ? r.oldest_aging + 'd' : '—') + '</td><td>' + peso(r.cost_month) + '</td><td>' + peso(r.cost_ytd) + '</td><td>' + (r.next_pms_km != null ? r.next_pms_km + ' km' : '') + (r.next_pms_days != null ? ' / ' + r.next_pms_days + ' d' : '') + (r.next_pms_km == null && r.next_pms_days == null ? '—' : '') + '</td><td>' + fmtDate(r.registration_due) + '</td><td>' + ((r.equipment_missing || []).length ? pill('overdue', r.equipment_missing.length + ' missing') + '<br><small>' + esc(r.equipment_missing.join(', ')) + '</small>' : pill('ok', 'complete')) + (r.equipment_last_audit ? '<br><small>audit ' + fmtDate(r.equipment_last_audit) + '</small>' : '') + '</td><td>' + (r.over_estimate_count || 0) + '</td></tr>'; }).join('') + '</tbody></table></div>';
        bindOpen(m);
      }).catch(fail);
      m.querySelector('#fmSumX').onclick = function () { exportXlsx('FMS-executive-summary-' + Core.today(), [{ name: 'Summary', rows: (S.summaryRows || []).map(function (r) { return { PLATE: r.plate, SVC: r.svc_code || '', MAKE: r.make || '', MODEL: r.model || '', YEAR: r.year || '', FUEL: r.fuel || '', TYPE: r.vehicle_type || '', TEAM: r.team || '', STATUS: r.status, LAST_REPAIR_ON: r.last_repair ? r.last_repair.on : '', LAST_REPAIR: r.last_repair ? r.last_repair.work : '', LAST_REPAIR_COST: r.last_repair ? Number(r.last_repair.cost) : 0, OPEN_REQUESTS: r.open_requests, OLDEST_AGING_DAYS: r.oldest_aging == null ? '' : r.oldest_aging, COST_THIS_MONTH: Number(r.cost_month), COST_YTD: Number(r.cost_ytd), NEXT_PMS_KM: r.next_pms_km == null ? '' : r.next_pms_km, NEXT_PMS_DAYS: r.next_pms_days == null ? '' : r.next_pms_days, REGISTRATION_DUE: r.registration_due || '', EQUIPMENT_MISSING: (r.equipment_missing || []).join(', '), EQUIPMENT_LAST_AUDIT: r.equipment_last_audit || '', OVER_ESTIMATE: r.over_estimate_count }; }) }]); };
      m.querySelector('#fmSumP').onclick = function () { var tb = m.querySelector('#fmSumT'); if (!tb) return; printWindow('Fleet executive summary', '<h1>AHBA Fleet — Executive summary</h1><div>' + Core.today() + '</div>' + tb.outerHTML, true); };
    };
    VIEWS.settings = function (m) {
      if (!isAdmin()) { m.innerHTML = '<div class="fm-empty">Admin only</div>'; return; }
      Promise.all([api.getSettings(), api.listDashboardUsers()]).then(function (r) {
        var s = r[0], users = r[1]; S.settings = s;
        var titles = s.members.map(function (x) { return x.role_title; }); var warn = [];
        if (titles.indexOf('CEO/President') < 0) warn.push('no CEO/President tagged');
        if (titles.indexOf('Chief Operation Officer') < 0 && titles.indexOf('Procurement Officer') < 0) warn.push('no Chief Operation Officer or Procurement Officer tagged');
        m.innerHTML = (warn.length ? '<div class="fm-warn">Approvals cannot complete: ' + esc(warn.join('; ')) + '. Tag the people below.</div>' : '') +
          '<div class="fm-sec">Approval rule</div><div class="fm-note">A request is approved when the <b>CEO/President</b> signs AND one of the <b>Chief Operation Officer</b> or <b>Procurement Officer</b> signs. Admin Officer and Property Custodian are notified only. Fleet admin encodes.</div>' +
          '<div class="fm-sec">People (console users)</div><table><thead><tr><th>User</th><th>Role title</th><th>Encodes (fleet admin rights)</th><th>Notify</th><th>Push to mobile account</th></tr></thead><tbody>' + users.map(function (u) { var mm = s.members.filter(function (x) { return x.username === u.username; })[0] || {};
            return '<tr><td>' + esc(u.display_name || u.username) + ' <small style="color:#8a9894">' + esc(u.username) + '</small></td><td><select data-m="title" data-u="' + esc(u.username) + '"><option value="">— not a member —</option>' + opts(Core.ROLE_TITLES, mm.role_title || '') + '</select></td><td><input type="checkbox" data-m="admin" data-u="' + esc(u.username) + '"' + (mm.role === 'admin' ? ' checked' : '') + '></td><td><input type="checkbox" data-m="notify" data-u="' + esc(u.username) + '"' + (mm.notify !== false && mm.role_title ? ' checked' : '') + '></td><td><input data-m="push" data-u="' + esc(u.username) + '" value="' + esc(mm.push_team || '') + '" placeholder="e.g. AHBA_TEST" style="width:130px"></td></tr>'; }).join('') + '</tbody></table>' +
          '<div class="fm-sec">PMS package</div><table><thead><tr><th>Item</th><th>Every km</th><th>Every months</th><th>Active</th><th></th></tr></thead><tbody>' + s.pms_rules.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td>' + (x.every_km || '—') + '</td><td>' + (x.every_months || '—') + '</td><td>' + (x.active ? '✅' : '—') + '</td><td><button class="fm-btn" data-rule="' + x.id + '">Edit</button></td></tr>'; }).join('') + '</tbody></table>' +
          '<div class="fm-bar" style="margin-top:8px"><label>Standard PMS cost (₱) — used as the estimate of automatic PMS requests <input id="fmPmsCost" type="number" step="0.01" value="' + esc(s.pms_standard_cost) + '" style="width:120px"></label><button class="fm-btn p" id="fmPmsCostSave">Save</button><span style="color:#8a9894;font-size:11px">blank = PMS requests start at For canvass</span></div>' +
          '<div class="fm-sec">Extra push targets</div><div class="fm-bar"><input id="fmPush" style="min-width:320px" value="' + esc(s.push_teams) + '" placeholder="Mobile team usernames, comma-separated"><button class="fm-btn p" id="fmPushSave">Save</button><span style="color:#8a9894;font-size:11px">Daily 07:00 · reminders + "waiting for approval" digest</span></div>';
        function saveMember(u) { var g = function (k) { return m.querySelector('[data-m="' + k + '"][data-u="' + u + '"]'); }; var t = g('title').value;
          var p = t ? api.saveMember({ username: u, role_title: t, role: g('admin').checked ? 'admin' : 'none', notify: g('notify').checked, push_team: g('push').value.trim() || null }) : api.saveMember({ username: u, role_title: 'Fleet admin', role: 'none', notify: false, push_team: null, deleted_at: new Date().toISOString() });
          p.then(function () { toast('Saved ' + u); return api.getSettings().then(function (ns) { S.settings = ns; }); }).catch(fail); }
        m.querySelectorAll('[data-m]').forEach(function (el) { el.onchange = function () { saveMember(el.dataset.u); }; });
        function ruleForm(x) { x = x || {}; modal('PMS package', field('label', 'Item', 'text', x.label, { required: true }) + field('every_km', 'Every km', 'number', x.every_km) + field('every_months', 'Every months', 'number', x.every_months) + field('active', 'Active', 'select', null, { options: opts([{ value: '1', label: 'Yes' }, { value: '0', label: 'No' }], x.active === false ? '0' : '1') }),
          function (f) { if (!f.every_km && !f.every_months) throw new Error('Set every km and/or every months'); return api.savePmsRule({ id: x.id, label: f.label, every_km: num(f.every_km), every_months: num(f.every_months), sort_order: x.sort_order == null ? 10 : x.sort_order, active: f.active === '1' }).then(function () { toast('PMS package saved'); return loadFleet().then(function () { VIEWS.settings(m); }); }); }); }
        m.querySelectorAll('[data-rule]').forEach(function (b) { b.onclick = function () { ruleForm(s.pms_rules.filter(function (x) { return String(x.id) === b.dataset.rule; })[0]); }; });
        m.querySelector('#fmPmsCostSave').onclick = function () { api.saveSetting('pms_standard_cost', m.querySelector('#fmPmsCost').value).then(function () { toast('Standard PMS cost saved'); }).catch(fail); };
        m.querySelector('#fmPushSave').onclick = function () { api.saveSetting('push_teams', m.querySelector('#fmPush').value).then(function () { toast('Push targets saved'); }).catch(fail); };
      }).catch(fail);
    };

    load();
    return { refresh: function () { return S.sel ? refreshVehicle() : refreshAll(); }, destroy: function () { rootEl.innerHTML = ''; } };
  }
  root.ConsoleFMS = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
