import React, { useState, useRef, useEffect } from 'react'
import { ToolbarProps, CHINESE_PUNCTUATIONS } from '../types/editor.types'
import '../styles/toolbar.css'

const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [showPunctuationPanel, setShowPunctuationPanel] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)

  const punctuationRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const highlightPickerRef = useRef<HTMLDivElement>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)

  // 點擊外部關閉面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (punctuationRef.current && !punctuationRef.current.contains(event.target as Node)) {
        setShowPunctuationPanel(false)
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(event.target as Node)) {
        setShowHighlightPicker(false)
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target as Node)) {
        setShowFontPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!editor) {
    return null
  }

  const insertPunctuation = (punctuation: string) => {
    editor.chain().focus().insertContent(punctuation).run()
    setShowPunctuationPanel(false)
  }

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setShowLinkModal(false)
    }
  }

  const addImage = () => {
    const url = window.prompt('請輸入圖片 URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const handlePrint = () => {
    // 獲取編輯器的 HTML 內容
    const content = editor.getHTML()

    // 創建一個新視窗用於列印
    const printWindow = window.open('', '_blank', 'width=800,height=600')

    if (printWindow) {
      // 寫入 HTML 內容和樣式
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>列印文件</title>
            <style>
              @page {
                margin: 2cm;
              }

              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
                max-width: 800px;
                margin: 0 auto;
              }

              h1 { font-size: 18pt; margin: 1em 0 0.5em; page-break-after: avoid; }
              h2 { font-size: 16pt; margin: 0.8em 0 0.4em; page-break-after: avoid; }
              h3 { font-size: 14pt; margin: 0.6em 0 0.3em; page-break-after: avoid; }
              h4, h5, h6 { font-size: 12pt; margin: 0.5em 0 0.2em; page-break-after: avoid; }

              p { margin: 0.5em 0; orphans: 3; widows: 3; }

              ul, ol { padding-left: 2em; margin: 0.5em 0; }

              /* 中文數字列表 */
              ol {
                list-style: none;
                counter-reset: list-counter;
                padding-left: 5em;
              }

              ol > li {
                counter-increment: list-counter;
                position: relative;
                list-style: none;
              }

              ol > li::marker {
                content: none;
                display: none;
              }

              ol > li::before {
                content: counter(list-counter, trad-chinese-informal) '、';
                position: absolute;
                left: -5em;
                width: 4.5em;
                text-align: right;
                color: #000;
                font-weight: 500;
              }

              ol ol {
                counter-reset: list-counter;
                padding-left: 4em;
              }

              ol ol > li::before {
                content: '(' counter(list-counter, trad-chinese-informal) ')';
                width: 3.5em;
              }

              ol ol ol {
                counter-reset: list-counter;
                padding-left: 3em;
              }

              ol ol ol > li::before {
                content: counter(list-counter, decimal) '.';
                width: 2.5em;
              }

              li {
                margin: 0.2em 0;
                list-style: none;
                page-break-inside: avoid;
              }

              blockquote {
                border-left: 2pt solid #666;
                padding-left: 1em;
                margin: 1em 0;
                color: #333;
                page-break-inside: avoid;
              }

              code {
                background: #f5f5f5;
                padding: 0.2em 0.4em;
                border-radius: 3px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 0.9em;
              }

              pre {
                background: #f5f5f5;
                color: #000;
                padding: 1em;
                border: 1pt solid #ddd;
                border-radius: 5px;
                overflow-x: auto;
                margin: 1em 0;
                page-break-inside: avoid;
              }

              pre code {
                background: none;
                padding: 0;
              }

              hr {
                border: none;
                border-top: 1pt solid #000;
                margin: 2em 0;
                page-break-after: avoid;
              }

              a {
                color: #0066cc;
                text-decoration: underline;
              }

              a::after {
                content: ' (' attr(href) ')';
                font-size: 0.8em;
                color: #666;
              }

              img {
                max-width: 100%;
                height: auto;
                page-break-inside: avoid;
              }

              table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
                page-break-inside: avoid;
              }

              th, td {
                border: 1pt solid #000;
                padding: 4pt 8pt;
                text-align: left;
              }

              th {
                background: #f5f5f5;
                font-weight: bold;
              }

              mark {
                background-color: #ffeb3b;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              [style*='text-align: left'] { text-align: left; }
              [style*='text-align: center'] { text-align: center; }
              [style*='text-align: right'] { text-align: right; }
              [style*='text-align: justify'] { text-align: justify; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `)

      printWindow.document.close()

      // 等待內容載入後執行列印
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        // 不自動關閉，讓用戶控制
      }
    }
  }

  // 更多顏色選項
  const colors = [
    '#000000',
    '#ffffff',
    '#FF0000',
    '#FFA500',
    '#FFFF00',
    '#00FF00',
    '#00FFFF',
    '#0000FF',
    '#FF00FF',
    '#800000',
    '#FF6B6B',
    '#FFA07A',
    '#FFD700',
    '#90EE90',
    '#87CEEB',
    '#9370DB',
    '#FFB6C1',
    '#808080',
  ]
  const highlightColors = [
    '#FFFF00',
    '#FFD700',
    '#FFA500',
    '#FF6B6B',
    '#FFB6C1',
    '#FF00FF',
    '#00FF00',
    '#90EE90',
    '#00FFFF',
    '#87CEEB',
    '#FFA07A',
    '#E6E6FA',
  ]
  const fonts = [
    { label: '預設字體', value: 'inherit' },
    { label: '標楷體', value: 'DFKai-SB, BiauKai, 標楷體, serif' },
    { label: '新細明體', value: 'PMingLiU, 新細明體, serif' },
    { label: '微軟正黑體', value: 'Microsoft JhengHei, 微軟正黑體, sans-serif' },
    { label: '微軟雅黑體', value: 'Microsoft YaHei, 微軟雅黑體, sans-serif' },
    { label: '黑體', value: 'SimHei, 黑體, sans-serif' },
    { label: '宋體', value: 'SimSun, 宋體, serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Courier New', value: 'Courier New, monospace' },
  ]

  return (
    <div className="toolbar">
      {/* 基本格式化按鈕 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="粗體 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="斜體 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="底線 (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="刪除線"
        >
          <s>S</s>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 標題 */}
      <div className="toolbar-group">
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value)
            if (level === 0) {
              editor.chain().focus().setParagraph().run()
            } else {
              editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
            }
            // 選擇後自動失焦
            e.target.blur()
          }}
          value={
            editor.isActive('heading', { level: 1 })
              ? 1
              : editor.isActive('heading', { level: 2 })
              ? 2
              : editor.isActive('heading', { level: 3 })
              ? 3
              : editor.isActive('heading', { level: 4 })
              ? 4
              : editor.isActive('heading', { level: 5 })
              ? 5
              : editor.isActive('heading', { level: 6 })
              ? 6
              : 0
          }
          className="heading-select"
        >
          <option value="0">正文</option>
          <option value="1">標題 1</option>
          <option value="2">標題 2</option>
          <option value="3">標題 3</option>
          <option value="4">標題 4</option>
          <option value="5">標題 5</option>
          <option value="6">標題 6</option>
        </select>
      </div>

      <div className="toolbar-divider"></div>

      {/* 字體選擇 */}
      <div className="toolbar-group">
        <div className="font-picker-wrapper" ref={fontPickerRef}>
          <button
            onClick={() => setShowFontPicker(!showFontPicker)}
            title="字體"
            className="font-button"
          >
            字
          </button>
          {showFontPicker && (
            <div className="font-picker-panel">
              {fonts.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    if (font.value === 'inherit') {
                      editor.chain().focus().unsetFontFamily().run()
                    } else {
                      editor.chain().focus().setFontFamily(font.value).run()
                    }
                    setShowFontPicker(false)
                  }}
                  style={{ fontFamily: font.value }}
                  className="font-item"
                  title={font.label}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider"></div>

      {/* 文字顏色和螢光筆 */}
      <div className="toolbar-group">
        <div className="color-picker-wrapper" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="文字顏色"
            className="color-button"
          >
            A
          </button>
          {showColorPicker && (
            <div className="color-picker-panel">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run()
                    setShowColorPicker(false)
                  }}
                  style={{ backgroundColor: color }}
                  className="color-swatch"
                  title={color}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetColor().run()
                  setShowColorPicker(false)
                }}
                className="color-clear"
              >
                清除
              </button>
            </div>
          )}
        </div>
        <div className="color-picker-wrapper" ref={highlightPickerRef}>
          <button
            onClick={() => setShowHighlightPicker(!showHighlightPicker)}
            title="螢光筆"
            className="highlight-button"
          >
            ⬛
          </button>
          {showHighlightPicker && (
            <div className="color-picker-panel">
              {highlightColors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color }).run()
                    setShowHighlightPicker(false)
                  }}
                  style={{ backgroundColor: color }}
                  className="color-swatch"
                  title={color}
                />
              ))}
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run()
                  setShowHighlightPicker(false)
                }}
                className="color-clear"
              >
                清除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider"></div>

      {/* 對齊方式 - 改用更清楚的圖示 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="靠左對齊"
        >
          <span className="align-icon align-left">☰</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="置中對齊"
        >
          <span className="align-icon align-center">☰</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="靠右對齊"
        >
          <span className="align-icon align-right">☰</span>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          title="兩端對齊"
        >
          <span className="align-icon align-justify">☰</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 列表 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="項目符號"
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="編號清單（中文數字）"
        >
          一、
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 列表縮排 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!editor.can().sinkListItem('listItem')}
          title="增加縮排（往右）"
        >
          →
        </button>
        <button
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          title="減少縮排（往左）"
        >
          ←
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 中文標點符號 */}
      <div className="toolbar-group">
        <div className="punctuation-wrapper" ref={punctuationRef}>
          <button
            onClick={() => setShowPunctuationPanel(!showPunctuationPanel)}
            className="punctuation-trigger"
            title="中文標點符號"
          >
            、。
          </button>
          {showPunctuationPanel && (
            <div className="punctuation-panel">
              <div className="punctuation-section">
                <div className="punctuation-label">常用標點</div>
                <div className="punctuation-grid">
                  {CHINESE_PUNCTUATIONS.filter((p) => p.category === 'common').map((item) => (
                    <button
                      key={item.value}
                      onClick={() => insertPunctuation(item.value)}
                      className="punctuation-item"
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="punctuation-section">
                <div className="punctuation-label">特殊符號</div>
                <div className="punctuation-grid">
                  {CHINESE_PUNCTUATIONS.filter((p) => p.category === 'special').map((item) => (
                    <button
                      key={item.value}
                      onClick={() => insertPunctuation(item.value)}
                      className="punctuation-item"
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="punctuation-section">
                <div className="punctuation-label">括號類</div>
                <div className="punctuation-grid">
                  {CHINESE_PUNCTUATIONS.filter((p) => p.category === 'bracket').map((item) => (
                    <button
                      key={item.value}
                      onClick={() => insertPunctuation(item.value)}
                      className="punctuation-item bracket"
                      title={item.label}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-divider"></div>

      {/* 進階功能 */}
      <div className="toolbar-group">
        <button onClick={() => setShowLinkModal(true)} title="插入連結">
          🔗
        </button>
        <button onClick={addImage} title="插入圖片">
          🖼️
        </button>
        <button onClick={insertTable} title="插入表格">
          📊
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="引用"
        >
          "
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="程式碼區塊"
        >
          &lt;/&gt;
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔線">
          —
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 編輯操作 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="復原 (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Y)"
        >
          ↷
        </button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} title="清除格式">
          ✗
        </button>
        <button onClick={handlePrint} title="列印 (Ctrl+P)">
          🖨️
        </button>
      </div>

      {/* 連結Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>插入連結</h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setLink()}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={setLink}>確定</button>
              <button onClick={() => setShowLinkModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Toolbar
