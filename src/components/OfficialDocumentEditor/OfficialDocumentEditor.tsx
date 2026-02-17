import React, { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Editor } from '@tiptap/react'
import DocumentEditor from '../DocumentEditor/DocumentEditor'
import { PaperSize, Orientation, PAPER_DIMENSIONS } from '../DocumentEditor/types/editor.types'
import { OfficialDocFormData, defaultFormData, generateOfficialPrintHTML } from './printUtils'
import './officialDocumentEditor.css'

const DEFAULT_EDITOR_CONTENT = '<p><strong>主旨：</strong></p><p><strong>說明：</strong></p>'

export interface DocumentData {
  formData: OfficialDocFormData
  editorContent: unknown
}

interface OfficialDocumentEditorProps {
  /** 供外部監聽整份文件（表單 + 編輯器）的完整 JSON 變更 */
  onDocumentChange?: (doc: DocumentData) => void
  /** 初始文件資料（表單 + 編輯器），用於從後端載入 */
  initialDocument?: { formData?: Partial<OfficialDocFormData>; editorContent?: unknown }
}

const OfficialDocumentEditor: React.FC<OfficialDocumentEditorProps> = ({
  onDocumentChange,
  initialDocument,
}) => {
  const { register, watch, reset, getValues } = useForm<OfficialDocFormData>({
    defaultValues: { ...defaultFormData, ...initialDocument?.formData },
  })
  const editorRef = useRef<Editor | null>(null)
  const paperSizeRef = useRef<PaperSize>('A4')
  const orientationRef = useRef<Orientation>('portrait')
  const editorContentRef = useRef<string>('')

  // JSON 面板狀態
  const [showJsonPanel, setShowJsonPanel] = useState(false)
  const [jsonInput, setJsonInput] = useState('')

  // 列印預覽
  const [printPreviewHTML, setPrintPreviewHTML] = useState<string | null>(null)
  const printIframeRef = useRef<HTMLIFrameElement>(null)

  // 列印預覽開啟時隱藏主頁 scrollbar
  React.useEffect(() => {
    if (printPreviewHTML) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [printPreviewHTML])

  const initialEditorContent = initialDocument?.editorContent
    ? (typeof initialDocument.editorContent === 'string'
      ? initialDocument.editorContent
      : JSON.stringify(initialDocument.editorContent))
    : DEFAULT_EDITOR_CONTENT

  // 通知外部文件變更
  const notifyChange = useCallback((formData: OfficialDocFormData) => {
    if (!onDocumentChange) return
    const editorJSON = editorContentRef.current ? JSON.parse(editorContentRef.current) : null
    onDocumentChange({ formData, editorContent: editorJSON })
  }, [onDocumentChange])

  // watch 所有欄位，變動時通知外部
  React.useEffect(() => {
    const subscription = watch((data) => {
      notifyChange(data as OfficialDocFormData)
    })
    return () => subscription.unsubscribe()
  }, [watch, notifyChange])

  // 暴露 reset 到 window，供測試和外部載入
  React.useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__setFormData = (data: OfficialDocFormData) => {
      reset(data)
      notifyChange(data)
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__setFormData
    }
  }, [reset, notifyChange])

  const handleEditorReady = (editor: Editor) => {
    editorRef.current = editor
  }

  const handleEditorChange = (content: string) => {
    editorContentRef.current = content
    notifyChange(getValues())
  }

  const handlePaperSizeChange = (size: PaperSize) => {
    paperSizeRef.current = size
  }

  const handleOrientationChange = (o: Orientation) => {
    orientationRef.current = o
  }

  const handlePrintOverride = () => {
    if (!editorRef.current) return
    const editorHTML = editorRef.current.getHTML()
    const printHTML = generateOfficialPrintHTML(
      getValues(),
      editorHTML,
      paperSizeRef.current,
      orientationRef.current
    )
    // 注入 @media screen CSS，讓 iframe 預覽顯示白紙效果
    const dims = PAPER_DIMENSIONS[paperSizeRef.current]
    const pw = orientationRef.current === 'landscape' ? dims.height : dims.width
    const ph = orientationRef.current === 'landscape' ? dims.width : dims.height
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

  const handleReset = () => {
    reset(defaultFormData)
    notifyChange(defaultFormData)
  }

  // === 匯出 / JSON 功能 ===

  const getFullDocumentJSON = useCallback(() => {
    const editorJSON = editorContentRef.current ? JSON.parse(editorContentRef.current) : null
    return JSON.stringify({
      formData: getValues(),
      editorContent: editorJSON,
    }, null, 2)
  }, [getValues])

  const exportHTML = () => {
    if (!editorRef.current) return
    const html = editorRef.current.getHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const fullJSON = getFullDocumentJSON()
    const blob = new Blob([fullJSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyJSON = () => {
    setJsonInput(getFullDocumentJSON())
  }

  const handleLoadJSON = () => {
    const text = jsonInput.trim()
    if (!text) return
    try {
      const json = JSON.parse(text)
      if (json.formData) {
        reset(json.formData)
        notifyChange(json.formData)
      }
      if (json.editorContent && editorRef.current) {
        editorRef.current.commands.setContent(json.editorContent)
      }
    } catch {
      if (editorRef.current) editorRef.current.commands.setContent(text)
    }
  }

  return (
    <div className="official-document-editor">
      {/* 表頭：公文制式欄位 */}
      <div className="doc-header-form">
        <details open>
          <summary>發文單位資訊</summary>
          <fieldset className="doc-form-section">
            <div className="doc-form-row">
              <label>發文方式</label>
              <select {...register('sendMethod')}>
                <option value="紙本傳送">紙本傳送</option>
                <option value="電子交換">電子交換</option>
              </select>
            </div>
            <div className="doc-form-row">
              <label>發文單位 <span className="doc-required">*</span></label>
              <input type="text" {...register('orgName')} placeholder="例：天王有限公司" />
            </div>
            <div className="doc-form-row">
              <label>文書類型</label>
              <select {...register('docType')}>
                <option value="函">函</option>
                <option value="書函">書函</option>
                <option value="令">令</option>
                <option value="公告">公告</option>
                <option value="簽">簽</option>
                <option value="箋函">箋函</option>
              </select>
            </div>
          </fieldset>
        </details>

        <details>
          <summary>聯絡資訊</summary>
          <fieldset className="doc-form-section">
            <div className="doc-form-row">
              <label>地址</label>
              <input type="text" {...register('address')} placeholder="例：台北市忠孝東路一段一號 20 樓" />
            </div>
            <div className="doc-form-row">
              <label>聯絡人</label>
              <input type="text" {...register('contactPerson')} />
            </div>
            <div className="doc-form-row doc-form-row-inline">
              <div className="doc-inline-field">
                <label>電話</label>
                <input type="text" {...register('phone')} placeholder="02-2216-4477" />
              </div>
              <div className="doc-inline-field doc-inline-field-small">
                <label>分機</label>
                <input type="text" {...register('extension')} placeholder="33" />
              </div>
            </div>
            <div className="doc-form-row">
              <label>電子信箱</label>
              <input type="email" {...register('email')} placeholder="user@example.com" />
            </div>
          </fieldset>
        </details>

        <details open>
          <summary>公文主要資訊</summary>
          <fieldset className="doc-form-section">
            <div className="doc-form-row">
              <label>受文者 <span className="doc-required">*</span></label>
              <input type="text" {...register('recipient')} placeholder="例：米花市政府資訊局" />
            </div>
            <div className="doc-form-row doc-form-row-inline">
              <div className="doc-inline-field">
                <label>發文日期</label>
                <div className="doc-date-inputs">
                  <span>中華民國</span>
                  <input type="text" {...register('year')} placeholder="113" className="doc-date-input" />
                  <span>年</span>
                  <input type="text" {...register('month')} placeholder="1" className="doc-date-input doc-date-input-short" />
                  <span>月</span>
                  <input type="text" {...register('day')} placeholder="1" className="doc-date-input doc-date-input-short" />
                  <span>日</span>
                </div>
              </div>
            </div>
            <div className="doc-form-row">
              <label>發文字號 <span className="doc-required">*</span></label>
              <input type="text" {...register('docNumber')} placeholder="例：天字第 1130001 號" />
            </div>
            <div className="doc-form-row doc-form-row-inline">
              <div className="doc-inline-field">
                <label>速別</label>
                <select {...register('speed')}>
                  <option value="最速件">最速件</option>
                  <option value="速件">速件</option>
                  <option value="普通件">普通件</option>
                </select>
              </div>
              <div className="doc-inline-field">
                <label>密等</label>
                <input type="text" {...register('classification')} />
              </div>
            </div>
            <div className="doc-form-row">
              <label>附件</label>
              <input type="text" {...register('attachments')} placeholder="例：服務團隊成員名冊、保密同意書" />
            </div>
          </fieldset>
        </details>
      </div>

      {/* 中間：Tiptap 編輯器 */}
      <DocumentEditor
        content={initialEditorContent}
        onEditorReady={handleEditorReady}
        onPrintOverride={handlePrintOverride}
        onPaperSizeChange={handlePaperSizeChange}
        onOrientationChange={handleOrientationChange}
        onChange={handleEditorChange}
        placeholder="在此輸入公文內容..."
        defaultBindingLine={true}
      />

      {/* 表尾：正本副本 */}
      <div className="doc-footer-form">
        <fieldset className="doc-form-section">
          <legend>正本與副本</legend>
          <div className="doc-form-row">
            <label>正本</label>
            <input type="text" {...register('originalTo')} placeholder="受文者機關名稱" />
          </div>
          <div className="doc-form-row">
            <label>副本</label>
            <input type="text" {...register('copyTo')} />
          </div>
          <div className="doc-form-row doc-form-row-inline">
            <div className="doc-inline-field">
              <label>檔號</label>
              <input type="text" {...register('fileNumber')} />
            </div>
            <div className="doc-inline-field">
              <label>保存年限</label>
              <input type="text" {...register('retentionPeriod')} />
            </div>
          </div>
        </fieldset>
        <div className="doc-footer-actions">
          <button type="button" className="doc-btn-reset" onClick={handleReset}>
            重設表單
          </button>
        </div>
      </div>

      {/* 動作列：匯出 & JSON */}
      <div className="doc-action-bar">
        <button type="button" className="doc-btn-action" onClick={exportHTML}>匯出 HTML</button>
        <button type="button" className="doc-btn-action doc-btn-action-primary" onClick={exportJSON}>匯出 JSON</button>
        <button type="button" className="doc-btn-action" onClick={() => setShowJsonPanel(!showJsonPanel)}>
          {showJsonPanel ? '隱藏 JSON' : '顯示 JSON'}
        </button>
      </div>

      {/* JSON 面板 */}
      {showJsonPanel && (
        <div className="doc-json-panel">
          <div className="doc-json-header">
            <span className="doc-json-title">JSON</span>
            <div className="doc-json-actions">
              <button type="button" className="doc-btn-small" onClick={handleCopyJSON}>複製目前內容</button>
              <button type="button" className="doc-btn-small doc-btn-small-primary" onClick={handleLoadJSON}>載入 JSON</button>
            </div>
          </div>
          <textarea
            className="doc-json-input"
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder="貼上 JSON 後點「載入 JSON」可還原整份公文（表單 + 編輯器內容）"
            spellCheck={false}
          />
        </div>
      )}

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

export default OfficialDocumentEditor
