let CONTROLS = [];
const state = { selected: new Set(), rows: {} }; // rows: id -> {weakness, owner, resources, start, due, milestones, status, notes}
const LS_CALC = 'sprs-calc-v1';
const LS_POAM = 'poam-gen-v1';
const $ = (id) => document.getElementById(id);

const RES_HINT = {
  '3.1': 'Identity/access tooling, MFA licenses, admin time',
  '3.2': 'Security training provider or platform, staff time',
  '3.3': 'SIEM or log aggregation tool, log storage',
  '3.4': 'Endpoint management tool, baseline documentation',
  '3.5': 'MFA solution, directory/account cleanup',
  '3.6': 'IR plan drafting, tabletop exercise time',
  '3.7': 'Maintenance procedures, vendor agreements',
  '3.8': 'Media handling procedures, destruction service',
  '3.9': 'Personnel screening process, HR coordination',
  '3.10': 'Physical controls (locks, badges), visitor logging',
  '3.11': 'Risk assessment template, assessor time',
  '3.12': 'SSP authoring, assessment support',
  '3.13': 'Firewall/VPN, FIPS-validated cryptographic modules',
  '3.14': 'EDR/antimalware, patch management tooling',
};

const DEFAULT_MILESTONES = [
  'Define approach, assign owner, confirm resources',
  'Implement the control across all in-scope systems',
  'Verify implementation and file evidence',
];

const STAGGER = {
  aggressive: { '5': 30, '5/3': 30, '3': 60, '1': 120 },
  steady:     { '5': 60, '5/3': 60, '3': 90, '1': 180 },
  relaxed:    { '5': 90, '5/3': 90, '3': 180, '1': 365 },
};

const ND_IDS = ['3.1.20', '3.1.22', '3.10.3', '3.10.4', '3.10.5', '3.12.4'];

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function weightNum(c) {
  if (c.weight === '5/3') return 5;
  return parseInt(c.weight, 10) || 0;
}

function mapsOrder(a, b) {
  return weightNum(b) - weightNum(a) || parseFloat(a.id) - parseFloat(b.id);
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, n) {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

function defaultRow(c) {
  return {
    weakness: 'Requirement not implemented. ' + c.requirement,
    owner: '',
    resources: RES_HINT[c.family] || '',
    start: '',
    due: '',
    milestones: DEFAULT_MILESTONES.join('\n'),
    status: 'Not Started',
    notes: '',
  };
}

function save() {
  try {
    const rows = {};
    for (const id of state.selected) rows[id] = state.rows[id] || defaultRow(byId(id));
    localStorage.setItem(LS_POAM, JSON.stringify({ selected: [...state.selected], rows }));
  } catch (e) {}
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_POAM) || 'null');
    if (d && Array.isArray(d.selected)) {
      state.selected = new Set(d.selected);
      state.rows = d.rows || {};
    }
  } catch (e) {}
}
function byId(id) { return CONTROLS.find(c => c.id === id); }

function checkCalcImport() {
  let found = 0;
  try {
    const d = JSON.parse(localStorage.getItem(LS_CALC) || '{}');
    found = Object.keys(d).filter(k => d[k] === 'no' || d[k] === 'partial').length;
  } catch (e) {}
  const btn = $('importCalc');
  if (found) {
    $('importStatus').innerHTML = 'Found <strong>' + found + '</strong> open gap(s) saved from the SPRS Score Calculator in this browser.';
    btn.disabled = false;
  } else {
    $('importStatus').textContent = 'No saved calculator answers in this browser. Pick requirements by hand below, or run the SPRS Calculator first and come back.';
    btn.disabled = true;
  }
}

function importFromCalc() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(LS_CALC) || '{}'); } catch (e) {}
  state.selected = new Set(Object.keys(d).filter(k => (d[k] === 'no' || d[k] === 'partial') && byId(k)));
  for (const id of state.selected) if (!state.rows[id]) state.rows[id] = defaultRow(byId(id));
  save(); renderWarnings(); renderPicker(); renderPlan();
}

function renderWarnings() {
  const box = $('warnings');
  const ndSel = [...state.selected].filter(id => ND_IDS.includes(id));
  const sspSel = state.selected.has('3.12.4');
  let html = '';
  if (ndSel.length) {
    html += '<div class="warn bad"><strong>Blocked: ' + ndSel.length + ' never-deferrable requirement(s) selected (' + ndSel.map(esc).join(', ') + ').</strong><br>' +
      'These six can never sit on a POA&M. They must be implemented before the assessment, no exceptions. Uncheck them above; they belong in your implementation plan, not this POA&M.</div>';
  }
  if (sspSel) {
    html += '<div class="warn bad"><strong>3.12.4 is selected.</strong> Without a System Security Plan, no assessment can be completed at all. Write the SSP first; it is not a POA&M item.</div>';
  }
  const n = state.selected.size - ndSel.length;
  if (n > 0) {
    html += '<div class="warn info"><strong>' + n + ' item(s)</strong> on this POA&M. Remember: a POA&M does not change your SPRS score. It documents the plan to close each gap, which is what assessors and contracting officers want to see.</div>';
  }
  $('warnCard').classList.toggle('hidden', !html);
  box.innerHTML = html;
}

