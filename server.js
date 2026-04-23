const isProd = process.env.NODE_ENV === 'production'

if (isProd) {

  const { render, renderAll, routes, layout } = await import('./dist/server/entry-server.js')
  const port = parseInt(process.env.PORT || '5173')

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)

      // assets — static + inmutable
      if (url.pathname.startsWith('/assets/')) {
        return new Response(Bun.file('./dist' + url.pathname), {
          headers: { 'Cache-Control': 'max-age=31536000, immutable' }
        })
      }

      // otros estáticos (fuentes, favicon, etc.)
      if (url.pathname.includes('.')) {
        const file = Bun.file('./dist' + url.pathname)
        if (await file.exists()) return new Response(file)
      }

      if (url.searchParams.has('render')) {
        const page = render(url.pathname)
        const data = page.title === '404'
          ? { body: page.body, title: '404', layout }
          : { body: page.body, title: page.title, layout, cache: renderAll(), routes }
        const compressed = Bun.gzipSync(Buffer.from(JSON.stringify(data)))
        return new Response(compressed, {
          status: page.title === '404' ? 404 : 200,
          headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }
        })
      }

      if (url.pathname === '/404') {
        return new Response(Bun.file('./dist/404.html'), { status: 404 })
      }

      return new Response(Bun.file('./dist/index.html'))
    },
  })

  console.log(`http://localhost:${port}`)

} else {

  const { createServer } = await import('node:http')
  const { createServer: createVite } = await import('vite')
  const { readFile } = await import('node:fs/promises')

  const vite = await createVite({ server: { middlewareMode: true }, appType: 'custom' })
  let port = parseInt(process.env.PORT || '5173')

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')

    if (url.searchParams.has('render')) {
      vite.ssrLoadModule('/src/entry-server.js')
        .then(({ render, renderAll, routes, layout }) => {
          const page = render(url.pathname)
          const data = page.title === '404'
            ? { body: page.body, title: '404', layout }
            : { body: page.body, title: page.title, layout, cache: renderAll(), routes }
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = page.title === '404' ? 404 : 200
          res.end(JSON.stringify(data))
        })
        .catch(e => { res.statusCode = 500; res.end(e.message) })
      return
    }

    vite.middlewares(req, res, async () => {
      try {
        let html = await readFile('./index.html', 'utf-8')
        html = await vite.transformIndexHtml(req.url, html)
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      } catch (e) {
        res.statusCode = 500
        res.end(e.message)
      }
    })
  })

  server.on('error', e => {
    if (e.code === 'EADDRINUSE') { port++; server.listen(port) }
    else throw e
  })
  server.listen(port, () => console.log(`http://localhost:${port}`))

}
