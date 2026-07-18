# Site 改版簡報：從「新聞摘要站」到「一天一長文的書櫃專欄」

狀態：待動工（等第一批真 essay 進 `content/essays/` 後開始）
日期：2026-07-18
背景決策：digest（每日精選/每週回顧）已從產品下線（pipeline `PUBLISH_DIGEST=false`，
2026-07-18 起 `content/daily`、`content/weekly` 不再有新檔）。產品重新定位為：
**每天一篇長文——一篇深度報導（Guardian Long Read / Comment is Free），
配上書櫃中真正能回應它的書，寫成的 AI 評析。**

這份文件是動工時的設計依據。動工前請先確認 `content/essays/` 已有至少 3-5 篇
真實 essay，用真資料校版型，不要對著空資料設計。

---

## 1. 設計原則

1. **這是專欄，不是聚合器。** 一天最多一篇，有些天沒有（寧缺勿濫是合法輸出）。
   版面應該像 newsletter/專欄網站，不是新聞清單。
2. **靈魂是三元組**：`[深度報導] × [書櫃裡的書] → [這篇回應]`。
   每個頁面都要讓這個配對關係一眼可見。
3. **閱讀優先**：單欄、內文量度約 60-70 字元（中文約 32-38 字）、襯線或高可讀
   內文字體、行高 1.7-1.9。現有的卡片/清單式 grid 退場。
4. **書是一等公民**：站的獨特價值是「我的書櫃如何閱讀世界」，
   要有以書為軸的瀏覽方式。

## 2. 資訊架構（改版後）

```
/                     首頁 = 最新一篇 essay 的全文（hero）
/essays/<date>/       單篇 essay（現有路由保留）
/archive/             逆時序目錄：日期・標題・回應的報導・用到的書
/books/               書索引：每本書一格，列出它回應過的所有文章
/dashboard/           保留（系統健康，連結移到 footer，不再放頁首）
/daily/*, /weekly/*   舊 digest 頁：保留可訪問（歷史存檔），但從首頁導航移除
```

## 3. 各頁規格

### 首頁 `/`
- 直接呈現**最近一篇** essay 全文（不是「今天」——沒稿的日子不能開天窗；
  用 `essays` collection 排序取第一篇即可）。
- 文首放結構化的三元組 header（見 §4）。
- 文末：「前一篇」連結 + 「全部評析 →」(`/archive/`)。
- 現有 index.astro 的三個清單區塊（書櫃評析/每日精選/每週回顧）整個移除。

### 單篇 `/essays/<date>/`
- 與首頁同版型（可共用 component）；上一篇/下一篇導航。

### Archive `/archive/`
- 每筆一行或一小塊：日期・essay 標題・回應的報導標題（外連）・書名（內連到 /books/）。
- 像雜誌目錄，不做卡片牆。

### 書索引 `/books/`
- 以書分組：書名 + 這本書回應過的 essay 列表（日期・標題）。
- 資料來源：彙整所有 essay 的書目（見 §4 資料契約）。
- 這頁是本站獨有的殺手級頁面，值得花心思，但第一版簡單列表即可。

## 4. 資料契約（pipeline → site）

Essay markdown 由 pipeline 的 `EssayRenderer`（bookshelf-echo repo,
`publisher/src/.../EssayRenderer.kt`）產生，落在 `content/essays/<YYYY-MM-DD>.md`。
目前格式：

```markdown
---
title: "評析標題"
date: 2026-07-19
kind: essay
---

> 回應新聞：[新聞標題](https://…)（guardian）

（essay 內文 Markdown，800-1500 字）

---

本文書目：

- 《書名》｜章節名
```

**改版時建議先升級 EssayRenderer 的 frontmatter**（pipeline 側小改動），把三元組
結構化，免得前端 parse markdown 正文：

```yaml
title: "評析標題"
date: 2026-07-19
kind: essay
news_title: "…"
news_url: "…"
news_source: "guardian"
books:
  - book_title: "…"
    chapter_title: "…"
```

資料都已在 pipeline 的 `essays.books` JSON 欄位裡，只是 renderer 目前把它
渲染成正文清單。升級後 `src/content.config.ts` 的 essays schema 同步加欄位
（全部 optional，向後相容已存在的檔案）。若不想動 pipeline，備案是前端從
正文 parse `> 回應新聞：` 行與 `本文書目：` 清單——可行但脆弱，不建議。

## 5. 三元組 header（每篇 essay 頂部的固定主件）

視覺上大致是：

```
  ┌────────────────────────────────────────────┐
  │  回應報導   The Dacre dynasty …  (Guardian) │   ← 外連原文
  │  以書回應   《書名》｜章節名                  │   ← 內連 /books/
  └────────────────────────────────────────────┘
   評析標題（大字）
   2026-07-19 · AI 撰寫，經 judge + critic 兩道審查
```

- 「AI 撰寫」的 transparency 標註要保留（誠實原則是這個產品的核心價值觀）。
- 書名連到 `/books/` 對應區塊。

## 6. 邊界情況

- **沒有稿的日子**：首頁顯示最近一篇即可，不需要「今日缺席」告示。
- **essays 為空**（理論上動工時已不會發生）：保留現有的空狀態文案。
- **舊 digest 連結**：`/daily/*`、`/weekly/*` 繼續 build（content 檔案還在），
  只是不再從首頁連過去。外部舊連結（LINE 卡片歷史訊息）不會 404。
- **`daily.json` / `essay.json`**：`src/pages/daily.json.ts` 是 nplus-backend
  LINE 每日推播的資料源（`AiRadarDigestFetcher` 讀它，404 會讓整張 LINE 卡
  發不出去）——**不可刪除**。
  ⚠️ 急迫：daily 凍結後 `daily.json` 會永遠回傳 2026-07-18 的資料
  （`date` 欄位固定在那天），LINE job 每天 08:00 照推 → **每天收到同一張
  過期卡**。這不用等改版，應盡快處理：短期可先停用 backend 的
  `ai_radar_daily_push` 排程，或讓 backend 比對 `payload.date != 今天` 就
  跳過；正解是 §8 的「改推 essay」。

## 7. 不要做的事

- 不要引入 CSS framework / UI library——現有 Base.astro 的手寫 CSS 路線保持。
- 不要做 tag/分類/搜尋/RSS（等內容量夠了再說；RSS 可以是 v2）。
- 不要動 dashboard 的內容，只把入口移到 footer。
- 不要刪 `content/daily`、`content/weekly` 的歷史檔案。

## 8. 相關的後續（不屬於本次改版，記在這裡免得忘）

- nplus-backend 的 LINE 每日卡片：digest 凍結後，卡片應改為「今日評析」
  （有 essay 的日子推 essay 標題+連結，沒有的日子不推或推空卡文案）。
  牽動 `AiRadarDigestFetcher` 與 `daily.json`/`essay.json` 的選用。
- Pipeline 側品質迭代（bookshelf-echo repo `docs/next-steps.md`）：
  essayist 候選排序、檢索 query 改用 digest 摘要、judge verdict 標註資料回收。