function renderPicker() {
  const q = ($('search').value || '').toLowerCase();
  const fam = $('familyFilter').value;
  const wt = $('weightFilter').value;
  const hideNd = $('hideNd').checked;
  const fams = {};
  for (const c of CONTROLS) (fams[c.family] = fams[c.family] || c.family_name);
  const fs = $('familyFilter');
  if (fs.options.length <= 1) {
    for (const f of Object.keys(fams).sort((a, b) => parseFloat(a) - parseFloat(b))) {
      const o = document.createElement('option');
      o.value = f; o.textContent = f + ' ' + fams[f];
      fs.appendChild(o);
    }
  }
  const list = CONTROLS.filter(c => {
    if (hideNd && c.never_deferrable) return false;
    if (fam && c.family !== fam) return false;
    if (wt && c.weight !== wt) return false;
    if (q && !(c.id.includes(q) || c.requirement.toLowerCase().includes(q))) return false;
    return true;
  });
  $('picker').innerHTML = list.map(c =>
    '<label class="pick' + (c.never_deferrable ? ' nd' : '') + '">' +
    '<input type="checkbox" data-pick="' + c.id + '"' + (state.selected.has(c.id) ? ' checked' : '') + '> ' +
    '<span class="pick-id">' + c.id + '</span> ' +
    '<span class="badge w' + c.weight.replace('/', '') + '">' + c.weight + 'pt</span> ' +
    (c.never_deferrable ? '<span class="badge nd">NEVER DEFERRABLE</span> ' : '') +
    '<span class="pick-req">' + esc(c.requirement) + '</span></label>'
  ).join('') || '<p class="muted">No requirements match the filters.</p>';
  $('picker').querySelectorAll('[data-pick]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) { state.selected.add(cb.dataset.pick); if (!state.rows[cb.dataset.pick]) state.rows[cb.dataset.pick] = defaultRow(byId(cb.dataset.pick)); }
      else state.selected.delete(cb.dataset.pick);
      save(); renderWarnings(); renderPlan();
    });
  });
}

function selectedControls() {
  return [...state.selected].map(byId).filter(Boolean).sort(mapsOrder);
}

function renderPlan() {
  const list = selectedControls();
  const show = list.length > 0;
  $('planCard').classList.toggle('hidden', !show);
  $('exportCard').classList.toggle('hidden', !show);
  if (!show) { $('plan').innerHTML = ''; return; }
  $('planCount').textContent = '— ' + list.length + ' item(s), MAPS priority order';
  $('plan').innerHTML = list.map(c => {
    const r = state.rows[c.id] || (state.rows[c.id] = defaultRow(c));
    const blocked = c.never_deferrable;
    return '<div class="prow' + (blocked ? ' blocked' : '') + '" data-row="' + c.id + '">' +
      '<div class="prow-head"><span class="pick-id">' + c.id + '</span> ' +
      '<span class="badge w' + c.weight.replace('/', '') + '">' + c.weight + 'pt</span> ' +
      (blocked ? '<span class="badge nd">CANNOT BE ON POA&amp;M</span>' : '') +
      '<span class="prow-fam">' + c.family + ' ' + esc(c.family_name) + '</span></div>' +
      '<label>Weakness / gap <textarea data-f="weakness" rows="2">' + esc(r.weakness) + '</textarea></label>' +
      '<div class="grid2">' +
      '<label>Owner <input data-f="owner" value="' + esc(r.owner) + '" placeholder="Name or role"></label>' +
      '<label>Resources required <input data-f="resources" value="' + esc(r.resources) + '"></label>' +
      '<label>Scheduled start <input type="date" data-f="start" value="' + esc(r.start) + '"></label>' +
      '<label>Scheduled completion <input type="date" data-f="due" value="' + esc(r.due) + '"></label>' +
      '</div>' +
      '<label>Milestones (one per line) <textarea data-f="milestones" rows="3">' + esc(r.milestones) + '</textarea></label>' +
      '<div class="grid2">' +
      '<label>Status <select data-f="status">' +
      ['Not Started', 'In Progress', 'Delayed', 'Completed'].map(s => '<option' + (r.status === s ? ' selected' : '') + '>' + s + '</option>').join('') +
      '</select></label>' +
      '<label>Notes <input data-f="notes" value="' + esc(r.notes) + '" placeholder="Evidence location, dependencies…"></label>' +
      '</div>' +
      '<button class="btn ghost sm" data-remove="' + c.id + '">Remove from POA&amp;M</button>' +
      '</div>';
  }).join('');
  $('plan').querySelectorAll('[data-row] [data-f]').forEach(inp => {
    inp.addEventListener('change', () => {
      const id = inp.closest('[data-row]').dataset.row;
      state.rows[id][inp.dataset.f] = inp.value;
      save();
    });
  });
  $('plan').querySelectorAll('[data-remove]').forEach(b => {
    b.addEventListener('click', () => {
      state.selected.delete(b.dataset.remove);
      save(); renderWarnings(); renderPicker(); renderPlan();
    });
  });
}

