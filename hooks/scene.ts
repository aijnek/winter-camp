// 冬の夜のキャンプ場を 1 枚の SVG として組み立てる。
// fill は context 利用率 (0〜1) で、月の満ち欠けと月明かりの強さを決める。

// 原画は 4:1 の横長で、x は X0 (左端) から W (右端) まで。画面には右下を基準に
// 高さを合わせて収める (xMaxYMax slice) ので、4:1 より縦長の画面では高さがすべて見え、
// 左側だけが切れる。テントと月は右端から 450 以内に置き、縦長の画面でも残るようにする。
const X0 = -2000
const W = 1600
const H = 900

function mulberry32(seed: number): () => number {
  let a = seed

  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const out = [0, 1, 2].map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t))

  return '#' + out.map(v => v.toString(16).padStart(2, '0')).join('')
}

const n = (v: number) => v.toFixed(1)

function tri(x: number): number {
  const f = x - Math.floor(x)

  return 1 - Math.abs(f * 2 - 1)
}

// 三角波を重ねた稜線。period が長いほど大きな山になる。
function ridge(seed: number, base: number, amp: number, period: number): string {
  const rand = mulberry32(seed)
  const p = [rand(), rand(), rand()]
  let d = `M${X0},${H}`

  for (let x = X0; x <= W; x += 16) {
    const y =
      base -
      amp * (0.55 * tri(x / period + p[0]!) + 0.3 * tri(x / (period * 0.43) + p[1]!) + 0.15 * tri(x / (period * 0.17) + p[2]!)) -
      rand() * amp * 0.04
    d += `L${x},${n(y)}`
  }

  return d + `L${W},${H}Z`
}

function pine(x: number, ground: number, height: number): string {
  const w = height * 0.36
  let d = ''

  for (let i = 0; i < 4; i++) {
    const top = ground - height + (height * 0.2) * i
    const half = w * (0.35 + 0.22 * i)
    d += `M${n(x)},${n(top)}L${n(x + half)},${n(top + height * 0.36)}L${n(x - half)},${n(top + height * 0.36)}Z`
  }

  return d + `M${n(x - 2)},${n(ground - height * 0.1)}h4v${n(height * 0.1)}h-4Z`
}

const FAR = ridge(11, 665, 250, 620)
const MID = ridge(23, 725, 150, 380)
const NEAR = ridge(37, 770, 90, 240)

const PINES = (() => {
  const rand = mulberry32(5)
  let d = ''

  // 中央は文字が載るので、木は左右の端に寄せる。
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? rand() * 430 : W - rand() * 380
    d += pine(side, 800 + rand() * 60, 70 + rand() * 120)
  }

  // 横長の画面でだけ見える左側にも、まばらに木を置く。
  for (let i = 0; i < 30; i++) {
    d += pine(X0 + rand() * (-X0 - 80), 800 + rand() * 60, 60 + rand() * 110)
  }

  return d
})()

// 星は明るさ 8 段階 × またたきの 4 組に分け、組ごとに 1 本の path で点を打つ。
// 長さ 0 の線に丸い端を付けると点になるので、1 個ずつ circle を書くより短く済む。
const LEVELS = 8
const levelBrightness = (level: number) => 0.18 + (0.82 * (level + 0.5)) / LEVELS

type Bucket = { dots: string; warm: string; cool: string }

const STARS: Bucket[][] = (() => {
  const rand = mulberry32(99)
  const buckets: Bucket[][] = [0, 1, 2, 3].map(() =>
    Array.from({ length: LEVELS }, () => ({ dots: '', warm: '', cool: '' })),
  )
  const put = (x: number, y: number, b: number) => {
    const level = Math.min(LEVELS - 1, Math.floor(((b - 0.18) / 0.82) * LEVELS))
    const bucket = buckets[Math.floor(rand() * 4)]![level]!
    const dot = `M${Math.round(x)} ${Math.round(y)}h0`
    bucket.dots += dot
    // 特に明るい星には淡いにじみを付け、青白い星と暖色の星を混ぜる。
    if (level >= 5) {
      if (rand() < 0.35) {
        bucket.warm += dot
      } else {
        bucket.cool += dot
      }
    }
  }

  for (let i = 0; i < 1800; i++) {
    // 明るい星は少なく、暗い星を多くする。
    put(X0 + rand() * (W - X0), rand() * 660, 0.2 + 0.8 * Math.pow(rand(), 2.6))
  }

  // 天の川の帯に沿って暗い星を密に置く。月が満ちると最初に消える。
  const cos = Math.cos((-28 * Math.PI) / 180)
  const sin = Math.sin((-28 * Math.PI) / 180)
  for (let i = 0; i < 450; i++) {
    const along = (rand() * 2 - 1) * 950
    const across = (rand() + rand() + rand() - 1.5) * 110
    const x = 620 + along * cos - across * sin
    const y = 250 + along * sin + across * cos
    if (x > W || y < 0 || y > 660) {
      continue
    }
    put(x, y, 0.18 + 0.3 * rand())
  }

  return buckets
})()

