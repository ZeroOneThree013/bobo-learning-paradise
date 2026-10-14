/**
 * BoBo 學習樂園：選配後端（Google Apps Script，綁定在一份 Google Sheet 上）
 * 功能：① 雲端題庫 ② 題目回饋 ③ Google 登入後同步學習進度 ④ 把成績單寄到「自己」的 Gmail
 *
 * 設定：專案設定 → 指令碼屬性，新增 CLIENT_ID = 你的 OAuth 用戶端 ID（xxxx.apps.googleusercontent.com）
 * 部署：部署 → 新增部署作業 → 網頁應用程式（執行身分：我；誰可以存取：任何人）
 * 分頁：questions 要自己匯入；feedback / users / progress / sessions 會自動建立。
 */
var SESSION_DAYS = 30;
var MAIL_PER_DAY = 3;
var MAX_JSON = 60000;

/* ---------- 入口 ---------- */
function doGet(e) {
  var sh = SpreadsheetApp.getActive().getSheetByName('questions');
  var out = [];
  if (sh) {
    var rows = sh.getDataRange().getValues(), head = rows.shift();
    rows.forEach(function (r) {
      if (!r[0] && !r[2]) return;
      var o = {}; head.forEach(function (h, i) { o[String(h).trim()] = r[i]; });
      out.push(o);
    });
  }
  return json_({ questions: out });
}

function doPost(e) {
  var res;
  try {
    var p = JSON.parse(e.postData.contents);
    switch (p.action) {
      case 'login': res = login_(p); break;
      case 'load': res = load_(p); break;
      case 'save': res = save_(p); break;
      case 'mail': res = mail_(p); break;
      case 'logout': res = logout_(p); break;
      default: res = feedback_(p);
    }
  } catch (err) { res = { ok: false, error: 'bad_request' }; }
  return json_(res);
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clip_(s, n) { return String(s == null ? '' : s).slice(0, n); }
function sheet_(name, head) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); }
  return sh;
}
function withLock_(fn) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function sha_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s));
}

/* ---------- 題目回饋（不需登入） ---------- */
function feedback_(p) {
  sheet_('feedback', ['time', 'unit', 'q', 'text', 'msg'])
    .appendRow([new Date(), clip_(p.unit, 10), clip_(p.q, 5), clip_(p.text, 80), clip_(p.msg, 300)]);
  return { ok: true };
}

/* ---------- Google 登入 ---------- */
function verifyGoogle_(idToken) {
  var clientId = PropertiesService.getScriptProperties().getProperty('CLIENT_ID');
  if (!clientId || !idToken) return null;
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var t = JSON.parse(r.getContentText());
  var okIss = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  if (t.aud !== clientId || !okIss || String(t.email_verified) !== 'true' || Number(t.exp) * 1000 < Date.now() || !t.email) return null;
  return { email: String(t.email).toLowerCase(), name: clip_(t.given_name || t.name || '', 40) };
}

function login_(p) {
  var g = verifyGoogle_(p.idToken);
  if (!g) return { ok: false, error: 'auth' };
  return withLock_(function () {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var now = Date.now();
    var users = sheet_('users', ['email', 'name', 'createdAt', 'lastLogin', 'mailDay', 'mailCount']);
    var vals = users.getDataRange().getValues(), row = -1;
    for (var i = 1; i < vals.length; i++) if (vals[i][0] === g.email) { row = i + 1; break; }
    if (row < 0) users.appendRow([g.email, g.name, new Date(now), new Date(now), '', 0]);
    else users.getRange(row, 2, 1, 3).setValues([[g.name, vals[row - 1][2], new Date(now)]]);
    var sess = sheet_('sessions', ['hash', 'email', 'expires']);
    sess.appendRow([sha_(token), g.email, now + SESSION_DAYS * 86400000]);
    pruneSessions_(sess, now);
    var prog = readProgress_(g.email);
    return { ok: true, session: token, email: g.email, name: g.name, progress: prog.data, updatedAt: prog.updatedAt };
  });
}

function pruneSessions_(sess, now) {
  var v = sess.getDataRange().getValues();
  for (var i = v.length - 1; i >= 1; i--) if (Number(v[i][2]) < now) sess.deleteRow(i + 1);
}

function authed_(p) {
  if (!p.session) return null;
  var h = sha_(String(p.session)), v = sheet_('sessions', ['hash', 'email', 'expires']).getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === h && Number(v[i][2]) > Date.now()) return String(v[i][1]);
  return null;
}

function logout_(p) {
  return withLock_(function () {
    var sess = sheet_('sessions', ['hash', 'email', 'expires']), h = sha_(String(p.session || '')), v = sess.getDataRange().getValues();
    for (var i = v.length - 1; i >= 1; i--) if (v[i][0] === h) sess.deleteRow(i + 1);
    return { ok: true };
  });
}

/* ---------- 進度：讀、合併後寫 ---------- */
function readProgress_(email) {
  var v = sheet_('progress', ['email', 'json', 'updatedAt']).getDataRange().getValues();
  for (var i = 1; i < v.length; i++) if (v[i][0] === email) {
    try { return { data: JSON.parse(v[i][1]), updatedAt: Number(v[i][2]) || 0, row: i + 1 }; } catch (e) { }
  }
  return { data: { v: 1, u: {} }, updatedAt: 0, row: -1 };
}

