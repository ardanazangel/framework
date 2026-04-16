import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { createGzip } from 'node:zlib'
import path from 'node:path'

const isProduction = process.env.NODE_ENV === 'production'
const isSSG = process.argv.includes('--ssg')

if (isSSG) {
  const { render, renderAll, routes: routeTypeMap, layout } = await import('./dist/server/entry-server.js')
  const all = renderAll()
  const routeKeys = Object.keys(all)

  const distAssets = await fs.readdir('./dist/assets')
  const cssFiles = distAssets.filter(f => f.endsWith('.css'))
  const fonts = (await fs.readdir('./dist')).filter(f => f.endsWith('.woff2'))
  const preloads = [
    ...fonts.map(f => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`),
    ...cssFiles.map(f => `<link rel="preload" href="/assets/${f}" as="style" crossorigin>`),
    '<link rel="preload" href="/render.json" as="fetch" crossorigin>',
  ].join('\n    ')

  // render.json — single file con todas las rutas + mapa de tipos
  await fs.writeFile('./dist/render.json', JSON.stringify({ ...all, __routes__: routeTypeMap }))
  console.log('  ✓ render.json')

  // HTML pages — pre-rendered content, no inlined NDJSON
  const indexHtml = await fs.readFile('./dist/index.html', 'utf-8')
  for (const route of routeKeys) {
    const page = render(route)
    const html = indexHtml
      .replace('</head>', `    ${preloads}\n    <title>${page.title}</title>\n  </head>`)
      .replace('<main id="_root"></main>', `${layout}<main id="_root">${page.body}</main>`)
    const dir = path.join('./dist', route === '/' ? '' : route)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), html)
    console.log(`  ✓ ${route}`)
  }

  // 404.html — bare page, no SPA shell
  await fs.copyFile('./404.html', './dist/404.html')
  console.log('  ✓ /404.html')

  // limpiar dist/server — no necesario en SSG
  await fs.rm('./dist/server', { recursive: true, force: true })
  console.log(`\n${routes.length} páginas + render.json generados`)
  process.exit(0)
}
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

const fontDir = isProduction ? './dist' : './public'
const fontFiles = (await fs.readdir(fontDir)).filter(f => f.endsWith('.woff2'))
const fontPreloads = fontFiles
  .map(f => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`)
  .join('\n    ')

const cssPreload = isProduction
  ? (await fs.readdir('./dist/assets')).filter(f => f.endsWith('.css'))
    .map(f => `<link rel="preload" href="/assets/${f}" as="style" crossorigin>`)
    .join('\n    ')
  : ''

const preloads = [fontPreloads, cssPreload].filter(Boolean).join('\n    ')


const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

let vite
let serverModule

if (!isProduction) {
  const { createServer: createVite } = await import('vite')
  vite = await createVite({ server: { middlewareMode: true }, appType: 'custom', base })
}

async function getModule() {
  if (vite) return vite.ssrLoadModule('/src/entry-server.js')
  serverModule ??= await import('./dist/server/entry-server.js')
  return serverModule
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  const filePath = path.join('./dist', url.pathname)
  try {
    if ((await fs.stat(filePath)).isDirectory()) return false
    const mime = MIME[path.extname(filePath)] ?? 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    if (req.headers['accept-encoding']?.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip')
      createReadStream(filePath).pipe(createGzip()).pipe(res)
    } else {
      createReadStream(filePath).pipe(res)
    }
    return true
  } catch {
    return false
  }
}

let currentPort = process.env.PORT ? parseInt(process.env.PORT) : 5173

function startServer() {
  createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')

    if (!isProduction) {
      await new Promise((resolve) => vite.middlewares(req, res, resolve))
      if (res.writableEnded) return
    }

    // in production, static assets (including pre-generated render.json) take priority
    if (isProduction && await serveStatic(req, res)) return

    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5) // strip /api/
      const { schemas, validate } = await getModule()
      const schema = schemas[name]

      if (!schema) {
        res.writeHead(404).end('Not found')
        return
      }

      let body
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', chunk => data += chunk)
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        body = JSON.parse(raw)
      } catch {
        res.writeHead(400).end('Invalid JSON')
        return
      }

      const errors = {}
      for (const field of schema.fields) {
        const error = validate(field, body[field.name] ?? '')
        if (error) errors[field.name] = error
      }

      if (Object.keys(errors).length) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ errors }))
        return
      }

      // TODO: handle validated data (send email, save to db, etc.)
      console.log(`[form:${name}]`, body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    if (url.searchParams.has('render')) {
      const { render, renderAll, routes: routeTypeMap, layout } = await getModule()
      const page = render(url.pathname)
      const is404 = page.title === '404'
      res.writeHead(is404 ? 404 : 200, { 'Content-Type': 'application/x-ndjson' })
      res.write(JSON.stringify({ body: page.body, title: page.title, layout }) + '\n')
      if (!is404) {
        setImmediate(() => res.end(JSON.stringify({ cache: renderAll(), routes: routeTypeMap }) + '\n'))
      } else {
        res.end()
      }
      return
    }

    // 404 — bare page, no SPA
    if (url.pathname === '/404') {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      const page404 = isProduction
        ? await fs.readFile('./dist/404.html', 'utf-8')
        : await fs.readFile('./404.html', 'utf-8')
      return res.end(page404)
    }

    // SPA fallback
    res.setHeader('Content-Type', 'text/html; charset=utf-8')

    if (isProduction) {
      let html = await fs.readFile('./dist/index.html', 'utf-8')
      return res.end(html.replace('<meta charset="UTF-8"', preloads + '\n    <meta charset="UTF-8"'))
    }

    let html = await fs.readFile('./index.html', 'utf-8')
    html = await vite.transformIndexHtml(url.pathname, html)
    res.end(html.replace('<meta charset="UTF-8"', preloads + '\n    <meta charset="UTF-8"'))
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${currentPort} in use, trying ${currentPort + 1}...`)
      currentPort++
      startServer()
    } else {
      throw err
    }
  }).listen(currentPort, () => console.log(`Server started at http://localhost:${currentPort}`))
}

startServer()
