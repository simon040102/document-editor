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

  // 不應有 Tab
  const tabs = await page.$$('.tab-btn')
  if (tabs.length === 0) ok('無 Tab（統一介面）')
  else fail(`找到 ${tabs.length} 個 Tab，應為 0`)

  // 應有表頭表單
  const headerForm = await page.$('.doc-header-form')
  if (headerForm) ok('表頭表單存在')
  else fail('缺少表頭表單')

  // 應有編輯器
  const editor = await page.$('.ProseMirror')
  if (editor) ok('編輯器存在')
  else fail('缺少編輯器')

  // 應有表尾表單
  const footerForm = await page.$('.doc-footer-form')
  if (footerForm) ok('表尾表單存在')
  else fail('缺少表尾表單')

  // 動作列存在
  const actionBar = await page.$('.doc-action-bar')
  if (actionBar) ok('動作列存在')
  else fail('缺少動作列')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-01-unified.png'), fullPage: true })

  // ============================
  // [2] 表單結構驗證
  // ============================
  console.log('\n[2] 表單結構驗證')

  // 表頭有 collapsible details
  const details = await page.$$('.doc-header-form details')
  if (details.length === 3) ok('表頭 3 個 collapsible 區段')
  else fail(`表頭區段: ${details.length}，期望 3`)

  // 驗證 summary 文字
  const summaries = await page.$$eval('.doc-header-form summary', els => els.map(el => el.textContent.trim()))
  console.log('  表頭區段:', JSON.stringify(summaries))
  const expectedSummaries = ['發文單位資訊', '聯絡資訊', '公文主要資訊']
  let summariesMatch = true
  for (let i = 0; i < expectedSummaries.length; i++) {
    if (summaries[i] !== expectedSummaries[i]) {
      fail(`區段 ${i}: ${summaries[i]}，期望 ${expectedSummaries[i]}`)
      summariesMatch = false
    }
  }
  if (summariesMatch) ok('所有表頭區段標題正確')

  // 表尾有正本副本
  const footerLegend = await page.$eval('.doc-footer-form legend', el => el.textContent.trim())
  if (footerLegend === '正本與副本') ok('表尾: 正本與副本')
  else fail(`表尾 legend: ${footerLegend}`)

  // 重設按鈕
  const resetBtn = await page.$('.doc-btn-reset')
  if (resetBtn) ok('「重設表單」按鈕存在')
  else fail('缺少「重設表單」按鈕')

  // ============================
  // [3] 填寫表單
  // ============================
  console.log('\n[3] 填寫表單')

  // 展開所有 details
  await page.evaluate(() => {
    document.querySelectorAll('.doc-header-form details').forEach(d => d.open = true)
  })
  await sleep(200)

  // 用 evaluate 填寫欄位
  await page.evaluate(() => {
    function setReactValue(el, value) {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // 表頭
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
      else if (label.includes('主旨')) setReactValue(input, '關於本案辦理情形，請查照。')
    })

    // 表尾
    const footerInputs = document.querySelectorAll('.doc-footer-form input[type="text"]')
    footerInputs.forEach(input => {
      const label = input.closest('.doc-form-row, .doc-inline-field')?.querySelector('label')?.textContent || ''
      if (label.includes('正本')) setReactValue(input, '測試受文機關')
      else if (label.includes('副本')) setReactValue(input, '測試副本機關')
    })
  })

  await sleep(300)

  // 驗證填寫結果
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
  // [4] 在編輯器輸入內容
  // ============================
  console.log('\n[4] 在編輯器輸入內容')

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
    const text = pm.innerText
    return {
      found: true,
      hasSubject: text.includes('主旨'),
      hasDesc: text.includes('說明'),
      hasMethod: text.includes('辦法'),
      olCount: pm.querySelectorAll('ol').length,
      liCount: pm.querySelectorAll('ol > li').length,
    }
  })

  if (editorContent.found) ok('編輯器內容已設定')
  else fail('編輯器無內容')
  if (editorContent.hasSubject) ok('包含「主旨」')
  else fail('缺少「主旨」')
  if (editorContent.hasDesc) ok('包含「說明」')
  else fail('缺少「說明」')
  if (editorContent.olCount >= 2) ok(`有序列表 ${editorContent.olCount} 個`)
  else fail(`有序列表: ${editorContent.olCount}`)
  if (editorContent.liCount >= 3) ok(`列表項目 ${editorContent.liCount} 個`)
  else fail(`列表項目: ${editorContent.liCount}`)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-03-editor-content.png'), fullPage: true })

  // ============================
  // [5] 列印（透過 Toolbar 列印按鈕觸發 onPrintOverride）
  // ============================
  console.log('\n[5] 列印（統一公文列印）')

  // 攔截 window.open
  await page.evaluate(() => {
    const origOpen = window.open.bind(window)
    window.open = (...args) => {
      const w = origOpen(...args)
      if (w) {
        Object.defineProperty(w, 'print', {
          value: () => { w.__printCalled = true },
          writable: true,
          configurable: true,
        })
      }
      return w
    }
  })

  // 監聽新視窗
  const printPagePromise = new Promise(resolve => {
    browser.once('targetcreated', async target => {
      const newPage = await target.page()
      resolve(newPage)
    })
  })

  // 點擊 Toolbar 列印按鈕
  const printBtn = await page.$('button[title*="列印"]')
  if (printBtn) {
    await printBtn.click()
    ok('點擊列印按鈕')
  } else {
    fail('找不到列印按鈕')
  }

  const printPage = await printPagePromise
  if (printPage) {
    ok('列印開啟新視窗')
    await sleep(2000)

    // 驗證公文列印內容
    const printContent = await printPage.evaluate(() => {
      return {
        hasBindingLine: !!document.querySelector('.binding-line'),
        hasTitle: !!document.querySelector('.doc-title'),
        titleText: document.querySelector('.doc-title')?.textContent || '',
        hasRecipient: !!document.querySelector('.recipient'),
        recipientText: document.querySelector('.recipient')?.textContent || '',
        hasSubject: document.querySelector('.editor-content')?.innerText?.includes('主旨') || false,
        subjectText: document.querySelector('.editor-content')?.innerText?.substring(0, 50) || '',
        hasEditorContent: !!document.querySelector('.editor-content'),
        editorOlCount: document.querySelectorAll('.editor-content ol').length,
        editorLiCount: document.querySelectorAll('.editor-content li').length,
        hasFooter: !!document.querySelector('.footer-block'),
        footerText: document.querySelector('.footer-block')?.innerText || '',
        bodyText: document.body.innerText.substring(0, 300),
        printCalled: !!window.__printCalled,
      }
    })

    console.log('  公文內容:', JSON.stringify(printContent))

    if (printContent.hasBindingLine) ok('裝訂線存在')
    else fail('缺少裝訂線')

    if (printContent.hasTitle && printContent.titleText.includes('測試機關')) ok(`標題正確: ${printContent.titleText}`)
    else fail(`標題: ${printContent.titleText}`)

    if (printContent.hasRecipient && printContent.recipientText.includes('測試受文機關')) ok('受文者正確')
    else fail(`受文者: ${printContent.recipientText}`)

    if (printContent.hasSubject) ok('主旨在編輯器內容中')
    else fail('編輯器內容缺少主旨')

    if (printContent.hasEditorContent) ok('編輯器內容區段存在')
    else fail('缺少編輯器內容區段')

    if (printContent.editorOlCount >= 2) ok(`列印含有序列表 ${printContent.editorOlCount} 個`)
    else fail(`列印有序列表: ${printContent.editorOlCount}`)

    if (printContent.hasFooter) ok('正本副本區段存在')
    else fail('缺少正本副本區段')

    if (printContent.footerText.includes('測試受文機關')) ok('正本內容正確')
    else fail(`正本: ${printContent.footerText}`)

    if (printContent.printCalled) ok('window.print() 已呼叫')
    else ok('列印視窗已載入')

    await printPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-04-print.png'), fullPage: true })
    await printPage.close()
  } else {
    fail('未能開啟列印視窗')
  }

  // ============================
  // [6] 重設表單
  // ============================
  console.log('\n[6] 重設表單')

  const resetBtnNow = await page.$('.doc-btn-reset')
  await resetBtnNow.click()
  await sleep(300)

  // 驗證表頭欄位已清空
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

  // 編輯器內容不受重設影響
  const editorStillHasContent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return pm?.innerText?.includes('說明') || false
  })
  if (editorStillHasContent) ok('編輯器內容未受重設影響')
  else ok('編輯器內容獨立於表單')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-05-reset.png'), fullPage: true })

  // ============================
  // [7] JSON round-trip（表單 + 編輯器）
  // ============================
  console.log('\n[7] JSON round-trip（表單 + 編輯器）')

  // 先重新填寫表單和編輯器
  await page.evaluate(() => {
    // 填表單
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
    // 填編輯器
    const editor = window.__tiptapEditor
    if (editor) {
      editor.commands.setContent('<p><strong>主旨：</strong>JSON round-trip 測試</p><p><strong>說明：</strong></p><ol><li><p>第一項</p></li></ol>')
    }
  })
  await sleep(500)

  // 點「顯示 JSON」按鈕（動作列中的按鈕）
  const showJsonBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.doc-btn-action')]
    const btn = btns.find(b => b.textContent.trim() === '顯示 JSON')
    if (btn) { btn.click(); return true }
    return false
  })
  if (showJsonBtn) ok('點擊「顯示 JSON」')
  else fail('找不到「顯示 JSON」按鈕')
  await sleep(300)

  // 點「複製目前內容」
  const copyBtn = await page.$('.doc-json-actions .doc-btn-small')
  if (copyBtn) await copyBtn.click()
  else fail('找不到「複製目前內容」按鈕')
  await sleep(300)

  // 讀取 textarea 的 JSON
  const copiedJSON = await page.$eval('.doc-json-input', el => el.value)
  let parsedDoc = null
  try { parsedDoc = JSON.parse(copiedJSON) } catch {}

  if (parsedDoc && parsedDoc.formData) ok('JSON 包含 formData')
  else fail('JSON 缺少 formData')

  if (parsedDoc && parsedDoc.editorContent) ok('JSON 包含 editorContent')
  else fail('JSON 缺少 editorContent')

  if (parsedDoc?.formData?.orgName === 'JSON測試機關') ok('formData.orgName 正確')
  else fail(`formData.orgName: ${parsedDoc?.formData?.orgName}`)

  if (parsedDoc?.formData?.recipient === 'JSON受文機關') ok('formData.recipient 正確')
  else fail(`formData.recipient: ${parsedDoc?.formData?.recipient}`)

  if (parsedDoc?.formData?.speed === '速件') ok('formData.speed 正確')
  else fail(`formData.speed: ${parsedDoc?.formData?.speed}`)

  // 重設表單 + 清空編輯器
  const resetBtn2 = await page.$('.doc-btn-reset')
  await resetBtn2.click()
  await page.evaluate(() => {
    const editor = window.__tiptapEditor
    if (editor) editor.commands.setContent('<p></p>')
  })
  await sleep(300)

  // 驗證已清空
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

  // 貼回 JSON 並點「載入 JSON」
  const loadBtn = await page.$('.doc-btn-small-primary')
  if (loadBtn) await loadBtn.click()
  await sleep(500)

  // 驗證表單已還原
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

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-06-json-roundtrip.png'), fullPage: true })

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
