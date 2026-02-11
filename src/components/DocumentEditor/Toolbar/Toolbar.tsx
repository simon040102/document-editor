import React, { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon, Type, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, ListRestart, IndentIncrease, IndentDecrease, Link2, ImageIcon, Table2,
  TextQuote, Code, Minus, Undo2, Redo2, RemoveFormatting, Printer, FolderOpen,
  UnfoldVertical, FoldVertical, MoveRight, MoveLeft, Maximize2, Minimize2,
} from 'lucide-react'
import { ToolbarProps, CHINESE_PUNCTUATIONS } from '../types/editor.types'
import { LINE_HEIGHT_STEPS, DEFAULT_LINE_HEIGHT } from '../extensions/LineHeight'
import { INDENT_STEP, MAX_INDENT } from '../extensions/TextIndent'
import '../styles/toolbar.css'

const Toolbar: React.FC<ToolbarProps> = ({ editor }) => {
  const [showPunctuationPanel, setShowPunctuationPanel] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [wordCount, setWordCount] = useState({ characters: 0, words: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // 字數統計
  useEffect(() => {
    if (!editor) return

    const updateWordCount = () => {
      const text = editor.getText()
      const characters = text.length
      const words = text.trim().split(/\s+/).filter((word) => word.length > 0).length
      setWordCount({ characters, words })
    }

    updateWordCount()
    editor.on('update', updateWordCount)

    return () => {
      editor.off('update', updateWordCount)
    }
  }, [editor])

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
    setShowImageModal(true)
  }

  const insertImageFromUrl = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl('')
      setShowImageModal(false)
    }
  }

  const insertImageFromFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const src = event.target?.result as string
          editor.chain().focus().setImage({ src }).run()
          setShowImageModal(false)
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
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
      // 寫入 HTML 內容和樣式（依公文規範）
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>列印文件</title>
            <style>
              @page {
                size: A4;
                margin: 2.5cm 2.5cm 2.5cm 4cm; /* 左側含裝訂線 2.5+1.5=4cm */

                @bottom-center {
                  content: counter(page);
                  font-family: DFKai-SB, BiauKai, '標楷體', serif;
                  font-size: 10pt;
                }
              }

              body {
                font-family: DFKai-SB, BiauKai, '標楷體', serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
                text-align: justify;
                margin: 0;
                counter-reset: list-L1;
              }

              h1 { font-size: 20pt; margin: 1em 0 0.5em; page-break-after: avoid; }
              h2 { font-size: 16pt; margin: 0.8em 0 0.4em; page-break-after: avoid; }
              h3 { font-size: 14pt; margin: 0.6em 0 0.3em; page-break-after: avoid; }
              h4, h5, h6 { font-size: 12pt; margin: 0.5em 0 0.2em; page-break-after: avoid; }

              p { margin: 0.5em 0; orphans: 3; widows: 3; }

              ul, ol { padding-left: 2em; margin: 0.5em 0; }

              /* 第 1 層：一、 中文數字 + 全形頓號 */
              ol {
                list-style: none;
                padding-left: 2em;
              }

              ol > li {
                counter-increment: list-L1;
                position: relative;
                list-style: none;
              }

              ol > li::marker {
                content: none;
                display: none;
              }

              ol > li::before {
                content: counter(list-L1, trad-chinese-informal) '\u3001';
                position: absolute;
                left: -2em;
                width: 2em;
                text-align: right;
                white-space: nowrap;
                color: #000;
                font-weight: 500;
              }

              /* 第 2 層：(一) 半形括號 + 中文數字 */
              ol ol {
                counter-reset: list-L2;
                padding-left: 1.5em;
              }

              ol ol > li { counter-increment: list-L2; }

              ol ol > li::before {
                content: '(' counter(list-L2, trad-chinese-informal) ')';
                left: -2em;
                width: 2em;
              }

              /* 第 3 層：1、 阿拉伯數字 + 全形頓號 */
              ol ol ol {
                counter-reset: list-L3;
                padding-left: 1.5em;
              }

              ol ol ol > li { counter-increment: list-L3; }

              ol ol ol > li::before {
                content: counter(list-L3, decimal) '\u3001';
                left: -1.5em;
                width: 1.5em;
              }

              /* 第 4 層：(1) 半形括號 + 阿拉伯數字 */
              ol ol ol ol {
                counter-reset: list-L4;
                padding-left: 1.2em;
              }

              ol ol ol ol > li { counter-increment: list-L4; }

              ol ol ol ol > li::before {
                content: '(' counter(list-L4, decimal) ')';
                left: -1.5em;
                width: 1.5em;
              }

              /* 第 5 層：甲、 天干 + 全形頓號 */
              ol ol ol ol ol {
                counter-reset: list-L5;
                padding-left: 1.8em;
              }

              ol ol ol ol ol > li { counter-increment: list-L5; }

              ol ol ol ol ol > li::before {
                content: counter(list-L5, cjk-heavenly-stem) '\u3001';
                left: -1.8em;
                width: 1.8em;
              }

              /* 第 6 層：(甲) 半形括號 + 天干 */
              ol ol ol ol ol ol {
                counter-reset: list-L6;
                padding-left: 1.3em;
              }

              ol ol ol ol ol ol > li { counter-increment: list-L6; }

              ol ol ol ol ol ol > li::before {
                content: '(' counter(list-L6, cjk-heavenly-stem) ')';
                left: -1.8em;
                width: 1.8em;
              }

              /* 第 7 層：子、 地支 + 全形頓號 */
              ol ol ol ol ol ol ol {
                counter-reset: list-L7;
                padding-left: 1.8em;
              }

              ol ol ol ol ol ol ol > li { counter-increment: list-L7; }

              ol ol ol ol ol ol ol > li::before {
                content: counter(list-L7, cjk-earthly-branch) '\u3001';
                left: -1.8em;
                width: 1.8em;
              }

              li {
                margin: 0.2em 0;
                list-style: none;
                page-break-inside: avoid;
              }

              /* 重新編號 */
              ol[data-restart-numbering="true"] { counter-set: list-L1 0; }
              ol ol[data-restart-numbering="true"] { counter-set: list-L2 0; }
              ol ol ol[data-restart-numbering="true"] { counter-set: list-L3 0; }
              ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L4 0; }
              ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L5 0; }
              ol ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L6 0; }
              ol ol ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L7 0; }

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

  const toggleFullscreen = () => {
    const editorEl = document.querySelector('.document-editor')
    if (!editorEl) return

    if (!isFullscreen) {
      editorEl.classList.add('fullscreen')
    } else {
      editorEl.classList.remove('fullscreen')
    }
    setIsFullscreen(!isFullscreen)
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
  const fontSizes = [
    { label: '預設', value: '' },
    { label: '10pt', value: '10pt' },
    { label: '12pt', value: '12pt' },
    { label: '14pt', value: '14pt' },
    { label: '16pt', value: '16pt' },
    { label: '18pt', value: '18pt' },
    { label: '20pt', value: '20pt' },
    { label: '24pt', value: '24pt' },
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
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="斜體 (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="底線 (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          title="刪除線"
        >
          <Strikethrough size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={editor.isActive('superscript') ? 'is-active' : ''}
          title="上標 (x²)"
        >
          <SuperscriptIcon size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={editor.isActive('subscript') ? 'is-active' : ''}
          title="下標 (H₂O)"
        >
          <SubscriptIcon size={16} />
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
            <Type size={16} />
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

      {/* 字級選擇 */}
      <div className="toolbar-group">
        <select
          onChange={(e) => {
            const size = e.target.value
            if (size) {
              editor.chain().focus().setFontSize(size).run()
            } else {
              editor.chain().focus().unsetFontSize().run()
            }
            e.target.blur()
          }}
          value={editor.getAttributes('textStyle').fontSize || ''}
          className="font-size-select"
          title="字級"
        >
          {fontSizes.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
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
            <Palette size={16} />
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
            <Highlighter size={16} />
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

      {/* 對齊方式 */}
      <div className="toolbar-group">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="靠左對齊"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="置中對齊"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="靠右對齊"
        >
          <AlignRight size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          title="兩端對齊"
        >
          <AlignJustify size={16} />
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
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="編號清單（中文數字）"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleRestartNumbering().run()}
          disabled={!editor.isActive('orderedList')}
          className={editor.getAttributes('orderedList').restartNumbering ? 'is-active' : ''}
          title="重新編號（從一開始）"
        >
          <ListRestart size={16} />
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
          <IndentIncrease size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          title="減少縮排（往左）"
        >
          <IndentDecrease size={16} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 首行縮排 */}
      <div className="toolbar-group">
        <button
          onClick={() => {
            const { textIndent } = editor.getAttributes('paragraph')
            const current = textIndent ? parseFloat(textIndent) : 0
            const next = Math.min(current + INDENT_STEP, MAX_INDENT)
            editor.chain().focus().setTextIndent(`${next}em`).run()
          }}
          title="增加首行縮排"
        >
          <MoveRight size={16} />
        </button>
        <button
          onClick={() => {
            const { textIndent } = editor.getAttributes('paragraph')
            const current = textIndent ? parseFloat(textIndent) : 0
            const next = Math.max(current - INDENT_STEP, 0)
            if (next === 0) {
              editor.chain().focus().unsetTextIndent().run()
            } else {
              editor.chain().focus().setTextIndent(`${next}em`).run()
            }
          }}
          title="減少首行縮排"
        >
          <MoveLeft size={16} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 行距 */}
      <div className="toolbar-group">
        <button
          onClick={() => {
            const { lineHeight } = editor.getAttributes('paragraph')
            const current = lineHeight ? parseFloat(lineHeight) : DEFAULT_LINE_HEIGHT
            const nextIndex = LINE_HEIGHT_STEPS.findIndex((s) => s > current)
            if (nextIndex !== -1) {
              editor.chain().focus().setLineHeight(String(LINE_HEIGHT_STEPS[nextIndex])).run()
            }
          }}
          title="增加行距"
        >
          <UnfoldVertical size={16} />
        </button>
        <button
          onClick={() => {
            const { lineHeight } = editor.getAttributes('paragraph')
            const current = lineHeight ? parseFloat(lineHeight) : DEFAULT_LINE_HEIGHT
            const candidates = LINE_HEIGHT_STEPS.filter((s) => s < current)
            if (candidates.length > 0) {
              editor.chain().focus().setLineHeight(String(candidates[candidates.length - 1])).run()
            }
          }}
          title="減少行距"
        >
          <FoldVertical size={16} />
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
          <Link2 size={16} />
        </button>
        <button onClick={addImage} title="插入圖片">
          <ImageIcon size={16} />
        </button>
        <button onClick={insertTable} title="插入表格">
          <Table2 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'is-active' : ''}
          title="引用"
        >
          <TextQuote size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'is-active' : ''}
          title="程式碼區塊"
        >
          <Code size={16} />
        </button>
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔線">
          <Minus size={16} />
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
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} title="清除格式">
          <RemoveFormatting size={16} />
        </button>
        <button onClick={handlePrint} title="列印 (Ctrl+P)">
          <Printer size={16} />
        </button>
        <button onClick={toggleFullscreen} title={isFullscreen ? '退出全視窗' : '全視窗'}>
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 字數統計 */}
      <div className="toolbar-group word-count">
        <span title="字數統計">
          {wordCount.characters} 字 / {wordCount.words} 詞
        </span>
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

      {/* 圖片Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>插入圖片</h3>
            <div className="image-insert-options">
              <div className="image-option">
                <label>圖片URL：</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && insertImageFromUrl()}
                />
                <button onClick={insertImageFromUrl}>插入URL</button>
              </div>
              <div className="image-divider">或</div>
              <div className="image-option">
                <button onClick={insertImageFromFile} className="file-upload-button">
                  <FolderOpen size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> 從電腦選擇圖片
                </button>
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowImageModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Toolbar
