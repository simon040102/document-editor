import { Editor } from '@tiptap/react'

export interface DocumentEditorProps {
  content?: string
  onChange?: (content: string) => void
  onHTMLChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export interface ToolbarProps {
  editor: Editor | null
}

export interface PunctuationItem {
  label: string
  value: string
  category: 'common' | 'special' | 'bracket' | 'math'
}

export const CHINESE_PUNCTUATIONS: PunctuationItem[] = [
  // 常用標點
  { label: '、', value: '、', category: 'common' },
  { label: '。', value: '。', category: 'common' },
  { label: '，', value: '，', category: 'common' },
  { label: '：', value: '：', category: 'common' },
  { label: '；', value: '；', category: 'common' },
  { label: '！', value: '！', category: 'common' },
  { label: '？', value: '？', category: 'common' },

  // 特殊符號
  { label: '—', value: '—', category: 'special' },
  { label: '…', value: '…', category: 'special' },
  { label: '～', value: '～', category: 'special' },
  { label: '·', value: '·', category: 'special' },
  { label: '※', value: '※', category: 'special' },

  // 括號類
  { label: '「」', value: '「」', category: 'bracket' },
  { label: '『』', value: '『』', category: 'bracket' },
  { label: '（）', value: '（）', category: 'bracket' },
  { label: '【】', value: '【】', category: 'bracket' },
  { label: '《》', value: '《》', category: 'bracket' },
  { label: '〈〉', value: '〈〉', category: 'bracket' },
]
