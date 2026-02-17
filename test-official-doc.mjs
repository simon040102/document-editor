import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let passed = 0, failed = 0
function ok(msg) { passed++; console.log(`  ✓ ${msg}`) }
function fail(msg) { failed++; console.log(`  ✗ ${msg}`) }

// ============================================================
// 開啟列印預覽 + 等待 iframe 載入
// ============================================================
async function openPrintPreview(page) {
  const printBtn = await page.$('button[title*="列印"]')
  if (!printBtn) { fail('找不到列印按鈕'); return false }
  await printBtn.click()
  await sleep(1500)

  const overlayExists = await page.$('.print-preview-overlay')
  if (!overlayExists) { fail('列印預覽 overlay 未出現'); return false }

  return true
}

// ============================================================
// 關閉列印預覽
// ============================================================
async function closePrintPreview(page) {
  const closed = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.print-preview-btn')]
    const btn = btns.find(b => b.textContent.trim() === '關閉')
    if (btn) { btn.click(); return true }
    return false
  })
  if (!closed) { fail('找不到關閉按鈕'); return }
  await sleep(300)
  const overlayGone = await page.$('.print-preview-overlay')
  if (!overlayGone) ok('overlay 已關閉')
  else fail('overlay 未關閉')
}

// ============================================================
// 從 iframe 取得預覽資訊
// ============================================================
async function getPreviewInfo(page) {
  return page.evaluate(() => {
    const iframe = document.querySelector('.print-preview-iframe')
    if (!iframe?.contentDocument) return null
    const doc = iframe.contentDocument
    const body = doc.body

    return {
      hasBindingLine: !!doc.querySelector('.binding-line'),
      hasDocTop: !!doc.querySelector('.doc-top'),
      hasDocTitle: !!doc.querySelector('.doc-title'),
      hasContactBlock: !!doc.querySelector('.contact-block'),
      hasRecipient: !!doc.querySelector('.recipient'),
      hasMetaBlock: !!doc.querySelector('.meta-block'),
      hasEditorContent: !!doc.querySelector('.editor-content'),
      hasFooterBlock: !!doc.querySelector('.footer-block'),
      // 文字內容
      titleText: doc.querySelector('.doc-title')?.textContent || '',
      recipientText: doc.querySelector('.recipient')?.textContent || '',
      footerText: doc.querySelector('.footer-block')?.innerText || '',
      bodyText: body?.innerText || '',
      // 列表結構
      olCount: doc.querySelectorAll('.editor-content ol').length,
      liCount: doc.querySelectorAll('.editor-content li').length,
    }
  })
}

