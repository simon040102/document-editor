import React, { useState } from 'react'
import { Editor } from '@tiptap/react'
import './bubbleMenu.css'

interface TableBubbleMenuProps {
  editor: Editor
}

const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  const [showMenu, setShowMenu] = useState(false)

  // 檢查當前是否在表格中
  React.useEffect(() => {
    const updateMenu = () => {
      const isInTable = editor.isActive('table')
      setShowMenu(isInTable)
    }

    editor.on('selectionUpdate', updateMenu)
    editor.on('update', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('update', updateMenu)
    }
  }, [editor])

  if (!showMenu || !editor.isActive('table')) {
    return null
  }

  return (
    <div className="table-bubble-menu">
      <div className="table-menu-section">
        <span className="menu-label">行：</span>
        <button
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="在上方插入行"
        >
          ↑+
        </button>
        <button
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="在下方插入行"
        >
          ↓+
        </button>
        <button
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="刪除行"
          disabled={!editor.can().deleteRow()}
        >
          🗑️行
        </button>
      </div>

      <div className="table-menu-divider"></div>

      <div className="table-menu-section">
        <span className="menu-label">列：</span>
        <button
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="在左方插入列"
        >
          ←+
        </button>
        <button
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="在右方插入列"
        >
          →+
        </button>
        <button
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="刪除列"
          disabled={!editor.can().deleteColumn()}
        >
          🗑️列
        </button>
      </div>

      <div className="table-menu-divider"></div>

      <div className="table-menu-section">
        <button
          onClick={() => editor.chain().focus().mergeCells().run()}
          title="合併儲存格"
          disabled={!editor.can().mergeCells()}
        >
          ⬜ 合併
        </button>
        <button
          onClick={() => editor.chain().focus().splitCell().run()}
          title="分割儲存格"
          disabled={!editor.can().splitCell()}
        >
          ⬜ 分割
        </button>
      </div>

      <div className="table-menu-divider"></div>

      <div className="table-menu-section">
        <button
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="切換標題行"
        >
          標題行
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          title="切換標題列"
        >
          標題列
        </button>
      </div>

      <div className="table-menu-divider"></div>

      <div className="table-menu-section">
        <button
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="刪除表格"
          className="danger-button"
        >
          🗑️ 刪除表格
        </button>
      </div>
    </div>
  )
}

export default TableBubbleMenu
