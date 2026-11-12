/* ---------- 共用小工具 ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 簡易標記：`code`、**粗體**、空行分段
function md(s) {
  return String(s).split(/\n\n/).map(p =>
    '<p>' + esc(p).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</p>'
  ).join('');
}
function codeHTML(src, extra) {
  return '<pre class="code ' + (extra || '') + '"><button class="copy" type="button" data-act="copy" aria-label="複製程式碼">複製</button><code>' + esc(src) + '</code></pre>';
}
const pick = a => a[Math.floor(Math.random() * a.length)];
function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(t).then(() => true, () => legacyCopy(t));
  }
  return Promise.resolve(legacyCopy(t));
}
function legacyCopy(t) {
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}
