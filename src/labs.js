/* ---------- 實作元件（簡化模擬）：lab.type 對應 Labs.<type>，新增類型就在這裡加一個函式 ---------- */
const Labs = {};
const mkLines = (n, h) => Array.from({ length: n }, (_, i) => '<div class="ln' + (h && i === 0 ? ' h' : '') + '" style="height:' + (h && i === 0 ? 7 : 4) + 'px;margin:' + (h && i === 0 ? '0 0 8px' : '0 0 5px') + (i % 5 === 4 ? ';width:60%' : '') + '"></div>').join('');

/* u1：排序 */
Labs.sort = (root, u, api) => {
  // 預設答案是第 1 單元的；其他單元在 lab 資料加 "answer"（正確順序）與 "hint"（排錯時的提示）即可重用
  const right = u.lab.answer || [String.raw`\documentclass[11pt]{article}`, String.raw`\usepackage{geometry}`, String.raw`\begin{document}`, 'Hello, LaTeX!', String.raw`\end{document}`];
  let arr = u.lab.lines.slice();
  const draw = (msg) => {
    root.innerHTML = '<div class="panel"><h3>把程式行排成正確順序</h3>' + arr.map((l, i) => '<div class="blk"><code>' + esc(l) + '</code><button type="button" data-m="-1" data-i="' + i + '" aria-label="上移"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-m="1" data-i="' + i + '" aria-label="下移"' + (i === arr.length - 1 ? ' disabled' : '') + '>↓</button></div>').join('') +
      '<div class="row" style="margin-top:10px"><button class="btn" type="button" id="chk">檢查順序</button></div><div id="msg" style="margin-top:10px">' + (msg || '') + '</div></div>';
    $$('.blk button', root).forEach(b => b.onclick = () => { const i = +b.dataset.i, j = i + +b.dataset.m;[arr[i], arr[j]] = [arr[j], arr[i]]; draw(); });
    $('#chk', root).onclick = () => {
      if (arr.join('\n') === right.join('\n')) { draw('<div class="okbox">✔ ' + esc(u.lab.ok || '順序正確，可以編譯了！') + '</div>'); api.done(); }
      else {
        const pos = {}; right.forEach((l, i) => pos[l] = i);
        let m = '再想想：';
        if (u.lab.hint) m += u.lab.hint; else if (arr.indexOf(right[0]) !== 0) m += '最前面要先宣告文件類別。'; else if (arr.indexOf(right[2]) < arr.indexOf(right[1])) m += '套件要在 \\begin{document} 之前載入。'; else m += '內容要放在 begin 和 end 之間。';
        draw('<div class="warnbox">' + esc(m) + '</div>'); api.say('差一點點！看看提示。', 'think');
      }
    };
  };
  draw();
};

/* u2：中文編譯 */
Labs.compile = (root, u, api) => {
  const init = String.raw`\documentclass{article}
% 在這裡補上中文設定
\begin{document}
你好，LaTeX！
\end{document}`;
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>編輯器</h3><textarea id="src" spellcheck="false" style="min-height:190px">' + esc(init) + '</textarea>' +
    '<div class="ctl"><label for="cmp">編譯器</label><select id="cmp"><option>pdfLaTeX</option><option>XeLaTeX</option><option>LuaLaTeX</option></select></div>' +
    '<div class="row"><button class="btn" type="button" id="go">▶ 編譯</button><button class="btn sec sm" type="button" id="tip">💡 提示</button></div></div>' +
    '<div class="panel"><h3>結果</h3><div id="out" class="muted">按「編譯」看看。</div></div></div>';
  const out = $('#out', root);
  $('#tip', root).onclick = () => { out.innerHTML = '<div class="warnbox">需要兩行：<code>\\usepackage{xeCJK}</code> 和 <code>\\setCJKmainfont{字型}</code>（例如 <code>Noto Serif CJK TC</code>），而且編譯器要選 XeLaTeX。</div>'; api.say(pick(THINK), 'think'); };
  $('#go', root).onclick = () => {
    const s = $('#src', root).value, c = $('#cmp', root).value;
    const hasPkg = /\\usepackage(\[[^\]]*\])?\{[^}]*xeCJK[^}]*\}/.test(s), hasFont = /\\setCJKmainfont(\[[^\]]*\])?\{[^}]+\}/.test(s);
    if (!hasPkg) { out.innerHTML = '<div class="err">! LaTeX Error: Unicode character 你 (U+4F60) not set up for use with LaTeX.<br>→ 還沒載入中文套件（xeCJK）。</div>'; api.say(pick(SAD), 'sad'); return; }
    if (c === 'pdfLaTeX') { out.innerHTML = '<div class="err">! Package xeCJK Error: package xeCJK 只能搭配 XeLaTeX 使用。<br>→ 請把編譯器換成 XeLaTeX。</div>'; api.say(pick(SAD), 'sad'); return; }
    if (c === 'LuaLaTeX') { out.innerHTML = '<div class="err">xeCJK 只支援 XeLaTeX；LuaLaTeX 要改用 luatexja 之類的套件。<br>→ 這一題請選 XeLaTeX。</div>'; return; }
    if (!hasFont) { out.innerHTML = '<div class="err">Package fontspec Error: 找不到可用的中文字型。<br>→ 請用 \\setCJKmainfont 指定字型。</div>'; api.say(pick(SAD), 'sad'); return; }
    out.innerHTML = '<div class="okbox">✔ 編譯成功！</div><div class="page a4" style="margin-top:10px;padding:22px 20px"><div style="font-size:1.1rem;color:#111">你好，LaTeX！</div></div>'; api.done();
  };
};

