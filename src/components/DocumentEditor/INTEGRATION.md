# Document Editor 整合指南

## 📋 快速整合步驟

### 1️⃣ 複製檔案
將整個 `DocumentEditor` 資料夾複製到你的專案中：
```
你的專案/
  src/
    components/
      DocumentEditor/  ← 複製整個資料夾
```

### 2️⃣ 安裝必要套件

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

或使用 yarn：
```bash
yarn add @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

#### 套件列表
| 套件名稱 | 版本 | 用途 |
|---------|------|------|
| @tiptap/react | ^3.19.0 | Tiptap React 核心 |
| @tiptap/starter-kit | ^3.19.0 | 基本編輯功能（粗體、斜體等） |
| @tiptap/extension-underline | ^3.19.0 | 底線功能 |
| @tiptap/extension-text-align | ^3.19.0 | 文字對齊 |
| @tiptap/extension-text-style | ^3.19.0 | 文字樣式（顏色/字體基礎） |
| @tiptap/extension-font-family | ^3.19.0 | 字體選擇 |
| @tiptap/extension-color | ^3.19.0 | 文字顏色 |
| @tiptap/extension-highlight | ^3.19.0 | 螢光筆 |
| @tiptap/extension-link | ^3.19.0 | 超連結 |
| @tiptap/extension-image | ^3.19.0 | 圖片插入 |
| @tiptap/extension-table | ^3.19.0 | 表格 |
| @tiptap/extension-table-row | ^3.19.0 | 表格列 |
| @tiptap/extension-table-cell | ^3.19.0 | 表格儲存格 |
| @tiptap/extension-table-header | ^3.19.0 | 表格標題 |

### 3️⃣ 在你的專案中使用

#### 基本使用
```tsx
import React, { useState } from 'react'
import DocumentEditor from './components/DocumentEditor/DocumentEditor'

function MyComponent() {
  const [content, setContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  return (
    <div>
      <DocumentEditor
        content={content}
        onChange={setContent}
        onHTMLChange={setHtmlContent}
        placeholder="開始輸入內容..."
      />
    </div>
  )
}
```

#### Props 說明
```typescript
interface DocumentEditorProps {
  content?: string              // 初始內容（JSON 字串或 HTML）
  onChange?: (json: string) => void     // 內容變更回調（JSON 格式）
  onHTMLChange?: (html: string) => void // 內容變更回調（HTML 格式）
  placeholder?: string          // 提示文字
  editable?: boolean           // 是否可編輯（預設 true）
  className?: string           // 自訂 CSS class
}
```

### 4️⃣ 進階使用範例

#### 儲存到資料庫
```tsx
function SaveToDatabase() {
  const [content, setContent] = useState('')

  const handleSave = async () => {
    // content 是 JSON 字串，可以直接儲存到資料庫
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify({ content }),
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return (
    <>
      <DocumentEditor content={content} onChange={setContent} />
      <button onClick={handleSave}>儲存</button>
    </>
  )
}
```

#### 唯讀模式
```tsx
function ReadOnlyView({ savedContent }: { savedContent: string }) {
  return (
    <DocumentEditor
      content={savedContent}
      editable={false}
      className="readonly-editor"
    />
  )
}
```

#### 匯出 HTML
```tsx
function ExportHTML() {
  const [htmlContent, setHtmlContent] = useState('')

  const handleExport = () => {
    // htmlContent 是 HTML 字串
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.html'
    a.click()
  }

  return (
    <>
      <DocumentEditor onHTMLChange={setHtmlContent} />
      <button onClick={handleExport}>匯出 HTML</button>
    </>
  )
}
```

## 🎯 功能說明

### 基本功能
- ✅ 粗體、斜體、底線、刪除線
- ✅ 標題 H1-H6
- ✅ 字體選擇（標楷體、新細明體、微軟正黑體等 10 種字體）
- ✅ 文字顏色（18 種顏色）、螢光筆（12 種顏色）
- ✅ 文字對齊（左、中、右、兩端）
- ✅ 項目符號、編號清單（中文數字：一、二、三）
- ✅ 列表縮排（增加/減少）
- ✅ 列印功能（只列印編輯器內容）

### 中文特色功能
- ✅ 中文標點符號快速插入面板
  - 常用標點：、。，：；！？
  - 特殊符號：— … ～ · ※
  - 括號類：「」『』（）【】《》〈〉

### 進階功能
- ✅ 超連結插入
- ✅ 圖片插入
- ✅ 表格插入
- ✅ 引用區塊
- ✅ 程式碼區塊
- ✅ 分隔線
- ✅ 復原/重做
- ✅ 清除格式

## ⚙️ React 版本相容性

此編輯器支援：
- React 17.x
- React 18.x
- React 19.x

如果你的專案使用 React 17，請確保已安裝：
```bash
npm install react@^17.0.0 react-dom@^17.0.0
```

## 🎨 自訂樣式

如果你想修改樣式，可以編輯：
- `styles/editor.css` - 編輯器主體樣式
- `styles/toolbar.css` - 工具列樣式

或在你的專案中覆寫 CSS：
```css
.document-editor {
  /* 自訂編輯器容器樣式 */
}

.toolbar {
  /* 自訂工具列樣式 */
}

.ProseMirror {
  /* 自訂編輯區域樣式 */
}
```

## 🐛 常見問題

### Q: 游標會亂跳？
A: 確保使用 `onChange` 回調更新狀態，不要直接修改 `content` prop。

### Q: 樣式沒有載入？
A: 確保有 import CSS 檔案，或檢查你的打包工具是否支援 CSS import。

### Q: 中文輸入法有問題？
A: 此編輯器已支援 IME（輸入法），應該可以正常使用中文輸入法。

### Q: 如何禁用某些功能？
A: 可以修改 `Toolbar.tsx`，移除或註解掉不需要的按鈕。

## 📝 授權

MIT License

---

**有問題？** 歡迎提出 issue 或聯繫開發者。
