/* ---------- 學習卡片的「排出來長這樣」示意圖（全部是自己畫的，不是影片截圖） ---------- */
const Viz = {};
const vl = (n, h) => Array.from({ length: n }, (_, i) => '<div class="vl' + (i % 6 === 5 ? ' s' : '') + '"></div>').join('');
const vp = (inner, cls, no) => '<div class="vp ' + (cls || '') + '">' + inner + (no ? '<div class="no">' + no + '</div>' : '') + '</div>';
const vcol = (inner, cap) => '<div class="viz-col">' + inner + (cap ? '<div class="viz-cap">' + cap + '</div>' : '') + '</div>';
const vcode = s => '<div class="vcode">' + s + '</div>';
const vrow = (...a) => '<div class="viz-row">' + a.join('') + '</div>';
const ARR = '<div class="viz-arr" aria-hidden="true">→</div>';
const kx = (t, d) => '<span class="kx" data-d="' + (d ? 1 : 0) + '" data-tex="' + esc(t) + '">' + esc(t) + '</span>';

// u1：認識 Overleaf 介面
Viz['u1:1'] = () => vrow('<div class="vwin" role="img" aria-label="Overleaf 介面示意：左邊編輯器，右邊 PDF 預覽"><div class="vtop">📄 我的第一份文件　<span class="b">▶ 重新編譯</span><span class="b2">⬇ 下載 PDF</span></div>' +
  '<div class="cols"><div>\\documentclass{article}\n\\begin{document}\nHello, LaTeX!\n\\end{document}<span class="vtag" style="right:6px;bottom:6px">① 在左邊寫語法</span></div><div>' + vp('Hello, LaTeX!<div style="margin-top:6px">' + vl(4) + '</div>', '', '1') + '<span class="vtag" style="right:6px;bottom:6px">② 右邊看 PDF</span></div></div></div>');
Viz['u1:2'] = () => vrow(vcol(vcode('<span class="hl">\\documentclass[11pt]{article}</span>\n<span class="dim">\\usepackage{geometry}</span>\n\\begin{document}\nHello, LaTeX!\n\\end{document}'), '黃底是「文件類別」，決定整份文件的基本樣式'), ARR, vcol(vp('Hello, LaTeX!<div style="margin-top:6px">' + vl(3) + '</div>', '', '1'), '編譯後的 PDF'));
Viz['u1:3'] = () => vrow(vcol('<div class="vcode">main.tex</div>', '你寫的語法'), ARR, vcol('<div class="vok" style="background:#fff7d6;border-color:#f5c400;color:#5b4a00">⚙ 編譯</div>', '按「重新編譯」'), ARR, vcol(vp('PDF', '', ''), '排好版的成品')) + '<p class="viz-note">改了語法，就要重新編譯，右邊的 PDF 才會更新。</p>';

// u2：中文
Viz['u2:0'] = () => vrow(vcol('<div class="vbad">! LaTeX Error: Unicode character 你<br>(U+4F60) not set up for use with LaTeX.</div>', '直接打中文，沒有載入中文套件'), ARR, vcol('<div class="vok">✔ 載入 xeCJK + XeLaTeX 後</div>' + vp('<div style="font-size:11px">你好，LaTeX！</div>', '', '1'), '中文成功顯示'));
Viz['u2:2'] = () => vrow('<div class="vwin" role="img" aria-label="選單示意：把編譯器改成 XeLaTeX"><div class="vtop">⚙ 選單 ▸ 設定</div><div style="padding:10px"><div style="margin-bottom:6px">編譯器</div><div style="border:2px solid #b9c7e0;border-radius:8px;padding:4px 8px;background:#fff">pdfLaTeX ▾</div><div style="margin:6px 0;border:1px solid #e0e6f2;border-radius:8px;overflow:hidden"><div style="padding:3px 8px">pdfLaTeX</div><div style="padding:3px 8px;background:#ffe9a6;font-weight:800">XeLaTeX　← 選這個</div><div style="padding:3px 8px">LuaLaTeX</div></div></div></div>');