/* u3：邊界與行距 */
Labs.layout = (root, u, api) => {
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>調整版面</h3>' +
    '<div class="ctl"><label for="mg">邊界</label><input id="mg" type="range" min="1" max="4" step="0.5" value="3"><b id="mgv"></b></div>' +
    '<div class="ctl"><label for="ls">行距</label><input id="ls" type="range" min="1" max="2" step="0.25" value="1"><b id="lsv"></b></div>' +
    '<h3 style="margin-top:12px">對應的語法</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div>' +
    '<div><div class="page a4" id="pg"></div><div class="pg-label">A4 預覽（示意）</div></div></div>';
  const upd = () => {
    const m = +$('#mg', root).value, l = +$('#ls', root).value;
    $('#mgv', root).textContent = m + ' cm'; $('#lsv', root).textContent = l + ' 倍';
    const pad = m / 21 * 100;
    $('#pg', root).innerHTML = '<div style="position:absolute;left:' + pad + '%;right:' + pad + '%;top:' + (m / 29.7 * 100) + '%;bottom:' + (m / 29.7 * 100) + '%;overflow:hidden;outline:1px dashed #9ec1e6">' +
      Array.from({ length: 40 }, (_, i) => '<div class="ln' + (i === 0 ? ' h' : '') + '" style="height:4px;margin-bottom:' + (3 + l * 4) + 'px;' + (i % 7 === 6 ? 'width:55%' : '') + '"></div>').join('') + '</div>';
    $('#gen', root).textContent = '\\usepackage[margin=' + m + 'cm]{geometry}\n\\usepackage{setspace}\n\\setstretch{' + l + '}';
    if (m === 2 && l === 1.5) { $('#msg', root).innerHTML = '<div class="okbox">✔ 邊界 2 cm、行距 1.5 倍！</div>'; api.done(); } else $('#msg', root).innerHTML = '';
  };
  $('#mg', root).oninput = upd; $('#ls', root).oninput = upd; upd();
};

