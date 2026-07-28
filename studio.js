// ═══════════════════════════════════════════════════
// STUDIO MODULE — Toolkit
// ═══════════════════════════════════════════════════
let _studioActivePlan = null;
let _studioCloFilter  = 'all';
let _studioTab        = 'plan';
let _studioNewCloStatus = 'exploring';

function studioSave() { saveState(); }

function studioInit() {
  studioTab(_studioTab, null, true);
}

function studioTab(name, el, force) {
  if (!force && _studioTab === name) return;
  _studioTab = name;
  document.querySelectorAll('.studio-stab').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('studio-tab-' + name);
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.studio-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('sp-' + name);
  if (panel) {
    panel.style.display = 'flex';
    panel.style.flexDirection = name === 'clo' ? 'column' : 'row';
    panel.style.flex = '1';
  }
  if (name === 'plan') renderPlanList_();
  if (name === 'clo')  renderClo_();
}

function suid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ── Projects ──
function renderPlanList_() {
  const el = document.getElementById('sp-plan-list'); if (!el) return;
  const q = ((document.getElementById('sp-plan-search')||{}).value||'').toLowerCase();
  let plans = S.studioPlan || [];
  if (q) plans = plans.filter(p =>
    (p.name||'').toLowerCase().includes(q) ||
    (p.tags||[]).some(t => t.toLowerCase().includes(q)) ||
    (p.notes||'').toLowerCase().includes(q)
  );
  if (!plans.length) {
    el.innerHTML = '<div style="padding:10px;font-size:12px;color:#808080;font-family:var(--font-ui);">暂无项目</div>';
    return;
  }
  el.innerHTML = plans.map(p => {
    const tagStr = (p.tags||[]).map(t =>
      `<span style="background:#000080;color:#fff;font-size:10px;padding:0 4px;font-family:var(--font-ui);">${t}</span>`
    ).join('');
    return `<div class="sp-plan-row${_studioActivePlan===p.id?' active':''}" onclick="selectPlan_('${p.id}')">
      <div class="sp-plan-row-name">${p.name||'（未命名）'}</div>
      ${tagStr ? `<div class="sp-plan-row-meta" style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px;">${tagStr}</div>` : ''}
    </div>`;
  }).join('');
}

function selectPlan_(id) {
  _studioActivePlan = id;
  const p = (S.studioPlan||[]).find(x => x.id === id);
  if (!p) return;
  renderPlanList_();
  document.getElementById('sp-plan-empty').style.display = 'none';
  const det = document.getElementById('sp-plan-detail');
  det.style.display = 'flex';
  document.getElementById('spd-name').textContent = p.name || '';
  document.getElementById('spd-f-notes').value = p.notes || '';
  renderPlanTagChips_(p);
}

function planField(field, val) {
  const p = (S.studioPlan||[]).find(x => x.id === _studioActivePlan); if (!p) return;
  p[field] = val;
  studioSave();
}

function renderPlanTagChips_(p) {
  const el = document.getElementById('spd-ptags'); if (!el) return;
  el.innerHTML = (p.tags||[]).map(t => {
    const esc = t.replace(/'/g,'&#39;');
    return `<span class="sp-tech-chip" style="background:#000080;color:#fff;border-color:#000060 #000040 #000040 #000060;">${t}<button class="sp-tech-del" style="color:#aaa;" onclick="removePlanTag_('${esc}')">×</button></span>`;
  }).join('');
}

function addPlanTag_() {
  const inp = document.getElementById('spd-ptag-inp'); if (!inp) return;
  const val = inp.value.trim(); if (!val) return;
  const p = (S.studioPlan||[]).find(x=>x.id===_studioActivePlan); if (!p) return;
  if (!p.tags) p.tags = [];
  if (!p.tags.includes(val)) { p.tags.push(val); studioSave(); renderPlanTagChips_(p); renderPlanList_(); }
  inp.value = '';
}

function removePlanTag_(tag) {
  const p = (S.studioPlan||[]).find(x=>x.id===_studioActivePlan); if (!p) return;
  p.tags = (p.tags||[]).filter(t=>t!==tag); studioSave(); renderPlanTagChips_(p); renderPlanList_();
}

function openNewPlanModal() { openModal('studioNewPlanModal'); setTimeout(()=>document.getElementById('snp-name').focus(),80); }

function createPlan_() {
  const name = document.getElementById('snp-name').value.trim();
  if (!name) { alert('请输入名称'); return; }
  const p = { id:suid(), name, tags:[], notes:'' };
  if (!S.studioPlan) S.studioPlan = [];
  S.studioPlan.push(p); studioSave();
  closeModal('studioNewPlanModal');
  document.getElementById('snp-name').value = '';
  renderPlanList_(); selectPlan_(p.id);
}

function deletePlan_() {
  if (!_studioActivePlan) return;
  if (!confirm('确认删除此项目？')) return;
  S.studioPlan = (S.studioPlan||[]).filter(p => p.id !== _studioActivePlan);
  _studioActivePlan = null; studioSave(); renderPlanList_();
  document.getElementById('sp-plan-empty').style.display = 'flex';
  document.getElementById('sp-plan-detail').style.display = 'none';
}

// ── Skills ──
function cloFilter_(f, btn) {
  _studioCloFilter = f;
  document.querySelectorAll('.studio-clo-filter').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderClo_();
}

function renderClo_() {
  const el = document.getElementById('sp-clo-list'); if (!el) return;
  const q = ((document.getElementById('clo-search-inp')||{}).value||'').toLowerCase();
  let list = S.studioClo || [];
  if (_studioCloFilter !== 'all') list = list.filter(t=>t.status===_studioCloFilter);
  if (q) list = list.filter(t=>(t.name+' '+(t.category||'')+' '+(t.notes||'')).toLowerCase().includes(q));
  el.innerHTML = list.map(t => `
    <div class="sp-clo-row">
      <div class="sp-clo-dot${t.status==='mastered'?' mastered':''}" title="click to toggle" onclick="toggleCloStatus_('${t.id}')"></div>
      <div style="flex:1;min-width:0;">
        ${t.category?`<div class="sp-clo-cat">${t.category}</div>`:''}
        <div class="sp-clo-name">${t.name}</div>
        ${t.notes?`<div class="sp-clo-notes">${t.notes}</div>`:''}
      </div>
      <div class="sp-clo-acts">
        <button class="pxl-btn" onclick="openEditCloModal_('${t.id}')" style="font-size:10px;padding:1px 6px;">编辑</button>
        <button class="pxl-btn" onclick="deleteClo_('${t.id}')" style="font-size:10px;padding:1px 6px;border-color:#cc0000;color:#cc0000;">删除</button>
      </div>
    </div>
  `).join('') || '<div style="padding:12px;font-size:12px;color:#808080;font-family:var(--font-ui);">暂无技能</div>';
  const total    = (S.studioClo||[]).length;
  const mastered = (S.studioClo||[]).filter(t=>t.status==='mastered').length;
  const mEl = document.getElementById('clo-stat-mastered');
  const tEl = document.getElementById('clo-stat-total');
  if (mEl) mEl.textContent = mastered;
  if (tEl) tEl.textContent = total;
  const cats = {};
  (S.studioClo||[]).forEach(t=>{ const c=t.category||'其他'; cats[c]=(cats[c]||0)+1; });
  const catsEl = document.getElementById('clo-stat-cats');
  if (catsEl) catsEl.innerHTML = Object.entries(cats).map(([c,n])=>`<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>${c}</span><span>${n}</span></div>`).join('');
}

function toggleCloStatus_(id) {
  const t = (S.studioClo||[]).find(x=>x.id===id); if (!t) return;
  t.status = t.status==='mastered'?'exploring':'mastered'; studioSave(); renderClo_();
}

function deleteClo_(id) {
  if (!confirm('确认删除此技能？')) return;
  S.studioClo = (S.studioClo||[]).filter(x=>x.id!==id); studioSave(); renderClo_();
}

function setNewCloStatus(s) {
  _studioNewCloStatus = s;
  const eBtn = document.getElementById('snc-btn-exploring');
  const mBtn = document.getElementById('snc-btn-mastered');
  if (eBtn) { eBtn.style.background = s==='exploring'?'#000080':''; eBtn.style.color = s==='exploring'?'#fff':''; }
  if (mBtn) { mBtn.style.background = s==='mastered'?'#008000':''; mBtn.style.color = s==='mastered'?'#fff':''; }
}

function openNewCloModal() {
  document.getElementById('snc-modal-title').textContent = '新建技能';
  document.getElementById('snc-edit-id').value = '';
  document.getElementById('snc-cname').value  = '';
  document.getElementById('snc-ccat').value   = '';
  document.getElementById('snc-cnotes').value = '';
  _studioNewCloStatus = 'exploring';
  setNewCloStatus('exploring');
  openModal('studioNewCloModal');
  setTimeout(()=>document.getElementById('snc-cname').focus(),80);
}

function openEditCloModal_(id) {
  const t = (S.studioClo||[]).find(x=>x.id===id); if (!t) return;
  document.getElementById('snc-modal-title').textContent = '编辑技能';
  document.getElementById('snc-edit-id').value = id;
  document.getElementById('snc-cname').value   = t.name  || '';
  document.getElementById('snc-ccat').value    = t.category || '';
  document.getElementById('snc-cnotes').value  = t.notes || '';
  _studioNewCloStatus = t.status || 'exploring';
  setNewCloStatus(_studioNewCloStatus);
  openModal('studioNewCloModal');
}

function saveCloModal_() {
  const name = document.getElementById('snc-cname').value.trim();
  if (!name) { alert('请输入名称'); return; }
  const editId = document.getElementById('snc-edit-id').value;
  if (!S.studioClo) S.studioClo = [];
  if (editId) {
    const t = S.studioClo.find(x=>x.id===editId);
    if (t) { t.name=name; t.category=document.getElementById('snc-ccat').value.trim(); t.notes=document.getElementById('snc-cnotes').value.trim(); t.status=_studioNewCloStatus; }
  } else {
    S.studioClo.push({ id:suid(), name, category:document.getElementById('snc-ccat').value.trim(), notes:document.getElementById('snc-cnotes').value.trim(), status:_studioNewCloStatus });
  }
  studioSave(); closeModal('studioNewCloModal'); renderClo_();
}

function studioExport() {
  const data = { studioPlan: S.studioPlan||[], studioClo: S.studioClo||[] };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'toolkit-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}

// Auto-init if Toolkit tab is already active when this script loads
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('sec-studio') &&
      document.getElementById('sec-studio').classList.contains('active')) {
    studioInit();
  }
});
