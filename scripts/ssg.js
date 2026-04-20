import fs from 'node:fs/promises'
import path from 'node:path'

export default async function ssg() {
  const { render, renderAll, routes: routeTypeMap, layout } = await import('../dist/server/entry-server.js')
  const all = renderAll()
  const routeKeys = Object.keys(all)

  const cssFiles = (await fs.readdir('./dist/assets')).filter(f => f.endsWith('.css'))
  const fonts = (await fs.readdir('./dist')).filter(f => f.endsWith('.woff2'))

  const preloads = [
    ...fonts.map(f => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`),
    ...cssFiles.map(f => `<link rel="preload" href="/assets/${f}" as="style" crossorigin>`),
    '<link rel="preload" href="/render.json" as="fetch" crossorigin>',
  ].join('\n    ')

  // render.json
  await fs.writeFile('./dist/render.json', JSON.stringify({ ...all, __routes__: routeTypeMap }))
  console.log('  ✓ render.json')

  // HTML pages
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

  // 404
  await fs.copyFile('./404.html', './dist/404.html')
  console.log('  ✓ /404.html')

  await fs.rm('./dist/server', { recursive: true, force: true })
  console.log(`\n${routeKeys.length} páginas + render.json generados`)
}
