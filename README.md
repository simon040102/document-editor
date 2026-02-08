# Document Editor - 文件編輯器

一個基於 React 和 Tiptap 的富文本編輯器，特別支援中文標點符號快速插入。

## ✨ 特色功能

### 📝 基本編輯功能
- **文字格式化**：粗體、斜體、底線、刪除線
- **標題層級**：H1-H6 支援
- **文字顏色**：多色選擇器
- **螢光筆**：多色背景標記

### 🎯 中文特色功能
- **中文標點符號面板**：一鍵插入常用中文標點
  - 常用標點：、。，：；！？
  - 特殊符號：— … ～ · ※
  - 括號類：「」『』（）【】《》〈〉
- 支援中文輸入法（IME）

### 📐 段落格式
- **文字對齊**：左對齊、置中、右對齊、兩端對齊
- **列表**：有序列表、無序列表、巢狀列表
- **引用區塊**：區塊引用樣式

### 🔧 進階功能
- **表格**：插入和編輯表格
- **圖片**：圖片上傳與插入
- **連結**：超連結插入與編輯
- **程式碼區塊**：程式碼展示
- **分隔線**：段落分隔

### 💾 輸出功能
- **HTML 輸出**：匯出為 HTML 格式
- **JSON 輸出**：匯出為 JSON 格式
- 即時預覽輸出結果

## 🚀 快速開始

### 安裝依賴
\`\`\`bash
npm install
\`\`\`

### 啟動開發伺服器
\`\`\`bash
npm run dev
\`\`\`

專案會在 \`http://localhost:3000\` 啟動。

## 📦 整合到現有專案

將 \`src/components/DocumentEditor\` 目錄複製到你的專案中，然後：

\`\`\`tsx
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
\`\`\`

## 🛠️ 技術棧

- **React** 18.x
- **TypeScript** 5.x
- **Tiptap** 3.x
- **Vite** 7.x

支援 React 17.x / 18.x / 19.x

---

**Made with ❤️ using Tiptap**
