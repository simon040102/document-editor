# Document Editor - Agent 操作指南

## 專案概述

基於 React 18 + Tiptap 3.x + Vite 7.x + TypeScript 的富文本編輯器，依據《臺北市政府公文製作參考手冊（第 2 版）》規範設計，支援中文公文格式排版。

## 技術架構

- **前端框架**: React 18 + TypeScript
- **編輯器核心**: Tiptap 3.x (ProseMirror)
- **建構工具**: Vite 7.x
- **圖示**: lucide-react
- **測試**: Puppeteer (headless browser)
- **部署**: GitHub → main 分支

## 目錄結構

```
src/components/DocumentEditor/
├── DocumentEditor.tsx        # 主元件，註冊所有 Tiptap 擴充
├── Toolbar/Toolbar.tsx       # 工具列 UI + handlePrint 列印功能
├── BubbleMenu/               # 連結與表格的氣泡選單
├── extensions/               # 自訂 Tiptap 擴充
│   ├── FontSize.ts           # 字級控制
│   ├── LineHeight.ts         # 行距控制
│   ├── TextIndent.ts         # 縮排控制
│   ├── ListNumbering.ts      # 列表重新編號 (restartNumbering)
│   └── WordPaste.ts          # Word 貼上格式轉換
├── styles/
│   ├── editor.css            # 編輯器主樣式（含列表 7 層 CSS counters、列印樣式）
│   └── toolbar.css           # 工具列樣式
├── types/editor.types.ts     # TypeScript 型別定義
└── index.ts                  # 匯出入口
```

## 關鍵檔案說明

### editor.css — 列表 7 層 CSS Counter 系統
- 使用 CSS `counter-reset`/`counter-increment`/`counter-set` 實現公文編號
- 7 層格式：一、→ (一) → 1、→ (1) → 甲、→ (甲) → 子、
- 計數器名稱：`list-L1` ~ `list-L7`
- Counter styles: `trad-chinese-informal`, `decimal`, `cjk-heavenly-stem`, `cjk-earthly-branch`
- `data-restart-numbering="true"` HTML 屬性控制重新編號

### Toolbar.tsx — handlePrint 列印樣式
- `handlePrint` 函數開啟新視窗並注入 inline CSS
- **重要**：編輯器 CSS 與列印 CSS 必須保持同步！修改 editor.css 中的列表樣式時，必須同步更新 Toolbar.tsx 的 handlePrint 內對應的 inline styles
- 列印設定：A4、邊界 2.5cm（左 4cm 含裝訂線）、標楷體、頁碼置中

### ListNumbering.ts — 重新編號擴充
- 為 `orderedList` 新增 `restartNumbering` 屬性
- `toggleRestartNumbering` command 切換重新編號
- 對應 HTML: `<ol data-restart-numbering="true">`

### WordPaste.ts — Word 貼上處理
- ProseMirror Plugin 使用 `transformPastedHTML` 攔截
- 偵測 Word HTML（`mso-list`, `MsoListParagraph` 等標記）
- 將扁平 Word 列表段落轉換為巢狀 `<ol><li>` 結構

## 開發流程

### 啟動開發伺服器
```bash
npm run dev
```
預設跑在 `http://localhost:3000`

### 建構檢查
```bash
npm run build
```
執行 `tsc && vite build`，會同時做 TypeScript 型別檢查。

### 執行測試
```bash
node test-editor.mjs
```
- **前提**：開發伺服器必須在 `localhost:3000` 運行中
- 使用 Puppeteer 開啟瀏覽器自動測試
- 測試結果包含截圖，儲存在 `test-screenshots/` 目錄
- 目前約 48 項斷言，涵蓋：頁面載入、列表續號、JSON 載入、marks 格式、重新編號、7 層巢狀等

## 完成任務的標準流程

每次修改程式碼後，必須依序執行：

1. **建構檢查** — `npm run build`，確認 TypeScript 無錯誤
2. **啟動 dev server** — 如果尚未啟動，先 `npm run dev &`
3. **執行測試** — `node test-editor.mjs`，確認所有斷言通過（0 失敗）
4. **提交** — `git add <修改的檔案> && git commit -m "訊息"`
5. **推送** — `git push`

## 注意事項

### 同步修改清單
修改以下任一項目時，相關檔案必須一起更新：

| 修改項目 | 需同步更新的檔案 |
|---------|----------------|
| 列表層級樣式（padding、marker） | `editor.css` + `Toolbar.tsx` (handlePrint) |
| 新增 Tiptap 擴充 | `DocumentEditor.tsx` (import + extensions 陣列) |
| 層級數量變更 | `editor.css` + `Toolbar.tsx` + `DocumentEditor.tsx` (操作說明) + `README.md` + `test-editor.mjs` |

### CSS Counter 機制
- `.ProseMirror` 上的 `counter-reset: list-L1 0` 是全域的，讓多個 `<ol>` 區塊共用計數器
- 每層 `ol` 使用 `counter-reset` 建立該層計數器
- `counter-set` 用於重新編號（不建立新 scope）
- `::before` 偽元素用 `position: absolute` + `left` 負值 + `width` + `text-align: right` 定位 marker

### 列印樣式
- Toolbar.tsx 的 `handlePrint` 使用 `document.open()` 建立新文件
- 所有樣式以 inline `<style>` 注入，不依賴外部 CSS
- 修改編輯器外觀後務必同步列印樣式

### 測試
- `test-editor.mjs` 使用 `window.__tiptapEditor` API 操作編輯器
- 該 API 在 `DocumentEditor.tsx` 的 `onCreate` callback 中暴露
- 測試依賴 dev server 在 port 3000 運行
- 新增功能時應在 test-editor.mjs 補充對應測試

### Git 工作流
- 主分支：`main`
- 遠端：`origin` → `https://github.com/simon040102/document-editor.git`
- 直接推送到 main（無 PR 流程）
- commit message 使用英文
