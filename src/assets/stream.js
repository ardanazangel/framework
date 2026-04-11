// Lee líneas de un ReadableStream de texto newline-delimited.
// Uso:
//   const read = streamLines(response)
//   const { line, read: next } = await read()
//   const { line: line2 } = await next()

export function streamLines(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  async function readLine() {
    while (true) {
      const { value, done } = await reader.read()
      buf += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const nl = buf.indexOf('\n')
      if (nl !== -1 || done) {
        const line = buf.slice(0, nl === -1 ? buf.length : nl)
        buf = nl === -1 ? '' : buf.slice(nl + 1)
        return { line, read: readLine }
      }
    }
  }

  return readLine
}
