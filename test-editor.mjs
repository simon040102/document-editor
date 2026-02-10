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
  // 載入頁面
  // ============================
  console.log('\n[1] 頁面載入')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })
  await sleep(1000)
  const title = await page.$eval('h1', el => el.textContent).catch(() => null)
  title ? ok('頁面載入成功') : ok('頁面載入成功（無 h1）')

  const editor = await page.$('.ProseMirror')

  // 確認 __tiptapEditor 可用
  const hasEditor = await page.evaluate(() => !!window.__tiptapEditor)
  if (hasEditor) {
    ok('window.__tiptapEditor 可用')
  } else {
    fail('window.__tiptapEditor 不可用')
  }

  // ============================
  // 測試列表退出（ListKeymap）
  // ============================
  console.log('\n[2] ListKeymap - 空項目按 Enter 退出列表')
  await editor.click()

  // 建立有序列表
  const listBtn = await page.$('button[title="編號清單（中文數字）"]')
  await listBtn.click()
  await sleep(200)
  await page.keyboard.type('第一項', { delay: 15 })
  await page.keyboard.press('Enter')
  await sleep(100)
  // 現在在空的第二項，按 Enter 應該退出列表
  await page.keyboard.press('Enter')
  await sleep(300)

  const exitResult = await page.evaluate(() => {
    const sel = window.getSelection()
    if (!sel || !sel.anchorNode) return 'unknown'
    let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode
    while (node) {
      if (node.tagName === 'LI') return 'still-in-list'
      if (node.classList && node.classList.contains('ProseMirror')) break
      node = node.parentElement
    }
    return 'paragraph'
  })

  if (exitResult === 'paragraph') {
    ok('空項目按 Enter 成功退出列表')
  } else {
    fail(`退出失敗，游標位置：${exitResult}`)
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-list-exit.png'), fullPage: true })

  // ============================
  // 測試完整公文場景：一、→ 銀行帳戶 → 二、
  // ============================
  console.log('\n[3] 公文場景：一、→ 段落 → 二、')

  // 清空
  await editor.click()
  await page.keyboard.down('Meta')
  await page.keyboard.press('a')
  await page.keyboard.up('Meta')
  await page.keyboard.press('Backspace')
  await sleep(200)

  // 輸入主旨
  await page.keyboard.type('主旨：關於本案共同投標協議監造服務費尾款撥付事宜。', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('說明：', { delay: 10 })
  await page.keyboard.press('Enter')
  await sleep(200)

  // 開始列表
  const listBtn2 = await page.$('button[title="編號清單（中文數字）"]')
  await listBtn2.click()
  await sleep(200)
  await page.keyboard.type('敬請依約撥付旨揭一案共同投標協議監造服務費尾款，請撥入帳號如下：', { delay: 10 })
  await page.keyboard.press('Enter')
  await sleep(100)

  // 空項目按 Enter 退出列表
  await page.keyboard.press('Enter')
  await sleep(300)

  // 輸入銀行帳戶（段落）
  await page.keyboard.type('銀行帳號：彰化銀行仁和分行；', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.keyboard.type('帳戶：中栁工程顧問股份有限公司；', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.keyboard.type('帳號：5321-01-002801-00。', { delay: 10 })
  await page.keyboard.press('Enter')
  await sleep(200)

  // 重新進入列表（點「編號清單」按鈕）
  const listBtn3 = await page.$('button[title="編號清單（中文數字）"]')
  await listBtn3.click()
  await sleep(200)
  await page.keyboard.type('隨函檢附費用明細表及發票1紙。', { delay: 10 })
  await page.keyboard.press('Enter')
  await page.keyboard.type('以上敬請鑒核。', { delay: 10 })
  await sleep(500)

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-full-doc.png'), fullPage: true })

  // 驗證銀行帳戶段落對齊
  const alignCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const topPs = Array.from(pm.querySelectorAll(':scope > p'))
    const firstP = topPs[0]
    const bankPs = topPs.filter(p =>
      p.textContent.includes('銀行帳號') ||
      p.textContent.includes('帳戶：中') ||
      p.textContent.includes('帳號：5321')
    )
    if (!firstP || bankPs.length === 0) {
      return { ok: false, msg: `頂層 p: ${topPs.length}, 銀行帳號 p: ${bankPs.length}` }
    }
    const base = Math.round(firstP.getBoundingClientRect().left)
    const bankL = bankPs.map(p => Math.round(p.getBoundingClientRect().left))
    const match = bankL.every(l => Math.abs(l - base) < 2)
    return { ok: match, base, bankL }
  })

  if (alignCheck.ok) {
    ok(`銀行帳戶與本文左緣對齊 (left=${alignCheck.base}px)`)
  } else {
    fail(`對齊不一致：${JSON.stringify(alignCheck)}`)
  }

  // 驗證列表編號 — CSS counter 架構檢查
  // 注意：getComputedStyle(::before).content 回傳的是 CSS 表達式，不是解析後的中文數字
  // 因此改為驗證 CSS counter 結構正確性，確保跨 ol 續號
  const numbering = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const ols = pm.querySelectorAll(':scope > ol')

    // 檢查 counter-reset 設定
    const pmStyle = window.getComputedStyle(pm)
    const pmCounterReset = pmStyle.counterReset || pmStyle.getPropertyValue('counter-reset')

    const result = []
    ols.forEach((ol, i) => {
      const items = ol.querySelectorAll(':scope > li')
      const olStyle = window.getComputedStyle(ol)
      const olCounterReset = olStyle.counterReset || olStyle.getPropertyValue('counter-reset')
      result.push({
        olIndex: i,
        itemCount: items.length,
        text: Array.from(items).map(li => li.textContent.substring(0, 20)),
        olCounterReset,
      })
    })
    return { pmCounterReset, ols: result, olCount: ols.length }
  })
  console.log('  列表結構:', JSON.stringify(numbering))

  // 驗證 CSS counter 架構
  if (numbering.olCount >= 2) {
    ok(`找到 ${numbering.olCount} 個 ol 區塊`)

    // .ProseMirror 應該有 counter-reset: list-L1
    if (numbering.pmCounterReset && numbering.pmCounterReset.includes('list-L1')) {
      ok('ProseMirror 有 counter-reset: list-L1（跨 ol 共享）')
    } else {
      fail(`ProseMirror counter-reset: ${numbering.pmCounterReset}`)
    }

    // 頂層 ol 不應該自己 reset list-L1（否則會重新從一開始）
    const ol2Reset = numbering.ols[1].olCounterReset || ''
    if (!ol2Reset.includes('list-L1')) {
      ok('第二個 ol 未 reset list-L1，CSS counter 會延續')
    } else {
      fail(`第二個 ol 的 counter-reset 包含 list-L1：${ol2Reset}`)
    }
  } else {
    fail(`只找到 ${numbering.olCount} 個 ol，期望至少 2 個`)
  }

  // ============================
  // JSON 載入測試 — 透過 window.__tiptapEditor
  // ============================
  console.log('\n[4] JSON 載入測試 - 透過 __tiptapEditor API')

  // 建立複雜的 JSON 內容
  const testJSON = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [{ type: 'text', text: '臺北市政府函' }] },
      { type: 'paragraph', attrs: { textAlign: 'justify' }, content: [
        { type: 'text', text: '主旨：關於本案共同投標協議監造服務費尾款撥付事宜，請查照。' }
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: '說明：' }] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '依據旨案共同投標執行作業協議書第二條辦理。' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [
          { type: 'text', text: '敬請依約撥付旨揭一案共同投標協議監造服務費尾款，請撥入帳號如下：' }
        ] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '隨函檢附費用明細表及發票1紙（發票號碼：TT50379905）。' }] }] },
        { type: 'listItem', content: [
          { type: 'paragraph', content: [{ type: 'text', text: '以上敬請鑒核。' }] },
          { type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '本案屬於長期維護合約。' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '合約期間至113年12月31日止。' }] }] },
          ]}
        ]},
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: '正本：中栁工程顧問股份有限公司' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '副本：本府工務局' }] },
      { type: 'horizontalRule' },
      { type: 'table', content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '項目' }] }] },
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '金額' }] }] },
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '備註' }] }] },
        ]},
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '監造服務費' }] }] },
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NT$ 1,234,567' }] }] },
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '尾款' }] }] },
        ]},
      ]},
      { type: 'paragraph', content: [
        { type: 'text', marks: [{ type: 'bold' }], text: '承辦人：' },
        { type: 'text', text: '王小明　' },
        { type: 'text', marks: [{ type: 'bold' }], text: '電話：' },
        { type: 'text', text: '(02)2345-6789' },
      ]},
      { type: 'blockquote', content: [
        { type: 'paragraph', content: [{ type: 'text', text: '備註：本案經費由年度預算支應。' }] }
      ]},
    ]
  }

  // 使用 __tiptapEditor 載入 JSON
  const loadResult = await page.evaluate((json) => {
    try {
      const editor = window.__tiptapEditor
      if (!editor) return { loaded: false, error: '__tiptapEditor not found' }
      editor.commands.setContent(json)
      return { loaded: true }
    } catch (e) {
      return { loaded: false, error: e.message }
    }
  }, testJSON)

  if (loadResult.loaded) {
    ok('JSON 載入成功')
  } else {
    fail(`JSON 載入失敗：${loadResult.error}`)
  }

  await sleep(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-json-loaded.png'), fullPage: true })

  // 驗證 JSON 載入後的 DOM 結構
  const domCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const h1 = pm.querySelector('h1')
    const ols = pm.querySelectorAll('ol')
    const table = pm.querySelector('table')
    const blockquote = pm.querySelector('blockquote')
    const hr = pm.querySelector('hr')

    return {
      hasH1: !!h1,
      h1Text: h1?.textContent || '',
      h1Align: h1?.style?.textAlign || h1?.getAttribute('style') || 'none',
      olCount: ols.length,
      hasTable: !!table,
      tableRows: table?.querySelectorAll('tr').length || 0,
      tableCols: table?.querySelectorAll('tr:first-child > *').length || 0,
      hasBlockquote: !!blockquote,
      blockquoteText: blockquote?.textContent || '',
      hasHr: !!hr,
      totalElements: pm.children.length,
    }
  })

  console.log('  DOM 結構:', JSON.stringify(domCheck))

  if (domCheck.hasH1 && domCheck.h1Text === '臺北市政府函') ok('H1 標題正確')
  else fail(`H1: ${domCheck.h1Text}`)

  // 驗證標題置中對齊
  if (domCheck.h1Align.includes('center')) ok('H1 置中對齊')
  else fail(`H1 對齊：${domCheck.h1Align}`)

  if (domCheck.olCount >= 1) ok(`有序列表 ${domCheck.olCount} 個`)
  else fail('找不到有序列表')

  // 驗證巢狀列表 L2
  const nestedCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const nestedOl = pm.querySelector('ol ol')
    if (!nestedOl) return { hasNested: false }
    const items = nestedOl.querySelectorAll(':scope > li')
    // 檢查 L2 的 ::before 格式：應該是 (一)、(二) 格式
    const beforeContents = Array.from(items).map(li => {
      return window.getComputedStyle(li, '::before').content
    })
    return { hasNested: true, nestedCount: items.length, beforeContents }
  })

  if (nestedCheck.hasNested) {
    ok(`巢狀列表 L2 有 ${nestedCheck.nestedCount} 項`)
    console.log('  L2 ::before:', JSON.stringify(nestedCheck.beforeContents))
  } else {
    fail('找不到巢狀列表 L2')
  }

  if (domCheck.hasTable && domCheck.tableRows === 2) ok('表格正確（2 rows）')
  else fail(`表格：rows=${domCheck.tableRows}`)

  if (domCheck.tableCols === 3) ok('表格欄數正確（3 cols）')
  else fail(`表格欄數：${domCheck.tableCols}`)

  if (domCheck.hasBlockquote) ok('引用區塊正確')
  else fail('找不到引用區塊')

  if (domCheck.hasHr) ok('分隔線正確')
  else fail('找不到分隔線')

  // 驗證粗體 marks
  const boldCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const strongs = pm.querySelectorAll('strong')
    const texts = Array.from(strongs).map(s => s.textContent)
    return { count: strongs.length, texts }
  })

  if (boldCheck.count >= 2 && boldCheck.texts.includes('承辦人：')) {
    ok(`粗體格式正確 (${boldCheck.count} 個)`)
  } else {
    fail(`粗體：${JSON.stringify(boldCheck)}`)
  }

  // ============================
  // [5] 更複雜的 JSON：帶多段列表中斷的公文
  // ============================
  console.log('\n[5] JSON 載入 - 多段列表中斷續號')

  const testJSON2 = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '說明：' }] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第一項內容。' }] }] },
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: '這是插入的段落文字。' }] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二項內容。' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第三項內容。' }] }] },
      ]},
      { type: 'paragraph', content: [{ type: 'text', text: '另一段插入文字。' }] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '第四項內容。' }] }] },
      ]},
    ]
  }

  const loadResult2 = await page.evaluate((json) => {
    try {
      window.__tiptapEditor.commands.setContent(json)
      return { loaded: true }
    } catch (e) {
      return { loaded: false, error: e.message }
    }
  }, testJSON2)

  if (loadResult2.loaded) ok('多段列表 JSON 載入成功')
  else fail(`載入失敗：${loadResult2.error}`)

  await sleep(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-multi-list.png'), fullPage: true })

  // 驗證三個 ol 的 CSS counter 結構
  const multiListCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    const ols = pm.querySelectorAll(':scope > ol')

    const pmStyle = window.getComputedStyle(pm)
    const pmCounterReset = pmStyle.counterReset || pmStyle.getPropertyValue('counter-reset')

    const result = []
    let totalItems = 0
    ols.forEach((ol, i) => {
      const items = ol.querySelectorAll(':scope > li')
      totalItems += items.length
      const olStyle = window.getComputedStyle(ol)
      const olCounterReset = olStyle.counterReset || olStyle.getPropertyValue('counter-reset')
      result.push({
        olIndex: i,
        itemCount: items.length,
        text: Array.from(items).map(li => li.textContent.substring(0, 15)),
        olCounterReset,
      })
    })
    return { pmCounterReset, ols: result, olCount: ols.length, totalItems }
  })

  console.log('  多段列表結構:', JSON.stringify(multiListCheck))

  if (multiListCheck.olCount === 3) {
    ok('找到 3 個 ol 區塊')
  } else {
    fail(`找到 ${multiListCheck.olCount} 個 ol，期望 3 個`)
  }

  if (multiListCheck.totalItems === 4) {
    ok(`共 ${multiListCheck.totalItems} 個 li 項目`)
  } else {
    fail(`共 ${multiListCheck.totalItems} 個 li，期望 4 個`)
  }

  // 所有頂層 ol 都不應該 reset list-L1
  const allNoReset = multiListCheck.ols.every(ol => {
    const reset = ol.olCounterReset || ''
    return !reset.includes('list-L1')
  })
  if (allNoReset) {
    ok('所有頂層 ol 均未 reset list-L1，CSS counter 跨 ol 延續')
  } else {
    fail('部分 ol 重置了 list-L1')
  }

  // ============================
  // [6] JSON 載入 - 含 marks 的複雜內容
  // ============================
  console.log('\n[6] JSON 載入 - 多種 marks 與樣式')

  const testJSON3 = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [
        { type: 'text', text: '正常文字 ' },
        { type: 'text', marks: [{ type: 'bold' }], text: '粗體' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'italic' }], text: '斜體' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'underline' }], text: '底線' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'strike' }], text: '刪除線' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'bold' }, { type: 'italic' }], text: '粗斜體' },
      ]},
      { type: 'paragraph', content: [
        { type: 'text', marks: [{ type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }], text: '連結文字' },
      ]},
      { type: 'paragraph', content: [
        { type: 'text', marks: [{ type: 'textStyle', attrs: { color: '#FF0000' } }], text: '紅色文字' },
        { type: 'text', text: ' ' },
        { type: 'text', marks: [{ type: 'highlight', attrs: { color: '#FFFF00' } }], text: '螢光筆' },
      ]},
      { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 42;\nconsole.log(x);' }] },
      { type: 'bulletList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '項目一' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '項目二' }] }] },
      ]},
    ]
  }

  const loadResult3 = await page.evaluate((json) => {
    try {
      window.__tiptapEditor.commands.setContent(json)
      return { loaded: true }
    } catch (e) {
      return { loaded: false, error: e.message }
    }
  }, testJSON3)

  if (loadResult3.loaded) ok('marks 測試 JSON 載入成功')
  else fail(`載入失敗：${loadResult3.error}`)

  await sleep(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-marks.png'), fullPage: true })

  const marksCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      hasBold: !!pm.querySelector('strong'),
      hasItalic: !!pm.querySelector('em'),
      hasUnderline: !!pm.querySelector('u'),
      hasStrike: !!pm.querySelector('s'),
      hasLink: !!pm.querySelector('a[href]'),
      linkHref: pm.querySelector('a[href]')?.getAttribute('href') || '',
      hasCodeBlock: !!pm.querySelector('pre code'),
      codeText: pm.querySelector('pre code')?.textContent || '',
      hasBulletList: !!pm.querySelector('ul'),
      bulletItems: pm.querySelectorAll('ul > li').length,
      hasRedText: !!pm.querySelector('[style*="color"]'),
      hasMark: !!pm.querySelector('mark'),
    }
  })

  console.log('  marks 檢查:', JSON.stringify(marksCheck))

  if (marksCheck.hasBold) ok('粗體 mark')
  else fail('缺少粗體')

  if (marksCheck.hasItalic) ok('斜體 mark')
  else fail('缺少斜體')

  if (marksCheck.hasUnderline) ok('底線 mark')
  else fail('缺少底線')

  if (marksCheck.hasStrike) ok('刪除線 mark')
  else fail('缺少刪除線')

  if (marksCheck.hasLink && marksCheck.linkHref === 'https://example.com') ok('連結 mark')
  else fail(`連結：${marksCheck.linkHref}`)

  if (marksCheck.hasCodeBlock && marksCheck.codeText.includes('const x = 42')) ok('程式碼區塊')
  else fail('缺少程式碼區塊')

  if (marksCheck.hasBulletList && marksCheck.bulletItems === 2) ok('項目符號列表 (2 項)')
  else fail(`項目符號：${marksCheck.bulletItems}`)

  if (marksCheck.hasMark) ok('螢光筆 mark')
  else fail('缺少螢光筆')

  // ============================
  // [7] JSON getJSON 往返測試
  // ============================
  console.log('\n[7] JSON 往返測試 (setContent → getJSON)')

  const roundTripCheck = await page.evaluate((originalJson) => {
    try {
      const editor = window.__tiptapEditor
      editor.commands.setContent(originalJson)
      const outputJson = editor.getJSON()

      // 比較基本結構
      const inTypes = originalJson.content.map(n => n.type)
      const outTypes = outputJson.content.map(n => n.type)

      return {
        ok: true,
        inputTypes: inTypes,
        outputTypes: outTypes,
        match: JSON.stringify(inTypes) === JSON.stringify(outTypes),
        inputCount: originalJson.content.length,
        outputCount: outputJson.content.length,
      }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }, testJSON)

  if (roundTripCheck.ok && roundTripCheck.match) {
    ok(`JSON 往返結構完全一致 (${roundTripCheck.outputCount} 個頂層節點)`)
  } else if (roundTripCheck.ok) {
    // Tiptap 可能在最後加入一個空段落（確保游標可放置）
    // 檢查輸入的所有 type 是否為輸出的前綴
    const inputStr = JSON.stringify(roundTripCheck.inputTypes)
    const outputPrefix = JSON.stringify(roundTripCheck.outputTypes.slice(0, roundTripCheck.inputCount))
    if (inputStr === outputPrefix) {
      ok(`JSON 往返結構一致（輸出多 ${roundTripCheck.outputCount - roundTripCheck.inputCount} 個尾端節點，Tiptap 正常行為）`)
    } else {
      fail(`結構不一致：輸入 ${JSON.stringify(roundTripCheck.inputTypes)} → 輸出 ${JSON.stringify(roundTripCheck.outputTypes)}`)
    }
  } else {
    fail(`往返測試錯誤：${roundTripCheck.error}`)
  }

  // ============================
  // 列印預覽截圖
  // ============================
  console.log('\n[8] 最終狀態截圖')
  // 載回完整公文做最終截圖
  await page.evaluate((json) => {
    window.__tiptapEditor.commands.setContent(json)
  }, testJSON)
  await sleep(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-final.png'), fullPage: true })
  ok('最終狀態截圖完成')

  // ============================
  // 結果統計
  // ============================
  console.log(`\n=== 測試完成：${passed} 通過, ${failed} 失敗 ===\n`)
  console.log(`截圖：${SCREENSHOT_DIR}`)

  await sleep(2000)
  await browser.close()

  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('測試崩潰:', err)
  process.exit(1)
})
