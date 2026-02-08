import { useState } from 'react'
import DocumentEditor from './components/DocumentEditor/DocumentEditor'
import './App.css'

function App() {
  const [content, setContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [showOutput, setShowOutput] = useState(false)

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
  }

  const handleHTMLChange = (html: string) => {
    setHtmlContent(html)
  }

  const exportHTML = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📝 Document Editor - 文件編輯器</h1>
        <div className="header-actions">
          <button onClick={() => setShowOutput(!showOutput)} className="btn-secondary">
            {showOutput ? '隱藏輸出' : '顯示輸出'}
          </button>
          <button onClick={exportHTML} className="btn-primary">
            匯出 HTML
          </button>
          <button onClick={exportJSON} className="btn-primary">
            匯出 JSON
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="editor-section">
          <DocumentEditor
            content={content}
            onChange={handleContentChange}
            onHTMLChange={handleHTMLChange}
            placeholder="開始輸入你的文件內容..."
          />
        </div>

        {showOutput && (
          <div className="output-section">
            <div className="output-panel">
              <h3>HTML 輸出</h3>
              <pre className="output-code">{htmlContent}</pre>
            </div>
            <div className="output-panel">
              <h3>JSON 輸出</h3>
              <pre className="output-code">{content}</pre>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          使用 <strong>Tiptap</strong> 建構 | 支援 React 17-19 |
          <a href="https://tiptap.dev" target="_blank" rel="noopener noreferrer"> 文件 </a>
        </p>
      </footer>
    </div>
  )
}

export default App
