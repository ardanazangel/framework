import { render, renderAll } from '../dist/server/entry-server.js'

export const handler = async (event) => {
  const url = new URL(event.rawUrl)

  if (url.pathname === '/render.json') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderAll()),
    }
  }

  if (url.pathname === '/render') {
    const path = url.searchParams.get('path') || '/'
    const { html } = render(path)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cache: { [path]: { html } } }),
    }
  }

  return { statusCode: 404, body: 'not found' }
}