/* u4：封面 */
Labs.cover = (root, u, api) => {
  const opts = [['ctr', '標題置中 (\\centering)'], ['huge', '使用 \\HUGE 放大'], ['bold', '粗體 (\\textbf)'], ['vfill', '作者資訊用 \\vfill 推到底部']];
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>封面設定</h3>' + opts.map(o => '<label class="chk"><input type="checkbox" data-k="' + o[0] + '"> ' + esc(o[1]) + '</label>').join('') +
    '<h3 style="margin-top:12px">語法</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div>' +
    '<div><div class="page a4" id="pg" style="display:flex;flex-direction:column;padding:12%"></div><div class="pg-label">封面預覽（示意）</div></div></div>';
  const upd = () => {
    const k = {}; $$('input', root).forEach(i => k[i.dataset.k] = i.checked);
    let code = '\\begin{titlepage}\n' + (k.ctr ? '  \\centering\n' : '') + '  ' + (k.huge ? '{\\HUGE ' : '') + (k.bold ? '\\textbf{我的專題報告}' : '我的專題報告') + (k.huge ? '}' : '') + '\n' + (k.vfill ? '  \\vfill\n' : '') + '  作者：小明\n\\end{titlepage}';
    $('#gen', root).textContent = code;
    $('#pg', root).innerHTML = '<div style="text-align:' + (k.ctr ? 'center' : 'left') + ';font-size:' + (k.huge ? '1.5rem' : '.9rem') + ';font-weight:' + (k.bold ? 800 : 400) + ';color:#111">我的專題報告</div>' + (k.vfill ? '<div style="flex:1"></div>' : '') + '<div style="font-size:.7rem;color:#111;' + (k.vfill ? '' : 'margin-top:8px;') + '">作者：小明</div>';
    if (k.ctr && k.huge && k.bold && k.vfill) { $('#msg', root).innerHTML = '<div class="okbox">✔ 封面完成！</div>'; api.done(); } else $('#msg', root).innerHTML = '';
  };
  $$('input', root).forEach(i => i.onchange = upd); upd();
};

/* u5：清單與註腳 */
Labs.lists = (root, u, api) => {
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>清單設定</h3>' +
    '<div class="ctl"><label for="st">編號樣式</label><select id="st"><option value="1">1. 2. 3.</option><option value="a">(a) (b) (c)</option><option value="i">i. ii. iii.</option><option value="b">• 項目符號</option></select></div>' +
    '<label class="chk"><input type="checkbox" id="fn"> 在第一項加註腳 (\\footnote)</label><h3 style="margin-top:12px">語法</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div>' +
    '<div><div class="page a4" id="pg" style="padding:10% 9%;color:#111;font-size:.85rem"></div><div class="pg-label">預覽（示意）</div></div></div>';
  const upd = () => {
    const st = $('#st', root).value, fn = $('#fn', root).checked;
    const lab = { 1: n => n + '.', a: n => '(' + 'abc'[n - 1] + ')', i: n => ['i', 'ii', 'iii'][n - 1] + '.', b: () => '•' }[st];
    const env = st === 'b' ? 'itemize' : 'enumerate', opt = st === 'a' ? '[label=(\\alph*)]' : (st === 'i' ? '[label=\\roman*.]' : '');
    $('#gen', root).textContent = (st === 'a' || st === 'i' ? '\\usepackage{enumitem}\n' : '') + '\\begin{' + env + '}' + opt + '\n  \\item 蘋果' + (fn ? '\\footnote{水果。}' : '') + '\n  \\item 香蕉\n  \\item 橘子\n\\end{' + env + '}';
    $('#pg', root).innerHTML = ['蘋果' + (fn ? '<sup>1</sup>' : ''), '香蕉', '橘子'].map((t, i) => '<div style="margin:6px 0"><b style="display:inline-block;width:2.2em">' + lab(i + 1) + '</b>' + t + '</div>').join('') + (fn ? '<div style="position:absolute;left:9%;right:9%;bottom:7%;border-top:1px solid #999;padding-top:4px;font-size:.7rem"><sup>1</sup> 水果。</div>' : '');
    if (st === 'a' && fn) { $('#msg', root).innerHTML = '<div class="okbox">✔ (a)(b)(c) 清單加上註腳了！</div>'; api.done(); } else $('#msg', root).innerHTML = '';
  };
  $('#st', root).onchange = upd; $('#fn', root).onchange = upd; upd();
};

