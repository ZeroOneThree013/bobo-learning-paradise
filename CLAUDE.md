# CLAUDE.md — BoBo 學習樂園（小博的 LaTeX 學習樂園）

> AI 每次開工前先讀完這份文件。這裡的規則優先於你的預設習慣。
> 讀完後你應該知道：這個專案是什麼、檔案放哪、新增內容照什麼格式、做完怎麼驗收。

## 1. 專案是什麼

- **目的**：把一支 YouTube 教學影片（PAPAYA 電腦教室〈用 LaTeX 完成專業報告，使用 Overleaf〉）整理成互動式學習網站，並對照 Overleaf 官方文件，讓初學者能「學習 → 驗證 → 實作」。
- **讀者**：第一次接觸 LaTeX 的大學生，中文（繁體）母語。
- **吉祥物**：「小博（Bobo）」，一本戴學士帽的智慧之書，負責鼓勵與提示。
- **每個單元固定三段**：📖 學習（4 張卡片）→ ✅ 驗證（5 題）→ 🛠 實作（1 個互動練習）。三段都完成才算完成單元並解鎖徽章。
- **成品形式**：打包成**單一 `index.html`**，部署在 GitHub Pages（`main` 分支、根目錄）。沒有後端也能完整使用；Google 登入與雲端題庫是選配。

## 2. 檔案結構（各放什麼）

```
index.html          ← 打包後的成品（由 build.py 產生，絕對不要手改）
build.py            ← 打包 + 資料格式檢查
CLAUDE.md           ← 本文件
NOTES.md            ← 工作日誌：做到哪、下次從哪開始
content/latex/
  theme.json        ← 這個主題的影片來源 {"video": {...}}
  u1.json … uN.json ← 每個單元一個檔案（新增單元只需要新增這種檔案）
src/
  template.html     ← 頁面骨架（<head>、頁尾文字、各區塊的佔位符）
  style.css         ← 全部樣式
  config.js         ← GAS_URL、GOOGLE_CLIENT_ID（選配後端設定，不要改）
  core.js           ← 共用小工具（$、esc、md、codeHTML…）
  labs.js           ← 實作元件：Labs.<type> = (root, u, api) => {…}
  viz.js            ← 學習卡片的「排出來長這樣」示意圖（選用）
  app.js            ← 狀態、路由、各頁面渲染、題庫邏輯
  account.js        ← 登入、同步、匯出（選配）
assets/
  icon.png, apple-touch-icon.png, manifest.json
  mascot/{happy,cheer,sad,think}.webp   ← 小博的四種表情
backend/
  Code.gs           ← Google Apps Script（選配雲端題庫與回饋）
  questions.csv     ← 雲端題庫範本（選配）
```

**打包規則**：`build.py` 把 `src/template.html` 內的 `{{CSS}}`、`{{CONFIG}}`、`{{DATA}}`、`{{JS}}`、`{{b64:路徑}}` 換成對應檔案內容；JS 依序是 core → labs → viz → app → account。

## 3. 開發流程

1. 改 `content/`、`src/`、`assets/` 裡的檔案（**不是** `index.html`）。
2. 執行 `python3 build.py`（Windows 可用 `python build.py` 或 `py build.py`）。
   - 它會先檢查所有單元的資料格式；有 `✗` 錯誤就不會產生 `index.html`，請依訊息修正。
   - `⚠` 是警告，不會中斷，但新內容不應再產生警告。
3. 本機預覽：直接用瀏覽器開 `index.html`，或 `python3 -m http.server 8000` 後開 `http://localhost:8000`。
4. `git add -A && git commit`，推到 `main`，GitHub Pages 約 1–2 分鐘後更新。**`index.html` 要一起 commit**（Pages 直接讀它）。

## 4. 視覺與語氣規範

**色票（定義在 `src/style.css` 的 `:root`，只能用這些變數，不要自己加新顏色）**

