import React, { useState } from 'react'
import './officialDocument.css'

interface OfficialDocFormData {
  sendMethod: string
  orgName: string
  docType: string
  orgAbbrev: string
  address: string
  contactPerson: string
  phone: string
  extension: string
  email: string
  recipient: string
  year: string
  month: string
  day: string
  docNumber: string
  speed: string
  classification: string
  attachments: string
  subject: string
  descriptionItems: string[]
  methodItems: string[]
  originalTo: string
  copyTo: string
  fileNumber: string
  retentionPeriod: string
}

interface OfficialDocumentFormProps {
  onLoadToEditor?: (html: string) => void
}

const defaultFormData: OfficialDocFormData = {
  sendMethod: '紙本傳送',
  orgName: '',
  docType: '函',
  orgAbbrev: '',
  address: '',
  contactPerson: '',
  phone: '',
  extension: '',
  email: '',
  recipient: '',
  year: '',
  month: '',
  day: '',
  docNumber: '',
  speed: '普通件',
  classification: '',
  attachments: '',
  subject: '',
  descriptionItems: [''],
  methodItems: [],
  originalTo: '',
  copyTo: '',
  fileNumber: '',
  retentionPeriod: '',
}

const OfficialDocumentForm: React.FC<OfficialDocumentFormProps> = ({ onLoadToEditor }) => {
  const [formData, setFormData] = useState<OfficialDocFormData>(defaultFormData)

  const updateField = (field: keyof OfficialDocFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addDescriptionItem = () => {
    setFormData(prev => ({ ...prev, descriptionItems: [...prev.descriptionItems, ''] }))
  }

  const removeDescriptionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      descriptionItems: prev.descriptionItems.filter((_, i) => i !== index),
    }))
  }

  const updateDescriptionItem = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      descriptionItems: prev.descriptionItems.map((item, i) => (i === index ? value : item)),
    }))
  }

  const addMethodItem = () => {
    setFormData(prev => ({ ...prev, methodItems: [...prev.methodItems, ''] }))
  }

  const removeMethodItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      methodItems: prev.methodItems.filter((_, i) => i !== index),
    }))
  }

  const updateMethodItem = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      methodItems: prev.methodItems.map((item, i) => (i === index ? value : item)),
    }))
  }

  const generatePrintHTML = () => {
    const d = formData
    const descriptionHTML = d.descriptionItems.filter(s => s.trim()).length > 0
      ? `<p class="section-label">說明：</p>
         <ol class="doc-list">${d.descriptionItems.filter(s => s.trim()).map(item => `<li>${item}</li>`).join('')}</ol>`
      : ''

    const methodHTML = d.methodItems.filter(s => s.trim()).length > 0
      ? `<p class="section-label">辦法：</p>
         <ol class="doc-list">${d.methodItems.filter(s => s.trim()).map(item => `<li>${item}</li>`).join('')}</ol>`
      : ''

    const phoneText = d.extension
      ? `${d.phone} 分機 ${d.extension}`
      : d.phone

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>公文列印</title>
  <style>
    @page {
      size: A4;
      margin: 2cm 2cm 2cm 0.5cm;
      @bottom-center {
        content: counter(page);
        font-family: DFKai-SB, BiauKai, '標楷體', serif;
        font-size: 10pt;
      }
    }

    body {
      font-family: DFKai-SB, BiauKai, '標楷體', serif;
      font-size: 12pt;
      line-height: 2;
      color: #000;
      margin: 0;
      padding: 0 0 0 3.5cm;
      counter-reset: list-L1;
    }

    /* 裝訂線 */
    .binding-line {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: 1.2cm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2cm;
      font-size: 14pt;
      color: #888;
      z-index: 10;
    }

    .binding-line::after {
      content: '';
      position: absolute;
      right: 0;
      top: 8%;
      bottom: 8%;
      border-right: 1px dashed #bbb;
    }

    /* 頂部資訊 */
    .doc-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5cm;
      line-height: 1.5;
    }

    .doc-top .send-method {
      font-size: 11pt;
    }

    .doc-top .file-info {
      text-align: right;
      font-size: 11pt;
    }

    .doc-top .file-info p {
      margin: 0;
    }

    /* 機關名稱 + 文書類型 */
    .doc-title {
      text-align: center;
      font-size: 22pt;
      font-weight: bold;
      margin: 0.3cm 0 0.2cm;
      letter-spacing: 0.1em;
    }

    /* 聯絡資訊區塊 */
    .contact-block {
      text-align: right;
      line-height: 1.8;
      margin-bottom: 0.3cm;
      font-size: 11pt;
    }

    .contact-block p {
      margin: 0;
    }

    /* 受文者 */
    .recipient {
      font-weight: bold;
      font-size: 12pt;
      margin: 0.3cm 0;
    }

    /* 公文資訊區 */
    .meta-block {
      line-height: 1.8;
      margin-bottom: 0.3cm;
    }

    .meta-block p {
      margin: 0.05cm 0;
    }

    /* 主旨 */
    .subject-text {
      text-indent: -3em;
      margin-left: 3em;
      margin-top: 0.3cm;
      margin-bottom: 0.3cm;
      text-align: justify;
    }

    /* 說明/辦法標題 */
    .section-label {
      font-weight: bold;
      margin: 0.3cm 0 0;
    }

    /* 列表 — 沿用公文格式 CSS 計數器 */
    ol.doc-list {
      list-style: none;
      padding-left: 2em;
      margin: 0 0 0.3cm;
    }

    ol.doc-list > li {
      counter-increment: list-L1;
      position: relative;
      list-style: none;
      margin: 0.2em 0;
      text-align: justify;
    }

    ol.doc-list > li::marker {
      content: none;
      display: none;
    }

    ol.doc-list > li::before {
      content: counter(list-L1, trad-chinese-informal) '\\3001';
      position: absolute;
      left: -2em;
      width: 2em;
      text-align: right;
      white-space: nowrap;
      font-weight: 500;
    }

    /* 正本副本 */
    .footer-block {
      margin-top: 1cm;
      border-top: 1px solid #000;
      padding-top: 0.3cm;
    }

    .footer-block p {
      margin: 0.05cm 0;
    }
  </style>