/* u6：浮動體 */
Labs.float = (root, u, api) => {
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>圖片設定</h3>' +
    '<div class="ctl"><label for="pos">位置</label><select id="pos"><option value="b">b（底部）</option><option value="h">h（原地附近）</option><option value="t">t（頂端）</option><option value="p">p（獨立頁）</option></select></div>' +
    '<div class="ctl"><label for="lb">\\label</label><input id="lb" type="text" value="fig:cat" size="10"></div>' +
    '<div class="ctl"><label for="rf">\\ref</label><input id="rf" type="text" value="fig:dog" size="10"></div>' +
    '<h3 style="margin-top:12px">語法</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div>' +
    '<div><div class="page a4" id="pg" style="padding:8%;color:#111;font-size:.75rem"></div><div class="pg-label">預覽（示意）</div></div></div>';
  const upd = () => {
    const p = $('#pos', root).value, lb = $('#lb', root).value.trim(), rf = $('#rf', root).value.trim(), ok = lb && lb === rf;
    $('#gen', root).textContent = '\\begin{figure}[' + p + ']\n  \\includegraphics{cat.png}\n  \\caption{可愛的貓}\n  \\label{' + lb + '}\n\\end{figure}\n\n如圖 \\ref{' + rf + '} 所示。';
    const fig = '<div class="fig" style="margin:6px 0;padding:14px 2px">圖 1：可愛的貓</div>';
    const txt = '<p style="margin:4px 0">如圖 ' + (ok ? '1' : '<b style="color:#c0392b">??</b>') + ' 所示。' + '這裡是一些文字內容。'.repeat(3) + '</p>';
    const lines = mkLines(5);
    let h;
    if (p === 't') h = fig + txt + lines; else if (p === 'b') h = txt + lines + '<div style="position:absolute;left:8%;right:8%;bottom:8%">' + fig + '</div>';
    else if (p === 'h') h = txt + fig + lines; else h = txt + lines + '<div class="pg-label" style="margin-top:8px">（圖片被放到獨立的一頁）</div>';
    $('#pg', root).innerHTML = h;
    $('#msg', root).innerHTML = ok ? '' : '<div class="warnbox">label 和 ref 的名字不同，編譯後會出現「??」。</div>';
    if (p === 't' && ok) { $('#msg', root).innerHTML = '<div class="okbox">✔ 圖在頂端，ref 也對上了！</div>'; api.done(); }
  };
  $$('select,input', root).forEach(i => { i.oninput = upd; i.onchange = upd; }); upd();
};

/* u7：表格產生器 */
Labs.table = (root, u, api) => {
  let R = 3, C = 3, al = 'l', vl = false, hl = false;
  const cells = {};
  const draw = () => {
    let t = '<table class="tb">';
    for (let r = 0; r < R; r++) { t += '<tr>'; for (let c = 0; c < C; c++) t += '<td><input class="cellin" data-r="' + r + '" data-c="' + c + '" aria-label="第' + (r + 1) + '列第' + (c + 1) + '欄" value="' + esc(cells[r + ',' + c] || '') + '"></td>'; t += '</tr>'; }
    t += '</table>';
    root.innerHTML = '<div class="labgrid"><div class="panel"><h3>表格產生器</h3><div class="ctl"><label for="R">列數</label><input id="R" type="number" min="1" max="6" value="' + R + '" style="width:4.5em"><label for="C" style="min-width:3em">欄數</label><input id="C" type="number" min="1" max="6" value="' + C + '" style="width:4.5em"></div>' +
      '<div class="ctl"><label for="al">對齊</label><select id="al"><option value="l"' + (al === 'l' ? ' selected' : '') + '>靠左 l</option><option value="c"' + (al === 'c' ? ' selected' : '') + '>置中 c</option><option value="r"' + (al === 'r' ? ' selected' : '') + '>靠右 r</option></select></div>' +
      '<label class="chk"><input type="checkbox" id="vl"' + (vl ? ' checked' : '') + '> 垂直線</label><label class="chk"><input type="checkbox" id="hl"' + (hl ? ' checked' : '') + '> 水平線</label><div class="scroll">' + t + '</div></div>' +
      '<div class="panel"><h3>產生的 LaTeX</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div></div>';
    const ng = () => {
      const sep = vl ? '|' : '', spec = sep + Array(C).fill(al).join(sep) + sep, h = hl ? '\\hline\n' : '';
      let s = '\\begin{tabular}{' + spec + '}\n' + h;
      for (let r = 0; r < R; r++) { s += Array.from({ length: C }, (_, c) => cells[r + ',' + c] || ' ').join(' & ') + ' \\\\\n' + h; }
      s += '\\end{tabular}';
      $('#gen', root).textContent = s;
      if (C >= 3 && al === 'c' && vl && hl) { $('#msg', root).innerHTML = '<div class="okbox">✔ 符合任務！複製到 Overleaf 試試看。</div>'; api.done(); } else $('#msg', root).innerHTML = '';
    };
    $$('.cellin', root).forEach(i => i.oninput = () => { cells[i.dataset.r + ',' + i.dataset.c] = i.value; ng(); });
    const num = (id, f) => { $(id, root).onchange = e => { f(Math.max(1, Math.min(6, +e.target.value || 1))); draw(); }; };
    num('#R', v => R = v); num('#C', v => C = v);
    $('#al', root).onchange = e => { al = e.target.value; ng(); };
    $('#vl', root).onchange = e => { vl = e.target.checked; ng(); };
    $('#hl', root).onchange = e => { hl = e.target.checked; ng(); };
    ng();
  };
  draw();
};

