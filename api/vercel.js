import { render, renderAll, validRoutes } from '../dist/server/entry-server.js'

export default function handler(req, res) {
  const url = new URL(req.url, 'http://x')

  if (url.pathname === '/render.json') {
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify(renderAll()))
  }

  if (url.pathname === '/render') {
    const path = url.searchParams.get('path') || '/'
    const { html } = render(path)
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ cache: { [path]: { html } } }))
  }

  res.statusCode = 404
  res.end('not found')
}