</head>
<body>
  <div class="binding-line">
    <span>裝</span>
    <span>訂</span>
    <span>線</span>
  </div>

  <div class="doc-top">
    <span class="send-method">發文方式：${d.sendMethod}</span>
    <div class="file-info">
      <p>檔　號：${d.fileNumber}</p>
      <p>保存年限：${d.retentionPeriod}</p>
    </div>
  </div>

  <p class="doc-title">${d.orgName}　${d.docType}</p>

  <div class="contact-block">
    ${d.address ? `<p>地　址：${d.address}</p>` : ''}
    ${d.contactPerson ? `<p>聯　絡　人：${d.contactPerson}</p>` : ''}
    ${phoneText ? `<p>電　話：${phoneText}</p>` : ''}
    ${d.email ? `<p>電 子 信 箱：${d.email}</p>` : ''}
  </div>

  <p class="recipient">受文者：${d.recipient}</p>

  <div class="meta-block">
    <p>發文日期：中華民國 ${d.year} 年 ${d.month} 月 ${d.day} 日</p>
    <p>發文字號：${d.docNumber}</p>
    <p>速別：${d.speed}</p>
    <p>密等及解密條件或保密期限：${d.classification}</p>
    ${d.attachments ? `<p>附件：${d.attachments}</p>` : ''}
  </div>

  <p class="subject-text"><strong>主旨：</strong>${d.subject}</p>

  ${descriptionHTML}
  ${methodHTML}

  <div class="footer-block">
    <p>正本：${d.originalTo}</p>
    <p>副本：${d.copyTo}</p>
  </div>