/* u8：數學公式 */
Labs.math = (root, u, api) => {
  const presets = [['二次公式', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'], ['求和', '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}'], ['積分', '\\int_0^1 x^2\\,dx']];
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>輸入公式（不用寫 $）</h3><textarea id="m" spellcheck="false" aria-label="LaTeX 公式">\\frac{1}{2}</textarea><div class="row" style="margin-top:8px">' +
    presets.map((p, i) => '<button class="btn sec sm" type="button" data-p="' + i + '">' + p[0] + '</button>').join('') + '</div><div id="msg" style="margin-top:10px"></div></div>' +
    '<div class="panel"><h3>即時顯示</h3><div id="prev" style="font-size:1.4rem;padding:12px;overflow:auto;min-height:3em"></div></div></div>';
  const upd = () => {
    const s = $('#m', root).value, el = $('#prev', root);
    if (window.katex) { try { window.katex.render(s, el, { throwOnError: true, displayMode: true }); } catch (e) { el.innerHTML = '<div class="err">語法錯誤：' + esc(String(e.message).replace(/^KaTeX parse error: /, '')) + '</div>'; } }
    else el.innerHTML = '<div class="warnbox">公式顯示元件沒有載入（可能離線），先顯示原始語法：<code>' + esc(s) + '</code></div>';
    if (/\\frac\s*\{/.test(s) && /\\sqrt\s*(\[[^\]]*\])?\s*\{/.test(s) && !el.querySelector('.err')) { $('#msg', root).innerHTML = '<div class="okbox">✔ 有分數也有根號！</div>'; api.done(); } else $('#msg', root).innerHTML = '';
  };
  $('#m', root).oninput = upd;
  $$('[data-p]', root).forEach(b => b.onclick = () => { $('#m', root).value = presets[b.dataset.p][1]; upd(); });
  window.__mathHook = upd; upd();
  return () => { window.__mathHook = null; };
};

/* u9：參考文獻 */
Labs.cite = (root, u, api) => {
  const bib = { smith2020: 'Smith, J. (2020). 學習排版的第一步. 虛構期刊, 12(3), 1–10.', lee2021: 'Lee, A. (2021). 論文寫作入門. 虛構出版社.', wang2022: 'Wang, B. (2022). 文獻管理的小技巧. 虛構研討會論文集, 45–52.' };
  const init = '這是一個重要觀點 \\cite{smith2020}。\n另一篇研究也這樣說 \\cite{}。\n\n';
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>references.bib 裡的文獻（虛構）</h3>' + Object.keys(bib).map(k => '<div class="muted"><code>' + k + '</code>　' + esc(bib[k]) + '</div>').join('') +
    '<h3 style="margin-top:12px">main.tex 內文</h3><textarea id="t" spellcheck="false" style="min-height:140px">' + esc(init) + '</textarea>' +
    '<div class="row" style="margin-top:8px"><button class="btn" type="button" id="go">▶ 編譯</button></div></div><div class="panel"><h3>結果</h3><div id="out" class="muted">補上引用與兩行參考文獻指令後編譯。</div></div></div>';
  $('#go', root).onclick = () => {
    const s = $('#t', root).value, keys = []; let m; const re = /\\cite\{([^}]*)\}/g;
    while ((m = re.exec(s))) m[1].split(',').map(x => x.trim()).filter(Boolean).forEach(k => keys.push(k));
    const bad = keys.filter(k => !bib[k]), uniq = Array.from(new Set(keys.filter(k => bib[k])));
    const hasStyle = /\\bibliographystyle\{[^}]+\}/.test(s), hasBib = /\\bibliography\{[^}]+\}/.test(s);
    const out = $('#out', root);
    let h = '';
    if (bad.length) h += '<div class="err">Warning: Citation ' + bad.map(esc).join(', ') + ' undefined → [?]</div>';
    if (!hasStyle || !hasBib) h += '<div class="warnbox" style="margin-top:8px">少了 ' + (!hasStyle ? '\\bibliographystyle{plain} ' : '') + (!hasBib ? '\\bibliography{references}' : '') + '，參考文獻不會出現。</div>';
    if (uniq.length >= 2 && hasStyle && hasBib && !bad.length) {
      const order = uniq.slice().sort();
      h = '<div class="okbox">✔ 編譯成功！</div><div class="page" style="padding:14px;margin-top:10px;color:#111;font-size:.85rem"><p>' + esc(s.replace(/\\cite\{[^}]*\}/g, c => '[' + (c.match(/\{([^}]*)\}/)[1].split(',').map(k => order.indexOf(k.trim()) + 1).join(',')) + ']').replace(/\\bibliograph\w*\{[^}]*\}/g, '').trim()).replace(/\n/g, '<br>') + '</p><h4>參考文獻</h4>' + order.map((k, i) => '<p>[' + (i + 1) + '] ' + esc(bib[k]) + '</p>').join('') + '</div>';
      out.innerHTML = h; api.done(); return;
    }
    out.innerHTML = h || '<div class="warnbox">至少要引用兩篇不同的文獻。</div>'; api.say(pick(THINK), 'think');
  };
};

