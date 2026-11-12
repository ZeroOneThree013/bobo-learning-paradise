# NOTES.md — 工作日誌

> 每次收工更新：做到哪、下次從哪開始。

## 目前狀態（2026-11-12）
- 兩本書、17 個單元：
  - LaTeX 排版（`content/latex/`）：u1–u10 來自影片，u11（Beamer 簡報）為官方補充。
  - 網頁 & 開發（`content/web/`）：u101–u106，整理自播放清單的第 1 支影片（SQL 基礎語法，逐字稿由使用者提供），並對照 SQLite 官方文件。
- 專案結構：`content/` `src/` `assets/` `backend/`，`build.py` 打包並檢查格式；多主題已重構完成，LaTeX 單元 id 與舊進度不變。
- 舊版（10/06 作業）保存在分支 `hw-2026-10-06-vibe-coding`。

## 已查證並更正影片的地方
- u103：BETWEEN 兩端都包含（影片說等同「小於 90」）。
- u105：SQLite 會忽略 VARCHAR(N) 的 N（影片說是字數上限）。

## 下次從哪開始
1. 「網頁 & 開發」影片正式標題待補（`content/web/theme.json` 的 `videos[0].title` 目前是暫定的描述）。
2. 播放清單其餘 4 支影片（使用者指定）：每拿到一支的逐字稿，就照 CLAUDE.md 第 6.5 節新增單元，`videos` 加一筆並用 `video` 欄位指向它。
3. 舊 LaTeX 單元單選題答案位置分散（CLAUDE.md 第 9 節 #2）。
