import React, { useState, useRef, useEffect } from 'react'
import { ToolbarProps, CHINESE_PUNCTUATIONS } from '../types/editor.types'
import '../styles/toolbar.css'

const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [showPunctuationPanel, setShowPunctuationPanel] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)

  const punctuationRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const highlightPickerRef = useRef<HTMLDivElement>(null)

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
    window.print()
  }

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#888888']
  const highlightColors = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FFB6C1']

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
