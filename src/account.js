/* ---------- 帳號、同步與匯出（選配：要設定 GAS_URL 與 GOOGLE_CLIENT_ID 才會出現登入） ---------- */
const ACCT_KEY = 'bobo-acct-v1';
const Acct = {
  s: null,            // { session, email, name }
  status: 'idle',     // idle | syncing | ok | fail
  last: 0, timer: null, busy: false,
  enabled() { return !!(CONFIG.GAS_URL && CONFIG.GOOGLE_CLIENT_ID); },
  init() {
    try { this.s = JSON.parse(localStorage.getItem(ACCT_KEY)); } catch (e) { this.s = null; }
    if (this.s && !(this.s.session && this.s.email)) this.s = null;
    if (this.s && this.enabled()) this.sync(true);
  },
  chip() {
    if (!this.enabled()) return '';
    return '<button class="pill acct" type="button" data-act="acct" title="' + (this.s ? esc(this.s.email) : '登入後可同步進度') + '">' + (this.s ? '👤 ' + esc(this.s.name || this.s.email.split('@')[0]) : '👤 登入') + '</button>';
  },
  persist() { try { localStorage.setItem(ACCT_KEY, JSON.stringify(this.s)); } catch (e) { } },
  clear() { this.s = null; try { localStorage.removeItem(ACCT_KEY); } catch (e) { } },
  async call(body) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(CONFIG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl.signal });
      return await r.json();
    } finally { clearTimeout(t); }
  },
  expired() { this.clear(); this.status = 'idle'; toast('登入已過期，請重新登入'); renderTop(); },
  dirty() { if (!this.s || !this.enabled()) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(false), 2000); },
  // 把本機進度送上去；伺服器合併後回傳，再合併回本機
  async sync(refresh) {
    if (!this.s || this.busy) return;
    this.busy = true; this.status = 'syncing'; this.paint();
    try {
      const r = await this.call({ action: 'save', session: this.s.session, progress: S });
      if (!r.ok) { if (r.error === 'session') { this.expired(); return; } throw new Error(r.error); }
      this.status = 'ok'; this.last = r.updatedAt || Date.now();
      if (applyRemote(r.progress) && refresh) { renderTop(); renderKeep(); }
    } catch (e) { this.status = 'fail'; } finally { this.busy = false; this.paint(); }
  },
  paint() {
    const el = $('#acctst'); if (!el) return;
    el.textContent = { idle: '', syncing: '同步中…', ok: '✔ 已同步' + (this.last ? '（' + new Date(this.last).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) + '）' : ''), fail: '⚠ 同步失敗，稍後會再試（進度仍存在這台裝置）' }[this.status];
  }
};

/* ---- 合併規則（與伺服器相同）：星星取最高分，完成與徽章只增不減 ---- */
function cleanProg(d) {
  const out = { v: 1, u: {} };
  if (!d || typeof d !== 'object' || !d.u || typeof d.u !== 'object') return out;
  Object.keys(d.u).forEach(id => {
    if (!byId[id]) return;
    const x = d.u[id] || {}, o = { learn: !!x.learn, quizDone: !!x.quizDone, lab: !!x.lab, badged: !!x.badged, q: {} };
    Object.keys(x.q || {}).forEach(k => { if (/^u\d{1,3}-q\d{1,2}$/.test(k)) o.q[k] = Math.max(0, Math.min(2, Number(x.q[k]) || 0)); });
    out.u[id] = o;
  });
  return out;
}
function mergeProg(a, b) {
  a = cleanProg(a); b = cleanProg(b);
  const out = { v: 1, u: {} };
  new Set(Object.keys(a.u).concat(Object.keys(b.u))).forEach(id => {
    const x = a.u[id] || { q: {} }, y = b.u[id] || { q: {} };
    const o = { learn: !!(x.learn || y.learn), quizDone: !!(x.quizDone || y.quizDone), lab: !!(x.lab || y.lab), badged: !!(x.badged || y.badged), q: {} };
    new Set(Object.keys(x.q).concat(Object.keys(y.q))).forEach(k => { o.q[k] = Math.max(x.q[k] || 0, y.q[k] || 0); });
    out.u[id] = o;
  });
  return out;
}
// 合併進本機；回傳本機是否有變動
function applyRemote(remote) {
  const before = JSON.stringify(cleanProg(S)), m = mergeProg(S, remote);
  if (JSON.stringify(m) === before) return false;
  S = m; try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { }
  return true;
}

/* ---- 匯出 ---- */
function reportRows() {
  return UN.map(u => { const x = U(u.id); return { title: (THEMES.length > 1 ? themeOf(u).title + '・' : '') + u.n + '. ' + u.title, learn: x.learn ? 1 : 0, quiz: x.quizDone ? 1 : 0, lab: x.lab ? 1 : 0, stars: ustars(u), max: umax(u), badge: x.badged ? 1 : 0 }; });
}
function download(name, text, type) {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type }));
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const today = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); };
function exportJSON() { download('bobo-progress-' + today() + '.json', JSON.stringify({ app: 'bobo', exportedAt: new Date().toISOString(), progress: cleanProg(S) }, null, 2), 'application/json'); }
function exportCSV() {
  const q = s => /[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : s;
  const rows = reportRows();
  download('bobo-progress-' + today() + '.csv', '﻿單元,學習,驗證,實作,星星,滿分,徽章\n' + rows.map(r => [q(r.title), r.learn, r.quiz, r.lab, r.stars, r.max, r.badge].join(',')).join('\n'), 'text/csv');
}
function importFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result), p = j && j.progress ? j.progress : j;
      if (!p || !p.u) throw new Error('format');
      const ch = applyRemote(p); save(); renderTop(); renderKeep();
      toast(ch ? '已載入進度（與目前的進度合併）' : '檔案裡沒有比目前更新的進度');
    } catch (e) { toast('這個檔案看起來不是 BoBo 的進度檔'); }
  };
  rd.onerror = () => toast('讀取檔案失敗'); rd.readAsText(file);
}

