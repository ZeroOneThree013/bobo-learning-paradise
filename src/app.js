/* ---------- 狀態與進度 ---------- */
const LS_KEY = 'bobo-lab-v1';
const FB_KEY = 'bobo-feedback-queue';
function loadState() {
  try { const j = JSON.parse(localStorage.getItem(LS_KEY)); if (j && j.v === 1 && j.u) return j; } catch (e) { }
  return { v: 1, u: {} };
}
let S = loadState();
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { } if (typeof Acct !== 'undefined') Acct.dirty(); }
function U(id) { return S.u[id] || (S.u[id] = { learn: false, quizDone: false, lab: false, badged: false, q: {} }); }

// 工作用的單元資料（雲端題庫成功時，會換掉對應單元的題目）
const UN = UNITS.map(u => Object.assign({}, u, { questions: u.questions.slice() }));
// THEMES（每本書的資料）由 build.py 從 content/<主題>/theme.json 產生；這裡只放「規劃中」的占位卡與輔助函式
const COMING = { id: 'next', icon: '🌱', title: '更多主題', sub: '小博正在整理下一本書' };
const themeById = {}; THEMES.forEach(t => { themeById[t.id] = t; });
const themeUnits = tid => UN.filter(u => u.theme === tid);
const themeOf = u => themeById[u.theme];
const videoOf = u => { const t = themeOf(u); return t.videos[u.video || 0] || t.videos[0]; };
const byId = {}; UN.forEach(u => { byId[u.id] = u; });
let cloud = 'off'; // off | loading | ok | fail

const qid = (u, i) => u.id + '-q' + (i + 1);
const qmax = q => (q.type === 'fill' ? 2 : 1);
const umax = u => u.questions.reduce((s, q) => s + qmax(q), 0);
function ustars(u) { const st = U(u.id).q; return u.questions.reduce((s, q, i) => s + (st[qid(u, i)] || 0), 0); }
const unitDone = u => { const x = U(u.id); return !!(x.learn && x.quizDone && x.lab); };
const unitIdx = id => UN.findIndex(u => u.id === id);

/* ---------- 小博 ---------- */
const Mascot = {
  timer: null,
  init() {
    $('#dock').innerHTML = '<div class="bubble empty" id="bubble" aria-live="polite"></div><div class="bobo idle" id="bobo"><img id="bimg" alt="小博（Bobo）吉祥物" src="' + MASCOT.happy + '"><button class="dtoggle" type="button" id="dtoggle" aria-label="收起小博" title="收起／展開小博">×</button></div>';
    $('#dtoggle').onclick = () => { const d = $('#dock'), m = d.classList.toggle('min'); const t = $('#dtoggle'); t.textContent = m ? '📖' : '×'; t.setAttribute('aria-label', m ? '展開小博' : '收起小博'); };
  },
  set(mood) {
    const bobo = $('#bobo'), img = $('#bimg');
    if (!bobo) return;
    img.src = MASCOT[mood] || MASCOT.happy;
    bobo.className = 'bobo';
    bobo.querySelectorAll('.star,.drop').forEach(n => n.remove());
    void bobo.offsetWidth;
    bobo.className = 'bobo ' + (mood === 'happy' ? 'idle' : (mood === 'think' ? '' : mood));
    if (mood === 'cheer') {
      ['⭐', '✨', '🌟', '✨'].forEach((s, i) => {
        const n = document.createElement('span'); n.className = 'star'; n.textContent = s;
        n.style.left = (10 + i * 32) + 'px'; n.style.top = (10 + (i % 2) * 24) + 'px'; n.style.animationDelay = (i * .12) + 's';
        bobo.appendChild(n); setTimeout(() => n.remove(), 1600);
      });
    }
    if (mood === 'sad') {
      const n = document.createElement('span'); n.className = 'drop'; n.textContent = '💧';
      bobo.appendChild(n); setTimeout(() => n.remove(), 1700);
    }
    clearTimeout(this.timer);
    if (mood !== 'happy') this.timer = setTimeout(() => this.set('happy'), mood === 'think' ? 9000 : 5000);
  },
  say(text, mood) {
    const b = $('#bubble');
    if (b && text) { b.textContent = text; b.classList.remove('empty'); clearTimeout(this.btimer); this.btimer = setTimeout(() => this.hide(), 6000); }
    this.set(mood || 'happy');
  },
  hide() { const b = $('#bubble'); if (b) b.classList.add('empty'); }
};
const CHEER = ['答對了！太棒了！', '小博好開心，你學得好快！', '漂亮！繼續保持～', '就是這樣，你真的懂了！'];
const SAD = ['沒關係，錯誤也是學習的一部分。', '差一點點！小博陪你再看一次。', '別灰心，我們看看哪裡不一樣。'];
const THINK = ['嗯～這題有點難，看看提示吧。', '小博也在想…你一定可以的！'];

