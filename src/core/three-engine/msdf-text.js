import { THREE } from './index.js'

// ─── shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  uniform sampler2D uAtlas;
  uniform vec3      uColor;
  uniform float     uPxRange;
  uniform vec2      uAtlasSize;

  in  vec2 vUv;
  out vec4 fragColor;

  float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
  }

  void main() {
    vec2  msdfUnit = vec2(uPxRange) / uAtlasSize;
    vec2  screenPx = vec2(1.0) / fwidth(vUv);
    float pxRange  = max(0.5 * dot(msdfUnit, screenPx), 1.0);

    vec3  msd     = texture(uAtlas, vUv).rgb;
    float sd      = median(msd.r, msd.g, msd.b);
    float opacity = clamp(pxRange * (sd - 0.5) + 0.5, 0.0, 1.0);

    if (opacity < 0.001) discard;
    fragColor = vec4(uColor, opacity);
  }
`

// ─── font cache ───────────────────────────────────────────────────────────────

const fontCache = new Map() // url → { data, texture }

/**
 * Carga un font MSDF (JSON + PNG) y lo cachea.
 * Devuelve una Promise que resuelve con { data, texture }.
 *
 * @param {string} jsonUrl  - p.ej. '/fonts/nmb.json'
 */
export async function loadFont(jsonUrl) {
  if (fontCache.has(jsonUrl)) return fontCache.get(jsonUrl)

  const pngUrl = jsonUrl.replace(/\.json$/, '.png')

  const [data, texture] = await Promise.all([
    fetch(jsonUrl).then(r => r.json()),
    new THREE.TextureLoader().loadAsync(pngUrl),
  ])

  const font = { data, texture }
  fontCache.set(jsonUrl, font)
  return font
}

// ─── MSDFText ─────────────────────────────────────────────────────────────────

/**
 * Mesh con texto renderizado via MSDF.
 *
 * @param {string} text
 * @param {{ data, texture }} font   - resultado de loadFont()
 * @param {object} opts
 * @param {number} opts.fontSize     - altura en unidades de mundo
 * @param {string} opts.color        - color CSS
 * @param {'left'|'center'|'right'} opts.align
 */
export class MSDFText extends THREE.Mesh {
  constructor(text, font, { fontSize = 1, color = '#ffffff', align = 'center' } = {}) {
    const { data, texture } = font
    const { info, common, chars, kernings, distanceField } = data

    const atlasW = common.scaleW
    const atlasH = common.scaleH
    const scale  = fontSize / info.size

    const glyphMap = Object.fromEntries(chars.map(g => [g.char, g]))
    const kernMap  = Object.fromEntries(
      kernings.map(k => [`${k.first}/${k.second}`, k.amount])
    )

    // ancho total
    let totalWidth = 0
    for (let i = 0; i < text.length; i++) {
      const g = glyphMap[text[i]]
      if (!g) continue
      if (i > 0) totalWidth += (kernMap[`${text.charCodeAt(i-1)}/${text.charCodeAt(i)}`] ?? 0) * scale
      totalWidth += g.xadvance * scale
    }

    const originX = align === 'center' ? -totalWidth / 2
                  : align === 'right'  ? -totalWidth
                  : 0

    const pos = [], uvs = [], idx = []
    let cursor = originX
    let vi = 0

    for (let i = 0; i < text.length; i++) {
      const g = glyphMap[text[i]]
      if (!g) continue

      if (i > 0) cursor += (kernMap[`${text.charCodeAt(i-1)}/${text.charCodeAt(i)}`] ?? 0) * scale

      const centerY = (common.lineHeight / 2) * scale
      const x0   = cursor + g.xoffset * scale
      const x1   = x0 + g.width  * scale
      const y1   = centerY - g.yoffset * scale
      const y0   = y1 - g.height * scale
      const u0   = g.x / atlasW
      const u1   = (g.x + g.width) / atlasW
      const vTop = 1 - g.y / atlasH
      const vBot = 1 - (g.y + g.height) / atlasH

      pos.push(x0,y0,0, x1,y0,0, x1,y1,0, x0,y1,0)
      uvs.push(u0,vBot, u1,vBot, u1,vTop, u0,vTop)
      idx.push(vi, vi+1, vi+2, vi, vi+2, vi+3)
      vi += 4

      cursor += g.xadvance * scale
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(idx)

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas:    { value: texture },
        uColor:    { value: new THREE.Color(color) },
        uPxRange:  { value: distanceField.distanceRange },
        uAtlasSize:{ value: new THREE.Vector2(atlasW, atlasH) },
      },
      vertexShader:   VERT,
      fragmentShader: FRAG,
      glslVersion:    THREE.GLSL3,
      transparent:    true,
      depthWrite:     false,
    })

    super(geo, mat)

    this._width     = totalWidth
    this._advance   = totalWidth
    this._originX   = originX
    this._scale     = scale
    this._kernMap   = kernMap
    this._firstCode = text.charCodeAt(0)
    this._lastCode  = text.charCodeAt(text.length - 1)
  }

  /** Ancho visual del texto en unidades de mundo */
  get width() { return this._width }

  /** Cuánto avanza el cursor después de este texto (para composición letra a letra) */
  get advance() { return this._advance }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}

/**
 * Posiciona un array de MSDFText (cada uno con align:'left') en secuencia
 * y centra el grupo resultante en x=0.
 *
 * @param {MSDFText[]} letters
 * @param {number}     [kernScale=1]  multiplica el spacing entre letras
 */
export function layoutLetters(letters, kernScale = 1) {
  let cursor = 0
  for (let i = 0; i < letters.length; i++) {
    const curr = letters[i]
    // _originX es negativo en 'center'/'right': compensamos para que
    // el cursor tipografico quede en la posicion correcta
    curr.position.x = cursor - curr._originX

    let advance = curr.advance

    // kerning con la letra siguiente
    if (i < letters.length - 1) {
      const next = letters[i + 1]
      const kern = curr._kernMap[`${curr._lastCode}/${next._firstCode}`] ?? 0
      advance += kern * curr._scale
    }

    cursor += advance * kernScale
  }

  const offset = cursor / 2
  for (const l of letters) l.position.x -= offset
}
