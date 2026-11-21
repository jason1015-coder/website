// Pure geometry for the sand table: repositories become districts sized by the
// repository, and their files become buildings inside those districts.

import type { CityFile, RepoSummary } from './githubCity'

export interface Rect {
  x: number
  z: number
  w: number
  d: number
}

export interface Plot {
  repo: RepoSummary
  rect: Rect
  index: number
}

export interface Building {
  file: CityFile
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
}

/** The usable sand area, in world units, centred on the table. */
export const SAND_BOUNDS: Rect = { x: 0, z: 0, w: 16.1, d: 10.1 }

const GAP = 0.13
const WALKWAY = 0.42
/** Lines of code that reach full height. Bigger files are clamped, not scaled. */
const TALLEST_LINES = 1400
const MAX_HEIGHT = 4.05
const MAX_FOOTPRINT = 0.95

export function layoutDistricts(repos: RepoSummary[], bounds: Rect = SAND_BOUNDS): Plot[] {
  if (repos.length === 0) return []
  const weighted = repos
    .map((repo) => ({
      repo,
      // Area follows how many buildings the district must hold; before the tree
      // is known, fall back to the repo's size on GitHub.
      weight:
        repo.fileCount && repo.fileCount > 0
          ? 1 + Math.sqrt(repo.fileCount)
          : 1 + Math.log1p(Math.max(0, repo.sizeKb)),
    }))
    .sort((a, b) => b.weight - a.weight || a.repo.name.localeCompare(b.repo.name))

  return squarify(weighted, (entry) => entry.weight, bounds).map((entry, index) => ({
    repo: entry.item.repo,
    rect: shrink(entry.rect, GAP),
    index,
  }))
}

export function layoutBuildings(files: CityFile[], district: Rect): Building[] {
  if (files.length === 0) return []
  const area = shrink(district, WALKWAY)
  if (area.w <= 0 || area.d <= 0) return []

  const aspect = area.w / area.d
  const cols = Math.max(1, Math.min(48, Math.round(Math.sqrt(files.length * aspect))))
  const rows = Math.ceil(files.length / cols)
  const cellW = area.w / cols
  const cellD = area.d / rows
  const cell = Math.min(cellW, cellD)

  const cells: { x: number; z: number }[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({
        x: area.x - area.w / 2 + cellW * (col + 0.5),
        z: area.z - area.d / 2 + cellD * (row + 0.5),
      })
    }
  }

  // Tallest files take the middle of the district, so each repo gets a downtown.
  cells.sort((a, b) => Math.hypot(a.x - area.x, a.z - area.z) - Math.hypot(b.x - area.x, b.z - area.z))
  const ordered = [...files].sort((a, b) => b.lines - a.lines || b.bytes - a.bytes)
  const biggest = Math.max(1, ...files.map((file) => file.bytes))

  return ordered.slice(0, cells.length).map((file, index) => {
    const cellCentre = cells[index]
    const footprint = Math.min(MAX_FOOTPRINT, Math.max(0.028, cell * (0.5 + 0.36 * Math.sqrt(file.bytes / biggest))))
    return {
      file,
      x: cellCentre.x,
      z: cellCentre.z,
      w: footprint,
      d: footprint,
      h: heightFor(file.lines),
      color: file.color,
    }
  })
}

export function heightFor(lines: number): number {
  const normalised = Math.min(1, Math.log1p(Math.max(0, lines)) / Math.log1p(TALLEST_LINES))
  return 0.16 + Math.pow(normalised, 2) * MAX_HEIGHT
}

function shrink(rect: Rect, amount: number): Rect {
  return {
    x: rect.x,
    z: rect.z,
    w: Math.max(0, rect.w - amount * 2),
    d: Math.max(0, rect.d - amount * 2),
  }
}

function squarify<T>(items: T[], weightOf: (item: T) => number, box: Rect): { item: T; rect: Rect }[] {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0) || 1
  const scale = (box.w * box.d) / total
  const areas = items.map((item) => ({ item, area: Math.max(1e-6, weightOf(item) * scale) }))

  const output: { item: T; rect: Rect }[] = []
  let left = box.x - box.w / 2
  let top = box.z - box.d / 2
  let width = box.w
  let depth = box.d
  let cursor = 0

  while (cursor < areas.length && width > 1e-4 && depth > 1e-4) {
    const shortSide = Math.min(width, depth)
    const row = [areas[cursor]]
    let sum = areas[cursor].area
    let next = cursor + 1
    let worst = worstRatio(row, sum, shortSide)

    while (next < areas.length) {
      const candidate = [...row, areas[next]]
      const candidateSum = sum + areas[next].area
      const candidateWorst = worstRatio(candidate, candidateSum, shortSide)
      if (candidateWorst > worst) break
      row.push(areas[next])
      sum = candidateSum
      worst = candidateWorst
      next += 1
    }

    if (width >= depth) {
      const stripWidth = sum / depth
      let offset = top
      for (const entry of row) {
        const entryDepth = entry.area / stripWidth
        output.push({
          item: entry.item,
          rect: { x: left + stripWidth / 2, z: offset + entryDepth / 2, w: stripWidth, d: entryDepth },
        })
        offset += entryDepth
      }
      left += stripWidth
      width -= stripWidth
    } else {
      const stripDepth = sum / width
      let offset = left
      for (const entry of row) {
        const entryWidth = entry.area / stripDepth
        output.push({
          item: entry.item,
          rect: { x: offset + entryWidth / 2, z: top + stripDepth / 2, w: entryWidth, d: stripDepth },
        })
        offset += entryWidth
      }
      top += stripDepth
      depth -= stripDepth
    }

    cursor = next
  }

  return output
}

function worstRatio(row: { area: number }[], sum: number, side: number): number {
  let largest = 0
  let smallest = Number.POSITIVE_INFINITY
  for (const entry of row) {
    largest = Math.max(largest, entry.area)
    smallest = Math.min(smallest, entry.area)
  }
  const sumSquared = sum * sum
  const sideSquared = side * side
  return Math.max((sideSquared * largest) / sumSquared, sumSquared / (sideSquared * smallest))
}