function stars(fill: number): string {
  return STARS.map((levels, group) => {
    let body = ''

    levels.forEach((bucket, level) => {
      const b = levelBrightness(level)
      // 月明かりが強いほど全体が沈み、暗い星から見えなくなる。
      const opacity = Math.min(1, b * 1.25) * (1 - 0.45 * fill) - 0.3 * fill
      if (opacity <= 0.04 || bucket.dots === '') {
        return
      }
      const width = 2 * (0.4 + b * 1.4)
      const glow = (opacity * 0.16).toFixed(2)
      if (bucket.warm !== '') {
        body += `<path d="${bucket.warm}" stroke="#ffe2c2" stroke-width="${n(width * 3.2)}" opacity="${glow}"/>`
      }
      if (bucket.cool !== '') {
        body += `<path d="${bucket.cool}" stroke="#cfe0ff" stroke-width="${n(width * 3.2)}" opacity="${glow}"/>`
      }
      body += `<path d="${bucket.dots}" stroke-width="${n(width)}" opacity="${opacity.toFixed(2)}"/>`
    })

    return `<g class="${group === 0 ? '' : 'tw' + group}">${body}</g>`
  }).join('')
}

// 影の側は空と同じ色の円で星だけを隠し、その上に光の輪を重ねるので輪郭は見えない。
function moon(fill: number, sky: string): string {
  const cx = 1340
  const cy = 215
  const r = 52
  const lit = 0.05 + 0.95 * fill
  const rx = r * Math.abs(1 - 2 * lit)
  const sweep = lit < 0.5 ? 0 : 1
  // 光の輪の中心は、欠けているあいだは光っている縁の側へ寄せる。
  const glow = r * 0.75 * (1 - fill)
  const shape = `M${cx},${cy - r}A${r},${r} 0 0 1 ${cx},${cy + r}A${n(rx)},${r} 0 0 ${sweep} ${cx},${cy - r}Z`

  return `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${sky}"/>
<circle cx="${n(cx + glow * 0.914)}" cy="${n(cy - glow * 0.407)}" r="${n(135 + 450 * fill)}" fill="url(#halo)" opacity="${(0.12 + 0.5 * fill).toFixed(2)}"/>
<path d="${shape}" fill="#f4f1e4" transform="rotate(-24 ${cx} ${cy})"/>`
}

// 流れ星は描くたびに位置、向き、間隔を乱数で決め直す。
// SVG の中では乱数を使えないので、描き直し (context 利用率が変わったとき) ごとに並びが変わる。
function meteors(): { css: string; body: string } {
  let css = ''
  let body = ''

  for (let i = 0; i < 6; i++) {
    const x = 120 + Math.random() * 1360
    const y = 60 + Math.random() * 380
    // 0 度が右向き、90 度が真下。-20〜200 度を 6 等分して 1 本ずつ割り当て、向きが偏らないようにする。
    const angle = -20 + (i + Math.random()) * (220 / 6)
    const travel = 180 + Math.random() * 220
    const period = 40 + Math.random() * 50
    const delay = Math.random() * period
    const seen = ((0.6 + Math.random() * 0.5) / period) * 100
    css += `.m${i}{animation:f${i} ${n(period)}s linear ${n(delay)}s infinite}
@keyframes f${i}{0%{opacity:0;transform:translateX(0)}${(seen * 0.2).toFixed(2)}%{opacity:1}${seen.toFixed(2)}%{opacity:0;transform:translateX(${n(travel)}px)}100%{opacity:0;transform:translateX(${n(travel)}px)}}
`
    body += `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})"><path class="m${i}" d="M0,0L110,-1.3L110,1.3Z" opacity="0"/></g>
`
  }

  return { css, body }
}

