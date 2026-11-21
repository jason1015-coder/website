// The table's companion: a small pixel pet that sits on the desk next to the
// sand table and reports on the map through its LCD screen.

import * as THREE from 'three'

export type PetMood = 'loading' | 'live' | 'error'

export interface PetState {
  mood: PetMood
  headline: string
  detail: string
  /** 0..1, drawn as hearts on the screen. */
  progress: number
}

export interface Tamagotchi {
  group: THREE.Group
  setState(state: Partial<PetState>): void
  update(elapsed: number, camera: THREE.Camera): void
  dispose(): void
}

const SCREEN_W = 256
const SCREEN_H = 208
const INK = '#2c3a2f'
const LCD = '#b9cf9f'

export function createTamagotchi(): Tamagotchi {
  const group = new THREE.Group()

  const shellMaterial = new THREE.MeshStandardMaterial({ color: '#7ed3ab', roughness: 0.34, metalness: 0.06 })
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#f2e7cd', roughness: 0.5, metalness: 0.02 })
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#2b3a33', roughness: 0.6 })
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: '#f2a3b3', roughness: 0.4 })

  const geometries: THREE.BufferGeometry[] = [new THREE.SphereGeometry(0.92, 40, 28)]
  const body = new THREE.Mesh(geometries[0], shellMaterial)
  body.scale.set(1, 1.12, 0.82)
  body.position.y = 1.03
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // The screen sits proud of the shell (the egg's surface at eye height is
  // around z = 0.74), with a dark housing plate so it reads as inset.
  const housingGeometry = new THREE.PlaneGeometry(1.2, 0.98)
  geometries.push(housingGeometry)
  const housing = new THREE.Mesh(housingGeometry, darkMaterial)
  housing.position.set(0, 1.16, 0.785)
  housing.rotation.x = -0.1
  group.add(housing)

  const { ctx, texture } = screenCanvas()
  const screenGeometry = new THREE.PlaneGeometry(1.04, 0.85)
  geometries.push(screenGeometry)
  const screenMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false })
  const screen = new THREE.Mesh(screenGeometry, screenMaterial)
  screen.position.set(0, 1.16, 0.795)
  screen.rotation.x = -0.1
  group.add(screen)

  for (const x of [-0.3, 0, 0.3]) {
    const geometry = new THREE.CylinderGeometry(0.072, 0.072, 0.08, 18)
    geometries.push(geometry)
    const button = new THREE.Mesh(geometry, buttonMaterial)
    button.rotation.x = Math.PI / 2
    button.position.set(x, 0.67, 0.7)
    button.castShadow = true
    group.add(button)
  }

  const footGeometry = new THREE.SphereGeometry(0.2, 20, 14)
  geometries.push(footGeometry)
  for (const x of [-0.4, 0.4]) {
    const foot = new THREE.Mesh(footGeometry, darkMaterial)
    foot.scale.set(1, 0.62, 1.2)
    foot.position.set(x, 0.1, 0.12)
    foot.castShadow = true
    group.add(foot)
  }

  const ringGeometry = new THREE.TorusGeometry(0.17, 0.048, 12, 26)
  geometries.push(ringGeometry)
  const ring = new THREE.Mesh(ringGeometry, trimMaterial)
  ring.position.set(0, 2.09, 0)
  group.add(ring)

  const state: PetState = { mood: 'loading', headline: 'surveying', detail: 'github…', progress: 0 }
  let dirty = true
  let lastDraw = -1

  function setState(next: Partial<PetState>) {
    if (next.mood !== undefined && next.mood !== state.mood) {
      state.mood = next.mood
      dirty = true
    }
    if (next.headline !== undefined && next.headline !== state.headline) {
      state.headline = next.headline
      dirty = true
    }
    if (next.detail !== undefined && next.detail !== state.detail) {
      state.detail = next.detail
      dirty = true
    }
    if (next.progress !== undefined && next.progress !== state.progress) {
      state.progress = next.progress
      dirty = true
    }
  }

  function draw(blink: boolean) {
    ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)

    // Bezel and LCD, both slightly rounded.
    ctx.fillStyle = '#24322a'
    roundedRect(ctx, 4, 4, SCREEN_W - 8, SCREEN_H - 8, 22)
    ctx.fill()
    ctx.fillStyle = LCD
    roundedRect(ctx, 18, 18, SCREEN_W - 36, SCREEN_H - 36, 14)
    ctx.fill()

    // Faint pixel grid, like a real LCD.
    ctx.fillStyle = 'rgba(70,90,66,0.07)'
    for (let x = 18; x < SCREEN_W - 18; x += 4) ctx.fillRect(x, 18, 1, SCREEN_H - 36)

    // Hearts: how much of the city has been fetched.
    const filled = Math.round(state.progress * 5)
    for (let i = 0; i < 5; i += 1) {
      drawHeart(ctx, 32 + i * 22, 34, 8, i < filled)
    }

    const mood = state.mood
    const cx = 76
    const cy = 92
    if (mood === 'error') {
      drawPet(ctx, cx, cy, 'sad', blink)
      drawCross(ctx, 170, 74, 10)
      drawCross(ctx, 176, 104, 7)
    } else if (mood === 'loading') {
      drawPet(ctx, cx, cy, 'walk', blink)
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = INK
        ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((lastDraw + i * 0.9) * 0.004))
        ctx.fillRect(156 + i * 18, 96, 9, 9)
      }
      ctx.globalAlpha = 1
    } else {
      drawPet(ctx, cx, cy, 'happy', blink)
      for (let i = 0; i < 3; i += 1) {
        const sway = Math.sin(lastDraw * 0.002 + i) * 3
        ctx.fillStyle = 'rgba(44,58,47,0.55)'
        ctx.fillRect(166 + i * 16, 78 + sway, 4, 18)
      }
    }

    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.font = '600 17px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(clip(state.headline, 24), 30, 155)
    ctx.font = '400 15px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = 'rgba(44,58,47,0.72)'
    ctx.fillText(clip(state.detail, 27), 30, 177)

    texture.needsUpdate = true
  }

  draw(false)

  return {
    group,
    setState,
    update(elapsed, camera) {
      // The scene places the pet on the desk; bob around that height, not zero.
      const baseY: number = group.userData.baseY ?? group.position.y
      group.userData.baseY = baseY
      group.position.y = baseY + Math.sin(elapsed * 1.7) * 0.028
      group.rotation.z = Math.sin(elapsed * 0.9) * 0.018
      group.rotation.y = Math.atan2(camera.position.x - group.position.x, camera.position.z - group.position.z)

      const blink = Math.sin(elapsed * 2.1) > 0.985
      if (dirty || elapsed - lastDraw > 0.42) {
        lastDraw = elapsed
        dirty = false
        draw(blink)
      }
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose()
      shellMaterial.dispose()
      trimMaterial.dispose()
      darkMaterial.dispose()
      buttonMaterial.dispose()
      screenMaterial.dispose()
      texture.dispose()
    },
  }
}

function screenCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = SCREEN_W
  canvas.height = SCREEN_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is unavailable in this browser.')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return { canvas, ctx, texture }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean) {
  ctx.fillStyle = filled ? INK : 'rgba(44,58,47,0.2)'
  ctx.fillRect(x, y + size * 0.25, size * 0.4, size * 0.4)
  ctx.fillRect(x + size * 0.6, y + size * 0.25, size * 0.4, size * 0.4)
  ctx.fillRect(x, y, size * 0.4, size * 0.4)
  ctx.fillRect(x + size * 0.6, y, size * 0.4, size * 0.4)
  ctx.fillRect(x + size * 0.2, y + size * 0.6, size * 0.6, size * 0.4)
}

function drawPet(ctx: CanvasRenderingContext2D, x: number, y: number, mood: 'happy' | 'sad' | 'walk', blink: boolean) {
  const cell = 9
  ctx.fillStyle = INK
  // Body: a chunky 6x5 pixel blob.
  ctx.fillRect(x, y, cell * 5, cell * 4)
  ctx.fillRect(x + cell, y - cell, cell * 3, cell)
  ctx.fillRect(x - cell * 0.5, y + cell, cell * 0.5, cell * 2)
  ctx.fillRect(x + cell * 5, y + cell, cell * 0.5, cell * 2)

  // Clear the face area and draw eyes + mouth.
  ctx.fillStyle = LCD
  ctx.fillRect(x + cell * 0.6, y + cell * 0.6, cell * 3.8, cell * 2.2)

  ctx.fillStyle = INK
  if (blink) {
    ctx.fillRect(x + cell * 1.1, y + cell * 1.5, cell * 0.9, cell * 0.25)
    ctx.fillRect(x + cell * 3, y + cell * 1.5, cell * 0.9, cell * 0.25)
  } else {
    ctx.fillRect(x + cell * 1.1, y + cell, cell * 0.9, cell)
    ctx.fillRect(x + cell * 3, y + cell, cell * 0.9, cell)
  }

  if (mood === 'happy') {
    ctx.fillRect(x + cell * 1.7, y + cell * 2.4, cell * 1.6, cell * 0.3)
    ctx.fillRect(x + cell * 1.4, y + cell * 2.1, cell * 0.3, cell * 0.3)
    ctx.fillRect(x + cell * 3.3, y + cell * 2.1, cell * 0.3, cell * 0.3)
  } else if (mood === 'sad') {
    ctx.fillRect(x + cell * 1.7, y + cell * 2.7, cell * 1.6, cell * 0.3)
    ctx.fillRect(x + cell * 1.4, y + cell * 2.4, cell * 0.3, cell * 0.3)
    ctx.fillRect(x + cell * 3.3, y + cell * 2.4, cell * 0.3, cell * 0.3)
  } else {
    ctx.fillRect(x + cell * 1.9, y + cell * 2.4, cell * 1.2, cell * 0.35)
  }
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = 'rgba(44,58,47,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - size, y - size)
  ctx.lineTo(x + size, y + size)
  ctx.moveTo(x + size, y - size)
  ctx.lineTo(x - size, y + size)
  ctx.stroke()
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
