import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { serveStatic } from '@hono/node-server/serve-static'
import { createServer } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import fs from 'node:fs/promises'

const isProd = process.env.NODE_ENV === 'production'

// ─── SSG ────────────────────────────────────────────────────────────────────

if (process.argv.includes('--ssg')) {
  await (await import('./scripts/ssg.js')).default()
  process.exit(0)
}

// ─── Vite (dev only) ────────────────────────────────────────────────────────

let vite
if (!isProd) {
  const { createServer: createVite } = await import('vite')
  vite = await createVite({ server: { middlewareMode: true }, appType: 'custom' })
}

const getModule = vite
  ? () => vite.ssrLoadModule('/src/entry-server.js')
  : () => import('./dist/server/entry-server.js')

// ─── Preloads ───────────────────────────────────────────────────────────────

const dir = isProd ? './dist' : './public'
const fonts = (await fs.readdir(dir)).filter(f => f.endsWith('.woff2'))
const css = isProd ? (await fs.readdir('./dist/assets')).filter(f => f.endsWith('.css')) : []

const preloads = [
  ...fonts.map(f => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`),
  ...css.map(f => `<link rel="preload" href="/assets/${f}" as="style" crossorigin>`),
].join('\n    ')

// ─── App ────────────────────────────────────────────────────────────────────

const app = new Hono()

app.use('*', compress())

if (isProd) {
  app.use('/assets/*', serveStatic({ root: './dist' }))
  app.use('/*.woff2', serveStatic({ root: './dist' }))
  app.use('/render.json', serveStatic({ root: './dist' }))
}

// API
app.post('/api/:name', async (c) => {
  const { schemas, validate } = await getModule()
  const schema = schemas[c.req.param('name')]
  if (!schema) return c.notFound()

  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid JSON' }, 400)

  const errors = {}
  for (const f of schema.fields) {
    const err = validate(f, body[f.name] ?? '')
    if (err) errors[f.name] = err
  }
  if (Object.keys(errors).length) return c.json({ errors }, 400)

  console.log(`[form:${schema.name}]`, body)
  return c.json({ ok: true })
})

// Render (SPA navigation)
app.get('*', async (c, next) => {
  const url = new URL(c.req.url)
  if (!url.searchParams.has('render')) return next()

  const { render, renderAll, routes, layout } = await getModule()
  const page = render(url.pathname)

  if (page.title === '404') return c.json({ body: page.body, title: '404', layout }, 404)
  return c.json({ body: page.body, title: page.title, layout, cache: renderAll(), routes })
})

// 404
app.get('/404', async (c) => {
  return c.html(await fs.readFile(isProd ? './dist/404.html' : './404.html', 'utf-8'), 404)
})

// SPA shell
app.get('*', async (c) => {
  let html = isProd
    ? await fs.readFile('./dist/index.html', 'utf-8')
    : await vite.transformIndexHtml(c.req.path, await fs.readFile('./index.html', 'utf-8'))

  return c.html(html.replace('<meta charset="UTF-8"', preloads + '\n    <meta charset="UTF-8"'))
})

// ─── Start ──────────────────────────────────────────────────────────────────

let port = parseInt(process.env.PORT || '5173')

const listener = getRequestListener(app.fetch)
const server = createServer(vite
  ? (req, res) => vite.middlewares(req, res, () => listener(req, res))
  : listener
)

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { port++; server.listen(port) }
  else throw e
})
server.listen(port, () => console.log(`http://localhost:${port}`))
