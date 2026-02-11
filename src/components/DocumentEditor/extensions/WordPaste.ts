import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * 偵測是否為 Word 產出的 HTML
 */
function isWordHTML(html: string): boolean {
  return (
    html.includes('urn:schemas-microsoft-com:office:word') ||
    html.includes('xmlns:w=') ||
    html.includes('mso-') ||
    html.includes('MsoNormal') ||
    html.includes('MsoListParagraph')
  )
}

/**
 * 從 Word 段落的 style 中取得列表層級資訊
 */
function getWordListLevel(el: Element): number | null {
  const style = el.getAttribute('style') || ''
  const className = el.className || ''

  // 檢查 mso-list 樣式 (e.g., "mso-list:l0 level2 lfo1")
  const msoMatch = style.match(/mso-list:\s*l\d+\s+level(\d+)\s+lfo\d+/)
  if (msoMatch) {
    return parseInt(msoMatch[1], 10)
  }

  // 檢查 MsoListParagraph class + margin-left 推算層級
  if (
    className.includes('MsoListParagraph') ||
    className.includes('MsoList')
  ) {
    const marginMatch = style.match(
      /margin-left:\s*([\d.]+)\s*(pt|cm|in|em|px)/
    )
    if (marginMatch) {
      const val = parseFloat(marginMatch[1])
      const unit = marginMatch[2]
      let pts = val
      if (unit === 'cm') pts = val * 28.35
      else if (unit === 'in') pts = val * 72
      else if (unit === 'em') pts = val * 12
      else if (unit === 'px') pts = val * 0.75
      // Word 每層約 36pt (1.27cm)
      return Math.max(1, Math.round(pts / 36))
    }
    return 1
  }

  return null
}

/**
 * 移除 Word 列表標記 span (mso-list:Ignore)
 */
function removeListMarker(el: Element): void {
  // 移除 <!--[if !supportLists]--> ... <!--[endif]--> 區塊
  // 這些在 innerHTML 中會變成 comment nodes
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_COMMENT)
  const commentsToRemove: Comment[] = []
  let node: Comment | null
  while ((node = walker.nextNode() as Comment | null)) {
    if (
      node.textContent?.includes('supportLists') ||
      node.textContent?.includes('endif')
    ) {
      commentsToRemove.push(node)
    }
  }
  commentsToRemove.forEach((c) => c.remove())

  // 移除含 mso-list:Ignore 的 span
  const spans = el.querySelectorAll('span')
  spans.forEach((span) => {
    const spanStyle = span.getAttribute('style') || ''
    if (spanStyle.includes('mso-list') && spanStyle.includes('Ignore')) {
      span.remove()
      return
    }
    // 移除只有空白和 &nbsp; 的 span（Word 常在 marker 後加這種）
    if (
      span.children.length === 0 &&
      span.textContent?.trim() === '' &&
      spanStyle.includes('font:')
    ) {
      span.remove()
    }
  })
}

/**
 * 清理 Word 特有的 CSS 屬性和 class
 */
function cleanWordStyles(el: Element): void {
  // 清理 style 中的 mso-* 屬性
  const style = el.getAttribute('style')
  if (style) {
    const cleaned = style
      .split(';')
      .filter((prop) => {
        const trimmed = prop.trim().toLowerCase()
        return (
          trimmed &&
          !trimmed.startsWith('mso-') &&
          !trimmed.startsWith('tab-stops') &&
          !trimmed.startsWith('text-indent') &&
          !trimmed.startsWith('margin-left') &&
          !trimmed.startsWith('margin-bottom') &&
          !trimmed.startsWith('line-height')
        )
      })
      .join(';')
      .trim()

    if (cleaned) {
      el.setAttribute('style', cleaned)
    } else {
      el.removeAttribute('style')
    }
  }

  // 清理 Word class
  const className = el.className
  if (className && typeof className === 'string') {
    const cleaned = className
      .split(/\s+/)
      .filter(
        (c) =>
          !c.startsWith('Mso') &&
          !c.startsWith('mso') &&
          c !== 'MsoNormal' &&
          !c.includes('ListParagraph')
      )
      .join(' ')
      .trim()

    if (cleaned) {
      el.setAttribute('class', cleaned)
    } else {
      el.removeAttribute('class')
    }
  }

  // 移除 Word 特有屬性
  el.removeAttribute('lang')
  el.removeAttribute('xml:lang')

  // 遞迴清理子元素
  Array.from(el.children).forEach((child) => cleanWordStyles(child))
}

