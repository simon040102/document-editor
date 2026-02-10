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
import { DocumentEditorProps } from './types/editor.types'
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
    <div className={`document-editor ${className}`}>
      <Toolbar editor={editor} />
      <div className="editor-container">
        <EditorContent editor={editor} placeholder={placeholder} />
        <LinkBubbleMenu editor={editor} />
        <TableBubbleMenu editor={editor} />
      </div>
    </div>
  )
}

export default DocumentEditor