/* ---------- 小元件 ---------- */
function toast(msg) {
  $$('.toast').forEach(n => n.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
function showModal(html) {
  closeModal();
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = '<div class="card">' + html + '</div>';
  document.body.appendChild(m);
  const f = m.querySelector('textarea,button'); if (f) f.focus();
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }

/* ---------- 頁首 ---------- */
function renderTop() {
  const tot = UN.reduce((s, u) => s + ustars(u), 0), max = UN.reduce((s, u) => s + umax(u), 0);
  const h = location.hash.replace(/^#\/?/, '').split('/')[0];
  const cur = k => (h === k ? ' aria-current="page"' : '');
  $('#top').innerHTML = '<div class="top-in"><a class="brand" href="#/"><img src="' + MASCOT.happy + '" alt=""><span>BoBo 學習樂園<small>和小博一起學新知</small></span></a>' +
    '<nav aria-label="主選單"><a href="#/"' + cur('') + '>主題書架</a><a href="#/badges"' + cur('badges') + '>我的成就</a><a href="#/about"' + cur('about') + '>關於與來源</a></nav>' +
    '<span class="pill" title="目前累積的星星">⭐ ' + tot + ' / ' + max + '</span>' + (typeof Acct !== 'undefined' ? Acct.chip() : '') + '</div>';
}

/* ---------- 路由 ---------- */
let Q = null;           // 目前的作答狀態
const LI = {};          // 各單元目前的學習卡片
let labTeardown = null;

function render(keepScroll) {
  if (labTeardown) { labTeardown(); labTeardown = null; }
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  renderTop();
  const app = $('#app');
  app.style.animation = 'none'; void app.offsetWidth; app.style.animation = '';
  if (parts[0] === 'u' && byId[parts[1]]) unitView(byId[parts[1]], parts[2] || 'learn');
  else if (parts[0] === 'badges') badgesView();
  else if (parts[0] === 'about') aboutView();
  else if (parts[0] === 't' && themeById[parts[1]]) mapView(themeById[parts[1]]);
  else themeHome();
  document.title = 'BoBo 學習樂園';
  if (!keepScroll) window.scrollTo(0, 0);
}

/* ---------- 首頁 ---------- */
function mapView(t) {
  const TU = themeUnits(t.id);
  const m = TU.reduce((s, u) => s + [U(u.id).learn, U(u.id).quizDone, U(u.id).lab].filter(Boolean).length, 0);
  const pct = Math.round(m / (TU.length * 3) * 100);
  const done = TU.filter(unitDone).length;
  const next = TU.find(u => !unitDone(u)) || TU[0];
  const stat = pct === 0 ? '還沒開始，我們從第 1 單元出發吧！' : (done === TU.length ? '全部單元完成了，你是小博的得意門生！' : '已完成 ' + done + ' 個單元，繼續加油！');
  $('#app').innerHTML =
    '<div class="crumb"><a href="#/">← 所有主題</a></div>' +
    '<section class="card hero"><img class="pic" src="' + MASCOT.happy + '" alt="小博（Bobo）揮手打招呼">' +
    '<div><h1>' + t.icon + ' ' + esc(t.title) + '</h1>' +
    '<p>' + esc(t.intro) + '（目前共 ' + TU.length + ' 個單元），每個單元都有 <strong>📖 學習</strong>、<strong>✅ 驗證</strong>、<strong>🛠 實作</strong>，並對照 ' + esc(t.official.name) + '。</p>' +
    '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="整體進度"><i style="width:' + pct + '%"></i></div>' +
    '<p class="muted" style="margin:.4em 0 .9em">整體進度 ' + pct + '%　' + stat + '</p>' +
    '<div class="row"><a class="btn" href="#/u/' + next.id + '">' + (pct === 0 ? '🚀 從第 1 單元開始' : '▶ 繼續：' + next.title) + '</a><a class="btn sec" href="#/about">關於與來源</a></div></div></section>' +
    '<h2 style="margin:22px 4px 10px">🗺️ 學習地圖</h2><div class="grid">' +
    TU.map(u => {
      const x = U(u.id);
      return '<a class="card unit" href="#/u/' + u.id + '"><span class="no" aria-hidden="true">' + u.n + '</span><span class="ic" aria-hidden="true">' + u.icon + '</span>' +
        '<h3>' + esc(u.title) + '</h3><span class="muted" style="font-size:.9rem">' + esc(u.sub) + '</span>' +
        '<span class="pips"><span class="pip' + (x.learn ? ' on' : '') + '">' + (x.learn ? '✔ ' : '') + '學習</span><span class="pip' + (x.quizDone ? ' on' : '') + '">' + (x.quizDone ? '✔ ' : '') + '驗證</span><span class="pip' + (x.lab ? ' on' : '') + '">' + (x.lab ? '✔ ' : '') + '實作</span></span>' +
        '<span class="stars">⭐ ' + ustars(u) + ' / ' + umax(u) + '</span>' +
        (unitDone(u) ? '<span class="medal" title="已獲得徽章" aria-label="已獲得徽章">' + u.icon + '</span>' : '') + '</a>';
    }).join('') + '</div>';
  Mascot.say(pct === 0 ? '這是「' + t.title + '」的學習地圖，從第 1 單元開始吧！' : '歡迎回來！要不要接著學「' + next.title + '」？', 'happy');
}

function themeHome() {
  const card = t => {
    const TU = themeUnits(t.id), done = TU.filter(unitDone).length;
    const tot = TU.reduce((s, u) => s + ustars(u), 0), max = TU.reduce((s, u) => s + umax(u), 0);
    return '<a class="card unit" href="#/t/' + t.id + '"><span class="ic" aria-hidden="true">' + t.icon + '</span><h3>' + esc(t.title) + '</h3><span class="muted" style="font-size:.9rem">' + esc(t.sub) + '</span>' +
      '<span class="pips"><span class="pip on">' + TU.length + ' 個單元</span><span class="pip' + (done === TU.length ? ' on' : '') + '">已完成 ' + done + '</span></span><span class="stars">⭐ ' + tot + ' / ' + max + '</span></a>';
  };
  $('#app').innerHTML =
    '<section class="card hero"><img class="pic" src="' + MASCOT.happy + '" alt="小博（Bobo）揮手打招呼">' +
    '<div><h1>歡迎來到 BoBo 學習樂園！</h1>' +
    '<p>我是智慧之書「小博」。每個主題都是一本書，裡面分成小單元，用 <strong>📖 學習</strong>、<strong>✅ 驗證</strong>、<strong>🛠 實作</strong> 三步驟學會它。先挑一本書吧！</p></div></section>' +
    '<h2 style="margin:22px 4px 10px">📚 主題書架</h2><div class="grid">' +
    THEMES.map(card).join('') +
    '<div class="card unit" style="opacity:.75" aria-label="規劃中的主題"><span class="ic" aria-hidden="true">' + COMING.icon + '</span><h3>' + esc(COMING.title) + '</h3><span class="muted" style="font-size:.9rem">' + esc(COMING.sub) + '</span><span class="pips"><span class="pip">規劃中</span></span></div></div>';
  Mascot.say('嗨！我是小博，今天想翻開哪一本書？', 'happy');
}

/* ---------- 單元頁 ---------- */
function unitView(u, tab) {
  if (['learn', 'quiz', 'lab'].indexOf(tab) < 0) tab = 'learn';
  const x = U(u.id), i = unitIdx(u.id);
  const TU = themeUnits(u.theme), ti = TU.indexOf(u), prev = TU[ti - 1], next = TU[ti + 1], th = themeOf(u), vd = videoOf(u);
  const tabs = [['learn', '📖 學習', x.learn], ['quiz', '✅ 驗證', x.quizDone], ['lab', '🛠 實作', x.lab]];
  let body = '';
  if (tab === 'learn') body = learnHTML(u);
  else if (tab === 'quiz') body = quizHTML(u);
  else body = labFrameHTML(u);
  $('#app').innerHTML =
    '<div class="crumb"><a href="#/t/' + u.theme + '">← 學習地圖</a><span class="muted">單元 ' + u.n + ' / ' + TU.length + '</span><span class="sp"></span>' +
    (prev ? '<a class="btn sec sm" href="#/u/' + prev.id + '">← 上一單元</a>' : '') + (next ? '<a class="btn sec sm" href="#/u/' + next.id + '">下一單元 →</a>' : '') + '</div>' +
    '<section class="card"><h1>' + u.icon + ' ' + u.n + '. ' + esc(u.title) + '</h1><p class="muted" style="margin-top:-.2em">' + esc(u.sub) + '</p>' +
    '<div class="tabs" role="tablist">' + tabs.map(t => '<a class="tab" role="tab" href="#/u/' + u.id + '/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + (t[2] ? '<span class="done">完成</span>' : '') + '</a>').join('') + '</div>' +
    '<div id="tabbody">' + body + '</div>' +
    '<p class="muted" style="margin-top:18px;font-size:.85rem">內容整理自影片《<a href="' + vd.url + '" target="_blank" rel="noopener">' + esc(vd.title) + '</a>》（' + esc(th.channel.name) + '），並對照 ' + esc(th.official.name) + '補充。</p></section>';
  if (tab === 'learn') hydrateMath();
  if (tab === 'learn') Mascot.say('有不懂的地方，點「官方怎麼說」看原文喔！', 'happy');
  if (tab === 'quiz' && Q && Q.uid === u.id && Q.i === 0 && Q.phase === 'ask') Mascot.say('準備好了嗎？慢慢想，小博在旁邊。', 'happy');
  if (tab === 'lab') { mountLab(u); }
}

/* ---- 學習 ---- */
function learnHTML(u) {
  const n = u.cards.length, i = Math.min(LI[u.id] || 0, n - 1), c = u.cards[i];
  const title = c.sup ? c.t.replace(/^官方補充：/, '') : c.t;
  return '<article aria-live="polite"><h2>' + esc(title) + (c.sup ? '<span class="sup">官方補充</span>' : '') + '</h2>' + md(c.body) + (c.code ? codeHTML(c.code) : '') + vizHTML(u.id, i) +
    (c.url ? '<p><a class="btn sec sm" target="_blank" rel="noopener" href="' + c.url + '">🔎 ' + esc(c.label || '官方怎麼說') + '</a></p>' : '') + '</article>' +
    '<div class="dots" role="group" aria-label="學習卡片">' + u.cards.map((_, k) => '<button class="dot" type="button" data-act="card" data-i="' + k + '" aria-label="第 ' + (k + 1) + ' 張卡片"' + (k === i ? ' aria-current="true"' : '') + '></button>').join('') + '</div>' +
    '<p class="muted" style="text-align:center;margin:0">第 ' + (i + 1) + ' / ' + n + ' 張</p>' +
    '<div class="row end" style="margin-top:12px">' + (i > 0 ? '<button class="btn sec" type="button" data-act="card" data-i="' + (i - 1) + '">← 上一張</button>' : '') +
    (i < n - 1 ? '<button class="btn" type="button" data-act="card" data-i="' + (i + 1) + '">下一張 →</button>' : '<button class="btn mint" type="button" data-act="learned">我懂了！去驗證 →</button>') + '</div>';
}

/* ---- 驗證 ---- */
function newQ(uid) { return { uid, i: 0, res: [], phase: 'ask', tries: 0, hint: false, hintN: 0, msg: '', last: null, stars: 0 }; }
function officialBtns(u) {
  return (u.official || []).slice(0, 3).map(o => '<a class="btn sec sm" target="_blank" rel="noopener" href="' + o.url + '">🔎 官方：' + esc(o.label) + '</a>').join(' ');
}
function quizHTML(u) {
  if (!Q || Q.uid !== u.id) Q = newQ(u.id);
  const qs = u.questions; if (!qs.length) return '<p>這個單元還沒有題目。</p>';
  const tag = '<span class="pill" style="font-size:.78rem" title="題庫來源">題庫：' + (cloud === 'ok' ? '雲端' : '內建') + '</span>';
  if (Q.i >= qs.length) return resultHTML(u);
  const q = qs[Q.i];
  const dots = '<div class="qdots" aria-hidden="true">' + qs.map((_, k) => '<span class="qd ' + (k === Q.i ? 'cur' : (Q.res[k] === 'ok' ? 'ok' : (Q.res[k] === 'no' ? 'no' : ''))) + '"></span>').join('') + '</div>';
  let h = '<div class="qhead"><strong>第 ' + (Q.i + 1) + ' / ' + qs.length + ' 題</strong>' + dots + '<span class="sp"></span>' + tag + '</div>';
  const typeName = { choice: '單選題', tf: '是非題', fill: '填空題' }[q.type];
  h += '<p class="muted" style="margin:0">' + typeName + (q.type === 'fill' ? '（最多 3 次機會）' : '') + '</p><div class="qtext">' + esc(q.q) + '</div>';
  const done = Q.phase === 'fb';
  if (q.type === 'choice') {
    h += '<div class="opts">' + q.options.map((o, k) => {
      let cls = 'opt'; if (done) { if (k === q.answer) cls += ' ok'; else if (k === Q.last) cls += ' bad'; }
      return '<button type="button" class="' + cls + '" data-act="opt" data-i="' + k + '"' + (done ? ' disabled' : '') + '><span class="k">' + 'ABCD'[k] + '</span><span>' + esc(o) + (done && k === q.answer ? '　✔' : '') + (done && k === Q.last && k !== q.answer ? '　✘' : '') + '</span></button>';
    }).join('') + '</div>';
  } else if (q.type === 'tf') {
    const mk = (v, label) => { let cls = 'opt'; if (done) { if (v === q.answer) cls += ' ok'; else if (v === Q.last) cls += ' bad'; } return '<button type="button" class="' + cls + '" data-act="tf" data-v="' + v + '"' + (done ? ' disabled' : '') + '>' + label + '</button>'; };
    h += '<div class="tfs">' + mk(true, '✔ 對') + mk(false, '✘ 錯') + '</div>';
  } else {
    const parts = q.code.split(/_{3,}/);
    const w = Math.max(6, Math.max.apply(null, q.answers.map(a => a.length)) + 2);
    const val = Q.last == null ? '' : esc(Q.last);
    const inp = '<input id="fillin" class="blank" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="答案" style="width:' + w + 'ch" value="' + val + '"' + (done ? ' disabled' : '') + '>';
    h += '<pre class="code fillcode"><code>' + parts.map(esc).join(inp) + '</code></pre>';
    if (!done) {
      h += '<div class="row"><button class="btn" type="button" data-act="fillchk">檢查答案</button><button class="btn sec" type="button" data-act="fillhint">💡 看提示</button><span class="muted">第 ' + (Q.tries + 1) + ' 次嘗試</span></div>';
      if (Q.hintN > 0) h += '<div class="fb hint" role="status"><b class="t">💡 提示</b>' + q.hints.slice(0, Q.hintN).map((t, k) => '<div>' + (k + 1) + '. ' + esc(t) + '</div>').join('') + '</div>';
      if (Q.msg) h += '<div class="fb bad" role="status"><b class="t">✘ ' + esc(Q.msg) + '</b></div>';
    }
  }
  if (done) {
    const ok = Q.res[Q.i] === 'ok';
    let head;
    if (q.type === 'fill') head = ok ? '✔ 答對了！' : '✘ 這題先公布答案：' + q.answers[0];
    else if (q.type === 'choice') head = ok ? '✔ 答對了！' : '✘ 答錯了，正確答案是 ' + 'ABCD'[q.answer];
    else head = ok ? '✔ 答對了！' : '✘ 答錯了，正確答案是「' + (q.answer ? '對' : '錯') + '」';
    h += '<div class="fb ' + (ok ? 'ok' : 'bad') + '" role="status"><b class="t">' + head + '　<span class="stars">+' + Q.stars + ' ⭐</span></b>' + esc(q.explain) + '</div>' +
      '<div class="row" style="margin-top:12px">' + officialBtns(u) + '<button class="btn sec sm" type="button" data-act="report">🚩 這題有問題</button><span class="sp"></span>' +
      '<button class="btn" type="button" data-act="qnext">' + (Q.i + 1 >= qs.length ? '看結果 →' : '下一題 →') + '</button></div>';
  }
  return h;
}
function resultHTML(u) {
  const qs = u.questions, max = umax(u), got = Q.res.reduce((s, r, k) => s + (Q.runStars ? (Q.runStars[k] || 0) : 0), 0), best = ustars(u);
  const good = got >= max * .7;
  return '<div class="result"><div class="big">⭐ ' + got + ' / ' + max + '</div><p>' + (good ? '太厲害了！這個單元你掌握得很好。' : '再複習一下學習卡片，下次一定更好！') + '</p>' +
    '<div class="qdots" style="justify-content:center;margin-bottom:10px">' + qs.map((_, k) => '<span class="qd ' + (Q.res[k] === 'ok' ? 'ok' : 'no') + '"></span>').join('') + '</div>' +
    '<p class="muted">歷史最高：⭐ ' + best + ' / ' + max + '（可以重做來刷新紀錄）</p>' +
    '<div class="row" style="justify-content:center"><button class="btn sec" type="button" data-act="qretry">🔁 再做一次</button><a class="btn" href="#/u/' + u.id + '/lab">去實作 🛠</a><a class="btn sec" href="#/t/' + u.theme + '">回學習地圖</a></div></div>';
}
function awardQ(u, stars) {
  const id = qid(u, Q.i), x = U(u.id);
  x.q[id] = Math.max(x.q[id] || 0, stars); save();
  Q.stars = stars; Q.runStars = Q.runStars || []; Q.runStars[Q.i] = stars;
}
function fillOK(input, answers, ci) {
  const norm = s => { s = String(s).replace(/\s+/g, ''); return ci ? s.toLowerCase() : s; };
  const a = norm(input);
  return answers.some(ans => {
    const t = norm(ans);
    if (a === t) return true;
    return !t.startsWith('\\') && a.startsWith('\\') && a.slice(1) === t;
  });
}
function afterAnswer(ok) {
  Q.res[Q.i] = ok ? 'ok' : 'no'; Q.phase = 'fb';
  Mascot.say(ok ? pick(CHEER) : pick(SAD), ok ? 'cheer' : 'sad');
  renderKeep();
}
function renderKeep() { const y = window.scrollY; render(true); window.scrollTo(0, y); }
function curUnit() { const p = location.hash.replace(/^#\/?/, '').split('/'); return byId[p[1]]; }

/* ---- 徽章 ---- */
function checkBadge(u) {
  const x = U(u.id);
  if (x.learn && x.quizDone && x.lab && !x.badged) {
    x.badged = true; save();
    const TU = themeUnits(u.theme), all = TU.every(k => U(k.id).badged);
    Mascot.say(all ? '你完成這本書的所有單元了！你是小博的得意門生！' : '解鎖徽章了！小博以你為榮！', 'cheer');
    showModal('<div class="badge-big" aria-hidden="true">' + (all ? '🎓' : u.icon) + '</div><h2>' + (all ? '你是「小博的得意門生」！' : '解鎖徽章：' + esc(u.title)) + '</h2><p>' +
      (all ? TU.length + ' 個單元全部完成，太了不起了！' : '學習、驗證、實作三個區塊都完成了。') + '</p><div class="row" style="justify-content:center"><button class="btn" type="button" data-act="close">太棒了！</button></div>');
  }
}

/* ---- 實作 ---- */
function labFrameHTML(u) {
  const lab = u.lab, x = U(u.id);
  return '<div class="task' + (x.lab ? ' ok' : '') + '" id="labtask">' + (x.lab ? '✔ 任務完成！' : '🎯 任務：') + ' ' + esc(lab.task) + '</div>' +
    '<div id="labroot"></div>' +
    '<p class="muted" style="margin-top:14px;font-size:.9rem">' + (themeOf(u).labNote || '') + ' ' + officialBtns(u) + '</p>';
}
function mountLab(u) {
  const root = $('#labroot'); if (!root) return;
  const api = {
    isDone: () => U(u.id).lab,
    done() {
      if (U(u.id).lab) return;
      U(u.id).lab = true; save(); renderTop();
      const t = $('#labtask'); if (t) { t.className = 'task ok'; t.textContent = '✔ 任務完成！ ' + u.lab.task; }
      const tabs = $$('.tab'); if (tabs[2] && !tabs[2].querySelector('.done')) tabs[2].insertAdjacentHTML('beforeend', '<span class="done">完成</span>');
      Mascot.say('任務完成！你動手做得很棒！', 'cheer'); toast('🛠 實作任務完成！');
      checkBadge(u);
    },
    say: (t, m) => Mascot.say(t, m),
    toast
  };
  const fn = Labs[u.lab.type];
  if (fn) { const r = fn(root, u, api); if (typeof r === 'function') labTeardown = r; }
  Mascot.say('動手試試看！做完任務小博會通知你。', 'think');
}

/* ---------- 成就與關於 ---------- */
function badgesView() {
  const tot = UN.reduce((s, u) => s + ustars(u), 0), max = UN.reduce((s, u) => s + umax(u), 0);
  const all = UN.every(u => U(u.id).badged);
  const sect = t => {
    const TU = themeUnits(t.id), ok = TU.every(u => U(u.id).badged);
    return '<h2 style="margin-top:20px">' + t.icon + ' ' + esc(t.title) + '　<span class="muted" style="font-size:.9rem">徽章 ' + TU.filter(u => U(u.id).badged).length + ' / ' + TU.length + '</span></h2>' +
      (ok ? '<div class="callout"><strong>🎓 稱號：小博的得意門生</strong><br>你完成了這本書的所有單元，太厲害了！</div>' : '<div class="callout">' + TU.length + ' 個單元的徽章全部解鎖，就能獲得這本書的「小博的得意門生」稱號。</div>') +
      '<div class="scroll"><table class="prog" style="margin-top:12px"><thead><tr><th>單元</th><th>學習</th><th>驗證</th><th>實作</th><th>星星</th><th>徽章</th></tr></thead><tbody>' +
      TU.map(u => { const x = U(u.id); const c = v => v ? '✔' : '—'; return '<tr><td><a href="#/u/' + u.id + '">' + u.icon + ' ' + u.n + '. ' + esc(u.title) + '</a></td><td>' + c(x.learn) + '</td><td>' + c(x.quizDone) + '</td><td>' + c(x.lab) + '</td><td>' + ustars(u) + '/' + umax(u) + '</td><td>' + (x.badged ? '<span aria-label="已解鎖">' + u.icon + '</span>' : '—') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
  };
  $('#app').innerHTML = '<section class="card"><h1>🏅 我的成就</h1>' +
    '<p>累積星星：<span class="stars">⭐ ' + tot + ' / ' + max + '</span>　已解鎖徽章：<strong>' + UN.filter(u => U(u.id).badged).length + ' / ' + UN.length + '</strong></p>' +
    THEMES.map(sect).join('') +
    '<h2 style="margin-top:20px">💾 備份與匯出</h2><p class="muted" style="margin-top:-.3em">進度預設存在這個瀏覽器。換裝置前可以下載備份，也可以登入 Google 帳號自動同步。</p>' +
    '<div class="row"><button class="btn sec sm" type="button" data-act="exp-json">⬇ 下載進度檔 (.json)</button><button class="btn sec sm" type="button" data-act="exp-csv">⬇ 下載成績表 (.csv)</button><button class="btn sec sm" type="button" data-act="imp">⬆ 載入進度檔</button><input id="impfile" type="file" accept=".json,application/json" hidden></div>' +
    (typeof Acct !== 'undefined' && Acct.enabled() ? '<p style="margin-top:10px">' + (Acct.s ? '已登入 <strong>' + esc(Acct.s.email) + '</strong>，進度會自動同步。<button class="btn sec sm" type="button" data-act="acct">帳號與寄信</button>' : '<button class="btn sm" type="button" data-act="acct">👤 登入並同步進度</button>') + '</p>' : '') +
    '<p style="margin-top:16px"><button class="btn sec sm" type="button" data-act="reset">重設所有進度</button></p></section>';
  Mascot.say(all ? '你是小博的得意門生！' : '一步一步來，徽章會越來越多喔！', all ? 'cheer' : 'happy');
}
function aboutView() {
  const st = { off: '目前使用內建題庫（尚未設定雲端題庫）', loading: '正在連線雲端題庫…', ok: '已載入雲端題庫（Google Sheet）', fail: '雲端題庫連線失敗，已自動改用內建題庫' }[cloud];
  const lnk = (u, t) => '<a href="' + u + '" target="_blank" rel="noopener">' + esc(t) + '</a>';
  const srcHTML = t => '<div class="tl"><p><strong>' + t.icon + ' ' + esc(t.title) + '</strong></p><p><strong>影片：</strong>' + t.videos.map(v => lnk(v.url, v.title)).join('<br>') +
    '<br>頻道：' + lnk(t.channel.url, t.channel.name) + '</p><p><strong>官方資料：</strong>' + lnk(t.official.url, t.official.name) + '（各單元附對應頁面）</p></div>';
  $('#app').innerHTML = '<section class="card"><h1>ℹ️ 關於與來源</h1>' +
    '<p>BoBo 學習樂園是一個「學習 → 驗證 → 實作」的互動學習平台，目前有 ' + THEMES.length + ' 本書。作為作業作品，它是單一 <code>index.html</code>，用 Vibe Coding（和 AI 反覆討論與修改）完成。</p>' +
    '<h2>內容來源</h2>' + THEMES.map(srcHTML).join('') +
    '<p>所有學習卡片與題目，都是參考上述影片後用自己的話重新整理，並對照各主題的官方文件補充（標示「官方補充」的部分）。這不是官方教材，也沒有重製影片逐字稿；完整內容請看原影片與官方文件。</p>' +
    '<h2>吉祥物</h2><p>智慧之書——小博（Bobo）的圖片由 AI 生成：主角由 Gemini 生成，慶祝、安慰、思考三種表情由 ChatGPT 依主角延伸。</p>' +
    '<h2>題庫狀態</h2><p>' + st + '。雲端題庫連線失敗或逾時（約 5 秒）時，會自動使用內建的 ' + UN.reduce((s, u) => s + u.questions.length, 0) + ' 題。</p>' +
    '<h2>📱 加到手機主畫面</h2><p>Android（Chrome）：右上角選單 ⋮ → 「安裝應用程式」或「加到主畫面」。iPhone（Safari）：下方分享按鈕 → 「加入主畫面」。之後就能像 App 一樣從主畫面開啟。</p>' +
    '<h2>隱私</h2><p>預設不需登入，學習進度只存在你瀏覽器的 <code>localStorage</code>，不蒐集姓名或學號。題目回饋只記錄單元、題號、意見內容與時間。</p>' +
    '<p>如果你選擇「用 Google 登入」，系統只會記錄你的 Google 帳號 Email、暱稱與學習進度（存在作者的 Google Sheet），用來同步進度與把成績單寄給你本人；不會取得密碼，也不會寄信給其他人。想刪除資料請聯絡作者。</p></section>';
  Mascot.say('這裡是來源說明。想看原影片，點上面的連結！', 'happy');
}

/* ---------- 雲端題庫與回饋（選配） ---------- */
function rowToQ(r) {
  try {
    const type = String(r.type || '').trim().toLowerCase(), q = String(r.q || '').trim();
    if (!q) return null;
    const body = String(r.body == null ? '' : r.body), ans = String(r.answer == null ? '' : r.answer).trim();
    const hints = String(r.hints || '').split('||').map(s => s.trim()).filter(Boolean);
    const base = { q, explain: String(r.explain || '').trim() || '（沒有解析）' };
    if (type === 'choice') {
      const options = body.split('||').map(s => s.trim()).filter(Boolean), a = parseInt(ans, 10) - 1;
      if (options.length < 2 || !(a >= 0 && a < options.length)) return null;
      return Object.assign(base, { type: 'choice', options, answer: a });
    }
    if (type === 'tf') return Object.assign(base, { type: 'tf', answer: /^(對|是|true|t|yes|y|1)$/i.test(ans) });
    if (type === 'fill') {
      const answers = ans.split('||').map(s => s.trim()).filter(Boolean);
      if (!/_{3,}/.test(body) || !answers.length) return null;
      return Object.assign(base, { type: 'fill', code: body, answers, hints: hints.length ? hints : ['再想想看～'] });
    }
  } catch (e) { }
  return null;
}
function applyCloud(rows) {
  const by = {};
  rows.forEach(r => {
    let id = String(r.unit == null ? '' : r.unit).trim(); if (/^\d+$/.test(id)) id = 'u' + id;
    if (!byId[id]) return;
    const q = rowToQ(r); if (q) (by[id] = by[id] || []).push(q);
  });
  let n = 0;
  Object.keys(by).forEach(id => { byId[id].questions = by[id]; n += by[id].length; });
  return n;
}
async function loadCloud() {
  const url = (CONFIG.GAS_URL || '').trim();
  if (!url) { cloud = 'off'; return; }
  cloud = 'loading';
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=questions', { signal: ctl.signal });
    const j = await r.json();
    if (!j || !Array.isArray(j.questions)) throw new Error('format');
    const n = applyCloud(j.questions);
    cloud = n > 0 ? 'ok' : 'fail';
    if (n > 0) { Q = null; toast('已載入雲端題庫（' + n + ' 題）'); }
  } catch (e) { cloud = 'fail'; } finally { clearTimeout(t); }
  flushFeedback();
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'about' || (p[0] === 'u' && p[2] === 'quiz')) renderKeep();
}
function queueFb(p) { try { const q = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); q.push(p); localStorage.setItem(FB_KEY, JSON.stringify(q.slice(-30))); } catch (e) { } }
function postFb(p) {
  return fetch(CONFIG.GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) });
}
async function flushFeedback() {
  if (!CONFIG.GAS_URL || cloud !== 'ok') return;
  let q = []; try { q = JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch (e) { }
  if (!q.length) return;
  try { for (const p of q) await postFb(p); localStorage.removeItem(FB_KEY); } catch (e) { }
}
async function sendFeedback(p) {
  if (!CONFIG.GAS_URL || cloud === 'fail') { queueFb(p); toast('目前沒有連上雲端，意見先存在這台裝置。'); return; }
  try { await postFb(p); toast('已送出，謝謝你的回饋！'); } catch (e) { queueFb(p); toast('送出失敗，意見先存在這台裝置。'); }
}

/* ---------- 事件 ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, u = curUnit();
  if (act === 'close') { closeModal(); return; }
  if (act === 'copy') { const t = el.parentElement.querySelector('code').textContent; copyText(t).then(ok => { el.textContent = ok ? '已複製 ✔' : '請手動複製'; setTimeout(() => { el.textContent = '複製'; }, 1500); }); return; }
  if (act === 'reset') {
    showModal('<h2>要重設所有進度嗎？</h2><p>星星、徽章與完成紀錄都會被清除，無法復原。' + (typeof Acct !== 'undefined' && Acct.s ? '你已登入，<strong>雲端備份的進度也會一起清除</strong>。' : '') + '</p><div class="row" style="justify-content:center"><button class="btn sec" type="button" data-act="close">先不要</button><button class="btn" type="button" data-act="reset-ok">確定重設</button></div>'); return;
  }
  if (act === 'reset-ok') {
    (async () => {
      el.disabled = true;
      const ok = typeof resetAll === 'function' ? await resetAll() : (S = { v: 1, u: {} }, save(), true);
      closeModal();
      if (ok) { Q = null; toast('進度已重設'); renderTop(); render(true); }
    })();
    return;
  }
  if (act === 'card' && u) { LI[u.id] = +el.dataset.i; renderKeep(); return; }
  if (act === 'learned' && u) { U(u.id).learn = true; save(); toast('📖 學習完成！換驗證囉'); Mascot.say('很好！來看看你學會了多少。', 'cheer'); checkBadge(u); location.hash = '#/u/' + u.id + '/quiz'; return; }
  if (!u) return;
  const q = Q && u.questions[Q.i];
  if (act === 'opt' && q && Q.phase === 'ask') { Q.last = +el.dataset.i; const ok = Q.last === q.answer; awardQ(u, ok ? 1 : 0); afterAnswer(ok); renderTop(); return; }
  if (act === 'tf' && q && Q.phase === 'ask') { Q.last = el.dataset.v === 'true'; const ok = Q.last === q.answer; awardQ(u, ok ? 1 : 0); afterAnswer(ok); renderTop(); return; }
  if (act === 'fillhint' && q && Q.phase === 'ask') {
    Q.hint = true; Q.hintN = Math.min(q.hints.length, Math.max(Q.hintN + 1, 1));
    const inp = $('#fillin'); Q.last = inp ? inp.value : null; Mascot.say(pick(THINK), 'think'); renderKeep(); const i2 = $('#fillin'); if (i2) i2.focus(); return;
  }
  if (act === 'fillchk' && q && Q.phase === 'ask') {
    const inp = $('#fillin'); const v = inp ? inp.value : '';
    if (!v.trim()) { toast('先填入答案再檢查喔'); if (inp) inp.focus(); return; }
    Q.tries++; Q.last = v;
    if (fillOK(v, q.answers, q.ci)) { awardQ(u, (Q.tries === 1 && !Q.hint) ? 2 : 1); afterAnswer(true); renderTop(); }
    else if (Q.tries >= 3) { awardQ(u, 0); afterAnswer(false); }
    else {
      Q.hintN = Math.min(q.hints.length, Math.max(Q.hintN, Q.tries)); Q.msg = '還不太對，再試一次！';
      Mascot.say(pick(SAD), 'sad'); renderKeep(); const i2 = $('#fillin'); if (i2) { i2.focus(); i2.select(); }
    }
    return;
  }
  if (act === 'qnext' && Q) {
    Q.i++; Q.phase = 'ask'; Q.tries = 0; Q.hint = false; Q.hintN = 0; Q.msg = ''; Q.last = null; Q.stars = 0;
    if (Q.i >= u.questions.length) {
      U(u.id).quizDone = true; save(); renderTop();
      const max = umax(u), got = (Q.runStars || []).reduce((s, v) => s + (v || 0), 0);
      Mascot.say(got >= max * .7 ? '太棒了！你的成績很漂亮！' : '做完了！再複習一下會更穩喔。', got >= max * .7 ? 'cheer' : 'think');
      renderKeep(); checkBadge(u); return;
    }
    renderKeep(); return;
  }
  if (act === 'qretry') { Q = newQ(u.id); renderKeep(); return; }
  if (act === 'report' && q) {
    showModal('<h2>🚩 這題有問題？</h2><p class="muted">告訴小博哪裡怪怪的（題目、答案或解析都可以）。</p><textarea id="fbtext" maxlength="300" aria-label="意見內容"></textarea><div class="row" style="justify-content:center"><button class="btn sec" type="button" data-act="close">取消</button><button class="btn" type="button" data-act="report-send">送出</button></div>'); return;
  }
  if (act === 'report-send' && Q) {
    const msg = ($('#fbtext').value || '').trim(); if (!msg) { toast('先寫一點意見喔'); return; }
    const qq = u.questions[Q.i];
    closeModal(); sendFeedback({ unit: u.id, q: Q.i + 1, text: String(qq.q).slice(0, 80), msg, t: new Date().toISOString() }); return;
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target && e.target.id === 'fillin') { e.preventDefault(); const b = $('[data-act=fillchk]'); if (b) b.click(); }
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
window.addEventListener('hashchange', () => { closeModal(); render(false); });

/* ---------- 啟動 ---------- */
function boot() {
  const bg = ['+', '−', '÷', '×', '♪', '♫', 'ABC', '</>', '⚛', '⚙', '∑', '√'];
  const pos = [[6, 12], [88, 10], [14, 40], [92, 38], [4, 68], [90, 66], [24, 82], [78, 84], [48, 6], [60, 90], [34, 20], [70, 30]];
  $('#floaters').innerHTML = bg.map((s, i) => '<span style="left:' + pos[i][0] + '%;top:' + pos[i][1] + '%;font-size:' + (22 + (i * 7) % 20) + 'px;animation-delay:' + (-i * 1.1) + 's">' + esc(s) + '</span>').join('');
  Mascot.init();
  if (typeof Acct !== 'undefined') Acct.init();
  render(false);
  loadCloud();
}
window.__katexReady = () => { hydrateMath(); if (window.__mathHook) window.__mathHook(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