// u3：章節與版面
Viz['u3:0'] = () => vrow(vcol(vcode('\\section{簡介}\n\\subsection{什麼是 LaTeX}'), '兩行語法'), ARR, vcol(vp('<b style="font-size:12px">1　簡介</b><div style="margin:4px 0">' + vl(2) + '</div><b style="font-size:10.5px">1.1　什麼是 LaTeX</b><div style="margin-top:4px">' + vl(3) + '</div>', '', '1'), '編號自動產生'));
Viz['u3:1'] = () => vrow(vcol(vp('<div class="box" style="position:absolute;left:30px;right:30px;top:30px;bottom:30px;padding:3px">' + vl(14) + '</div><div style="position:absolute;left:3px;top:14px;font-size:8px;color:#c0392b;font-weight:800">←2cm→</div>', ''), '白邊就是「邊界」，虛線框是文字區'), ARR, vcol(vcode('\\usepackage[a4paper,\n  margin=2cm]{geometry}'), '一行就能設定四邊'));
Viz['u3:2'] = () => vrow(vcol(vp(Array.from({ length: 9 }, () => '<div class="vl" style="margin-bottom:3px"></div>').join(''), ''), '單行距'), vcol(vp(Array.from({ length: 9 }, () => '<div class="vl" style="margin-bottom:7px"></div>').join(''), ''), '\\onehalfspacing 1.5 倍行距'));
Viz['u3:3'] = () => vrow(vcol(vcode('<span class="dim">% 這是註解，不會輸出</span>\n<span class="dim">%\\onehalfspacing</span>\n這行會輸出'), '% 後面的整行都被忽略'), ARR, vcol(vp('這行會輸出', '', '1'), '成品只有一行'));

// u4：封面
Viz['u4:0'] = () => vrow(vcol(vcode('LaTeX 期末報告 \\\\\n王小明'), '加 \\\\ 才會換行'), ARR, vcol(vp('LaTeX 期末報告<br>王小明', '', '')), vcol(vcode('資訊素養\n\nLaTeX 期末報告'), '空一行才是新段落'), ARR, vcol(vp('資訊素養<div style="height:8px"></div>LaTeX 期末報告', '', '')));
Viz['u4:1'] = () => vrow(vcol(vcode('\\begin{center}\n  {\\Huge \\textbf{LaTeX 期末報告}}\n\\end{center}'), ''), ARR, vcol(vp('<div style="text-align:center;margin-top:14px;font-size:15px;font-weight:800;line-height:1.2">LaTeX<br>期末報告</div>', ''), '置中、放大、粗體'));
Viz['u4:2'] = () => vrow(vcol(vcode('\\vspace*{3cm}\n標題\n\\vfill\n指導教授：李老師'), '\\vfill 會把空白撐開'), ARR, vcol(vp('<div style="margin-top:34px;text-align:center;font-weight:800;font-size:12px">標題</div><div style="position:absolute;left:12px;bottom:14px">指導教授：李老師</div>', ''), '標題在上，教授資訊被推到底部'));
Viz['u4:3'] = () => vrow(vcol(vcode('\\usepackage{graphicx}\n\\includegraphics[width=4cm]{logo}'), ''), ARR, vcol(vp('<div class="fig" style="width:56px;margin:12px auto 8px;padding:12px 0;font-size:9px">LOGO</div><div style="text-align:center;font-weight:800;font-size:11px">LaTeX 期末報告</div>', ''), '圖片寬度 4 cm'));

// u5：註腳與清單
Viz['u5:0'] = () => vrow(vcol(vcode('這是一句話\\footnote{這是註腳的內容。}'), ''), ARR, vcol(vp('這是一句話<sup>1</sup><div style="margin-top:6px">' + vl(4) + '</div><div class="fn"><sup>1</sup> 這是註腳的內容。</div>', '', '1'), '註腳自動放到頁面底部'));
const listViz = (env, marks, extra) => vrow(vcol(vcode('\\begin{' + env + '}' + (extra || '') + '\n  \\item 第一項\n  \\item 第二項\n\\end{' + env + '}'), ''), ARR, vcol(vp(['第一項', '第二項'].map((t, i) => '<div style="margin:3px 0"><b style="display:inline-block;width:20px">' + marks[i] + '</b>' + t + '</div>').join(''), ''), ''));
Viz['u5:1'] = () => listViz('itemize', ['•', '•']);
Viz['u5:2'] = () => listViz('enumerate', ['1.', '2.']);
Viz['u5:3'] = () => listViz('enumerate', ['(a)', '(b)'], '[(a)]');