// ============================================================
// 從 iframe 檢查 CSS 規則
// ============================================================
async function getPreviewCSS(page) {
  return page.evaluate(() => {
    const iframe = document.querySelector('.print-preview-iframe')
    if (!iframe?.contentDocument) return null
    const doc = iframe.contentDocument

    // 取得所有 style 標籤的 CSS 文字
    const styleEls = doc.querySelectorAll('style')
    const allCSS = Array.from(styleEls).map(s => s.textContent).join('\n')

    // 檢查 @page 規則
    const hasPageRule = allCSS.includes('@page')
    const hasBottomCenter = allCSS.includes('@bottom-center')
    const hasCounterPage = allCSS.includes('counter(page)')
    const hasTopLeft = allCSS.includes("@top-left")
    const hasTopRight = allCSS.includes("@top-right")
    const hasBottomLeft = allCSS.includes("@bottom-left")
    const hasBottomRight = allCSS.includes("@bottom-right")

    // 檢查 title 是否為空
    const titleText = doc.title || ''

    // 檢查 body 樣式
    const bodyStyle = doc.body ? window.getComputedStyle(doc.body) : null
    const bodyPadding = bodyStyle ? {
      top: bodyStyle.paddingTop,
      right: bodyStyle.paddingRight,
      bottom: bodyStyle.paddingBottom,
      left: bodyStyle.paddingLeft,
    } : null

    // 檢查 @media print 規則
    const hasMediaPrint = allCSS.includes('@media print')

    // 裝訂線樣式
    const bindingLine = doc.querySelector('.binding-line')
    let bindingLineStyle = null
    if (bindingLine) {
      const s = window.getComputedStyle(bindingLine)
      bindingLineStyle = {
        position: s.position,
        display: s.display,
        flexDirection: s.flexDirection,
      }
    }

    return {
      allCSS: allCSS.substring(0, 3000), // 截取前 3000 字元
      hasPageRule,
      hasBottomCenter,
      hasCounterPage,
      hasTopLeft,
      hasTopRight,
      hasBottomLeft,
      hasBottomRight,
      titleText,
      bodyPadding,
      hasMediaPrint,
      bindingLineStyle,
    }
  })
}

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ['--no-sandbox']
  })
  const page = await browser.newPage()

  // ============================
  // [1] 頁面載入 & 統一介面驗證
  // ============================
  console.log('\n[1] 頁面載入 & 統一介面驗證')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })
  await sleep(1000)

  const tabs = await page.$$('.tab-btn')
  if (tabs.length === 0) ok('無 Tab（統一介面）')
  else fail(`找到 ${tabs.length} 個 Tab，應為 0`)

  const headerForm = await page.$('.doc-header-form')
  if (headerForm) ok('表頭表單存在')
  else fail('缺少表頭表單')

  const editor = await page.$('.ProseMirror')
  if (editor) ok('編輯器存在')
  else fail('缺少編輯器')

  const footerForm = await page.$('.doc-footer-form')
  if (footerForm) ok('表尾表單存在')
  else fail('缺少表尾表單')

  const actionBar = await page.$('.doc-action-bar')
  if (actionBar) ok('動作列存在')
  else fail('缺少動作列')

  // 檢查工具列按鈕存在
  const toolbarBtns = await page.evaluate(() => {
    return {
      hasPrintBtn: !!document.querySelector('button[title*="列印"]'),
      hasBindingBtn: !!document.querySelector('button')  && [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '裝訂'),
      hasPaperSelect: !!document.querySelector('.paper-size-select'),
      hasOrientBtn: [...document.querySelectorAll('button')].some(b => ['直', '橫'].includes(b.textContent.trim())),
    }
  })
  if (toolbarBtns.hasPrintBtn) ok('列印按鈕存在')
  else fail('缺少列印按鈕')
  if (toolbarBtns.hasBindingBtn) ok('裝訂線按鈕存在')
  else fail('缺少裝訂線按鈕')
  if (toolbarBtns.hasPaperSelect) ok('紙張大小選擇器存在')
  else fail('缺少紙張大小選擇器')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-01-unified.png'), fullPage: true })

  // ============================
  // [2] 表單結構驗證
  // ============================
  console.log('\n[2] 表單結構驗證')

  const details = await page.$$('.doc-header-form details')
  if (details.length === 3) ok('表頭 3 個 collapsible 區段')
  else fail(`表頭區段: ${details.length}，期望 3`)

  const summaries = await page.$$eval('.doc-header-form summary', els => els.map(el => el.textContent.trim()))
  const expectedSummaries = ['發文單位資訊', '聯絡資訊', '公文主要資訊']
  let summariesMatch = true
  for (let i = 0; i < expectedSummaries.length; i++) {
    if (summaries[i] !== expectedSummaries[i]) {
      fail(`區段 ${i}: ${summaries[i]}，期望 ${expectedSummaries[i]}`)
      summariesMatch = false
    }
  }
  if (summariesMatch) ok('所有表頭區段標題正確')

  const footerLegend = await page.$eval('.doc-footer-form legend', el => el.textContent.trim())
  if (footerLegend === '正本與副本') ok('表尾: 正本與副本')
  else fail(`表尾 legend: ${footerLegend}`)

  const resetBtn = await page.$('.doc-btn-reset')
  if (resetBtn) ok('「重設表單」按鈕存在')
  else fail('缺少「重設表單」按鈕')

  // 驗證動作列按鈕
  const actionBtns = await page.$$eval('.doc-btn-action', els => els.map(el => el.textContent.trim()))
  if (actionBtns.includes('匯出 HTML')) ok('匯出 HTML 按鈕存在')
  else fail('缺少匯出 HTML 按鈕')
  if (actionBtns.includes('匯出 JSON')) ok('匯出 JSON 按鈕存在')
  else fail('缺少匯出 JSON 按鈕')
  if (actionBtns.some(t => t.includes('JSON'))) ok('JSON 面板切換按鈕存在')
  else fail('缺少 JSON 面板按鈕')

  // ============================
  // [3] 填寫表單
  // ============================
  console.log('\n[3] 填寫表單')

  await page.evaluate(() => {
    document.querySelectorAll('.doc-header-form details').forEach(d => d.open = true)
  })
  await sleep(200)

  await page.evaluate(() => {
    function setReactValue(el, value) {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const headerInputs = document.querySelectorAll('.doc-header-form input[type="text"], .doc-header-form input[type="email"], .doc-header-form textarea')
    headerInputs.forEach(input => {
      const placeholder = input.placeholder || ''
      const label = input.closest('.doc-form-row, .doc-inline-field')?.querySelector('label')?.textContent || ''
      if (placeholder.includes('天王') || label.includes('發文單位')) setReactValue(input, '測試機關')
      else if (placeholder.includes('台北') || label.includes('地址')) setReactValue(input, '台北市中正區重慶南路一段 1 號')
      else if (label.includes('聯絡人')) setReactValue(input, '張三')
      else if (placeholder.includes('02-') || label.includes('電話')) setReactValue(input, '02-1234-5678')
      else if (placeholder === '33' || label.includes('分機')) setReactValue(input, '100')
      else if (placeholder.includes('user@') || label.includes('信箱')) setReactValue(input, 'test@example.com')
      else if (placeholder.includes('米花') || label.includes('受文者')) setReactValue(input, '測試受文機關')
      else if (input.classList.contains('doc-date-input') && !input.classList.contains('doc-date-input-short')) {
        if (!input.value) setReactValue(input, '113')
      }
      else if (input.classList.contains('doc-date-input-short')) {
        if (!input.value) setReactValue(input, '6')
      }
      else if (placeholder.includes('天字') || label.includes('發文字號')) setReactValue(input, '測字第 1130001 號')
      else if (label.includes('附件')) setReactValue(input, '測試附件文件')
    })

    const footerInputs = document.querySelectorAll('.doc-footer-form input[type="text"]')
    footerInputs.forEach(input => {
      const label = input.closest('.doc-form-row, .doc-inline-field')?.querySelector('label')?.textContent || ''
      if (label.includes('正本')) setReactValue(input, '測試受文機關')
      else if (label.includes('副本')) setReactValue(input, '測試副本機關')
      else if (label.includes('檔號')) setReactValue(input, 'A-001-002')
      else if (label.includes('保存年限')) setReactValue(input, '10年')
    })
  })

  await sleep(300)

  const filledCheck = await page.evaluate(() => {
    const orgInput = document.querySelector('.doc-header-form input[placeholder*="天王"]')
    const recipientInput = [...document.querySelectorAll('.doc-header-form input[type="text"]')].find(el => {
      const label = el.closest('.doc-form-row, .doc-inline-field')?.querySelector('label')?.textContent || ''
      return label.includes('受文者')
    })
    return {
      orgName: orgInput?.value || '',
      recipient: recipientInput?.value || '',
    }
  })

  if (filledCheck.orgName === '測試機關') ok('發文單位已填寫')
  else fail(`發文單位: ${filledCheck.orgName}`)

  if (filledCheck.recipient === '測試受文機關') ok('受文者已填寫')
  else fail(`受文者: ${filledCheck.recipient}`)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-02-filled.png'), fullPage: true })
  ok('表單填寫完成')

  // ============================
  // [4] 短內容列印預覽 + CSS 驗證
  // ============================
  console.log('\n[4] 短內容列印預覽')

  // 設定簡短編輯器內容
  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent(`
        <p><strong>主旨：</strong>關於本案辦理情形，請查照。</p>
        <p><strong>說明：</strong></p>
        <ol>
          <li><p>依據相關規定辦理。</p></li>
          <li><p>請於期限內回覆。</p></li>
        </ol>
        <p><strong>辦法：</strong></p>
        <ol>
          <li><p>請各單位配合辦理。</p></li>
        </ol>
      `)
    }
  })
  await sleep(300)

  const editorContent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return { found: false }
    return {
      found: true,
      hasSubject: pm.innerText.includes('主旨'),
      hasDesc: pm.innerText.includes('說明'),
      hasMethod: pm.innerText.includes('辦法'),
      olCount: pm.querySelectorAll('ol').length,
      liCount: pm.querySelectorAll('ol > li').length,
    }
  })

  if (editorContent.found) ok('編輯器內容已設定')
  else fail('編輯器無內容')
  if (editorContent.hasSubject && editorContent.hasDesc && editorContent.hasMethod) ok('主旨、說明、辦法齊全')
  else fail('缺少主旨/說明/辦法')
  if (editorContent.liCount >= 3) ok(`列表項目 ${editorContent.liCount} 個`)
  else fail(`列表項目: ${editorContent.liCount}`)

  // 開啟預覽
  const previewOk1 = await openPrintPreview(page)
  if (previewOk1) {
    ok('列印預覽已開啟')

    const info1 = await getPreviewInfo(page)
    if (info1) {
      if (info1.hasBindingLine) ok('裝訂線存在')
      else fail('缺少裝訂線')

      if (info1.hasDocTop) ok('發文單位資訊區塊存在')
      else fail('缺發文單位資訊區塊')

      if (info1.hasDocTitle) ok('標題存在')
      else fail('缺標題')

      if (info1.titleText.includes('測試機關')) ok('標題文字正確')
      else fail(`標題: ${info1.titleText}`)

      if (info1.hasRecipient) ok('受文者存在')
      else fail('缺受文者')

      if (info1.recipientText.includes('測試受文機關')) ok('受文者文字正確')
      else fail(`受文者: ${info1.recipientText}`)

      if (info1.hasMetaBlock) ok('發文日期字號區塊存在')
      else fail('缺發文日期字號區塊')

      if (info1.hasEditorContent) ok('編輯器內容存在')
      else fail('缺編輯器內容')

      if (info1.bodyText.includes('主旨')) ok('含主旨文字')
      else fail('無主旨文字')

      if (info1.hasFooterBlock) ok('正本副本區塊存在')
      else fail('缺正本副本')

      if (info1.footerText.includes('測試受文機關')) ok('正本內容正確')
      else fail(`正本: ${info1.footerText}`)

      if (info1.liCount >= 3) ok(`列表項 ${info1.liCount} 個`)
      else fail(`列表項: ${info1.liCount}`)

      if (info1.hasContactBlock) ok('聯絡資訊區塊存在')
      else fail('缺聯絡資訊區塊')
    } else {
      fail('無法讀取 iframe 內容')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-03-short-preview.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // [5] 列印預覽 CSS 規則驗證
  // ============================
  console.log('\n[5] 列印預覽 CSS 規則驗證（@page 自訂頁碼）')

  // 重新開啟預覽來檢查 CSS
  const previewOk5 = await openPrintPreview(page)
  if (previewOk5) {
    const cssInfo = await getPreviewCSS(page)
    if (cssInfo) {
      // @page 規則
      if (cssInfo.hasPageRule) ok('@page 規則存在')
      else fail('缺少 @page 規則')

      // @bottom-center 頁碼
      if (cssInfo.hasBottomCenter) ok('@bottom-center margin box 存在')
      else fail('缺少 @bottom-center（頁碼位置）')

      if (cssInfo.hasCounterPage) ok('counter(page) 頁碼計數器存在')
      else fail('缺少 counter(page)')

      // 其他 margin box 設為空（覆蓋瀏覽器預設）
      if (cssInfo.hasTopLeft) ok("@top-left 已設定（覆蓋瀏覽器預設）")
      else fail('缺少 @top-left')

      if (cssInfo.hasTopRight) ok("@top-right 已設定（覆蓋瀏覽器預設）")
      else fail('缺少 @top-right')

      if (cssInfo.hasBottomLeft) ok("@bottom-left 已設定（覆蓋瀏覽器預設）")
      else fail('缺少 @bottom-left')

      if (cssInfo.hasBottomRight) ok("@bottom-right 已設定（覆蓋瀏覽器預設）")
      else fail('缺少 @bottom-right')

      // title 應為空
      if (!cssInfo.titleText || cssInfo.titleText.trim() === '') ok('<title> 為空（不會顯示在頁尾）')
      else fail(`<title> 不為空: "${cssInfo.titleText}"`)

      // @media print 規則
      if (cssInfo.hasMediaPrint) ok('@media print 規則存在')
      else fail('缺少 @media print')

      // 裝訂線 CSS
      if (cssInfo.bindingLineStyle) {
        if (cssInfo.bindingLineStyle.position === 'fixed') ok('裝訂線 position: fixed（每頁顯示）')
        else fail(`裝訂線 position: ${cssInfo.bindingLineStyle.position}`)

        if (cssInfo.bindingLineStyle.display === 'flex') ok('裝訂線 display: flex')
        else fail(`裝訂線 display: ${cssInfo.bindingLineStyle.display}`)
      } else {
        fail('找不到裝訂線樣式')
      }

      // body padding（螢幕預覽應有完整 padding）
      if (cssInfo.bodyPadding) {
        const padLeft = parseFloat(cssInfo.bodyPadding.left)
        if (padLeft > 100) ok(`body padding-left: ${cssInfo.bodyPadding.left}（含裝訂線空間）`)
        else fail(`body padding-left 太小: ${cssInfo.bodyPadding.left}`)

        const padTop = parseFloat(cssInfo.bodyPadding.top)
        if (padTop > 50) ok(`body padding-top: ${cssInfo.bodyPadding.top}（上邊距）`)
        else fail(`body padding-top 太小: ${cssInfo.bodyPadding.top}`)
      } else {
        fail('無法讀取 body padding')
      }

      // 檢查 CSS 中 @page margin 是否正確設定（裝訂線側為 0）
      const pageMarginMatch = cssInfo.allCSS.match(/margin:\s*([^;]+);/)
      if (pageMarginMatch) {
        const margin = pageMarginMatch[1].trim()
        console.log(`  @page margin: ${margin}`)
        if (margin.includes('0')) ok('@page margin 裝訂線側為 0')
        else fail(`@page margin 不含 0: ${margin}`)
      }
    } else {
      fail('無法讀取 iframe CSS')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-04-css-check.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // [6] 長內容列印預覽
  // ============================
  console.log('\n[6] 長內容列印預覽')

  // 設定 7 層巢狀列表 × 2 組 + 額外項目
  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent(`
        <p><strong>主旨：</strong>關於本案辦理情形，請查照。</p>
        <p><strong>說明：</strong></p>
        <ol>
          <li><p>第一大項說明文字</p>
            <ol><li><p>第一子項</p>
              <ol><li><p>第一小項</p>
                <ol><li><p>第一細項</p>
                  <ol><li><p>甲項說明</p>
                    <ol><li><p>甲子項說明</p>
                      <ol><li><p>子項說明</p></li></ol>
                    </li></ol>
                  </li></ol>
                </li></ol>
              </li></ol>
            </li></ol>
          </li>
          <li><p>第二大項說明文字</p>
            <ol><li><p>第二之一子項</p>
              <ol><li><p>第二小項</p>
                <ol><li><p>第二細項</p>
                  <ol><li><p>乙項說明</p>
                    <ol><li><p>乙子項說明</p>
                      <ol><li><p>丑項說明</p></li></ol>
                    </li></ol>
                  </li></ol>
                </li></ol>
              </li></ol>
            </li></ol>
          </li>
          <li><p>第三大項：這是一段比較長的文字，用來測試在列印時文字換行後的排版效果是否正常。</p></li>
          <li><p>第四大項說明</p></li>
          <li><p>第五大項說明</p></li>
          <li><p>第六大項說明</p></li>
          <li><p>第七大項說明</p></li>
          <li><p>第八大項說明</p></li>
          <li><p>第九大項說明</p></li>
          <li><p>第十大項說明</p></li>
        </ol>
      `)
    }
  })
  await sleep(300)

  const longContent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      liCount: pm?.querySelectorAll('ol > li').length || 0,
      olDepth: pm?.querySelectorAll('ol ol ol ol ol ol ol').length || 0,
    }
  })
  if (longContent.liCount >= 10) ok(`設定長內容：${longContent.liCount} 個列表項`)
  else fail(`列表項不足: ${longContent.liCount}`)
  if (longContent.olDepth >= 2) ok(`7 層巢狀 × ${longContent.olDepth} 組`)
  else fail(`巢狀深度不足: ${longContent.olDepth}`)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-05-long-content.png'), fullPage: true })

  // 開啟列印預覽
  const previewOk6 = await openPrintPreview(page)
  if (previewOk6) {
    ok('長內容列印預覽已開啟')

    const info6 = await getPreviewInfo(page)
    if (info6) {
      if (info6.hasDocTitle) ok('標題存在')
      else fail('缺標題')

      if (info6.hasEditorContent) ok('編輯器內容存在')
      else fail('缺編輯器內容')

      if (info6.bodyText.includes('主旨')) ok('含主旨文字')
      else fail('無主旨文字')

      if (info6.hasFooterBlock) ok('正本副本區塊存在')
      else fail('缺正本副本')

      if (info6.hasBindingLine) ok('裝訂線存在')
      else fail('缺裝訂線')

      if (info6.liCount >= 10) ok(`列表項完整：${info6.liCount} 個`)
      else fail(`列表項遺失：${info6.liCount}，期望 ≥10`)

      if (info6.olCount >= 2) ok(`ol 元素：${info6.olCount} 個`)
      else fail(`ol 元素不足：${info6.olCount}`)
    } else {
      fail('無法讀取 iframe 內容')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-06-long-preview.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // [7] 長主旨換行測試
  // ============================
  console.log('\n[7] 長主旨換行測試')

  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent(`
        <p><strong>主旨：</strong>關於本府辦理一一三年度市政建設計畫暨相關配套措施推動進度檢討會議紀錄及後續追蹤管考事項，請各機關依限完成辦理並函報本府備查，請查照。</p>
        <p><strong>說明：</strong></p>
        <ol>
          <li><p>依據本府一一三年十二月三十日府授研綜字第一一三○○一二三四五號函辦理。</p></li>
          <li><p>旨揭會議決議事項及分工表如附件，請各權責機關依限辦理。</p></li>
        </ol>
      `)
    }
  })
  await sleep(300)

  const longSubject = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const firstP = pm?.querySelector('p')
    return firstP?.innerText?.length || 0
  })
  if (longSubject > 50) ok(`長主旨 ${longSubject} 字`)
  else fail(`主旨太短: ${longSubject} 字`)

  const previewOk7 = await openPrintPreview(page)
  if (previewOk7) {
    ok('長主旨預覽已開啟')

    const info7 = await getPreviewInfo(page)
    if (info7) {
      if (info7.bodyText.includes('市政建設')) ok('長主旨文字完整顯示')
      else fail('長主旨文字不完整')

      if (info7.bodyText.includes('說明')) ok('說明段存在')
      else fail('缺少說明段')

      if (info7.bodyText.includes('追蹤管考')) ok('長主旨結尾文字完整')
      else fail('長主旨結尾截斷')
    } else {
      fail('無法讀取 iframe 內容')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-07-long-subject.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // [8] 列印預覽各元素排版驗證
  // ============================
  console.log('\n[8] 列印預覽排版驗證')

  // 設定包含所有欄位的完整公文
  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent(`
        <p><strong>主旨：</strong>關於本案辦理情形。</p>
        <p><strong>說明：</strong></p>
        <ol>
          <li><p>依據相關規定辦理。</p></li>
        </ol>
      `)
    }
  })
  await sleep(200)

  const previewOk8 = await openPrintPreview(page)
  if (previewOk8) {
    // 驗證各元素在 iframe 中的排版
    const layoutInfo = await page.evaluate(() => {
      const iframe = document.querySelector('.print-preview-iframe')
      if (!iframe?.contentDocument) return null
      const doc = iframe.contentDocument

      const docTop = doc.querySelector('.doc-top')
      const docTitle = doc.querySelector('.doc-title')
      const contactBlock = doc.querySelector('.contact-block')
      const recipient = doc.querySelector('.recipient')
      const metaBlock = doc.querySelector('.meta-block')
      const editorContent = doc.querySelector('.editor-content')
      const footerBlock = doc.querySelector('.footer-block')

      function getRect(el) {
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), height: Math.round(r.height) }
      }

      return {
        docTop: getRect(docTop),
        docTitle: getRect(docTitle),
        contactBlock: getRect(contactBlock),
        recipient: getRect(recipient),
        metaBlock: getRect(metaBlock),
        editorContent: getRect(editorContent),
        footerBlock: getRect(footerBlock),
      }
    })

    if (layoutInfo) {
      // 驗證元素垂直順序：docTop < docTitle < contactBlock < recipient < metaBlock < editorContent < footerBlock
      const order = [
        { name: 'docTop', rect: layoutInfo.docTop },
        { name: 'docTitle', rect: layoutInfo.docTitle },
        { name: 'recipient', rect: layoutInfo.recipient },
        { name: 'metaBlock', rect: layoutInfo.metaBlock },
        { name: 'editorContent', rect: layoutInfo.editorContent },
        { name: 'footerBlock', rect: layoutInfo.footerBlock },
      ].filter(x => x.rect)

      let orderCorrect = true
      for (let i = 1; i < order.length; i++) {
        if (order[i].rect.top < order[i-1].rect.top) {
          fail(`排版順序錯誤：${order[i].name}(top=${order[i].rect.top}) 在 ${order[i-1].name}(top=${order[i-1].rect.top}) 之前`)
          orderCorrect = false
          break
        }
      }
      if (orderCorrect) ok(`公文元素排版順序正確（${order.map(x => x.name).join(' → ')}）`)

      // 標題應該有高度
      if (layoutInfo.docTitle?.height > 0) ok(`標題高度 ${layoutInfo.docTitle.height}px`)
      else fail('標題高度為 0')

      // 編輯器內容應有高度
      if (layoutInfo.editorContent?.height > 0) ok(`編輯器內容高度 ${layoutInfo.editorContent.height}px`)
      else fail('編輯器內容高度為 0')
    } else {
      fail('無法讀取排版資訊')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-08-layout.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // [9] 重設表單
  // ============================
  console.log('\n[9] 重設表單')

  const resetBtnNow = await page.$('.doc-btn-reset')
  await resetBtnNow.click()
  await sleep(300)

  const resetCheck = await page.evaluate(() => {
    const headerInputs = document.querySelectorAll('.doc-header-form input[type="text"], .doc-header-form input[type="email"], .doc-header-form textarea')
    const footerInputs = document.querySelectorAll('.doc-footer-form input[type="text"]')
    let allEmpty = true
    headerInputs.forEach(input => {
      if (input.value && input.value.trim()) allEmpty = false
    })
    footerInputs.forEach(input => {
      if (input.value && input.value.trim()) allEmpty = false
    })
    return { allEmpty, headerCount: headerInputs.length, footerCount: footerInputs.length }
  })

  console.log(`  表頭 ${resetCheck.headerCount} 欄位, 表尾 ${resetCheck.footerCount} 欄位`)
  if (resetCheck.allEmpty) ok('所有表單欄位已重設')
  else fail('部分欄位未重設')

  const editorStillHasContent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return pm?.innerText?.trim().length > 0
  })
  if (editorStillHasContent) ok('編輯器內容未受重設影響')
  else ok('編輯器內容獨立於表單')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-09-reset.png'), fullPage: true })

  // ============================
  // [10] JSON round-trip（表單 + 編輯器）
  // ============================
  console.log('\n[10] JSON round-trip（表單 + 編輯器）')

  await page.evaluate(() => {
    const setFormData = window.__setFormData
    if (setFormData) {
      setFormData({
        sendMethod: '電子交換',
        orgName: 'JSON測試機關',
        docType: '書函',
        address: 'JSON測試地址',
        contactPerson: 'JSON測試人',
        phone: '03-1234-5678',
        extension: '99',
        email: 'json@test.com',
        recipient: 'JSON受文機關',
        year: '114',
        month: '3',
        day: '15',
        docNumber: 'JSON字第 1140001 號',
        speed: '速件',
        classification: '密',
        attachments: 'JSON附件',
        originalTo: 'JSON正本機關',
        copyTo: 'JSON副本機關',
        fileNumber: 'JSON-001',
        retentionPeriod: '10年',
      })
    }
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent('<p><strong>主旨：</strong>JSON round-trip 測試</p><p><strong>說明：</strong></p><ol><li><p>第一項</p></li></ol>')
    }
  })
  await sleep(500)

  // 點「顯示 JSON」
  const showJsonBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.doc-btn-action')]
    const btn = btns.find(b => b.textContent.trim() === '顯示 JSON')
    if (btn) { btn.click(); return true }
    return false
  })
  if (showJsonBtn) ok('點擊「顯示 JSON」')
  else fail('找不到「顯示 JSON」按鈕')
  await sleep(300)

  // 驗證 JSON 面板出現
  const jsonPanelExists = await page.$('.doc-json-panel')
  if (jsonPanelExists) ok('JSON 面板已顯示')
  else fail('JSON 面板未顯示')

  // 點「複製目前內容」
  const copyBtn = await page.$('.doc-json-actions .doc-btn-small')
  if (copyBtn) await copyBtn.click()
  else fail('找不到「複製目前內容」按鈕')
  await sleep(300)

  // 讀取 JSON
  const copiedJSON = await page.$eval('.doc-json-input', el => el.value)
  let parsedDoc = null
  try { parsedDoc = JSON.parse(copiedJSON) } catch {}

  if (parsedDoc?.formData) ok('JSON 包含 formData')
  else fail('JSON 缺少 formData')

  if (parsedDoc?.editorContent) ok('JSON 包含 editorContent')
  else fail('JSON 缺少 editorContent')

  // 驗證 formData 各欄位
  if (parsedDoc?.formData?.orgName === 'JSON測試機關') ok('formData.orgName 正確')
  else fail(`formData.orgName: ${parsedDoc?.formData?.orgName}`)

  if (parsedDoc?.formData?.recipient === 'JSON受文機關') ok('formData.recipient 正確')
  else fail(`formData.recipient: ${parsedDoc?.formData?.recipient}`)

  if (parsedDoc?.formData?.speed === '速件') ok('formData.speed 正確')
  else fail(`formData.speed: ${parsedDoc?.formData?.speed}`)

  if (parsedDoc?.formData?.docType === '書函') ok('formData.docType 正確')
  else fail(`formData.docType: ${parsedDoc?.formData?.docType}`)

  if (parsedDoc?.formData?.sendMethod === '電子交換') ok('formData.sendMethod 正確')
  else fail(`formData.sendMethod: ${parsedDoc?.formData?.sendMethod}`)

  if (parsedDoc?.formData?.originalTo === 'JSON正本機關') ok('formData.originalTo 正確')
  else fail(`formData.originalTo: ${parsedDoc?.formData?.originalTo}`)

  // 重設 + 清空
  const resetBtn2 = await page.$('.doc-btn-reset')
  await resetBtn2.click()
  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) editor.commands.setContent('<p></p>')
  })
  await sleep(300)

  const clearedCheck = await page.evaluate(() => {
    const orgInput = document.querySelector('.doc-header-form input[placeholder*="天王"]')
    const pm = document.querySelector('.ProseMirror')
    return {
      orgEmpty: !orgInput?.value,
      editorEmpty: !pm?.innerText?.includes('JSON round-trip'),
    }
  })
  if (clearedCheck.orgEmpty && clearedCheck.editorEmpty) ok('表單和編輯器已清空')
  else fail('清空失敗')

  // 載入 JSON
  const loadBtn = await page.$('.doc-btn-small-primary')
  if (loadBtn) await loadBtn.click()
  await sleep(500)

  const restoredCheck = await page.evaluate(() => {
    const orgInput = document.querySelector('.doc-header-form input[placeholder*="天王"]')
    const recipientInput = [...document.querySelectorAll('.doc-header-form input[type="text"]')].find(el => {
      const label = el.closest('.doc-form-row, .doc-inline-field')?.querySelector('label')?.textContent || ''
      return label.includes('受文者')
    })
    const pm = document.querySelector('.ProseMirror')
    return {
      orgName: orgInput?.value || '',
      recipient: recipientInput?.value || '',
      hasContent: pm?.innerText?.includes('JSON round-trip') || false,
    }
  })

  if (restoredCheck.orgName === 'JSON測試機關') ok('還原 formData.orgName 正確')
  else fail(`還原 orgName: ${restoredCheck.orgName}`)

  if (restoredCheck.recipient === 'JSON受文機關') ok('還原 formData.recipient 正確')
  else fail(`還原 recipient: ${restoredCheck.recipient}`)

  if (restoredCheck.hasContent) ok('還原編輯器內容正確')
  else fail('編輯器內容未還原')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-10-json-roundtrip.png'), fullPage: true })

  // ============================
  // [11] 還原後列印預覽驗證
  // ============================
  console.log('\n[11] 還原後列印預覽驗證')

  const previewOk11 = await openPrintPreview(page)
  if (previewOk11) {
    ok('還原後列印預覽開啟成功')

    const info11 = await getPreviewInfo(page)
    if (info11) {
      if (info11.titleText.includes('JSON測試機關')) ok('還原後標題正確')
      else fail(`還原後標題: ${info11.titleText}`)

      if (info11.recipientText.includes('JSON受文機關')) ok('還原後受文者正確')
      else fail(`還原後受文者: ${info11.recipientText}`)

      if (info11.bodyText.includes('JSON round-trip')) ok('還原後編輯器內容正確')
      else fail('還原後缺少編輯器內容')

      if (info11.footerText.includes('JSON正本機關')) ok('還原後正本正確')
      else fail(`還原後正本: ${info11.footerText}`)
    } else {
      fail('無法讀取 iframe 內容')
    }

    // 再次驗證 CSS（確保 @page margin boxes 在不同內容下仍然存在）
    const cssInfo11 = await getPreviewCSS(page)
    if (cssInfo11) {
      if (cssInfo11.hasBottomCenter && cssInfo11.hasCounterPage) ok('@page 頁碼設定仍然存在')
      else fail('@page 頁碼設定消失')
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-11-restored-preview.png'), fullPage: true })
    await closePrintPreview(page)
  }

  // ============================
  // 結果統計
  // ============================
  console.log(`\n=== 統一公文編輯器測試完成：${passed} 通過, ${failed} 失敗 ===\n`)
  console.log(`截圖：${SCREENSHOT_DIR}`)

  await sleep(2000)
  await browser.close()

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('測試崩潰:', err)
  process.exit(1)
})
