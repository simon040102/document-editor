import { Editor } from '@tiptap/react'

export interface DocumentEditorProps {
  content?: string
  onChange?: (content: string) => void
  onHTMLChange?: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export type PaperSize = 'A4' | 'A3' | 'B4' | 'B5' | 'Letter' | 'Legal'
export type Orientation = 'portrait' | 'landscape'

export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: 'A4' },
  A3: { width: 297, height: 420, label: 'A3' },
  B4: { width: 250, height: 353, label: 'B4' },
  B5: { width: 176, height: 250, label: 'B5' },
  Letter: { width: 216, height: 279, label: 'Letter' },
  Legal: { width: 216, height: 356, label: 'Legal' },
}

export const PAPER_CSS_SIZE: Record<PaperSize, string> = {
  A4: 'A4',
  A3: 'A3',
  B4: 'B4',
  B5: 'B5',
  Letter: 'letter',
  Legal: 'legal',
}

export interface ToolbarProps {
  editor: Editor | null
  paperSize: PaperSize
  orientation: Orientation
  bindingLine: boolean
  onPaperSizeChange: (size: PaperSize) => void
  onOrientationChange: (orientation: Orientation) => void
  onBindingLineChange: (enabled: boolean) => void
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