| 變數 | 色碼 | 用途 |
|---|---|---|
| `--navy` / `--navy2` | #1f3a6b / #2f5597 | 標題、深色區塊 |
| `--blue` / `--sky` | #3b82c8 / #d6ecfb | 連結、淺藍底 |
| `--cream` / `--paper` | #fff8e8 / #fffdf6 | 卡片與頁面底色 |
| `--gold` / `--gold-d` | #f7c948 / #d9a521 | 主要按鈕、星星 |
| `--mint` / `--mint-bg` / `--mint-d` | #58c79a / #e2f8ee / #2a8f68 | 答對、成功 |
| `--pink` / `--pink-bg` / `--pink-d` | #ff8fa3 / #ffe6ec / #c94661 | 答錯、警示 |
| `--wood` / `--wood-d` | #c98c52 / #9c6a37 | 書桌木紋裝飾 |
| `--ink` / `--ink2` / `--line` | #24324d / #566684 / #e6dcc3 | 文字、次要文字、分隔線 |

- 圓角統一 `--r: 22px`；字體用 `--font`（Noto Sans TC 系列）、程式碼用 `--mono`。
- 版面以「卡片」（`.card`）為單位，手機寬度（390px）不可出現橫向捲動。
- 單元圖示、徽章用 emoji，不放外部圖片。
- **語氣**：親切、直白、像小博在陪學；繁體中文，**中文一律用全形標點**（，。：；？！「」）；英文與指令用半形。一句話講一件事，不用艱深術語，必要時先白話再給名詞。
- **不引入框架或新的外部套件**。目前只有 KaTeX（CDN，用於數學示意）；要加任何外部資源必須先問使用者。

## 5. 單元資料格式（`content/latex/uN.json`）

```jsonc
{
  "id": "u11",                 // 固定 "u" + n，必須連續，建立後永遠不改（進度以 id 儲存）
  "n": 11,
  "icon": "🎞️",                // 一個 emoji
  "title": "Beamer 簡報",       // 短，不超過 12 字
  "sub": "frame、標題頁、主題、\\pause",   // 一行副標，列出本單元的關鍵詞
  "official": [{"label": "Beamer（Overleaf 官方）", "url": "https://…"}],   // 最多顯示 3 個
  "cards": [                   // 恰好 4 張
    {
      "t": "卡片標題",
      "body": "內文，支援 `行內程式碼` 與 **粗體**，\n\n 分段",
      "code": "選填：多行 LaTeX 範例",
      "url": "選填：官方連結", "label": "選填：連結按鈕文字",
      "sup": true              // 選填：影片沒講、來自官方文件的補充；標題要加「官方補充：」前綴
    }
  ],
  "questions": [               // 恰好 5 題：2 單選 + 1 是非 + 2 填空
    {"type": "choice", "q": "題目", "options": ["…","…","…","…"], "answer": 1, "explain": "解析"},
    {"type": "tf",     "q": "敘述", "answer": true, "explain": "解析"},
    {"type": "fill",   "q": "補上…", "code": "\\begin{___}", "answers": ["document"],
     "hints": ["第一層提示", "第二層提示（可給字母數）"], "explain": "解析"}
  ],
  "lab": {"type": "sort", "task": "給使用者看的任務說明", "…": "依 lab.type 而定，見第 7 節"}
}
```

JSON 裡的反斜線要寫成 `\\`（例如 LaTeX 的 `\section` 寫成 `"\\section"`）。

**題目規則**
- 星星：單選與是非各 1 顆、填空 2 顆（一次答對且沒用提示），所以每單元固定 7 顆。這個設計不要改。
- `choice` 的 `answer` 是 **0 起算的索引**。**正確答案的位置必須分散在 A–D**，同一單元的兩題不可都放 A（目前 u1、u3–u10 有這個問題，見第 9 節）。
- 錯誤選項要「看起來合理」，不要放荒謬選項。
- `fill` 的 `code` 必須含 `___`；`answers` 是可接受答案陣列（全部小寫英文，不含反斜線）；`hints` 至少兩層，由模糊到具體。
- 每題都要有 `explain`：說明「為什麼」，不只是重複答案。

**內容正確性（最重要）**
- 所有 LaTeX 語法與說法必須能在**影片**或 **Overleaf 官方文件**找到依據。查不到就不要寫，或問使用者。
- 來自官方文件而非影片的卡片，要設 `"sup": true` 並附官方連結。
- 不確定某個指令在 Overleaf 能不能編譯時，不要猜；標明「待確認」並告訴使用者。

## 6. 新增單元的標準步驟（照做，不要跳）

