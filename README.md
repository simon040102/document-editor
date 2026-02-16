# Document Editor - 公文編輯器

基於 React 18 + Tiptap 3.x + TypeScript 的富文本編輯器，依據《臺北市政府公文製作參考手冊（第 2 版）》規範設計，支援中文公文格式排版。

## 複製到其他專案

### 步驟 1：複製資料夾

將 `src/components/` 下的兩個資料夾複製到你的專案：

```
你的專案/src/components/
├── DocumentEditor/           # 通用富文本編輯器（必要）
└── OfficialDocumentEditor/   # 公文編輯器（選用，含表單 + 列印 + JSON 匯出入）
```

- 只需要編輯器 → 複製 `DocumentEditor/`
- 需要完整公文功能 → 兩個都複製

### 步驟 2：安裝套件

**基本編輯器（DocumentEditor）：**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-subscript @tiptap/extension-superscript lucide-react
```

**公文編輯器（OfficialDocumentEditor）額外需要：**

```bash
npm install react-hook-form
```

### 步驟 3：使用

**方式 A — 只用編輯器：**

```tsx
import DocumentEditor from './components/DocumentEditor'

function App() {
  const [content, setContent] = useState('')

  return (
    <DocumentEditor
      content={content}
      onChange={setContent}
      placeholder="開始輸入..."
    />
  )
}
```

**方式 B — 完整公文編輯器（含表頭表尾表單 + 列印 + JSON 匯出入）：**

```tsx
import OfficialDocumentEditor from './components/OfficialDocumentEditor'

function App() {
  return <OfficialDocumentEditor />
}
```

## DocumentEditor Props

| Prop | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `content` | `string` | `''` | 初始內容（JSON 或 HTML） |
| `onChange` | `(json: string) => void` | - | 內容變更回呼（JSON） |
| `onHTMLChange` | `(html: string) => void` | - | 內容變更回呼（HTML） |
| `placeholder` | `string` | `'開始輸入內容...'` | 佔位文字 |
| `editable` | `boolean` | `true` | 是否可編輯 |
| `className` | `string` | - | 自訂 CSS class |
| `onEditorReady` | `(editor: Editor) => void` | - | Editor 實例就緒回呼 |
| `onPrintOverride` | `() => void` | - | 覆寫列印行為 |
| `onPaperSizeChange` | `(size: PaperSize) => void` | - | 紙張大小變更回呼 |
| `onOrientationChange` | `(o: Orientation) => void` | - | 紙張方向變更回呼 |
| `defaultBindingLine` | `boolean` | `false` | 預設開啟裝訂線 |

## 功能

### 公文格式
- 預設標楷體、兩端對齊
- 7 層分項條列序號：一、→ (一) → 1、→ (1) → 甲、→ (甲) → 子、
- 重新編號（中斷序號後從一重新開始）
- A4 列印（含裝訂線、消除瀏覽器頁首頁尾）

### 文字格式
- 粗體、斜體、底線、刪除線
- 標題 H1-H6
- 10 種字體、7 種字級
- 文字顏色（18 色）、螢光筆（12 色）

### 段落
- 左 / 中 / 右 / 兩端對齊
- 有序列表（7 層中文編號）、無序列表
- 縮排控制、行距調整

### 中文特色
- 中文標點符號快速插入面板
- Word 貼上格式轉換（自動轉巢狀列表）

### 公文編輯器（OfficialDocumentEditor）
- 表頭表單：發文單位、受文者、發文日期字號等
- 表尾表單：正本、副本
- 公文列印（完整公文版面）
- JSON 匯出 / 載入（表單 + 編輯器內容完整還原）

## 資料夾結構

```
src/components/
├── DocumentEditor/               # 通用富文本編輯器
│   ├── DocumentEditor.tsx        # 主元件
│   ├── Toolbar/Toolbar.tsx       # 工具列 + 列印
│   ├── BubbleMenu/               # 氣泡選單（連結、表格）
│   ├── extensions/               # 自訂 Tiptap 擴充
│   │   ├── FontSize.ts           # 字級
│   │   ├── LineHeight.ts         # 行距
│   │   ├── TextIndent.ts         # 縮排
│   │   ├── ListNumbering.ts      # 重新編號
│   │   └── WordPaste.ts          # Word 貼上轉換
│   ├── styles/
│   │   ├── editor.css            # 編輯器樣式（7 層 CSS counters、列印）
│   │   └── toolbar.css           # 工具列樣式
│   ├── types/editor.types.ts     # TypeScript 型別
│   └── index.ts
│
└── OfficialDocumentEditor/       # 公文編輯器
    ├── OfficialDocumentEditor.tsx # 主元件（react-hook-form 表單）
    ├── printUtils.ts             # 公文列印 HTML 生成
    ├── officialDocumentEditor.css # 樣式
    └── index.ts
```

## 開發

```bash
npm install          # 安裝依賴
npm run dev          # 啟動開發伺服器 (localhost:3000)
npm run build        # 建構（含 TypeScript 型別檢查）
node test-editor.mjs # 編輯器測試（需先啟動 dev server）
node test-official-doc.mjs  # 公文編輯器測試
```

## 技術棧

- React 18 + TypeScript
- Tiptap 3.x (ProseMirror)
- Vite 7.x
- lucide-react
- react-hook-form

## 公文規範參考

依據《臺北市政府公文製作參考手冊（第 2 版）》：

- 用紙：A4（210mm x 297mm）
- 字型：中文採楷書
- 邊界：上下左右各 2.5cm，左側裝訂線 1.5cm
- 分項條列序號：一、→ (一) → 1、→ (1) → 甲、→ (甲) → 子、 共 7 層
