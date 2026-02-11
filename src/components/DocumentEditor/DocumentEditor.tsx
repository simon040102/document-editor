import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { FontFamily } from '@tiptap/extension-font-family'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { ListKeymap } from '@tiptap/extension-list-keymap'
import FontSize from './extensions/FontSize'
import LineHeight from './extensions/LineHeight'
import TextIndent from './extensions/TextIndent'
import ListNumbering from './extensions/ListNumbering'
import WordPaste from './extensions/WordPaste'
import { DocumentEditorProps, PaperSize, Orientation, PAPER_DIMENSIONS } from './types/editor.types'
import Toolbar from './Toolbar/Toolbar'
import LinkBubbleMenu from './BubbleMenu/LinkBubbleMenu'
import TableBubbleMenu from './BubbleMenu/TableBubbleMenu'
import './styles/editor.css'

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  content = '',
  onChange,
  onHTMLChange,
  placeholder = '開始輸入內容...',
  editable = true,
  className = '',
}) => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [paperSize, setPaperSize] = React.useState<PaperSize>('A4')
  const [orientation, setOrientation] = React.useState<Orientation>('portrait')

  const dim = PAPER_DIMENSIONS[paperSize]
  const paperW = orientation === 'portrait' ? dim.width : dim.height
  const paperH = orientation === 'portrait' ? dim.height : dim.width
  const MM_TO_PX = 3.7795
  const paperStyle = {
    '--paper-width': `${Math.round(paperW * MM_TO_PX)}px`,
    '--paper-min-height': `${Math.round(paperH * MM_TO_PX)}px`,
  } as React.CSSProperties

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color,
      FontSize,
      LineHeight,
      TextIndent,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'editor-table-cell',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'editor-table-header',
        },
      }),
      ListKeymap,
      ListNumbering,
      WordPaste,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const json = editor.getJSON()

      if (onHTMLChange) {
        onHTMLChange(html)
      }

      if (onChange) {
        onChange(JSON.stringify(json))
      }
    },
    onCreate: ({ editor }) => {
      setIsInitialized(true)
      // 暴露 editor 實例到 window，供測試和外部存取
      ;(window as unknown as Record<string, unknown>).__tiptapEditor = editor
    },
  })

  // 只在初始化時設定內容，避免游標亂跳
  React.useEffect(() => {
    if (editor && !isInitialized && content) {
      try {
        const json = JSON.parse(content)
        editor.commands.setContent(json, { emitUpdate: false })
      } catch {
        editor.commands.setContent(content, { emitUpdate: false })
      }
    }
  }, [content, editor, isInitialized])

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`document-editor ${className}`} style={paperStyle}>
      <Toolbar
        editor={editor}
        paperSize={paperSize}
        orientation={orientation}
        onPaperSizeChange={setPaperSize}
        onOrientationChange={setOrientation}
      />
      <div className="editor-container">
        <EditorContent editor={editor} placeholder={placeholder} />
        <LinkBubbleMenu editor={editor} />
        <TableBubbleMenu editor={editor} />
      </div>
      <div className="editor-footer">
        <details>
          <summary>操作說明</summary>
          <div className="footer-guide">
            <div className="guide-section">
              <strong>編號清單（公文格式）</strong>
              <ul>
                <li>點擊工具列「編號清單」按鈕建立有序列表，自動使用中文數字編號（一、二、三...）</li>
                <li>支援 7 層巢狀：一、&rarr; (一) &rarr; 1、&rarr; (1) &rarr; 甲、&rarr; (甲) &rarr; 子、，使用縮排按鈕切換層級</li>
                <li>在空的列表項目上按 <kbd>Enter</kbd> 即可退出列表，回到一般段落</li>
                <li>列表中斷後再次點擊「編號清單」，編號會自動接續（例：一、&rarr; 段落 &rarr; 二、）</li>
                <li>如需重新從「一」開始，點擊「重新編號」按鈕（僅在列表內啟用）</li>
              </ul>
            </div>
            <div className="guide-section">
              <strong>常用快捷鍵</strong>
              <ul>
                <li><kbd>Ctrl</kbd>+<kbd>B</kbd> 粗體 / <kbd>Ctrl</kbd>+<kbd>I</kbd> 斜體 / <kbd>Ctrl</kbd>+<kbd>U</kbd> 底線</li>
                <li><kbd>Ctrl</kbd>+<kbd>Z</kbd> 復原 / <kbd>Ctrl</kbd>+<kbd>Y</kbd> 重做</li>
                <li><kbd>Tab</kbd> 增加列表縮排 / <kbd>Shift</kbd>+<kbd>Tab</kbd> 減少縮排</li>
              </ul>
            </div>
            <div className="guide-section">
              <strong>列印與匯出</strong>
              <ul>
                <li>點擊列印按鈕可開啟列印預覽，預設 A4 紙張、標楷體、左側含裝訂線邊界</li>
                <li>編輯器內容支援 JSON 格式儲存與載入，確保格式不跑版</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

export default DocumentEditor
