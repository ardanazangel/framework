export default {
  oxc: {
    jsx: { runtime: 'automatic' },
    exclude: [/\.html/]
  },
  environments: {
    ssr: {
      build: {
        copyPublicDir: false,
      },
    },
  },
  plugins: [
    {
      name: 'minify-html',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html
            .replace(/<!--(?!<!)[^\[>][\s\S]*?-->/g, '')
            .replace(/\s+/g, ' ')
            .replace(/> </g, '><')
            .trim()
        }
      }
    }
  ]
}