function applyDates() {
  const start = $('defaultStart').value || fmtDate(new Date());
  const stag = STAGGER[$('stagger').value] || STAGGER.steady;
  for (const id of state.selected) {
    const c = byId(id);
    if (!c || c.never_deferrable) continue;
    const r = state.rows[id] || (state.rows[id] = defaultRow(c));
    r.start = start;
    r.due = addDays(start, stag[c.weight] || 180);
  }
  save(); renderPlan();
}

function planRows() {
  return selectedControls()
    .filter(c => !c.never_deferrable)
    .map(c => Object.assign({ id: c.id, family: c.family, family_name: c.family_name, weight: c.weight }, state.rows[c.id] || defaultRow(c)));
}

function csvCell(v) {
  v = String(v == null ? '' : v).replace(/\r?\n/g, ' | ');
  return /[",]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function exportCsv() {
  const rows = planRows();
  const head = ['Control ID', 'Family', 'Weight', 'Weakness', 'Owner', 'Resources Required', 'Scheduled Start', 'Scheduled Completion', 'Status', 'Milestones', 'Notes'];
  const lines = [head.join(',')].concat(rows.map(r =>
    [r.id, r.family + ' ' + r.family_name, r.weight, r.weakness, r.owner, r.resources, r.start, r.due, r.status, r.milestones, r.notes].map(csvCell).join(',')
  ));
  download('poam-nist-800-171.csv', lines.join('\n'), 'text/csv');
}

function exportMd() {
  const rows = planRows();
  const today = fmtDate(new Date());
  let md = '# Plan of Action & Milestones (POA&M)\n\n';
  md += 'NIST SP 800-171 Rev. 2 | Generated ' + today + ' with the AI Tech Pros POA&M Generator\n\n';
  md += '> A POA&M documents the plan to close each gap. It does not change the SPRS score. ' +
    'The six never-deferrable requirements (3.1.20, 3.1.22, 3.10.3, 3.10.4, 3.10.5, 3.12.4) cannot appear on a POA&M and are excluded below.\n\n';
  md += '## Summary\n\n';
  md += '| Control | Weight | Owner | Scheduled completion | Status |\n|---|---|---|---|---|\n';
  for (const r of rows) md += '| ' + r.id + ' | ' + r.weight + ' | ' + (r.owner || 'TBD') + ' | ' + (r.due || 'TBD') + ' | ' + r.status + ' |\n';
  md += '\n## Details\n\n';
  for (const r of rows) {
    md += '### ' + r.id + ' — ' + r.family + ' ' + r.family_name + ' (' + r.weight + '-point)\n\n';
    md += '**Weakness:** ' + r.weakness + '\n\n';
    md += '**Owner:** ' + (r.owner || 'TBD') + ' | **Resources:** ' + (r.resources || 'TBD') + '\n\n';
    md += '**Scheduled start:** ' + (r.start || 'TBD') + ' | **Scheduled completion:** ' + (r.due || 'TBD') + ' | **Status:** ' + r.status + '\n\n';
    md += '**Milestones:**\n\n';
    for (const m of String(r.milestones).split('\n').map(s => s.trim()).filter(Boolean)) md += '- [ ] ' + m + '\n';
    if (r.notes) md += '\n**Notes:** ' + r.notes + '\n';
    md += '\n';
  }
  download('poam-nist-800-171.md', md, 'text/markdown');
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

async function init() {
  const res = await fetch('data/nist-800-171-controls.json');
  const ds = await res.json();
  CONTROLS = ds.controls;
  load();
  $('defaultStart').value = fmtDate(new Date());
  checkCalcImport();
  renderWarnings();
  renderPicker();
  renderPlan();
  $('importCalc').addEventListener('click', importFromCalc);
  $('selectAll').addEventListener('click', () => {
    state.selected = new Set(CONTROLS.map(c => c.id));
    for (const id of state.selected) if (!state.rows[id]) state.rows[id] = defaultRow(byId(id));
    save(); renderWarnings(); renderPicker(); renderPlan();
  });
  $('clearAll').addEventListener('click', () => {
    state.selected = new Set();
    save(); renderWarnings(); renderPicker(); renderPlan();
  });
  $('search').addEventListener('input', renderPicker);
  $('familyFilter').addEventListener('change', renderPicker);
  $('weightFilter').addEventListener('change', renderPicker);
  $('hideNd').addEventListener('change', renderPicker);
  $('applyDates').addEventListener('click', applyDates);
  $('exportCsv').addEventListener('click', exportCsv);
  $('exportMd').addEventListener('click', exportMd);
  $('printBtn').addEventListener('click', () => window.print());
}
init();