export function scene(fill: number): string {
  const f = Math.min(1, Math.max(0, fill))
  const skyTop = mix('#050816', '#101c3d', f)
  const skyLow = mix('#131d3b', '#33487a', f)
  const farTop = mix('#34415f', '#7388b5', f)
  const farLow = mix('#1b2644', '#3f5486', f)
  const mid = mix('#141d38', '#263762', f)
  const near = mix('#0a1022', '#111a33', f)
  const snow = mix('#1d2848', '#5b6f9c', f)
  const trees = mix('#050912', '#080e1d', f)
  const shooting = meteors()

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X0} 0 ${W - X0} ${H}" preserveAspectRatio="xMaxYMax slice">
<style>
.tw1{animation:tw 7s ease-in-out infinite}
.tw2{animation:tw 9s ease-in-out -3s infinite}
.tw3{animation:tw 11s ease-in-out -6s infinite}
.lamp{animation:lamp 8s ease-in-out infinite}
${shooting.css}@keyframes tw{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes lamp{0%,100%{opacity:.9}50%{opacity:.7}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyLow}"/></linearGradient>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="${farTop}"/><stop offset=".85" stop-color="${farLow}"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".9"/><stop offset=".25" stop-color="#b9c9f5" stop-opacity=".35"/><stop offset=".6" stop-color="#b9c9f5" stop-opacity=".08"/><stop offset="1" stop-color="#b9c9f5" stop-opacity="0"/></radialGradient>
<linearGradient id="trail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="110" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<radialGradient id="milky"><stop offset="0" stop-color="#aebdf0"/><stop offset="1" stop-color="#aebdf0" stop-opacity="0"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="#ffc56e" stop-opacity=".8"/><stop offset="1" stop-color="#ffc56e" stop-opacity="0"/></radialGradient>
</defs>
<rect x="${X0}" width="${W - X0}" height="${H}" fill="url(#sky)"/>
<ellipse cx="620" cy="250" rx="900" ry="150" transform="rotate(-28 620 250)" fill="url(#milky)" opacity="${(0.26 * (1 - f)).toFixed(3)}"/>
<g fill="none" stroke="#eef2ff" stroke-linecap="round">${stars(f)}</g>
<g fill="url(#trail)" opacity="${(1 - 0.5 * f).toFixed(2)}">
${shooting.body}</g>
${moon(f, mix(skyTop, skyLow, 0.24))}
<path d="${FAR}" fill="url(#far)"/>
<path d="${MID}" fill="${mid}"/>
<path d="${NEAR}" fill="${near}"/>
<rect x="${X0}" y="820" width="${W - X0}" height="80" fill="${snow}"/>
<path d="M${X0},826Q-1600,806 -1200,824T-400,818T0,830Q400,800 800,824T${W},812V${H}H${X0}Z" fill="${snow}"/>
<path d="${PINES}" fill="${trees}"/>
<g transform="translate(1290 792)">
<ellipse class="lamp" cx="0" cy="26" rx="120" ry="34" fill="url(#warm)" opacity=".9"/>
<path d="M-44,30L0,-26L44,30Z" fill="#c9853a"/>
<path d="M-9,30L0,2L9,30Z" fill="#ffd58a"/>
<path d="M0,-26L44,30H30Z" fill="#8f5a24"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(176 0)">
<g stroke="#a9825a" stroke-width="1.3"><circle cx="-106" cy="19" r="10.5"/><circle cx="-70" cy="19" r="10.5"/></g>
<path d="M-106,19L-91,20L-95,3L-106,19M-95,3L-76,4M-91,20L-75,8M-77,1L-75,8L-70,19M-96,-1L-95,3" stroke="#e3b06a" stroke-width="1.6"/>
<path d="M-99,-1.5H-92M-77,1L-73,0.5Q-68.500,0.5 -68.500,4.500Q-68.500,7.500 -71.500,7.500" stroke="#8a6f52" stroke-width="1.8"/>
</g>
</g>
</svg>`
}
