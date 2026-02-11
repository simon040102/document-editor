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
  // [1] 頁面載入 & Tab 存在
  // ============================
  console.log('\n[1] 頁面載入 & Tab 驗證')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })
  await sleep(1000)

  const tabs = await page.$$('.tab-btn')
  if (tabs.length === 2) ok('找到 2 個 Tab')
  else fail(`Tab 數量: ${tabs.length}，期望 2`)

  // 驗證 tab 文字
  const tabTexts = await page.$$eval('.tab-btn', els => els.map(el => el.textContent.trim()))
  if (tabTexts[0] === '一般編輯') ok('Tab 1: 一般編輯')
  else fail(`Tab 1: ${tabTexts[0]}`)

  if (tabTexts[1] === '公文製作') ok('Tab 2: 公文製作')
  else fail(`Tab 2: ${tabTexts[1]}`)

  // 預設應在一般編輯 tab
  const editorVisible = await page.$('.ProseMirror')
  if (editorVisible) ok('預設顯示一般編輯器')
  else fail('未找到 ProseMirror 編輯器')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-01-tabs.png'), fullPage: true })

  // ============================
  // [2] 切換到公文製作 Tab
  // ============================
  console.log('\n[2] 切換到公文製作 Tab')
  await tabs[1].click()
  await sleep(500)

  const formVisible = await page.$('.official-doc-form')
  if (formVisible) ok('公文製作表單顯示')
  else fail('未找到公文製作表單')

  // 編輯器保持 mounted 但 display:none
  const editorSectionHidden = await page.$eval('.editor-section', el => el.style.display)
  if (editorSectionHidden === 'none') ok('編輯器區段已隱藏 (display:none)')
  else fail(`編輯器區段 display: ${editorSectionHidden}`)

  // 驗證 tab active 狀態
  const activeTab = await page.$('.tab-btn.tab-active')
  const activeText = await activeTab?.evaluate(el => el.textContent.trim())
  if (activeText === '公文製作') ok('公文製作 Tab 為 active')
  else fail(`Active tab: ${activeText}`)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-02-form.png'), fullPage: true })

  // ============================
  // [3] 表單結構驗證
  // ============================
  console.log('\n[3] 表單結構驗證')

  const fieldsets = await page.$$('.form-section')
  if (fieldsets.length === 5) ok('找到 5 個表單區段')
  else fail(`區段數量: ${fieldsets.length}，期望 5`)

  // 驗證 legend 文字
  const legends = await page.$$eval('.form-section legend', els => els.map(el => el.textContent.trim()))
  console.log('  區段:', JSON.stringify(legends))

  const expectedLegends = ['發文單位資訊', '聯絡資訊', '公文主要資訊', '公文內容', '正本與副本']
  let legendsMatch = true
  for (let i = 0; i < expectedLegends.length; i++) {
    if (legends[i] !== expectedLegends[i]) {
      fail(`區段 ${i}: ${legends[i]}，期望 ${expectedLegends[i]}`)
      legendsMatch = false
    }
  }
  if (legendsMatch) ok('所有區段標題正確')

  // 驗證動作按鈕
  const generateBtn = await page.$('.btn-generate')
  const loadEditorBtn = await page.$('.btn-load-editor')
  const resetBtn = await page.$('.btn-reset')

  if (generateBtn) ok('「產生公文」按鈕存在')
  else fail('缺少「產生公文」按鈕')

  if (loadEditorBtn) ok('「載入至編輯器」按鈕存在')
  else fail('缺少「載入至編輯器」按鈕')

  if (resetBtn) ok('「重設」按鈕存在')
  else fail('缺少「重設」按鈕')

  // ============================
  // [4] 填寫表單
  // ============================
  console.log('\n[4] 填寫表單')

  // 填寫發文單位資訊
  const inputs = await page.$$('.form-section input[type="text"], .form-section input[type="email"], .form-section textarea')
  console.log(`  找到 ${inputs.length} 個輸入欄位`)

  // 用 evaluate 填寫所有欄位
  await page.evaluate(() => {
    const form = document.querySelector('.official-doc-form')
    const allInputs = form.querySelectorAll('input[type="text"], input[type="email"], textarea')
    // 按 placeholder 或 label 找到欄位並觸發 React onChange
    function setReactValue(el, value) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      ).set
      nativeInputValueSetter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    allInputs.forEach(input => {
      const placeholder = input.placeholder || ''
      const label = input.closest('.form-row, .inline-field')?.querySelector('label')?.textContent || ''
      if (placeholder.includes('天王') || label.includes('發文單位')) setReactValue(input, '測試機關')
      else if (placeholder.includes('台北') || label.includes('地址')) setReactValue(input, '台北市中正區重慶南路一段 1 號')
      else if (label.includes('聯絡人')) setReactValue(input, '張三')
      else if (placeholder.includes('02-') || label.includes('電話')) setReactValue(input, '02-1234-5678')
      else if (placeholder === '33' || label.includes('分機')) setReactValue(input, '100')
      else if (placeholder.includes('user@') || label.includes('信箱')) setReactValue(input, 'test@example.com')
      else if (placeholder.includes('米花') || label.includes('受文者')) setReactValue(input, '測試受文機關')
      else if (input.classList.contains('date-input') && !input.classList.contains('date-input-short')) {
        if (!input.value) setReactValue(input, '113')
      }
      else if (input.classList.contains('date-input-short')) {
        if (!input.value) setReactValue(input, '6')
      }
      else if (placeholder.includes('天字') || label.includes('發文字號')) setReactValue(input, '測字第 1130001 號')
      else if (label.includes('附件')) setReactValue(input, '測試附件文件')
      else if (label.includes('正本')) setReactValue(input, '測試受文機關')
    })
  })

  // 填寫主旨 textarea
  await page.evaluate(() => {
    const textareas = document.querySelectorAll('.form-section textarea')
    function setReactValue(el, value) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      setter.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    // 第一個 textarea 是主旨
    if (textareas[0]) setReactValue(textareas[0], '關於本案辦理情形，請查照。')
    // 第二個 textarea 是第一個說明項目
    if (textareas[1]) setReactValue(textareas[1], '依據相關規定辦理。')
  })

  await sleep(300)

  // 新增第二個說明項目
  const addBtn = await page.$('.btn-add')
  if (addBtn) {
    await addBtn.click()
    await sleep(300)
    // 填寫第二個說明
    await page.evaluate(() => {
      const listTextareas = document.querySelectorAll('.list-item-row textarea')
      if (listTextareas[1]) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        setter.call(listTextareas[1], '請於期限內回覆。')
        listTextareas[1].dispatchEvent(new Event('input', { bubbles: true }))
        listTextareas[1].dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
    ok('新增第二個說明項目')
  } else {
    fail('找不到新增說明按鈕')
  }

  await sleep(300)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-03-filled.png'), fullPage: true })
  ok('表單填寫完成')

  // ============================
  // [5] 產生公文（列印預覽）
  // ============================
  console.log('\n[5] 產生公文（列印預覽）')

  // 攔截 window.open，使新視窗的 print() 被 override 為 noop
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

  await generateBtn.click()

  const printPage = await printPagePromise
  if (printPage) {
    ok('產生公文開啟新視窗')

    // 等待頁面內容載入
    await sleep(2000)

    // 驗證公文內容
    const printContent = await printPage.evaluate(() => {
      const body = document.body
      return {
        hasBindingLine: !!document.querySelector('.binding-line'),
        hasTitle: !!document.querySelector('.doc-title'),
        titleText: document.querySelector('.doc-title')?.textContent || '',
        hasRecipient: !!document.querySelector('.recipient'),
        recipientText: document.querySelector('.recipient')?.textContent || '',
        hasSubject: !!document.querySelector('.subject-text'),
        subjectText: document.querySelector('.subject-text')?.textContent || '',
        hasDocList: !!document.querySelector('.doc-list'),
        listItems: document.querySelectorAll('.doc-list > li').length,
        hasFooter: !!document.querySelector('.footer-block'),
        bodyText: body.innerText.substring(0, 200),
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

    if (printContent.hasSubject) ok('主旨區段存在')
    else fail('缺少主旨區段')

    if (printContent.hasDocList && printContent.listItems === 2) ok(`說明列表 ${printContent.listItems} 項`)
    else fail(`說明列表: ${printContent.listItems} 項`)

    if (printContent.hasFooter) ok('正本副本區段存在')
    else fail('缺少正本副本區段')

    if (printContent.printCalled) ok('window.print() 已被呼叫（已攔截）')
    else ok('列印視窗內容已載入')

    await printPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-04-print-preview.png'), fullPage: true })

    // 關閉列印視窗
    await printPage.close()
  } else {
    fail('未能開啟列印視窗')
  }

  // 恢復原始 window.open
  await page.evaluate(() => { delete window.__origOpen })

  // ============================
  // [6] 載入至編輯器
  // ============================
  console.log('\n[6] 載入至編輯器')

  // 確保在公文製作 Tab（重新取得元素避免 detached frame）
  await page.waitForSelector('.tab-btn')
  const allTabs = await page.$$('.tab-btn')
  await allTabs[1].click()
  await sleep(500)

  // 重新取得載入按鈕
  const loadEditorBtnRefresh = await page.$('.btn-load-editor')
  await loadEditorBtnRefresh.click()
  await sleep(500)

  // 應該自動切回一般編輯 Tab
  const currentActiveTab = await page.$eval('.tab-btn.tab-active', el => el.textContent.trim())
  if (currentActiveTab === '一般編輯') ok('自動切回一般編輯 Tab')
  else fail(`當前 Tab: ${currentActiveTab}`)

  // 驗證編輯器內容
  const editorContent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return { found: false }
    const text = pm.innerText
    const hasOrgName = text.includes('測試機關')
    const hasRecipient = text.includes('測試受文機關')
    const hasSubject = text.includes('關於本案辦理情形')
    const hasOl = !!pm.querySelector('ol')
    const liCount = pm.querySelectorAll('ol > li').length
    return { found: true, hasOrgName, hasRecipient, hasSubject, hasOl, liCount, textPreview: text.substring(0, 100) }
  })

  console.log('  編輯器內容:', JSON.stringify(editorContent))

  if (editorContent.found) ok('編輯器內容存在')
  else fail('編輯器無內容')

  if (editorContent.hasOrgName) ok('編輯器包含機關名稱')
  else fail('編輯器缺少機關名稱')

  if (editorContent.hasRecipient) ok('編輯器包含受文者')
  else fail('編輯器缺少受文者')

  if (editorContent.hasSubject) ok('編輯器包含主旨')
  else fail('編輯器缺少主旨')

  if (editorContent.hasOl && editorContent.liCount >= 2) ok(`編輯器有序列表 (${editorContent.liCount} 項)`)
  else fail(`編輯器列表: ol=${editorContent.hasOl}, li=${editorContent.liCount}`)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-05-loaded-editor.png'), fullPage: true })

  // ============================
  // [7] 重設表單
  // ============================
  console.log('\n[7] 重設表單')

  // 切回公文製作（重新取得元素）
  const tabs7 = await page.$$('.tab-btn')
  await tabs7[1].click()
  await sleep(300)

  // 點重設
  const resetBtnNow = await page.$('.btn-reset')
  await resetBtnNow.click()
  await sleep(300)

  // 驗證欄位已清空
  const resetCheck = await page.evaluate(() => {
    const form = document.querySelector('.official-doc-form')
    const textInputs = form.querySelectorAll('input[type="text"], input[type="email"]')
    const textareas = form.querySelectorAll('textarea')
    let allEmpty = true
    textInputs.forEach(input => {
      if (input.value && input.value.trim()) allEmpty = false
    })
    textareas.forEach(ta => {
      if (ta.value && ta.value.trim()) allEmpty = false
    })
    return { allEmpty, inputCount: textInputs.length, textareaCount: textareas.length }
  })

  if (resetCheck.allEmpty) ok('所有欄位已重設')
  else fail('部分欄位未重設')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-06-reset.png'), fullPage: true })

  // ============================
  // [8] 切回一般編輯驗證
  // ============================
  console.log('\n[8] 切回一般編輯')

  const tabs8 = await page.$$('.tab-btn')
  await tabs8[0].click()
  await sleep(300)

  const editorBackVisible = await page.$('.ProseMirror')
  if (editorBackVisible) ok('切回一般編輯器成功')
  else fail('切回後未找到編輯器')

  const formGone = await page.$('.official-doc-form')
  if (!formGone) ok('公文製作表單已隱藏')
  else fail('公文製作表單仍顯示')

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'od-07-back-editor.png'), fullPage: true })

  // ============================
  // 結果統計
  // ============================
  console.log(`\n=== 公文製作測試完成：${passed} 通過, ${failed} 失敗 ===\n`)
  console.log(`截圖：${SCREENSHOT_DIR}`)

  await sleep(2000)
  await browser.close()

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('測試崩潰:', err)
  process.exit(1)
})