/* ---- 登入視窗 ---- */
function loadGIS() {
  return new Promise((res, rej) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return res();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    const t = setTimeout(() => rej(new Error('timeout')), 8000);
    s.onload = () => { clearTimeout(t); res(); }; s.onerror = () => { clearTimeout(t); rej(new Error('load')); };
    document.head.appendChild(s);
  });
}
async function onGoogle(resp) {
  try {
    const r = await Acct.call({ action: 'login', idToken: resp.credential });
    if (!r.ok) { toast(r.error === 'auth' ? '登入驗證失敗，請再試一次' : '登入失敗'); return; }
    Acct.s = { session: r.session, email: r.email, name: r.name }; Acct.persist(); Acct.status = 'ok'; Acct.last = r.updatedAt || Date.now();
    applyRemote(r.progress); Acct.sync(false);
    closeModal(); toast('已登入：' + r.email); Mascot.say('歡迎回來！你的進度會自動備份。', 'cheer'); renderTop(); renderKeep();
  } catch (e) { toast('連不上雲端，先用訪客模式也能學習'); }
}
function acctModal() {
  if (!Acct.s) {
    showModal('<h2>👤 登入並同步進度</h2><p>用 Google 帳號登入後，進度會自動備份到雲端，換裝置也能繼續；也能把成績單寄到你的 Gmail。</p>' +
      '<p class="muted" style="font-size:.9rem">只會記錄你的 Google 帳號 Email 與學習進度，不會取得密碼。不登入也能完整學習。</p>' +
      '<div id="gbtn" style="display:flex;justify-content:center;min-height:44px;margin:10px 0"><span class="muted">載入登入按鈕中…</span></div>' +
      '<div class="row" style="justify-content:center"><button class="btn sec" type="button" data-act="close">先不登入</button></div>');
    loadGIS().then(() => {
      window.google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: onGoogle, ux_mode: 'popup' });
      const el = $('#gbtn'); if (el) { el.innerHTML = ''; window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', locale: 'zh-TW' }); }
    }).catch(() => { const el = $('#gbtn'); if (el) el.innerHTML = '<div class="warnbox">登入元件載入失敗（可能離線或被擋住）。你仍可用訪客模式，進度存在這台裝置。</div>'; });
  } else {
    showModal('<h2>👤 已登入</h2><p><strong>' + esc(Acct.s.email) + '</strong></p><p id="acctst" class="muted"></p>' +
      '<div class="row" style="justify-content:center"><button class="btn sec" type="button" data-act="acct-sync">🔄 立即同步</button><button class="btn" type="button" data-act="acct-mail">📧 寄成績單到我的 Gmail</button></div>' +
      '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sec sm" type="button" data-act="acct-out">登出</button><button class="btn sec sm" type="button" data-act="close">關閉</button></div>');
    Acct.paint();
  }
}
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act;
  if (act === 'acct') acctModal();
  else if (act === 'acct-sync') { await Acct.sync(true); if (Acct.status === 'ok') toast('已同步'); }
  else if (act === 'acct-out') { try { await Acct.call({ action: 'logout', session: Acct.s.session }); } catch (x) { } Acct.clear(); closeModal(); renderTop(); toast('已登出，進度仍保留在這台裝置'); }
  else if (act === 'acct-mail') {
    el.disabled = true; const old = el.textContent; el.textContent = '寄送中…';
    try {
      await Acct.sync(false);
      const r = await Acct.call({ action: 'mail', session: Acct.s.session, report: { rows: reportRows() } });
      if (r.ok) toast('已寄到 ' + r.to + '（也請看一下垃圾郵件匣）');
      else if (r.error === 'limit') toast('今天寄太多次了，明天再試');
      else if (r.error === 'session') Acct.expired();
      else toast('寄送失敗，請稍後再試');
    } catch (x) { toast('連不上雲端，寄送失敗'); }
    el.disabled = false; el.textContent = old;
  }
  else if (act === 'exp-json') exportJSON();
  else if (act === 'exp-csv') exportCSV();
  else if (act === 'imp') { const f = $('#impfile'); if (f) f.click(); }
});
document.addEventListener('change', e => { if (e.target && e.target.id === 'impfile' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; } });

/* ---- 重設：已登入時，雲端的進度也要一起清掉，否則下次同步會被「取最高分」補回來 ---- */
async function resetAll() {
  clearTimeout(Acct.timer);
  if (Acct.s && Acct.enabled()) {
    while (Acct.busy) await new Promise(r => setTimeout(r, 100));
    try {
      const r = await Acct.call({ action: 'reset', session: Acct.s.session });
      if (!r.ok) {
        if (r.error === 'session') { Acct.expired(); toast('登入已過期，請重新登入後再重設，才能一併清除雲端進度'); }
        else toast('雲端重設失敗，請稍後再試');
        return false;
      }
    } catch (e) { toast('連不上雲端，重設沒有完成，請稍後再試'); return false; }
    Acct.status = 'ok'; Acct.last = Date.now();
  }
  S = { v: 1, u: {} };
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { }
  return true;
}
