# Document Editor - 公文編輯器

一個基於 React 和 Tiptap 的富文本編輯器，依據《臺北市政府公文製作參考手冊》規範設計，支援中文公文格式排版。

## 特色功能

### 公文格式規範

- **預設字型**：標楷體（DFKai-SB），符合公文「中文採楷書」規定
- **預設對齊**：兩端對齊
- **分項條列序號**：支援公文規範 6 層編號
  - 第 1 層：一、二、三、…
  - 第 2 層：(一)(二)(三)…
  - 第 3 層：1、2、3、…
  - 第 4 層：(1)(2)(3)…
  - 第 5 層：甲、乙、丙、…
  - 第 6 層：(甲)(乙)(丙)…
- **列印頁面**：A4 紙張、頁邊界 2.5cm（左側 4cm 含裝訂線）、頁碼頁尾置中
- **字級選擇**：提供 10pt / 12pt / 14pt / 16pt / 18pt / 20pt / 24pt

### 基本編輯功能

- 文字格式化：粗體、斜體、底線、刪除線、上標、下標
- 標題層級：H1-H6
- 字體選擇：標楷體、新細明體、微軟正黑體等 10 種字體
- 文字顏色：18 色選擇器
- 螢光筆：12 色背景標記

### 中文特色功能

- 中文標點符號面板：一鍵插入常用中文標點
  - 常用標點：、。，：；！？
  - 特殊符號：— … ～ · ※
  - 括號類：「」『』（）【】《》〈〉

### 段落格式

- 文字對齊：左對齊、置中、右對齊、兩端對齊
- 列表：有序列表（中文數字 6 層）、無序列表、巢狀列表
- 縮排控制：增加/減少縮排
- 引用區塊

### 進階功能

- 表格：插入、編輯、合併儲存格、調整欄寬
- 圖片：從 URL 插入或從電腦上傳
- 連結：超連結插入與編輯（含氣泡選單）
- 程式碼區塊、分隔線
- 復原/重做、清除格式
- 列印（符合公文規範的頁面配置）

### 輸出功能

- HTML 匯出
- JSON 匯出
- 即時預覽輸出結果

## 快速開始

### 安裝依賴

```bash
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

專案會在 `http://localhost:3000` 啟動。

### 建置

```bash
npm run build
```

## 整合到其他專案

### 步驟 1：複製元件

將 `src/components/DocumentEditor` 整個資料夾複製到目標專案中。

### 步驟 2：安裝依賴

在目標專案中執行：

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-font-family @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-link @tiptap/extension-subscript @tiptap/extension-superscript @tiptap/extension-table @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-table-row @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-underline lucide-react
```

### 步驟 3：使用元件

```tsx
import DocumentEditor from './components/DocumentEditor'

function MyApp() {
  const [content, setContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  return (
    <DocumentEditor
      content={content}
      onChange={setContent}
      onHTMLChange={setHtmlContent}
      placeholder="開始輸入..."
    />
  )
}
```

### 元件 Props

| Prop | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `content` | `string` | `''` | 初始內容（JSON 字串或 HTML） |
| `onChange` | `(content: string) => void` | - | 內容變更回呼（JSON 格式） |
| `onHTMLChange` | `(html: string) => void` | - | 內容變更回呼（HTML 格式） |
| `placeholder` | `string` | `'開始輸入內容...'` | 佔位文字 |
| `editable` | `boolean` | `true` | 是否可編輯 |
| `className` | `string` | `''` | 自訂 CSS class |

### 資料夾結構

```
DocumentEditor/
├── DocumentEditor.tsx          # 主元件
├── index.ts                    # 匯出入口
├── Toolbar/
│   └── Toolbar.tsx             # 工具列（含列印功能）
├── BubbleMenu/
│   ├── LinkBubbleMenu.tsx      # 連結氣泡選單
│   ├── TableBubbleMenu.tsx     # 表格氣泡選單
│   └── bubbleMenu.css
├── extensions/
│   └── FontSize.ts             # 自訂字級擴充
├── types/
│   └── editor.types.ts         # TypeScript 型別定義
└── styles/
    ├── editor.css              # 編輯器樣式（含列印樣式）
    └── toolbar.css             # 工具列樣式
```

## 技術棧

- **React** 18.x
- **TypeScript** 5.x
- **Tiptap** 3.x（基於 ProseMirror）
- **Lucide React**（工具列圖示）
- **Vite** 7.x

支援 React 17.x / 18.x / 19.x

## 公文規範參考

本編輯器的格式設定依據《臺北市政府公文製作參考手冊（第 2 版）》，主要規範包括：

- 用紙：A4（210mm x 297mm）
- 書寫方式：由左而右，由上而下，橫行書寫
- 字型：中文採楷書
- 邊界：上下左右各 2.5cm，左側裝訂線 1.5cm
- 頁碼：頁尾置中
- 行距：12pt 字對應 15pt 行距
- 分項條列序號：一、→ (一) → 1、→ (1) → 甲、→ (甲) 共 6 層
