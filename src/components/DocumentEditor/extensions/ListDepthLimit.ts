import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Fragment } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'

export const MAX_LIST_DEPTH = 7

/**
 * 計算目前游標位置的列表巢狀深度（orderedList / bulletList 祖先數量）
 */
export function getListDepth(state: EditorState): number {
  const { $from } = state.selection
  let depth = 0
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'orderedList' || node.type.name === 'bulletList') {
      depth++
    }
  }
  return depth
}

/**
 * 攤平 HTML 中超過 maxDepth 層的 <ol>/<ul> 巢狀。
 * 超深的 <li> 內容會被提取到最深允許層的 <li> 中。
 */
function flattenDeepListsHTML(html: string, maxDepth: number): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')

  function walk(parent: Element, depth: number) {
    const children = Array.from(parent.children)
    for (const child of children) {
      const tag = child.tagName
      if (tag === 'OL' || tag === 'UL') {
        const newDepth = depth + 1
        if (newDepth > maxDepth) {
          // 超過深度：將 li 內容提取到上層 li
          const parentLi = parent.closest('li')
          if (parentLi) {
            const lis = Array.from(child.querySelectorAll(':scope > li'))
            for (const li of lis) {
              // 把 li 的子節點（排除巢狀 ol/ul）搬到 parentLi
              while (li.firstChild) {
                const node = li.firstChild
                if (node instanceof Element && (node.tagName === 'OL' || node.tagName === 'UL')) {
                  li.removeChild(node)
                } else {
                  parentLi.appendChild(node)
                }
              }
            }
          }
          child.remove()
        } else {
          walk(child, newDepth)
        }
      } else if (child.tagName === 'LI') {
        walk(child, depth)
      } else {
        walk(child, depth)
      }
    }
  }

  walk(doc.body, 0)
  return doc.body.innerHTML
}

/**
 * 計算 ProseMirror 文件中某位置的列表巢狀深度
 */
function getNodeListDepth(doc: EditorState['doc'], pos: number): number {
  const $pos = doc.resolve(Math.min(pos + 1, doc.content.size))
  let depth = 0
  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d)
    if (node.type.name === 'orderedList' || node.type.name === 'bulletList') {
      depth++
    }
  }
  return depth
}

const ListDepthLimit = Extension.create({
  name: 'listDepthLimit',

  addKeyboardShortcuts() {
    return {
      // 攔截 Tab：若已在最大深度，阻止 sinkListItem
      Tab: () => {
        const depth = getListDepth(this.editor.state)
        if (depth >= MAX_LIST_DEPTH) {
          return true // 消耗事件，不繼續傳遞
        }
        return false // 讓 ListItem 的 Tab handler 繼續執行
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('listDepthLimit'),

        props: {
          // 貼上 HTML 前攤平超深巢狀
          transformPastedHTML(html: string): string {
            return flattenDeepListsHTML(html, MAX_LIST_DEPTH)
          },
        },

        // 安全網：修正任何造成超深列表的交易（如 setContent）
        appendTransaction(
          transactions: readonly Transaction[],
          _oldState: EditorState,
          newState: EditorState
        ): Transaction | null {
          if (!transactions.some(tr => tr.docChanged)) return null

          // 找出所有超深的列表節點位置（從後往前收集，避免位移問題）
          const toFix: Array<{ pos: number; node: any }> = []

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'orderedList' || node.type.name === 'bulletList') {
              const depth = getNodeListDepth(newState.doc, pos)
              if (depth > MAX_LIST_DEPTH) {
                toFix.push({ pos, node })
                return false // 不再往下走，處理最外層超深的即可
              }
            }
          })

          if (toFix.length === 0) return null

          const { tr } = newState

          // 從後往前處理，避免位移
          for (let i = toFix.length - 1; i >= 0; i--) {
            const { pos, node } = toFix[i]
            const mapped = tr.mapping.map(pos)

            // 提取 listItem 的非列表子節點作為替代內容
            const content: any[] = []
            node.forEach((child: any) => {
              if (child.type.name === 'listItem') {
                child.forEach((grandchild: any) => {
                  if (grandchild.type.name !== 'orderedList' && grandchild.type.name !== 'bulletList') {
                    content.push(grandchild)
                  }
                })
              }
            })

            if (content.length > 0) {
              tr.replaceWith(mapped, mapped + node.nodeSize, Fragment.from(content))
            } else {
              tr.delete(mapped, mapped + node.nodeSize)
            }
          }

          return tr.steps.length > 0 ? tr : null
        },
      }),
    ]
  },
})

export default ListDepthLimit