// u6：圖表
Viz['u6:0'] = () => vrow(vcol(vcode('\\begin{figure}[h]\n  \\centering\n  \\includegraphics{plot}\n  \\caption{成績分布}\n  \\label{fig:plot}\n\\end{figure}'), ''), ARR, vcol(vp('<div class="fig" style="margin:10px 6px 4px;padding:18px 0">📊 plot</div><div style="text-align:center;font-size:9px">圖 1：成績分布</div><div style="margin-top:8px">' + vl(3) + '</div>', '', '1'), '編號與標題自動產生'));
Viz['u6:1'] = () => vrow(vcol(vp('文字文字…<div style="margin-top:4px">' + vl(6) + '</div><div style="position:absolute;left:12px;right:12px;bottom:14px;font-size:8px;color:#c0392b;font-weight:800">⚠ 這裡放不下這張圖</div>', '', '1'), '第 1 頁：剩下的空間不夠'), ARR, vcol(vp('<div class="fig" style="margin:6px 4px;padding:18px 0">📊 圖 1</div><div style="margin-top:6px">' + vl(4) + '</div>', '', '2'), '第 2 頁：圖片被移到這裡'));
Viz['u6:2'] = () => {
  const m = (fig, cap) => vcol(vp(fig, '', ''), cap), f = '<div class="fig" style="padding:8px 0;font-size:8px">圖</div>';
  return vrow(m(f + '<div style="margin-top:6px">' + vl(7) + '</div>', 't：頁面頂端'), m('<div style="margin-top:6px">' + vl(3) + '</div>' + f + '<div style="margin-top:6px">' + vl(3) + '</div>', 'h：就在這附近'), m('<div style="margin-top:2px">' + vl(8) + '</div><div style="position:absolute;left:12px;right:12px;bottom:14px">' + f + '</div>', 'b：頁面底部'), m('<div style="margin-top:30px">' + f + '</div>', 'p：獨立一頁')) + '<p class="viz-note">示意圖：圖片可能出現的位置</p>';
};
Viz['u6:3'] = () => vrow(vcol(vcode('如圖 \\ref{fig:plot} 所示，\n詳見第 \\pageref{fig:plot} 頁。'), ''), ARR, vcol(vp('如圖 1 所示，<br>詳見第 2 頁。', '', ''), '編號會跟著圖自動更新'));

// u7：表格
Viz['u7:0'] = () => vrow(vcol(vcode('\\begin{tabular}{|c|c|c|}\n  \\hline\n  姓名 &amp; 科目 &amp; 分數 \\\\\n  \\hline\n  小明 &amp; 數學 &amp; 90 \\\\\n  \\hline\n\\end{tabular}'), ''), ARR, vcol(vp('<table class="vtb" style="margin:14px auto;border:1px solid #111;border-collapse:collapse">' + [['姓名', '科目', '分數'], ['小明', '數學', '90']].map(r => '<tr>' + r.map(c => '<td style="border:1px solid #111;text-align:center">' + c + '</td>').join('') + '</tr>').join('') + '</table>', 'wide', '')));
Viz['u7:1'] = () => vrow(vcol(vp('<table class="vtb" style="margin:14px auto 4px;border:1px solid #111;border-collapse:collapse"><tr><td style="border:1px solid #111">姓名</td><td style="border:1px solid #111">分數</td></tr><tr><td style="border:1px solid #111">小明</td><td style="border:1px solid #111">90</td></tr></table><div style="text-align:center">表 1：成績表</div>', 'wide', ''), '用 table 包起來，就有編號與標題'));
Viz['u7:3'] = () => '<div class="viz-row"><table class="vsym" aria-label="特殊符號對照"><tr><th>想輸出</th><td>&amp;</td><td>%</td><td>$</td><td>#</td><td>_</td></tr><tr><th>要這樣寫</th><td><code>\\&amp;</code></td><td><code>\\%</code></td><td><code>\\$</code></td><td><code>\\#</code></td><td><code>\\_</code></td></tr></table></div><p class="viz-note">這些符號在 LaTeX 有特殊用途，前面加反斜線才會當一般文字顯示。</p>';