// 只收合法的結構：單元 u數字，旗標布林，題目星星 0–2
function clean_(d) {
  var out = { v: 1, u: {} };
  if (!d || typeof d !== 'object' || !d.u) return out;
  Object.keys(d.u).slice(0, 40).forEach(function (id) {
    if (!/^u\d{1,3}$/.test(id)) return;
    var x = d.u[id] || {}, o = { learn: !!x.learn, quizDone: !!x.quizDone, lab: !!x.lab, badged: !!x.badged, q: {} };
    Object.keys(x.q || {}).slice(0, 40).forEach(function (k) {
      if (/^u\d{1,3}-q\d{1,2}$/.test(k)) o.q[k] = Math.max(0, Math.min(2, Number(x.q[k]) || 0));
    });
    out.u[id] = o;
  });
  return out;
}

// 合併規則：星星取最高分，完成狀態與徽章只增不減
function merge_(a, b) {
  a = clean_(a); b = clean_(b);
  var out = { v: 1, u: {} };
  Object.keys(a.u).concat(Object.keys(b.u)).forEach(function (id) {
    if (out.u[id]) return;
    var x = a.u[id] || { q: {} }, y = b.u[id] || { q: {} };
    var o = { learn: !!(x.learn || y.learn), quizDone: !!(x.quizDone || y.quizDone), lab: !!(x.lab || y.lab), badged: !!(x.badged || y.badged), q: {} };
    Object.keys(x.q || {}).concat(Object.keys(y.q || {})).forEach(function (k) { o.q[k] = Math.max(x.q[k] || 0, y.q[k] || 0); });
    out.u[id] = o;
  });
  return out;
}

function load_(p) {
  var email = authed_(p);
  if (!email) return { ok: false, error: 'session' };
  var r = readProgress_(email);
  return { ok: true, progress: r.data, updatedAt: r.updatedAt };
}

function save_(p) {
  var email = authed_(p);
  if (!email) return { ok: false, error: 'session' };
  if (JSON.stringify(p.progress || {}).length > MAX_JSON) return { ok: false, error: 'too_big' };
  return withLock_(function () {
    var sh = sheet_('progress', ['email', 'json', 'updatedAt']), r = readProgress_(email);
    var merged = merge_(r.data, p.progress), now = Date.now();
    if (r.row < 0) sh.appendRow([email, JSON.stringify(merged), now]);
    else sh.getRange(r.row, 2, 1, 2).setValues([[JSON.stringify(merged), now]]);
    return { ok: true, progress: merged, updatedAt: now };
  });
}

/* ---------- 寄成績單：只寄給已驗證的登入者本人 ---------- */
function esc_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function csvCell_(s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

function mail_(p) {
  var email = authed_(p);
  if (!email) return { ok: false, error: 'session' };
  var rows = (p.report && p.report.rows || []).slice(0, 30);
  if (!rows.length) return { ok: false, error: 'empty' };
  return withLock_(function () {
    var users = sheet_('users', ['email', 'name', 'createdAt', 'lastLogin', 'mailDay', 'mailCount']);
    var v = users.getDataRange().getValues(), row = -1, today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'), count = 0;
    for (var i = 1; i < v.length; i++) if (v[i][0] === email) { row = i + 1; if (String(v[i][4]) === today) count = Number(v[i][5]) || 0; break; }
    if (count >= MAIL_PER_DAY) return { ok: false, error: 'limit' };
    var total = rows.reduce(function (s, r) { return s + (Number(r.stars) || 0); }, 0), max = rows.reduce(function (s, r) { return s + (Number(r.max) || 0); }, 0);
    var mark = function (b) { return b ? '✔' : '—'; };
    var html = '<div style="font-family:sans-serif"><h2>BoBo 學習樂園：我的成績單</h2><p>累積星星：<b>' + total + ' / ' + max + '</b>　產生時間：' + esc_(today) + '</p>' +
      '<table cellpadding="6" style="border-collapse:collapse;border:1px solid #ccc"><tr style="background:#eef3fb"><th>單元</th><th>學習</th><th>驗證</th><th>實作</th><th>星星</th><th>徽章</th></tr>' +
      rows.map(function (r) { return '<tr><td>' + esc_(clip_(r.title, 40)) + '</td><td align="center">' + mark(r.learn) + '</td><td align="center">' + mark(r.quiz) + '</td><td align="center">' + mark(r.lab) + '</td><td align="center">' + (Number(r.stars) || 0) + '/' + (Number(r.max) || 0) + '</td><td align="center">' + mark(r.badge) + '</td></tr>'; }).join('') +
      '</table><p style="color:#777">這封信由 BoBo 學習樂園依你的要求寄出，只會寄給你登入的 Google 帳號。</p></div>';
    var csv = '﻿單元,學習,驗證,實作,星星,滿分,徽章\n' + rows.map(function (r) {
      return [clip_(r.title, 40), r.learn ? 1 : 0, r.quiz ? 1 : 0, r.lab ? 1 : 0, Number(r.stars) || 0, Number(r.max) || 0, r.badge ? 1 : 0].map(csvCell_).join(',');
    }).join('\n');
    MailApp.sendEmail({ to: email, subject: 'BoBo 學習樂園：我的成績單（' + total + '/' + max + ' ⭐）', htmlBody: html, body: '請使用支援 HTML 的信箱檢視。', name: 'BoBo 學習樂園',
      attachments: [Utilities.newBlob(csv, 'text/csv', 'bobo-progress-' + today + '.csv')] });
    if (row > 0) users.getRange(row, 5, 1, 2).setValues([[today, count + 1]]);
    return { ok: true, to: email };
  });
}
