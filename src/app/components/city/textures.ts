// Procedural canvas textures: sand, wood, engraved labels. Keeping them here
// means the table needs no image assets and stays crisp at any zoom.

import * as THREE from 'three'

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is unavailable in this browser.')
  return { canvas, ctx }
}

function finish(canvas: HTMLCanvasElement, repeat?: [number, number]): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeat[0], repeat[1])
  }
  return texture
}

export function makeSandTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = surface(512, 512)
  ctx.fillStyle = '#c7b189'
  ctx.fillRect(0, 0, 512, 512)

  // Mottled base so the surface does not read as flat paint.
  for (let i = 0; i < 3400; i += 1) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const radius = Math.random() * 1.9 + 0.3
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,246,220,0.10)' : 'rgba(96,76,48,0.10)'
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Raked ripples, the thing that makes a sand table look touched.
  for (let y = 6; y < 512; y += 11) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(92,72,44,${0.05 + Math.random() * 0.04})`
    ctx.lineWidth = 0.8
    for (let x = 0; x <= 512; x += 8) {
      const wave = Math.sin(x * 0.028 + y * 0.12) * 1.7 + Math.sin(x * 0.071) * 0.8
      if (x === 0) ctx.moveTo(x, y + wave)
      else ctx.lineTo(x, y + wave)
    }
    ctx.stroke()
  }

  return finish(canvas, [3, 2])
}

export function makeWoodTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = surface(512, 512)
  ctx.fillStyle = '#5f4530'
  ctx.fillRect(0, 0, 512, 512)

  for (let x = 0; x < 512; x += 2) {
    const tone = Math.sin(x * 0.09) * 10 + Math.sin(x * 0.021 + 1.4) * 14
    ctx.fillStyle = `rgba(${48 + tone},${32 + tone * 0.7},${20 + tone * 0.5},0.35)`
    ctx.fillRect(x, 0, 2, 512)
  }
  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    ctx.strokeStyle = Math.random() > 0.4 ? 'rgba(26,18,12,0.16)' : 'rgba(120,88,60,0.12)'
    ctx.lineWidth = Math.random() * 1.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.random() * 5 - 2.5, y + Math.random() * 90 + 20)
    ctx.stroke()
  }

  return finish(canvas, [2, 1])
}

export function makeGlowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = surface(256, 256)
  const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 126)
  gradient.addColorStop(0, 'rgba(255,226,178,0.5)')
  gradient.addColorStop(0.45, 'rgba(255,205,140,0.16)')
  gradient.addColorStop(1, 'rgba(255,205,140,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return finish(canvas)
}

export function makeContactShadow(): THREE.CanvasTexture {
  const { canvas, ctx } = surface(128, 128)
  const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)')
  gradient.addColorStop(0.6, 'rgba(0,0,0,0.18)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  return finish(canvas)
}

export function makeDistrictLabel(name: string, detail: string): THREE.CanvasTexture {
  const { canvas, ctx } = surface(1024, 176)
  ctx.clearRect(0, 0, 1024, 176)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = 'rgba(38,28,16,0.78)'
  ctx.font = '600 54px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(name.toUpperCase(), 512, 62, 960)

  ctx.fillStyle = 'rgba(54,40,22,0.6)'
  ctx.font = '400 34px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(detail, 512, 124, 960)

  return finish(canvas)
}

export function makePlaque(owner: string, caption: string): THREE.CanvasTexture {
  const { canvas, ctx } = surface(1024, 160)
  const gradient = ctx.createLinearGradient(0, 0, 0, 160)
  gradient.addColorStop(0, '#d9bd85')
  gradient.addColorStop(0.5, '#c2a268')
  gradient.addColorStop(1, '#a98a55')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 160)

  ctx.strokeStyle = 'rgba(72,52,24,0.5)'
  ctx.lineWidth = 5
  ctx.strokeRect(18, 18, 988, 124)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3d2d15'
  ctx.font = '600 44px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(owner, 512, 62)
  ctx.font = '400 30px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillStyle = 'rgba(61,45,21,0.72)'
  ctx.fillText(caption, 512, 108)

  return finish(canvas)
}
