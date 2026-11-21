// The sand table itself: a wooden tray of sand with one district per
// repository and one instanced building per file. Everything is three.js,
// driven imperatively so a few hundred buildings stay cheap.

import * as THREE from 'three'

import { layoutBuildings, layoutDistricts, type Building, type Plot } from '../../lib/cityLayout'
import { CITY_OWNER, fileUrl, type CityFile, type DistrictData, type RepoSummary } from '../../lib/githubCity'
import { createTamagotchi, type PetMood, type Tamagotchi } from './tamagotchi'
import {
  makeContactShadow,
  makeDistrictLabel,
  makeGlowTexture,
  makePlaque,
  makeSandTexture,
  makeWoodTexture,
} from './textures'

const TABLE_W = 18.8
const TABLE_D = 13.4
const SAND_TOP = 0.14
const PLATE_H = 0.1
const DESK_Y = -1.95
const BUILDING_BASE = SAND_TOP + PLATE_H
const LABEL_BAND = 0.55
const PET_POSITION = new THREE.Vector3(10.8, DESK_Y, 3.4)

const PLATE_COLOURS = ['#b6a17d', '#ae9a80', '#bfa67f', '#a99a86', '#c0ac87', '#b5a58a']

export interface HoverPayload {
  kind: 'file' | 'repo'
  title: string
  subtitle: string
  lines: number
  bytes: number
  files?: number
  shown?: number
  stars?: number
  language?: string
  color?: string
  url: string
  hint: string
}

export interface HoverEvent {
  payload: HoverPayload
  x: number
  y: number
}

export interface CityStats {
  districts: number
  buildings: number
  lines: number
  bytes: number
}

export interface CityCallbacks {
  onHover: (event: HoverEvent | null) => void
  onStats: (stats: CityStats) => void
}

interface DistrictNode {
  repo: RepoSummary
  plot: Plot
  buildings: THREE.Group
  mesh: THREE.InstancedMesh | null
  data: DistrictData | null
  files: CityFile[]
  layout: Building[]
  plate: THREE.Mesh
  label: THREE.Mesh
  labelTexture: THREE.CanvasTexture
  appear: number
}

export class CityScene {
  private readonly container: HTMLElement
  private readonly callbacks: CityCallbacks
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock = new THREE.Clock()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2(0, 0)
  private readonly pointerPx = { x: 0, y: 0 }
  private readonly nodes = new Map<string, DistrictNode>()
  private readonly highlight: THREE.LineSegments
  private readonly pet: Tamagotchi
  private readonly observer: ResizeObserver
  private readonly reducedMotion: boolean
  private raf = 0
  private disposed = false
  private hovered: DistrictNode | null = null
  private hoveredFile: CityFile | null = null
  private hoverKey = ''
  private pointerInside = false
  private dragging = false
  private dragDistance = 0
  private lastPointer = { x: 0, y: 0 }
  private lastInput = 0
  private yaw = 0.72
  private pitch = 0.72
  private distance = 27
  private readonly target = new THREE.Vector3(0, 0.9, 0.3)
  private frame = 0

  constructor(container: HTMLElement, callbacks: CityCallbacks) {
    this.container = container
    this.callbacks = callbacks
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // The buildings only move while a district rises; the rest of the time the
    // shadow map is static, which keeps the table cheap on small GPUs.
    this.renderer.shadowMap.autoUpdate = false
    this.renderer.shadowMap.needsUpdate = true
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    container.appendChild(this.renderer.domElement)

    this.scene.fog = new THREE.FogExp2(0x0a0c0b, 0.012)

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 120)
    this.camera.position.set(17, 20, 18)

