import React, { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Type, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, ListRestart, IndentIncrease, IndentDecrease,
  Minus, Undo2, Redo2, RemoveFormatting, Printer,
  UnfoldVertical, FoldVertical, MoveRight, MoveLeft, Maximize2, Minimize2,
  Lock, LockOpen,
} from 'lucide-react'
import { ToolbarProps, CHINESE_PUNCTUATIONS, PAPER_DIMENSIONS, PAPER_CSS_SIZE, PaperSize } from '../types/editor.types'
import { MAX_LIST_DEPTH, getListDepth } from '../extensions/ListDepthLimit'
import { LINE_HEIGHT_STEPS, DEFAULT_LINE_HEIGHT } from '../extensions/LineHeight'
import { INDENT_STEP, MAX_INDENT } from '../extensions/TextIndent'
import '../styles/toolbar.css'

const Toolbar: React.FC<ToolbarProps> = ({ editor, paperSize, orientation, bindingLine, onPaperSizeChange, onOrientationChange, onBindingLineChange, onPrintOverride }) => {
  const [showPunctuationPanel, setShowPunctuationPanel] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [wordCount, setWordCount] = useState({ characters: 0, words: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [punctuationAlign, setPunctuationAlign] = useState<'left' | 'right'>('left')
  const [printPreviewHTML, setPrintPreviewHTML] = useState<string | null>(null)

  const punctuationRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const highlightPickerRef = useRef<HTMLDivElement>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)
  const printIframeRef = useRef<HTMLIFrameElement>(null)

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

  // 列印預覽開啟時隱藏主頁 scrollbar
  useEffect(() => {
    if (printPreviewHTML) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [printPreviewHTML])

  if (!editor) {
    return null
  }

  const insertPunctuation = (punctuation: string) => {
    editor.chain().focus().insertContent(punctuation).run()
    setShowPunctuationPanel(false)
  }

  const handlePrint = () => {
    if (onPrintOverride) {
      onPrintOverride()
      return
    }

    // 獲取編輯器的 HTML 內容
    const content = editor.getHTML()

    // 計算 @page size
    const cssSize = PAPER_CSS_SIZE[paperSize]
    const pageSize = orientation === 'landscape' ? `${cssSize} landscape` : cssSize

    // 根據是否有裝訂線決定邊距與排版
    // @page margin 處理每頁上下邊距，body padding 處理裝訂線側邊距
    let pageMargin: string
    let bodyPadding: string
    let printBodyPadding: string
    let bindingLineCSS = ''
    let bindingLineHTML = ''

    if (bindingLine) {
      // 有裝訂線：@page margin 處理每頁上下距離，裝訂線側 margin: 0 讓 binding-line 貼齊紙邊
      pageMargin = orientation === 'landscape'
        ? '0 2cm 2cm 2cm'
        : '2cm 2cm 2cm 0'
      // 螢幕預覽用完整 padding
      bodyPadding = orientation === 'landscape'
        ? 'padding: 4cm 2cm 2cm 2cm;'
        : 'padding: 2cm 2cm 2cm 4cm;'
      // 列印時只保留裝訂線側 padding（其餘由 @page margin 負責）
      printBodyPadding = orientation === 'landscape'
        ? 'padding: 4cm 0 0 0;'
        : 'padding: 0 0 0 4cm;'

      const bindingLineStyle = orientation === 'landscape'
        ? `position: fixed; left: 0; right: 0; top: 0; height: 1.2cm;
           display: flex; flex-direction: row; align-items: center; justify-content: center;
           gap: 2cm; font-size: 14pt; color: #888; z-index: 10;`
        : `position: fixed; left: 0; top: 0; width: 1.2cm; height: 100vh;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           gap: 2cm; font-size: 14pt; color: #888; z-index: 10;`
      const bindingLineAfter = orientation === 'landscape'
        ? `content: ''; position: absolute; bottom: 0; left: 8%; right: 8%; border-bottom: 1px dashed #bbb;`
        : `content: ''; position: absolute; right: 0; top: 8%; bottom: 8%; border-right: 1px dashed #bbb;`

      bindingLineCSS = `
              .binding-line { ${bindingLineStyle} }
              .binding-line::after { ${bindingLineAfter} }`
      bindingLineHTML = '<div class="binding-line"><span>裝</span><span>訂</span><span>線</span></div>'
    } else {
      // 無裝訂線：@page margin 處理每頁四周距離
      pageMargin = '2cm'
      bodyPadding = 'padding: 2cm;'
      printBodyPadding = 'padding: 0;'
    }

    // 產生列印預覽 HTML，顯示在同頁 overlay
    const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title></title>
            <style>
              @page {
                size: ${pageSize};
                margin: ${pageMargin};
                @top-left { content: ''; }
                @top-center { content: ''; }
                @top-right { content: ''; }
                @bottom-left { content: ''; }
                @bottom-center {
                  content: counter(page);
                  font-family: DFKai-SB, BiauKai, '標楷體', serif;
                  font-size: 10pt;
                }
                @bottom-right { content: ''; }
              }

              body {
                font-family: DFKai-SB, BiauKai, '標楷體', serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000;
                text-align: justify;
                margin: 0;
                ${bodyPadding}
                counter-reset: list-L1;
              }

              ${bindingLineCSS}

              h1 { font-size: 20pt; margin: 1em 0 0.5em; page-break-after: avoid; }
              h2 { font-size: 16pt; margin: 0.8em 0 0.4em; page-break-after: avoid; }
              h3 { font-size: 14pt; margin: 0.6em 0 0.3em; page-break-after: avoid; }
              h4, h5, h6 { font-size: 12pt; margin: 0.5em 0 0.2em; page-break-after: avoid; }

              p { margin: 0.5em 0; orphans: 3; widows: 3; }

              ul, ol { padding-left: 2em; margin: 0.5em 0; }

              /* 第 1 層：一、 中文數字 + 全形頓號 */
              ol {
                list-style: none;
                padding-left: 4em;
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

              ol > li > p:first-child {
                position: relative;
              }

              ol > li > p:first-child::before {
                content: counter(list-L1, trad-chinese-informal) '\u3001';
                position: absolute;
                left: -4em;
                width: 4em;
                text-align: right;
                white-space: nowrap;
                color: #000;
                font-weight: 500;
              }

              /* 第 2 層：(一) 半形括號 + 中文數字 */
              ol ol {
                counter-reset: list-L2;
                padding-left: 3.5em;
              }

              ol ol > li { counter-increment: list-L2; }

              ol ol > li > p:first-child::before {
                content: '(' counter(list-L2, trad-chinese-informal) ')';
                left: -3.5em;
                width: 3em;
              }

              /* 第 3 層：1、 阿拉伯數字 + 全形頓號 */
              ol ol ol {
                counter-reset: list-L3;
                padding-left: 2em;
              }

              ol ol ol > li { counter-increment: list-L3; }

              ol ol ol > li > p:first-child::before {
                content: counter(list-L3, decimal) '\u3001';
                left: -2em;
                width: 2em;
              }

              /* 第 4 層：(1) 半形括號 + 阿拉伯數字 */
              ol ol ol ol {
                counter-reset: list-L4;
                padding-left: 2.5em;
              }

              ol ol ol ol > li { counter-increment: list-L4; }

              ol ol ol ol > li > p:first-child::before {
                content: '(' counter(list-L4, decimal) ')';
                left: -2.5em;
                width: 2em;
              }

              /* 第 5 層：甲、 天干 + 全形頓號 */
              ol ol ol ol ol {
                counter-reset: list-L5;
                padding-left: 2em;
              }

              ol ol ol ol ol > li { counter-increment: list-L5; }

              ol ol ol ol ol > li > p:first-child::before {
                content: counter(list-L5, cjk-heavenly-stem) '\u3001';
                left: -2em;
                width: 2em;
              }

              /* 第 6 層：(甲) 半形括號 + 天干 */
              ol ol ol ol ol ol {
                counter-reset: list-L6;
                padding-left: 2.5em;
              }

              ol ol ol ol ol ol > li { counter-increment: list-L6; }

              ol ol ol ol ol ol > li > p:first-child::before {
                content: '(' counter(list-L6, cjk-heavenly-stem) ')';
                left: -2.5em;
                width: 2em;
              }

              /* 第 7 層：子、 地支 + 全形頓號 */
              ol ol ol ol ol ol ol {
                counter-reset: list-L7;
                padding-left: 2em;
              }

              ol ol ol ol ol ol ol > li { counter-increment: list-L7; }

              ol ol ol ol ol ol ol > li > p:first-child::before {
                content: counter(list-L7, cjk-earthly-branch) '\u3001';
                left: -2em;
                width: 2em;
              }

              li {
                margin: 0.2em 0;
                list-style: none;
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

              @media print {
                body { margin: 0; ${printBodyPadding} }
              }
            </style>
          </head>
          <body>
            ${bindingLineHTML}
            ${content}
          </body>
        </html>
      `

    // 注入 @media screen CSS，讓 iframe 預覽顯示白紙效果
    const dims = PAPER_DIMENSIONS[paperSize]
    const pw = orientation === 'landscape' ? dims.height : dims.width
    const ph = orientation === 'landscape' ? dims.width : dims.height
    const screenPreviewCSS = `<style data-screen-preview>
      @media screen {
        html { background: #525659; }
        body {
          width: ${pw}mm;
          margin: 20px auto;
          min-height: ${ph}mm;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08);
          background: #fff;
        }
      }
    </style>`
    setPrintPreviewHTML(printHTML.replace('</body>', screenPreviewCSS + '\n</body>'))
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

  const toggleLock = () => {
    const newLocked = !isLocked
    setIsLocked(newLocked)
    editor.setEditable(!newLocked)
    const container = document.querySelector('.editor-container')
    if (container) {
      container.classList.toggle('editor-locked', newLocked)
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
    <div className={`toolbar${isLocked ? ' toolbar-locked' : ''}`}>
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
          onClick={() => {
            if (getListDepth(editor.state) < MAX_LIST_DEPTH) {
              editor.chain().focus().sinkListItem('listItem').run()
            }
          }}
          disabled={!editor.can().sinkListItem('listItem') || getListDepth(editor.state) >= MAX_LIST_DEPTH}
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
            onClick={() => {
              if (!showPunctuationPanel && punctuationRef.current) {
                const rect = punctuationRef.current.getBoundingClientRect()
                const panelWidth = 320
                setPunctuationAlign(rect.left + panelWidth > window.innerWidth ? 'right' : 'left')
              }
              setShowPunctuationPanel(!showPunctuationPanel)
            }}
            className="punctuation-trigger"
            title="中文標點符號"
          >
            、。
          </button>
          {showPunctuationPanel && (
            <div className="punctuation-panel" style={punctuationAlign === 'right' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }}>
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
        <button onClick={handlePrint} title="列印 (Ctrl+P)" className="lock-exempt">
          <Printer size={16} />
        </button>
        <button onClick={toggleFullscreen} title={isFullscreen ? '退出全視窗' : '全視窗'} className="lock-exempt">
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={toggleLock}
          className={`lock-btn${isLocked ? ' is-active' : ''}`}
          title={isLocked ? '解除鎖定（目前已鎖定，無法編輯）' : '鎖定內容（防止誤刪）'}
        >
          {isLocked ? <Lock size={16} /> : <LockOpen size={16} />}
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 紙張設定 */}
      <div className="toolbar-group">
        <select
          value={paperSize}
          onChange={(e) => {
            onPaperSizeChange(e.target.value as PaperSize)
            e.target.blur()
          }}
          className="paper-size-select"
          title="紙張大小"
        >
          {Object.entries(PAPER_DIMENSIONS).map(([key, dim]) => (
            <option key={key} value={key}>{dim.label}</option>
          ))}
        </select>
        <button
          onClick={() => onOrientationChange(orientation === 'portrait' ? 'landscape' : 'portrait')}
          className={orientation === 'landscape' ? 'is-active' : ''}
          title={orientation === 'portrait' ? '切換為橫向' : '切換為直向'}
        >
          {orientation === 'portrait' ? '直' : '橫'}
        </button>
        <button
          onClick={() => onBindingLineChange(!bindingLine)}
          className={bindingLine ? 'is-active' : ''}
          title={bindingLine ? '關閉裝訂線' : '開啟裝訂線（列印時顯示）'}
        >
          裝訂
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 字數統計 */}
      <div className="toolbar-group word-count">
        <span title="字數統計">
          {wordCount.characters} 字 / {wordCount.words} 詞
        </span>
      </div>

      {/* 列印預覽 overlay */}
      {printPreviewHTML && (
        <div className="print-preview-overlay">
          <div className="print-preview-toolbar">
            <button
              className="print-preview-btn print-preview-btn-primary"
              onClick={() => {
                printIframeRef.current?.contentWindow?.print()
              }}
            >
              列印
            </button>
            <button
              className="print-preview-btn"
              onClick={() => setPrintPreviewHTML(null)}
            >
              關閉
            </button>
          </div>
          <iframe
            ref={printIframeRef}
            className="print-preview-iframe"
            srcDoc={printPreviewHTML}
            title="列印預覽"
          />
        </div>
      )}

    </div>
  )
}

export default Toolbar
