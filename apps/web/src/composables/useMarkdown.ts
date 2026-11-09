import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

md.inline.ruler.before('emphasis', 'underline', (state, silent) => {
  const start = state.pos
  if (state.src.slice(start, start + 2) !== '++') return false
  const end = state.src.indexOf('++', start + 2)
  if (end <= start + 2) return false

  if (!silent) {
    state.push('underline_open', 'u', 1)
    const text = state.push('text', '', 0)
    text.content = state.src.slice(start + 2, end)
    state.push('underline_close', 'u', -1)
  }
  state.pos = end + 2
  return true
})

export function renderMarkdown(source: string): string {
  const raw = md.render(source)
  return DOMPurify.sanitize(raw)
}
