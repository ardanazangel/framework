import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { createGzip } from 'node:zlib'
import path from 'node:path'

const isProduction = process.env.NODE_ENV === 'production'
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

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')

  if (!isProduction) {
    await new Promise((resolve) => vite.middlewares(req, res, resolve))
    if (res.writableEnded) return
  }

  // in production, static assets (including pre-generated render.json) take priority
  if (isProduction && await serveStatic(req, res)) return

  if (url.searchParams.has('render')) {
    const { render, renderAll, layout } = await getModule()
    const page = render(url.pathname)
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.write(JSON.stringify({ body: page.body, title: page.title, layout }) + '\n')
    setImmediate(() => res.end(JSON.stringify({ cache: renderAll() }) + '\n'))
    return
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
}).listen(port, () => console.log(`Server started at http://localhost:${port}`))
