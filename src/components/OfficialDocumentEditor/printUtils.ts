import { PaperSize, Orientation, PAPER_CSS_SIZE } from '../DocumentEditor/types/editor.types'

export interface OfficialDocFormData {
  sendMethod: string
  orgName: string
  docType: string
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
  originalTo: string
  copyTo: string
  fileNumber: string
  retentionPeriod: string
}

export const defaultFormData: OfficialDocFormData = {
  sendMethod: '紙本傳送',
  orgName: '',
  docType: '函',
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
  originalTo: '',
  copyTo: '',
  fileNumber: '',
  retentionPeriod: '',
}

export function generateOfficialPrintHTML(
  formData: OfficialDocFormData,
  editorHTML: string,
  paperSize: PaperSize,
  orientation: Orientation
): string {
  const d = formData
  const cssSize = PAPER_CSS_SIZE[paperSize]
  const pageSize = orientation === 'landscape' ? `${cssSize} landscape` : cssSize

  // 用 body padding 控制邊距（@page margin: 0 消除瀏覽器自動頁首/頁尾）
  const bodyPadding = orientation === 'landscape'
    ? 'padding: 4cm 2cm 2cm 2cm;'
    : 'padding: 2cm 2cm 2cm 4cm;'

  const bindingLineStyle = orientation === 'landscape'
    ? `position: fixed; left: 0; right: 0; top: 0; height: 1.2cm;
       display: flex; flex-direction: row; align-items: center; justify-content: center;
       gap: 2cm; font-size: 14pt; color: #888; z-index: 10;`
    : `position: fixed; left: 0; top: 0; bottom: 0; width: 1.2cm;
       display: flex; flex-direction: column; align-items: center; justify-content: center;
       gap: 2cm; font-size: 14pt; color: #888; z-index: 10;`
  const bindingLineAfter = orientation === 'landscape'
    ? `content: ''; position: absolute; bottom: 0; left: 8%; right: 8%; border-bottom: 1px dashed #bbb;`
    : `content: ''; position: absolute; right: 0; top: 8%; bottom: 8%; border-right: 1px dashed #bbb;`

  const phoneText = d.extension ? `${d.phone} 分機 ${d.extension}` : d.phone

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>公文列印</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 0;
    }

    body {
      font-family: DFKai-SB, BiauKai, '標楷體', serif;
      font-size: 12pt;
      line-height: 2;
      color: #000;
      margin: 0;
      ${bodyPadding}
      counter-reset: list-L1;
    }

    /* 裝訂線 */
    .binding-line { ${bindingLineStyle} }
    .binding-line::after { ${bindingLineAfter} }
    @media screen {
      .binding-line { display: none; }
      body { padding: 2cm; }
    }

    /* 頂部資訊 */
    .doc-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5cm;
      line-height: 1.5;
    }
    .doc-top .send-method { font-size: 11pt; }
    .doc-top .file-info { text-align: right; font-size: 11pt; }
    .doc-top .file-info p { margin: 0; }

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
    .contact-block p { margin: 0; }

    /* 受文者 */
    .recipient {
      font-weight: bold;
      font-size: 12pt;
      margin: 0.3cm 0;
    }

    /* 公文資訊區 */
    .meta-block { line-height: 1.8; margin-bottom: 0.3cm; }
    .meta-block p { margin: 0.05cm 0; }

    /* ===== 編輯器內容樣式（7 層列表 + 表格等） ===== */
    .editor-content p { margin: 0.5em 0; orphans: 3; widows: 3; }
    .editor-content h1 { font-size: 20pt; margin: 1em 0 0.5em; page-break-after: avoid; }
    .editor-content h2 { font-size: 16pt; margin: 0.8em 0 0.4em; page-break-after: avoid; }
    .editor-content h3 { font-size: 14pt; margin: 0.6em 0 0.3em; page-break-after: avoid; }
    .editor-content h4,
    .editor-content h5,
    .editor-content h6 { font-size: 12pt; margin: 0.5em 0 0.2em; page-break-after: avoid; }

    .editor-content ul, .editor-content ol { padding-left: 2em; margin: 0.5em 0; }

    /* 第 1 層：一、 */
    .editor-content ol {
      list-style: none;
      padding-left: 2em;
    }
    .editor-content ol > li {
      counter-increment: list-L1;
      list-style: none;
    }
    .editor-content ol > li::marker { content: none; display: none; }
    .editor-content ol > li > p:first-child { position: relative; }
    .editor-content ol > li > p:first-child::before {
      content: counter(list-L1, trad-chinese-informal) '\\3001';
      position: absolute;
      left: -2em;
      width: 2em;
      text-align: right;
      white-space: nowrap;
      color: #000;
      font-weight: 500;
    }

    /* 第 2 層：(一) */
    .editor-content ol ol { counter-reset: list-L2; padding-left: 1.5em; }
    .editor-content ol ol > li { counter-increment: list-L2; }
    .editor-content ol ol > li > p:first-child::before {
      content: '(' counter(list-L2, trad-chinese-informal) ')';
      left: -2em; width: 2em;
    }

    /* 第 3 層：1、 */
    .editor-content ol ol ol { counter-reset: list-L3; padding-left: 1.5em; }
    .editor-content ol ol ol > li { counter-increment: list-L3; }
    .editor-content ol ol ol > li > p:first-child::before {
      content: counter(list-L3, decimal) '\\3001';
      left: -1.5em; width: 1.5em;
    }

    /* 第 4 層：(1) */
    .editor-content ol ol ol ol { counter-reset: list-L4; padding-left: 1.2em; }
    .editor-content ol ol ol ol > li { counter-increment: list-L4; }
    .editor-content ol ol ol ol > li > p:first-child::before {
      content: '(' counter(list-L4, decimal) ')';
      left: -1.5em; width: 1.5em;
    }

    /* 第 5 層：甲、 */
    .editor-content ol ol ol ol ol { counter-reset: list-L5; padding-left: 1.8em; }
    .editor-content ol ol ol ol ol > li { counter-increment: list-L5; }
    .editor-content ol ol ol ol ol > li > p:first-child::before {
      content: counter(list-L5, cjk-heavenly-stem) '\\3001';
      left: -1.8em; width: 1.8em;
    }

    /* 第 6 層：(甲) */
    .editor-content ol ol ol ol ol ol { counter-reset: list-L6; padding-left: 1.3em; }
    .editor-content ol ol ol ol ol ol > li { counter-increment: list-L6; }
    .editor-content ol ol ol ol ol ol > li > p:first-child::before {
      content: '(' counter(list-L6, cjk-heavenly-stem) ')';
      left: -1.8em; width: 1.8em;
    }

    /* 第 7 層：子、 */
    .editor-content ol ol ol ol ol ol ol { counter-reset: list-L7; padding-left: 1.8em; }
    .editor-content ol ol ol ol ol ol ol > li { counter-increment: list-L7; }
    .editor-content ol ol ol ol ol ol ol > li > p:first-child::before {
      content: counter(list-L7, cjk-earthly-branch) '\\3001';
      left: -1.8em; width: 1.8em;
    }

    .editor-content li { margin: 0.2em 0; list-style: none; }

    /* 重新編號 */
    .editor-content ol[data-restart-numbering="true"] { counter-set: list-L1 0; }
    .editor-content ol ol[data-restart-numbering="true"] { counter-set: list-L2 0; }
    .editor-content ol ol ol[data-restart-numbering="true"] { counter-set: list-L3 0; }
    .editor-content ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L4 0; }
    .editor-content ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L5 0; }
    .editor-content ol ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L6 0; }
    .editor-content ol ol ol ol ol ol ol[data-restart-numbering="true"] { counter-set: list-L7 0; }

    /* 表格 */
    .editor-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    .editor-content th, .editor-content td {
      border: 1pt solid #000;
      padding: 4pt 8pt;
      text-align: left;
    }
    .editor-content th { background: #f5f5f5; font-weight: bold; }

    /* 引用 */
    .editor-content blockquote {
      border-left: 2pt solid #666;
      padding-left: 1em;
      margin: 1em 0;
      color: #333;
      page-break-inside: avoid;
    }

    /* 程式碼 */
    .editor-content pre {
      background: #f5f5f5;
      color: #000;
      padding: 1em;
      border: 1pt solid #ddd;
      border-radius: 5px;
      overflow-x: auto;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    .editor-content code {
      background: #f0f0f0;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    .editor-content pre code { background: none; padding: 0; }

    .editor-content hr {
      border: none;
      border-top: 1pt solid #000;
      margin: 2em 0;
      page-break-after: avoid;
    }

    .editor-content a { color: #0066cc; text-decoration: underline; }
    .editor-content a::after {
      content: ' (' attr(href) ')';
      font-size: 0.8em;
      color: #666;
    }

    .editor-content img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }

    .editor-content mark {
      background-color: #ffeb3b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .editor-content [style*='text-align: left'] { text-align: left; }
    .editor-content [style*='text-align: center'] { text-align: center; }
    .editor-content [style*='text-align: right'] { text-align: right; }
    .editor-content [style*='text-align: justify'] { text-align: justify; }

    /* 正本副本 */
    .footer-block {
      margin-top: 1cm;
      border-top: 1px solid #000;
      padding-top: 0.3cm;
    }
    .footer-block p { margin: 0.05cm 0; }
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

  <div class="editor-content">
    ${editorHTML}
  </div>

  <div class="footer-block">
    <p>正本：${d.originalTo}</p>
    <p>副本：${d.copyTo}</p>
  </div>
</body>
</html>`
}
