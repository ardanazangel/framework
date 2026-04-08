export default {
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
