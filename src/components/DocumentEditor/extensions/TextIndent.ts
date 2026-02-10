import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textIndent: {
      setTextIndent: (indent: string) => ReturnType
      unsetTextIndent: () => ReturnType
    }
  }
}

export const INDENT_STEP = 2 // em
export const MAX_INDENT = 10 // em

const TextIndent = Extension.create({
  name: 'textIndent',

  addOptions() {
    return {
      types: ['paragraph'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textIndent: {
            default: null,
            parseHTML: (element) => element.style.textIndent || null,
            renderHTML: (attributes) => {
              if (!attributes.textIndent) {
                return {}
              }
              return {
                style: `text-indent: ${attributes.textIndent}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextIndent:
        (indent: string) =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { textIndent: indent })
          )
        },
      unsetTextIndent:
        () =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'textIndent')
          )
        },
    }
  },
})

export default TextIndent