/* u10：目錄與頁碼 */
Labs.pageno = (root, u, api) => {
  const opts = [['star', '摘要用 \\section*，不進目錄'], ['roman', '前面用 \\pagenumbering{roman}（羅馬數字）'], ['arabic', '正文前加 \\pagenumbering{arabic}（從 1 重新開始）'], ['clear', '摘要、目錄、正文之間加 \\clearpage 分頁']];
  root.innerHTML = '<div class="labgrid"><div class="panel"><h3>設定</h3>' + opts.map(o => '<label class="chk"><input type="checkbox" data-k="' + o[0] + '"> ' + esc(o[1]) + '</label>').join('') +
    '<h3 style="margin-top:12px">語法</h3><pre class="code" id="gen" style="margin:0"></pre><div id="msg" style="margin-top:10px"></div></div>' +
    '<div class="panel"><h3>頁面預覽（示意）</h3><div class="pgs" id="pgs"></div><div id="toc" class="muted"></div></div></div>';
  const rom = ['i', 'ii', 'iii'];
  const upd = () => {
    const k = {}; $$('input', root).forEach(i => k[i.dataset.k] = i.checked);
    const C = k.clear ? '\\clearpage\n' : '';
    $('#gen', root).textContent = (k.roman ? '\\pagenumbering{roman}\n' : '') + (k.star ? '\\section*{摘要}\n' : '\\section{摘要}\n') + '本文介紹……\n' + C + '\\tableofcontents\n' + C + (k.arabic ? '\\pagenumbering{arabic}\n' : '') + '\\section{前言}\n正文開始。';
    let pages;
    if (k.clear) pages = [['摘要', '本文介紹…'], ['目錄', ''], ['1 前言', '正文開始。']]; else pages = [['摘要 ＋ 目錄 ＋ 前言', '全部擠在同一頁']];
    const nums = pages.map((_, i) => { if (!k.clear) return k.roman ? 'i' : '1'; if (i < 2) return k.roman ? rom[i] : String(i + 1); return k.arabic ? '1' : (k.roman ? rom[i] : String(i + 1)); });
    $('#pgs', root).innerHTML = pages.map((p, i) => '<div class="mini"><b>' + esc(p[0]) + '</b>' + esc(p[1]) + '<div class="no">' + nums[i] + '</div></div>').join('');
    $('#toc', root).innerHTML = '目錄內容：' + (k.star ? '' : '摘要、') + '1 前言';
    if (k.star && k.roman && k.arabic && k.clear) { $('#msg', root).innerHTML = '<div class="okbox">✔ 摘要不進目錄、羅馬數字、正文從 1 開始、各自分頁！</div>'; api.done(); } else $('#msg', root).innerHTML = '';
  };
  $$('input', root).forEach(i => i.onchange = upd); upd();
};
