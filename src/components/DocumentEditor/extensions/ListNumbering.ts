import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    listNumbering: {
      toggleRestartNumbering: () => ReturnType
    }
  }
}

const ListNumbering = Extension.create({
  name: 'listNumbering',

  addGlobalAttributes() {
    return [
      {
        types: ['orderedList'],
        attributes: {
          restartNumbering: {
            default: false,
            parseHTML: (element) =>
              element.getAttribute('data-restart-numbering') === 'true',
            renderHTML: (attributes) => {
              if (!attributes.restartNumbering) return {}
              return { 'data-restart-numbering': 'true' }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      toggleRestartNumbering:
        () =>
        ({ commands, editor }) => {
          const attrs = editor.getAttributes('orderedList')
          return commands.updateAttributes('orderedList', {
            restartNumbering: !attrs.restartNumbering,
          })
        },
    }
  },
})

export default ListNumbering
