import React, { useState, useCallback } from 'react'
import { Editor } from '@tiptap/react'
import './bubbleMenu.css'

interface LinkBubbleMenuProps {
  editor: Editor
}

const LinkBubbleMenu: React.FC<LinkBubbleMenuProps> = ({ editor }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [url, setUrl] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  // 檢查當前選區是否在連結上
  React.useEffect(() => {
    const updateMenu = () => {
      const isLink = editor.isActive('link')

      if (isLink) {
        const attrs = editor.getAttributes('link')
        setUrl(attrs.href || '')
        setShowMenu(true)
      } else {
        setShowMenu(false)
        setIsEditing(false)
      }
    }

    editor.on('selectionUpdate', updateMenu)
    editor.on('update', updateMenu)

    return () => {
      editor.off('selectionUpdate', updateMenu)
      editor.off('update', updateMenu)
    }
  }, [editor])

  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleSave = useCallback(() => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
    setIsEditing(false)
  }, [editor, url])

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run()
    setShowMenu(false)
    setIsEditing(false)
  }, [editor])

  const handleVisit = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [url])

  if (!showMenu || !editor.isActive('link')) {
    return null
  }

  // 計算 bubble menu 位置
  const { state } = editor
  const { from, to } = state.selection
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)

  const left = Math.min(start.left, end.left)
  const top = start.top - 60 // 在選區上方顯示

  return (
    <div
      className="link-bubble-menu"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1000,
      }}
    >
      {isEditing ? (
        <div className="link-edit-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            placeholder="https://example.com"
            autoFocus
          />
          <button onClick={handleSave} title="儲存">✓</button>
          <button onClick={() => setIsEditing(false)} title="取消">✗</button>
        </div>
      ) : (
        <div className="link-display">
          <a href={url} target="_blank" rel="noopener noreferrer" className="link-url">
            {url}
          </a>
          <div className="link-actions">
            <button onClick={handleVisit} title="開啟連結">🔗</button>
            <button onClick={handleEdit} title="編輯連結">✎</button>
            <button onClick={handleRemove} title="移除連結">🗑️</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LinkBubbleMenu
