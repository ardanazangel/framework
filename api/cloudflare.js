import { render, renderAll } from '../dist/server/entry-server.js'

export default {
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/render.json') {
      return Response.json(renderAll())
    }

    if (url.pathname === '/render') {
      const path = url.searchParams.get('path') || '/'
      const { html } = render(path)
      return Response.json({ cache: { [path]: { html } } })
    }

    return new Response('not found', { status: 404 })
  }
}
