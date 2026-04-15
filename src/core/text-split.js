// Tags inline que se pueden splitear por dentro
const INLINE_TAGS = new Set(['a', 'i', 'b', 'em', 'strong', 'span', 'u', 's'])

function tagName(tag) {
  return tag.match(/<\/?([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase() ?? ''
}

function wrapWord(word) {
  return `<span class="word"><span class="word-inner">${word}</span></span>`
}

function wrapChar(ch) {
  return `<span class="char"><span class="char-inner">${ch}</span></span>`
}

// Tokeniza HTML en nodos: { type: 'text'|'tag', value, closing, selfClosing, name }
function tokenize(html) {
  const tokens = []
  let i = 0
  while (i < html.length) {
    if (html[i] !== '<') {
      const end = html.indexOf('<', i)
      tokens.push({ type: 'text', value: html.slice(i, end === -1 ? html.length : end) })
      i = end === -1 ? html.length : end
    } else {
      const end = html.indexOf('>', i) + 1
      const raw = html.slice(i, end)
      const closing = raw[1] === '/'
      const selfClosing = raw[raw.length - 2] === '/'
      const name = tagName(raw)
      tokens.push({ type: 'tag', value: raw, closing, selfClosing, name })
      i = end
    }
  }
  return tokens
}

// Splitea texto en palabras preservando espacios
function splitWordsText(text) {
  return text.replace(/(\S+)/g, wrapWord)
}

// Splitea texto en chars preservando espacios
function splitCharsText(text) {
  return [...text].map(ch => ch === ' ' ? ' ' : wrapChar(ch)).join('')
}

// Procesa tokens dentro de un modo (words/chars), manejando tags inline
function processTokens(tokens, mode) {
  const out = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'text') {
      out.push(mode === 'words' ? splitWordsText(t.value) : splitCharsText(t.value))
      i++
    } else if (t.type === 'tag' && !t.closing && !t.selfClosing && INLINE_TAGS.has(t.name)) {
      // Recoger todo el contenido del tag inline hasta su cierre
      const openTag = t.value
      const inner = []
      let depth = 1
      i++
      while (i < tokens.length && depth > 0) {
        const cur = tokens[i]
        if (cur.type === 'tag' && cur.name === t.name) {
          if (cur.closing) depth--
          else depth++
        }
        if (depth > 0) inner.push(cur)
        i++
      }
      // Splitear el interior del tag inline recursivamente
      const closeTag = `</${t.name}>`
      out.push(openTag + processTokens(inner, mode) + closeTag)
    } else {
      out.push(t.value)
      i++
    }
  }
  return out.join('')
}

export function splitText(html) {
  if (!/\b(words|chars)\b/.test(html)) return html

  const tokens = tokenize(html)
  const out = []
  let i = 0
  let mode = null
  let depth = 0
  let innerTokens = []

  while (i < tokens.length) {
    const t = tokens[i]

    if (!mode) {
      if (t.type === 'tag' && !t.closing && !t.selfClosing) {
        if (/\bwords\b/.test(t.value)) { mode = 'words'; depth = 1; innerTokens = []; out.push(t.value); i++; continue }
        if (/\bchars\b/.test(t.value)) { mode = 'chars'; depth = 1; innerTokens = []; out.push(t.value); i++; continue }
      }
      out.push(t.value)
    } else {
      if (t.type === 'tag' && !t.selfClosing) {
        if (!t.closing) depth++
        else depth--
      }

      if (depth === 0) {
        // Cerrar modo — procesar todo el contenido acumulado
        out.push(processTokens(innerTokens, mode))
        out.push(t.value) // closing tag
        mode = null
        innerTokens = []
      } else {
        innerTokens.push(t)
      }
    }
    i++
  }

  return out.join('')
}