</body>
</html>`
  }

  const generateEditorHTML = () => {
    const d = formData
    const phoneText = d.extension ? `${d.phone} 分機 ${d.extension}` : d.phone

    let html = ''

    // 標題
    html += `<p style="text-align: center"><strong>${d.orgName}　${d.docType}</strong></p>`

    // 聯絡資訊
    if (d.address) html += `<p style="text-align: right">地　址：${d.address}</p>`
    if (d.contactPerson) html += `<p style="text-align: right">聯　絡　人：${d.contactPerson}</p>`
    if (phoneText) html += `<p style="text-align: right">電　話：${phoneText}</p>`
    if (d.email) html += `<p style="text-align: right">電 子 信 箱：${d.email}</p>`

    html += `<p></p>`

    // 受文者
    html += `<p><strong>受文者：${d.recipient}</strong></p>`
    html += `<p></p>`

    // 公文資訊
    html += `<p>發文日期：中華民國 ${d.year} 年 ${d.month} 月 ${d.day} 日</p>`
    html += `<p>發文字號：${d.docNumber}</p>`
    html += `<p>速別：${d.speed}</p>`
    if (d.classification) html += `<p>密等及解密條件或保密期限：${d.classification}</p>`
    if (d.attachments) html += `<p>附件：${d.attachments}</p>`

    html += `<p></p>`

    // 主旨
    html += `<p>主旨：${d.subject}</p>`
    html += `<p></p>`

    // 說明
    const descItems = d.descriptionItems.filter(s => s.trim())
    if (descItems.length > 0) {
      html += `<p>說明：</p>`
      html += `<ol>${descItems.map(item => `<li><p>${item}</p></li>`).join('')}</ol>`
      html += `<p></p>`
    }

    // 辦法
    const methItems = d.methodItems.filter(s => s.trim())
    if (methItems.length > 0) {
      html += `<p>辦法：</p>`
      html += `<ol>${methItems.map(item => `<li><p>${item}</p></li>`).join('')}</ol>`
      html += `<p></p>`
    }

    // 正本副本
    html += `<p>正本：${d.originalTo}</p>`
    html += `<p>副本：${d.copyTo}</p>`

    return html
  }

  const handleGenerate = () => {
    const printHTML = generatePrintHTML()
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    }
  }

  const handleLoadToEditor = () => {
    if (onLoadToEditor) {
      onLoadToEditor(generateEditorHTML())
    }
  }

  const handleReset = () => {
    setFormData(defaultFormData)
  }

  return (
    <div className="official-doc-form">
      <div className="form-header">
        <h2>公文製作</h2>
        <p className="form-subtitle">填寫以下欄位，產生正式公文格式</p>
      </div>

      {/* 基本資訊 */}
      <fieldset className="form-section">
        <legend>發文單位資訊</legend>
        <div className="form-row">
          <label>發文方式</label>
          <select value={formData.sendMethod} onChange={e => updateField('sendMethod', e.target.value)}>
            <option value="紙本傳送">紙本傳送</option>
            <option value="電子交換">電子交換</option>
          </select>
        </div>
        <div className="form-row">
          <label>發文單位 <span className="required">*</span></label>
          <input type="text" value={formData.orgName} onChange={e => updateField('orgName', e.target.value)} placeholder="例：天王有限公司" />
        </div>
        <div className="form-row">
          <label>文書類型</label>
          <select value={formData.docType} onChange={e => updateField('docType', e.target.value)}>
            <option value="函">函</option>
            <option value="書函">書函</option>
            <option value="令">令</option>
            <option value="公告">公告</option>
            <option value="簽">簽</option>
            <option value="箋函">箋函</option>
          </select>
        </div>
      </fieldset>

      {/* 聯絡資訊 */}
      <fieldset className="form-section">
        <legend>聯絡資訊</legend>
        <div className="form-row">
          <label>地址</label>
          <input type="text" value={formData.address} onChange={e => updateField('address', e.target.value)} placeholder="例：台北市忠孝東路一段一號 20 樓" />
        </div>
        <div className="form-row">
          <label>聯絡人</label>
          <input type="text" value={formData.contactPerson} onChange={e => updateField('contactPerson', e.target.value)} />
        </div>
        <div className="form-row form-row-inline">
          <div className="inline-field">
            <label>電話</label>
            <input type="text" value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="02-2216-4477" />
          </div>
          <div className="inline-field inline-field-small">
            <label>分機</label>
            <input type="text" value={formData.extension} onChange={e => updateField('extension', e.target.value)} placeholder="33" />
          </div>
        </div>
        <div className="form-row">
          <label>電子信箱</label>
          <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="user@example.com" />
        </div>
      </fieldset>

      {/* 公文主要資訊 */}
      <fieldset className="form-section">
        <legend>公文主要資訊</legend>
        <div className="form-row">
          <label>受文者 <span className="required">*</span></label>
          <input type="text" value={formData.recipient} onChange={e => updateField('recipient', e.target.value)} placeholder="例：米花市政府資訊局" />
        </div>
        <div className="form-row form-row-inline">
          <div className="inline-field">
            <label>發文日期</label>
            <div className="date-inputs">
              <span>中華民國</span>
              <input type="text" value={formData.year} onChange={e => updateField('year', e.target.value)} placeholder="113" className="date-input" />
              <span>年</span>
              <input type="text" value={formData.month} onChange={e => updateField('month', e.target.value)} placeholder="1" className="date-input date-input-short" />
              <span>月</span>
              <input type="text" value={formData.day} onChange={e => updateField('day', e.target.value)} placeholder="1" className="date-input date-input-short" />
              <span>日</span>
            </div>
          </div>
        </div>
        <div className="form-row">
          <label>發文字號 <span className="required">*</span></label>
          <input type="text" value={formData.docNumber} onChange={e => updateField('docNumber', e.target.value)} placeholder="例：天字第 1130001 號" />
        </div>
        <div className="form-row">
          <label>速別</label>
          <select value={formData.speed} onChange={e => updateField('speed', e.target.value)}>
            <option value="最速件">最速件</option>
            <option value="速件">速件</option>
            <option value="普通件">普通件</option>
          </select>
        </div>
        <div className="form-row">
          <label>密等及解密條件</label>
          <input type="text" value={formData.classification} onChange={e => updateField('classification', e.target.value)} />
        </div>
        <div className="form-row form-row-inline">
          <div className="inline-field">
            <label>檔號</label>
            <input type="text" value={formData.fileNumber} onChange={e => updateField('fileNumber', e.target.value)} />
          </div>
          <div className="inline-field">
            <label>保存年限</label>
            <input type="text" value={formData.retentionPeriod} onChange={e => updateField('retentionPeriod', e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <label>附件說明</label>
          <input type="text" value={formData.attachments} onChange={e => updateField('attachments', e.target.value)} placeholder="例：服務團隊成員名冊、保密同意書" />
        </div>
      </fieldset>

      {/* 公文內容 */}
      <fieldset className="form-section">
        <legend>公文內容</legend>
        <div className="form-row">
          <label>主旨 <span className="required">*</span></label>
          <textarea
            value={formData.subject}
            onChange={e => updateField('subject', e.target.value)}
            placeholder="簡明扼要說明行文目的與期望"
            rows={3}
          />
        </div>

        <div className="form-row">
          <label>說明</label>
          <div className="list-items">
            {formData.descriptionItems.map((item, index) => (
              <div key={index} className="list-item-row">
                <span className="item-number">{index + 1}.</span>
                <textarea
                  value={item}
                  onChange={e => updateDescriptionItem(index, e.target.value)}
                  placeholder={`第 ${index + 1} 項說明`}
                  rows={2}
                />
                {formData.descriptionItems.length > 1 && (
                  <button type="button" className="btn-remove" onClick={() => removeDescriptionItem(index)} title="移除">
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add" onClick={addDescriptionItem}>
              + 新增說明項目
            </button>
          </div>
        </div>

        <div className="form-row">
          <label>辦法（選填）</label>
          <div className="list-items">
            {formData.methodItems.map((item, index) => (
              <div key={index} className="list-item-row">
                <span className="item-number">{index + 1}.</span>
                <textarea
                  value={item}
                  onChange={e => updateMethodItem(index, e.target.value)}
                  placeholder={`第 ${index + 1} 項辦法`}
                  rows={2}
                />
                <button type="button" className="btn-remove" onClick={() => removeMethodItem(index)} title="移除">
                  &times;
                </button>
              </div>
            ))}
            <button type="button" className="btn-add" onClick={addMethodItem}>
              + 新增辦法項目
            </button>
          </div>
        </div>
      </fieldset>

      {/* 正本副本 */}
      <fieldset className="form-section">
        <legend>正本與副本</legend>
        <div className="form-row">
          <label>正本</label>
          <input type="text" value={formData.originalTo} onChange={e => updateField('originalTo', e.target.value)} placeholder="受文者機關名稱" />
        </div>
        <div className="form-row">
          <label>副本</label>
          <input type="text" value={formData.copyTo} onChange={e => updateField('copyTo', e.target.value)} />
        </div>
      </fieldset>

      {/* 動作按鈕 */}
      <div className="form-actions">
        <button type="button" className="btn-generate" onClick={handleGenerate}>
          產生公文
        </button>
        <button type="button" className="btn-load-editor" onClick={handleLoadToEditor}>
          載入至編輯器
        </button>
        <button type="button" className="btn-reset" onClick={handleReset}>
          重設
        </button>
      </div>
    </div>
  )
}

export default OfficialDocumentForm