1. 讀本文件與 `NOTES.md`；任選一個現有單元（例如 `content/latex/u11.json`）當格式範本。
2. 查官方文件，確認要寫的語法（見第 5 節「內容正確性」）。
3. 新增 `content/latex/u{N+1}.json`：`id`/`n` 接續現有最大編號。
4. 選實作元件（見第 7 節）：能用現成的 `sort` 就用資料驅動；否則在 `src/labs.js` 新增 `Labs.<新type>`。
5. （選用）想要卡片示意圖，在 `src/viz.js` 加 `Viz['u{N}:{卡片索引}'] = () => …`。
6. 執行 `python3 build.py`，必須顯示 `built index.html`，且新單元沒有 `✗`、沒有新的 `⚠`。
7. 開瀏覽器實測新單元：四張卡片都能翻、5 題都能作答、實作能做出「完成」（用對的答案與錯的答案各試一次）、手機寬度無橫向捲動、主控台沒有錯誤。
8. 更新 `NOTES.md`（做了什麼、下次從哪開始）。
9. 一個單元一個 commit，訊息用中文，例如「新增第 12 單元：TikZ 繪圖」。

新增單元**不需要**改 `app.js`：地圖、徽章、進度、成就頁、雲端同步都是依資料自動長出來的（單元總數會自動更新）。

## 7. 實作元件（`lab.type`）

| type | 內容 | 資料欄位 |
|---|---|---|
| `sort` | 把打亂的程式行排成正確順序（**可重用**） | `lines`（打亂的行）、`answer`（正確順序，需與 lines 是同一組行）、`hint`（排錯時的提示）、`task` |
| `compile` | 補完中文設定、選編譯器（u2 專用） | `task` |
| `layout` / `cover` / `lists` / `float` / `table` / `math` / `cite` / `pageno` | 各單元專用的互動模擬（u3–u10） | `task` |

- 新增類型：在 `src/labs.js` 加 `Labs.<type> = (root, u, api) => {…}`；`root` 是要渲染的容器，`u` 是單元資料，完成時呼叫 `api.done()`，要小博說話呼叫 `api.say(文字, 表情)`。`build.py` 會檢查 `lab.type` 是否存在。
- 這些是**簡化模擬**，頁面上固定提醒「真正的編譯結果請到 Overleaf 確認」，不要把它寫成真的編譯器。

## 8. 不能做的事

- ❌ 手動編輯 `index.html`（下次打包會被覆蓋）。
- ❌ 修改、重新編號、刪除既有單元的 `id`：使用者的進度（`localStorage` 的 `bobo-lab-v1`）與雲端資料都以 id 為鍵。
- ❌ 更動 `src/config.js`、`backend/Code.gs` 的設定值與金鑰，除非使用者明確要求。
- ❌ 新增色彩變數、外部套件、框架、追蹤碼。
- ❌ 寫沒有依據的 LaTeX 說法；❌ 複製影片逐字稿或官方文件大段原文（用自己的話整理並附連結）。
- ❌ 在一次修改裡順手重構不相關的程式；要重構先說明理由。
- ❌ 刪檔、強制推送（`git push --force`）、改寫歷史。

## 9. 已知限制與待辦（動手前先知道）

1. **目前只支援單一主題（LaTeX）**。`app.js` 裡的路由（`#/t/latex`）、`UNITS`/`VIDEO` 全域變數與地圖頁文字都綁定 LaTeX；`THEMES` 的「更多主題」只是占位。要新增整個新主題，必須先重構成「每個主題各自的單元清單」，這是獨立的大工作，請先和使用者討論，不要在新增內容時順手做。
2. 舊單元 u1、u3–u10 的單選題答案幾乎都在 A（程式沒有洗牌選項）。建議之後補上「載入時隨機排列選項並重新對應 answer」，或手動分散。`build.py` 會對這些單元顯示 ⚠。
3. `backend/questions.csv` 是雲端題庫範本，目前只含 u1–u10，**不會**自動同步 `content/`。雲端題庫有某單元的資料時才會覆蓋內建題目，所以不同步也不會壞；若要啟用新單元的雲端題庫，需手動補列。
4. 新增單元會讓「全部單元徽章」門檻提高：先前已集滿徽章的使用者，需要補完新單元才會再次拿到「得意門生」稱號。

## 10. 做完要

回報時簡短列出：
1. 改了哪些檔案（路徑）；
2. `python3 build.py` 的輸出（是否有 ⚠）；
3. 實測結果（見第 6 節第 7 點）；
4. 需要使用者決定或確認的事。

並更新 `NOTES.md`。