    this.buildTable()
    this.buildLights()

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))
    const highlightMaterial = new THREE.LineBasicMaterial({ color: '#f2ffb0', transparent: true, opacity: 0.95 })
    this.highlight = new THREE.LineSegments(highlightGeometry, highlightMaterial)
    this.highlight.visible = false
    this.scene.add(this.highlight)

    this.pet = createTamagotchi()
    this.pet.group.scale.setScalar(1.45)
    this.pet.group.position.copy(PET_POSITION)
    this.scene.add(this.pet.group)

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(container)
    this.resize()
    this.attach()
    this.updateCamera()
    this.tick()
  }

  setRepos(repos: RepoSummary[]): void {
    for (const node of this.nodes.values()) this.removeNode(node)
    this.nodes.clear()
    this.hovered = null
    this.hoveredFile = null

    for (const plot of layoutDistricts(repos)) this.addNode(plot)
    this.renderer.shadowMap.needsUpdate = true
    this.emitStats()
  }

  setDistrict(data: DistrictData): void {
    const node = this.nodes.get(data.repo)
    if (!node) return
    const firstBuild = node.mesh === null
    node.data = data
    node.files = data.files

    const labelTexture = makeDistrictLabel(
      node.repo.name,
      `${data.files.length} buildings · ${data.lines.toLocaleString('en-GB')} lines`,
    )
    node.labelTexture.dispose()
    node.labelTexture = labelTexture
    const labelMaterial = node.label.material as THREE.MeshBasicMaterial
    labelMaterial.map = labelTexture
    labelMaterial.needsUpdate = true

    const inner = {
      x: node.plot.rect.x,
      z: node.plot.rect.z - LABEL_BAND / 2,
      w: node.plot.rect.w,
      d: node.plot.rect.d - LABEL_BAND,
    }
    node.layout = layoutBuildings(data.files, inner)

    if (node.mesh) {
      node.buildings.remove(node.mesh)
      node.mesh.geometry.dispose()
      ;(node.mesh.material as THREE.Material).dispose()
      node.mesh = null
    }

    if (node.layout.length > 0) {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      geometry.translate(0, 0.5, 0)
      const material = new THREE.MeshStandardMaterial({ roughness: 0.58, metalness: 0.1 })
      const mesh = new THREE.InstancedMesh(geometry, material, node.layout.length)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.node = node

      const matrix = new THREE.Matrix4()
      const quaternion = new THREE.Quaternion()
      const position = new THREE.Vector3()
      const scale = new THREE.Vector3()
      const colour = new THREE.Color()

      node.layout.forEach((building, index) => {
        position.set(building.x, 0, building.z)
        scale.set(building.w, building.h, building.d)
        matrix.compose(position, quaternion, scale)
        mesh.setMatrixAt(index, matrix)
        mesh.setColorAt(index, colour.set(building.color))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()

      node.mesh = mesh
      node.buildings.add(mesh)
      // Only the first batch of a district rises out of the sand; later
      // batches (files still streaming in) must not make it pop again.
      if (firstBuild) {
        node.buildings.scale.y = this.reducedMotion ? 1 : 0.001
        node.appear = this.reducedMotion ? 1 : 0
      }
    }

    this.renderer.shadowMap.needsUpdate = true
    this.emitStats()
  }

  setPet(state: { mood: PetMood; headline: string; detail: string; progress: number }): void {
    this.pet.setState(state)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.detach()
    this.observer.disconnect()
    this.pet.dispose()
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          const map = (material as THREE.MeshStandardMaterial).map
          if (map) map.dispose()
          material.dispose()
        }
      }
    })
    this.nodes.clear()
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  // -- scene ---------------------------------------------------------------

  private buildTable(): void {
    const sandTexture = makeSandTexture()
    const woodTexture = makeWoodTexture()

    const deskGeometry = new THREE.PlaneGeometry(90, 90)
    const deskMaterial = new THREE.MeshStandardMaterial({ color: '#0d1210', roughness: 0.97, metalness: 0 })
    const desk = new THREE.Mesh(deskGeometry, deskMaterial)
    desk.rotation.x = -Math.PI / 2
    desk.position.y = DESK_Y
    desk.receiveShadow = true
    this.scene.add(desk)

    const glowGeometry = new THREE.PlaneGeometry(34, 26)
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: makeGlowTexture(),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = DESK_Y + 0.01
    this.scene.add(glow)

    const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.78, metalness: 0.04 })
    const slab = new THREE.Mesh(new THREE.BoxGeometry(TABLE_W, 0.55, TABLE_D), woodMaterial)
    slab.position.y = -0.275
    slab.castShadow = true
    slab.receiveShadow = true
    this.scene.add(slab)

    const rimDepth = 0.42
    const rimHeight = 0.62
    const rimPieces: [number, number, number, number, number][] = [
      [TABLE_W, rimHeight, rimDepth, 0, TABLE_D / 2 - rimDepth / 2],
      [TABLE_W, rimHeight, rimDepth, 0, -(TABLE_D / 2 - rimDepth / 2)],
      [rimDepth, rimHeight, TABLE_D - rimDepth * 2, TABLE_W / 2 - rimDepth / 2, 0],
      [rimDepth, rimHeight, TABLE_D - rimDepth * 2, -(TABLE_W / 2 - rimDepth / 2), 0],
    ]
    for (const [width, height, depth, x, z] of rimPieces) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), woodMaterial)
      piece.position.set(x, height / 2, z)
      piece.castShadow = true
      piece.receiveShadow = true
      this.scene.add(piece)
    }

    const legMaterial = new THREE.MeshStandardMaterial({ color: '#2c2018', roughness: 0.85 })
    for (const x of [-(TABLE_W / 2 - 1.1), TABLE_W / 2 - 1.1]) {
      for (const z of [-(TABLE_D / 2 - 1.1), TABLE_D / 2 - 1.1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), legMaterial)
        leg.position.set(x, -0.55 - 0.7, z)
        leg.castShadow = true
        this.scene.add(leg)
      }
    }

    const sand = new THREE.Mesh(
      new THREE.BoxGeometry(TABLE_W - 1.0, SAND_TOP, TABLE_D - 1.0),
      new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 0.98, metalness: 0 }),
    )
    sand.position.y = SAND_TOP / 2
    sand.receiveShadow = true
    this.scene.add(sand)

    const plaqueMaterial = new THREE.MeshStandardMaterial({
      map: makePlaque(CITY_OWNER, 'every repo a district · every file a building'),
      roughness: 0.42,
      metalness: 0.5,
    })
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.84), plaqueMaterial)
    plaque.position.set(0, 0.33, TABLE_D / 2 + 0.01)
    this.scene.add(plaque)

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: makeContactShadow(),
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
    const petShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), shadowMaterial)
    petShadow.rotation.x = -Math.PI / 2
    petShadow.position.set(PET_POSITION.x, DESK_Y + 0.012, PET_POSITION.z)
    this.scene.add(petShadow)
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffe7c2, 0x101815, 0.75))

    const key = new THREE.DirectionalLight(0xfff0d2, 2.4)
    key.position.set(9, 17, 10)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -17
    key.shadow.camera.right = 17
    key.shadow.camera.top = 17
    key.shadow.camera.bottom = -17
    key.shadow.camera.near = 1
    key.shadow.camera.far = 60
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    this.scene.add(key)

    const rim = new THREE.DirectionalLight(0x8fb6ff, 0.7)
    rim.position.set(-12, 8, -10)
    this.scene.add(rim)

    const fill = new THREE.PointLight(0xffcf94, 40, 34, 2)
    fill.position.set(0, 12, 6)
    this.scene.add(fill)
  }

  private addNode(plot: Plot): void {
    const { rect, repo, index } = plot

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(rect.w, PLATE_H, rect.d),
      new THREE.MeshStandardMaterial({
        color: PLATE_COLOURS[index % PLATE_COLOURS.length],
        roughness: 0.9,
        metalness: 0,
      }),
    )
    plate.position.set(rect.x, SAND_TOP + PLATE_H / 2, rect.z)
    plate.receiveShadow = true
    plate.userData.node = null
    this.scene.add(plate)

    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(rect.w, PLATE_H, rect.d)),
      new THREE.LineBasicMaterial({ color: '#6c5a3c', transparent: true, opacity: 0.45 }),
    )
    border.position.copy(plate.position)
    this.scene.add(border)

    const labelTexture = makeDistrictLabel(repo.name, `${repo.language ?? 'repository'} · ${formatKb(repo.sizeKb)}`)
    const labelWidth = Math.min(rect.w * 0.8, 3.2)
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(labelWidth, labelWidth * (176 / 1024)),
      new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false, toneMapped: false }),
    )
    label.rotation.x = -Math.PI / 2
    label.position.set(rect.x, BUILDING_BASE + 0.008, rect.z + rect.d / 2 - LABEL_BAND / 2)
    this.scene.add(label)

    const buildings = new THREE.Group()
    buildings.position.y = BUILDING_BASE
    buildings.scale.y = this.reducedMotion ? 1 : 0.001
    this.scene.add(buildings)

    const node: DistrictNode = {
      repo,
      plot,
      buildings,
      mesh: null,
      data: null,
      files: [],
      layout: [],
      plate,
      label,
      labelTexture,
      appear: this.reducedMotion ? 1 : 0,
    }
    plate.userData.node = node
    this.nodes.set(repo.name, node)
  }

  private removeNode(node: DistrictNode): void {
    for (const object of [node.plate, node.label, node.buildings]) {
      object.removeFromParent()
      object.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose()
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          for (const material of materials) material.dispose()
        }
      })
      if (object === node.label) node.labelTexture.dispose()
    }
    this.highlight.visible = false
  }

  // -- interaction ---------------------------------------------------------

  private attach(): void {
    const el = this.renderer.domElement
    el.style.touchAction = 'none'
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointerleave', this.onPointerLeave)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('dblclick', this.resetCamera)
  }

  private detach(): void {
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerup', this.onPointerUp)
    el.removeEventListener('pointerleave', this.onPointerLeave)
    el.removeEventListener('wheel', this.onWheel)
    el.removeEventListener('dblclick', this.resetCamera)
  }

  private onPointerDown = (event: PointerEvent) => {
    this.dragging = true
    this.dragDistance = 0
    this.lastPointer = { x: event.clientX, y: event.clientY }
    this.lastInput = performance.now()
    this.renderer.domElement.setPointerCapture(event.pointerId)
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointerPx.x = event.clientX - rect.left
    this.pointerPx.y = event.clientY - rect.top
    this.pointer.x = (this.pointerPx.x / rect.width) * 2 - 1
    this.pointer.y = -(this.pointerPx.y / rect.height) * 2 + 1
    this.pointerInside = true
    this.lastInput = performance.now()

    if (this.dragging) {
      const dx = event.clientX - this.lastPointer.x
      const dy = event.clientY - this.lastPointer.y
      this.lastPointer = { x: event.clientX, y: event.clientY }
      this.dragDistance += Math.abs(dx) + Math.abs(dy)
      this.yaw -= dx * 0.005
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.18, 1.35)
    }
  }

  private onPointerUp = (event: PointerEvent) => {
    this.dragging = false
    this.lastInput = performance.now()
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId)
    }
    if (this.dragDistance < 7 && this.hoveredFile && this.hovered) {
      window.open(fileUrl(this.hovered.repo, this.hoveredFile.path), '_blank', 'noopener')
    } else if (this.dragDistance < 7 && this.hovered) {
      window.open(this.hovered.repo.url, '_blank', 'noopener')
    }
  }

  private onPointerLeave = () => {
    this.pointerInside = false
    this.dragging = false
    this.clearHover()
  }

  private onWheel = (event: WheelEvent) => {
    event.preventDefault()
    this.distance = THREE.MathUtils.clamp(this.distance * Math.exp(event.deltaY * 0.0011), 11, 46)
    this.lastInput = performance.now()
  }

  private resetCamera = () => {
    this.yaw = 0.72
    this.pitch = 0.72
    this.distance = 27
  }

  private clearHover(): void {
    this.highlight.visible = false
    this.hovered = null
    this.hoveredFile = null
    if (this.hoverKey !== '') {
      this.hoverKey = ''
      this.callbacks.onHover(null)
    }
  }

  private pick(): void {
    if (!this.pointerInside) return
    this.raycaster.setFromCamera(this.pointer, this.camera)

    const meshes: THREE.InstancedMesh[] = []
    for (const node of this.nodes.values()) {
      if (node.mesh) meshes.push(node.mesh)
    }

    const buildingHits = this.raycaster.intersectObjects(meshes, false)
    if (buildingHits.length > 0) {
      const hit = buildingHits[0]
      const mesh = hit.object as THREE.InstancedMesh
      const node = mesh.userData.node as DistrictNode | undefined
      const index = hit.instanceId
      if (node && index !== undefined) {
        const building = node.layout[index]
        if (building) {
          this.setHover(node, building.file, building, `${node.repo.name}:${building.file.path}`)
          return
        }
      }
    }

    const plates: THREE.Mesh[] = []
    for (const node of this.nodes.values()) plates.push(node.plate)
    const plateHits = this.raycaster.intersectObjects(plates, false)
    if (plateHits.length > 0) {
      const node = plateHits[0].object.userData.node as DistrictNode | undefined
      if (node) {
        this.setHover(node, null, null, `repo:${node.repo.name}`)
        return
      }
    }

    this.clearHover()
  }

  private setHover(node: DistrictNode, file: CityFile | null, building: Building | null, key: string): void {
    this.hovered = node
    this.hoveredFile = file

    if (building) {
      const rise = node.buildings.scale.y
      this.highlight.visible = true
      this.highlight.position.set(building.x, BUILDING_BASE + (building.h * rise) / 2, building.z)
      this.highlight.scale.set(building.w * 1.16, building.h * rise + 0.02, building.d * 1.16)
    } else {
      this.highlight.visible = false
    }

    if (key === this.hoverKey) return
    this.hoverKey = key
    this.callbacks.onHover({
      payload: file ? this.filePayload(node, file) : this.repoPayload(node),
      x: this.pointerPx.x,
      y: this.pointerPx.y,
    })
  }

  private filePayload(node: DistrictNode, file: CityFile): HoverPayload {
    return {
      kind: 'file',
      title: file.path,
      subtitle: node.repo.name,
      lines: file.lines,
      bytes: file.bytes,
      language: file.language,
      color: file.color,
      url: fileUrl(node.repo, file.path),
      hint: 'click to open the file',
    }
  }

  private repoPayload(node: DistrictNode): HoverPayload {
    const data = node.data
    return {
      kind: 'repo',
      title: node.repo.name,
      subtitle: node.repo.description || 'A repository with no description yet.',
      lines: data?.lines ?? 0,
      bytes: data?.bytes ?? 0,
      files: data?.totalFiles ?? 0,
      shown: data?.files.length ?? 0,
      stars: node.repo.stars,
      language: node.repo.language ?? undefined,
      url: node.repo.url,
      hint: 'click to open the repository',
    }
  }

  private emitStats(): void {
    let buildings = 0
    let lines = 0
    let bytes = 0
    for (const node of this.nodes.values()) {
      buildings += node.layout.length
      lines += node.data?.lines ?? 0
      bytes += node.data?.bytes ?? 0
    }
    this.callbacks.onStats({ districts: this.nodes.size, buildings, lines, bytes })
  }

  // -- frame ---------------------------------------------------------------

  private resize(): void {
    const width = this.container.clientWidth || 1
    const height = this.container.clientHeight || 1
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private updateCamera(): void {
    const fit = this.camera.aspect < 1.5 ? 1.5 / Math.max(0.6, this.camera.aspect) : 1
    const distance = THREE.MathUtils.clamp(this.distance * fit, 11, 62)
    const horizontal = Math.cos(this.pitch) * distance
    this.camera.position.set(
      this.target.x + horizontal * Math.sin(this.yaw),
      this.target.y + Math.sin(this.pitch) * distance,
      this.target.z + horizontal * Math.cos(this.yaw),
    )
    this.camera.lookAt(this.target)
  }

  private tick = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.tick)
    const delta = Math.min(this.clock.getDelta(), 0.05)
    const elapsed = this.clock.elapsedTime
    const now = performance.now()

    if (!this.dragging && !this.hovered && !this.reducedMotion && now - this.lastInput > 3500) {
      this.yaw += delta * 0.032
    }
    this.updateCamera()

    let rising = false
    for (const node of this.nodes.values()) {
      if (node.appear < 1) {
        node.appear = Math.min(1, node.appear + delta * 1.5)
        const eased = 1 - Math.pow(1 - node.appear, 3)
        node.buildings.scale.y = 0.001 + eased * 0.999
        rising = true
      }
    }
    if (rising) this.renderer.shadowMap.needsUpdate = true

    this.pet.update(elapsed, this.camera)

    this.frame += 1
    if (this.frame % 3 === 0) this.pick()

    this.renderer.render(this.scene, this.camera)
  }
}

function formatKb(sizeKb: number): string {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(sizeKb))} KB`
}