/**
 * 從扁平的 Word 列表段落建構巢狀 <ol><li> 結構
 */
function buildNestedList(
  items: Array<{ level: number; content: string }>,
  doc: Document
): HTMLOListElement {
  const root = doc.createElement('ol')
  // stack[i] 代表第 i+1 層的 ol 元素
  const stack: HTMLOListElement[] = [root]

  for (const item of items) {
    const targetLevel = item.level

    if (targetLevel > stack.length) {
      // 需要深入 — 建立中間層的 ol
      for (let l = stack.length; l < targetLevel; l++) {
        const parentOl = stack[stack.length - 1]
        let lastLi = parentOl.lastElementChild as HTMLLIElement | null
        if (!lastLi || lastLi.tagName !== 'LI') {
          lastLi = doc.createElement('li')
          parentOl.appendChild(lastLi)
        }
        const newOl = doc.createElement('ol')
        lastLi.appendChild(newOl)
        stack.push(newOl)
      }
    } else if (targetLevel < stack.length) {
      // 需要返回上層
      while (stack.length > targetLevel) {
        stack.pop()
      }
    }

    const li = doc.createElement('li')
    const p = doc.createElement('p')
    p.innerHTML = item.content
    li.appendChild(p)
    stack[stack.length - 1].appendChild(li)
  }

  return root
}

/**
 * 轉換 Word HTML 中的列表段落為正確的 <ol><li> 結構
 */
function transformWordHTML(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  const children = Array.from(body.children)

  // 將元素分組為列表段與非列表段
  type ListItem = { level: number; content: string; element: Element }
  type Segment =
    | { type: 'list'; items: ListItem[] }
    | { type: 'other'; element: Element }

  const segments: Segment[] = []
  let currentListGroup: { type: 'list'; items: ListItem[] } | null = null

  for (const child of children) {
    const level = getWordListLevel(child)
    if (level !== null) {
      // 處理這個列表項目
      const clone = child.cloneNode(true) as Element
      removeListMarker(clone)
      cleanWordStyles(clone)
      const content = clone.innerHTML.trim()

      if (!currentListGroup) {
        currentListGroup = { type: 'list', items: [] }
        segments.push(currentListGroup)
      }
      currentListGroup.items.push({ level, content, element: child })
    } else {
      currentListGroup = null
      segments.push({ type: 'other', element: child })
    }
  }

  // 將列表段轉換為 <ol><li>
  for (const segment of segments) {
    if (segment.type === 'list') {
      const olTree = buildNestedList(segment.items, doc)
      const firstElement = segment.items[0].element
      firstElement.parentNode?.insertBefore(olTree, firstElement)
      for (const item of segment.items) {
        item.element.remove()
      }
    }
  }

  // 清理剩餘的非列表元素
  Array.from(body.children).forEach((child) => {
    if (child.tagName !== 'OL') {
      cleanWordStyles(child)
    }
  })

  // 移除空的 <o:p> 和其他 Office 標籤
  body.innerHTML = body.innerHTML
    .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
    .replace(/<\/?o:[^>]+>/gi, '')
    .replace(/<\/?v:[^>]+>/gi, '')
    .replace(/<\/?w:[^>]+>/gi, '')

  return body.innerHTML
}

/**
 * WordPaste 擴充：攔截從 Word 貼上的內容，轉換為正確的列表結構
 */
const WordPaste = Extension.create({
  name: 'wordPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wordPaste'),
        props: {
          transformPastedHTML(html: string) {
            if (isWordHTML(html)) {
              return transformWordHTML(html)
            }
            return html
          },
        },
      }),
    ]
  },
})

export default WordPaste