// u8：數學（KaTeX，載入失敗時顯示原始語法）
Viz['u8:0'] = () => vrow(vcol(vcode('行內：$a^2 + b^2 = c^2$\n獨立：\\[ a^2 + b^2 = c^2 \\]'), ''), ARR, vcol(vp('行內：' + kx('a^2+b^2=c^2') + '<div style="text-align:center;margin:10px 0">' + kx('a^2+b^2=c^2', 1) + '</div>' + vl(2), 'wide', ''), '獨立公式會自己成一行、置中'));
Viz['u8:1'] = () => vrow(vcol(vcode('\\sqrt{x + 1}\n\\frac{a}{b}'), ''), ARR, vcol('<div class="vp wide" style="aspect-ratio:auto;padding:14px;font-size:15px">' + kx('\\sqrt{x+1}') + '　　' + kx('\\frac{a}{b}') + '</div>'));
Viz['u8:2'] = () => vrow(vcol(vcode('\\sum_{i=1}^{n} i'), ''), ARR, vcol('<div class="vp wide" style="aspect-ratio:auto;padding:14px;font-size:17px">' + kx('\\sum_{i=1}^{n} i', 1) + '</div>', '下標寫在 _，上標寫在 ^'));

// u9：參考文獻
Viz['u9:0'] = () => vrow(vcol(vcode('@article{smith2021,\n  author  = {Smith, Amy},\n  title   = {An Example Article},\n  year    = {2021}\n}'), '.bib 檔裡的一筆資料'), ARR, vcol(vp('<b>參考文獻</b><div style="margin-top:4px">Smith, A. (2021). <i>An Example Article</i>.</div>', 'wide', '')));
Viz['u9:2'] = () => vrow(vcol(vcode('這種做法很常見 \\cite{smith2021}。'), ''), ARR, vcol(vp('這種做法很常見（Smith, 2021）。<div style="margin:6px 0">' + vl(3) + '</div><b style="font-size:9px">參考文獻</b><div style="font-size:8.5px">Smith, A. (2021). An Example Article.</div>', 'wide', '1'), '文中引用與文末清單會對應'));

// u10：目錄與頁碼
Viz['u10:0'] = () => vrow(vcol(vcode('\\tableofcontents'), ''), ARR, vcol(vp('<b style="font-size:12px">目錄</b><div style="margin-top:6px;font-size:9px">1　簡介 ........ 1<br>&nbsp;&nbsp;1.1　背景 ........ 1<br>2　方法 ........ 2</div>', '', '')));
Viz['u10:1'] = () => vrow(vcol(vcode('\\section{簡介}\n\\section*{摘要}'), '加星號就不編號、不進目錄'), ARR, vcol(vp('<b style="font-size:12px">目錄</b><div style="margin-top:6px">1　簡介 ........ 1</div><div style="margin-top:8px;font-size:8px;color:#c0392b;font-weight:800">（摘要沒有出現在這裡）</div>', '', '')));
Viz['u10:2'] = () => vrow(vcol(vp('<b style="font-size:12px">Contents</b><div style="margin-top:6px">1　簡介 ... 1</div>', ''), '預設標題是英文'), ARR, vcol(vcode('\\renewcommand*\\contentsname{目錄}'), ''), ARR, vcol(vp('<b style="font-size:12px">目錄</b><div style="margin-top:6px">1　簡介 ... 1</div>', ''), '改成中文'));
Viz['u10:3'] = () => vrow(vcol(vp('摘要', '', 'i'), '\\pagenumbering{roman}'), vcol(vp('目錄', '', 'ii'), '羅馬數字'), ARR, vcol(vp('正文', '', '1'), '\\pagenumbering{arabic} 從 1 重算'));

function vizHTML(uid, i) {
  const f = Viz[uid + ':' + i]; if (!f) return '';
  return '<div class="viz" role="group" aria-label="示意圖：排出來長這樣"><div class="viz-t">👀 排出來長這樣（示意）</div>' + f() + '</div>';
}
function hydrateMath() {
  $$('.kx').forEach(n => {
    if (!window.katex || n.dataset.done) return;
    try { window.katex.render(n.dataset.tex, n, { throwOnError: false, displayMode: n.dataset.d === '1' }); n.dataset.done = '1'; } catch (e) { }
  });
}
