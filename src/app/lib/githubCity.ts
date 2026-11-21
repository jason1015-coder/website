// The sand table is built from GitHub at runtime. No snapshot file, no token:
// we read the public repository list, each repo's file tree and then the raw
// text of the files that become buildings, so the height can be real line
// counts instead of an estimate.

import { cityRepos } from '../../data/cityRepos'

export const CITY_OWNER = 'jason1015-coder'

const API = 'https://api.github.com'
const RAW = 'https://raw.githubusercontent.com'
const CACHE_PREFIX = 'github-city:v3:'
const CACHE_TTL = 30 * 60 * 1000

/** Every text file becomes a building; only multi-megabyte data dumps are skipped. */
const MAX_FILE_BYTES = 1_500_000
/** Hard stop for a pathological tree, so one repo cannot freeze the table. */
const SAFETY_FILE_LIMIT = 4000

export interface RepoSummary {
  name: string
  description: string
  language: string | null
  stars: number
  forks: number
  sizeKb: number
  branch: string
  pushedAt: string
  url: string
  fork: boolean
  /** Text files that will become buildings, once the tree is known. */
  fileCount?: number
}

export interface CityFile {
  path: string
  lines: number
  bytes: number
  language: string
  color: string
}

export interface RepoList {
  repos: RepoSummary[]
  /** "fallback" means GitHub's anonymous API refused, so a known list was used. */
  source: 'github' | 'fallback'
}

export interface DistrictData {
  repo: string
  files: CityFile[]
  lines: number
  bytes: number
  totalFiles: number
  treeTruncated: boolean
  /** False while line counts are still streaming in. */
  complete: boolean
  fetchedAt: number
}

interface RawRepo {
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  size: number
  default_branch: string
  pushed_at: string
  html_url: string
  fork: boolean
  archived: boolean
  disabled: boolean
}

interface TreeEntry {
  path: string
  type: string
  size?: number
}

interface CdnNode {
  type: string
  name: string
  size?: number
  files?: CdnNode[]
}

interface Language {
  label: string
  color: string
}

const LANGUAGES: Record<string, Language> = {
  ts: { label: 'TypeScript', color: '#4c8fd0' },
  tsx: { label: 'TypeScript', color: '#4c8fd0' },
  js: { label: 'JavaScript', color: '#e8d46a' },
  jsx: { label: 'JavaScript', color: '#e8d46a' },
  mjs: { label: 'JavaScript', color: '#e8d46a' },
  cjs: { label: 'JavaScript', color: '#e8d46a' },
  rs: { label: 'Rust', color: '#c98b6b' },
  cpp: { label: 'C++', color: '#c2567f' },
  cc: { label: 'C++', color: '#c2567f' },
  cxx: { label: 'C++', color: '#c2567f' },
  hpp: { label: 'C++', color: '#b06a92' },
  c: { label: 'C', color: '#7f92a8' },
  h: { label: 'C', color: '#7f92a8' },
  py: { label: 'Python', color: '#4f7fb0' },
  go: { label: 'Go', color: '#5cc8d8' },
  md: { label: 'Markdown', color: '#8fa4b8' },
  mdx: { label: 'Markdown', color: '#8fa4b8' },
  json: { label: 'JSON', color: '#b8b273' },
  jsonc: { label: 'JSON', color: '#b8b273' },
  yml: { label: 'YAML', color: '#a98ed6' },
  yaml: { label: 'YAML', color: '#a98ed6' },
  toml: { label: 'TOML', color: '#b08c6e' },
  css: { label: 'CSS', color: '#7a6fbf' },
  scss: { label: 'CSS', color: '#7a6fbf' },
  html: { label: 'HTML', color: '#d1794f' },
  htm: { label: 'HTML', color: '#d1794f' },
  svg: { label: 'SVG', color: '#d1a04f' },
  sh: { label: 'Shell', color: '#7fae6a' },
  bash: { label: 'Shell', color: '#7fae6a' },
  zsh: { label: 'Shell', color: '#7fae6a' },
  ps1: { label: 'Shell', color: '#7fae6a' },
  sql: { label: 'SQL', color: '#c08a5e' },
  cmake: { label: 'CMake', color: '#8f9aa6' },
  java: { label: 'Java', color: '#b0714f' },
  kt: { label: 'Kotlin', color: '#a97bd6' },
  swift: { label: 'Swift', color: '#d1875f' },
  rb: { label: 'Ruby', color: '#c26969' },
  php: { label: 'PHP', color: '#7d86b8' },
  cs: { label: 'C#', color: '#6fa27a' },
  lua: { label: 'Lua', color: '#6c8fd1' },
  vue: { label: 'Vue', color: '#63b78d' },
  svelte: { label: 'Svelte', color: '#d1704f' },
  astro: { label: 'Astro', color: '#a9789e' },
  txt: { label: 'Text', color: '#8d968f' },
  xml: { label: 'XML', color: '#a3895f' },
  ini: { label: 'Config', color: '#8d968f' },
  cfg: { label: 'Config', color: '#8d968f' },
  env: { label: 'Config', color: '#8d968f' },
  gitignore: { label: 'Config', color: '#8d968f' },
  dockerfile: { label: 'Docker', color: '#6996c4' },
  tf: { label: 'Terraform', color: '#9a7bc4' },
  zig: { label: 'Zig', color: '#c99a5f' },
}

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'icns', 'bmp', 'tiff', 'tif', 'psd',
  'woff', 'woff2', 'ttf', 'otf', 'eot', 'mp3', 'wav', 'flac', 'ogg', 'm4a', 'mp4', 'mov',
  'webm', 'avi', 'mkv', 'pdf', 'zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'exe',
  'dll', 'so', 'dylib', 'a', 'o', 'obj', 'wasm', 'jar', 'class', 'pyc', 'bin', 'dat', 'db',
  'sqlite', 'sqlite3', 'riv', 'blend', 'fbx', 'glb', 'gltf', 'stl', 'step', 'stp', 'npy',
  'npz', 'pkl', 'onnx', 'parquet', 'ds_store', 'lock', 'snap', 'map', 'min',
])

const SKIP_DIRECTORY = /(^|\/)(node_modules|dist|build|out|vendor|third[_-]?party|\.git|\.next|\.nuxt|\.output|target|coverage|__pycache__|\.venv|venv|\.cache|\.turbo|pods|deriveddata|assets\/fonts)(\/|$)/i
const SKIP_FILE = /(^|\/)(package-lock\.json|bun\.lockb?|yarn\.lock|pnpm-lock\.yaml|cargo\.lock|gemfile\.lock|composer\.lock|poetry\.lock|go\.sum|flake\.lock|\.ds_store)(\/|$)/i

export function languageFor(path: string): Language {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) return LANGUAGES.dockerfile
  if (name === 'makefile' || name === 'cmakelists.txt') return LANGUAGES.cmake
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1) : name
  return LANGUAGES[ext] ?? { label: 'Text', color: '#8d968f' }
}

export function isModelled(entry: TreeEntry): boolean {
  if (entry.type !== 'blob') return false
  const path = entry.path
  if (SKIP_DIRECTORY.test(path) || SKIP_FILE.test(path)) return false
  if (/\.(min\.(js|css)|map|snap)$/i.test(path)) return false
  const bytes = entry.size ?? 0
  if (bytes <= 0 || bytes > MAX_FILE_BYTES) return false
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
  return !BINARY_EXT.has(ext)
}

export async function fetchRepos(signal?: AbortSignal): Promise<RepoList> {
  try {
    const rows: RawRepo[] = []
    // Every account repo, not just the first page: new repos show up on their own.
    for (let page = 1; page <= 5; page += 1) {
      const res = await fetch(`${API}/users/${CITY_OWNER}/repos?per_page=100&sort=updated&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: signal ?? AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(describeFailure(res.status, res.headers))
      const batch = (await res.json()) as RawRepo[]
      rows.push(...batch)
      if (batch.length < 100) break
    }
    return {
      source: 'github',
      repos: rows
        .filter((repo) => !repo.archived && !repo.disabled)
        .map((repo) => ({
          name: repo.name,
          description: repo.description?.trim() ?? '',
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          sizeKb: repo.size,
          branch: repo.default_branch || 'main',
          pushedAt: repo.pushed_at,
          url: repo.html_url,
          fork: repo.fork,
        })),
    }
  } catch (error) {
    if (signal?.aborted) throw error
    return { repos: cityRepos, source: 'fallback' }
  }
}

export interface RepoTree {
  repo: string
  candidates: TreeEntry[]
  totalFiles: number
  totalBytes: number
  truncated: boolean
  viaCdn: boolean
}

/** Reads a repo's recursive tree, falling back to jsDelivr if GitHub refuses. */
export async function fetchTree(repo: RepoSummary, signal?: AbortSignal): Promise<RepoTree> {
  let entries: TreeEntry[] = []
  let truncated = false
  let viaCdn = false

  try {
    const treeRes = await fetch(
      `${API}/repos/${CITY_OWNER}/${repo.name}/git/trees/${encodeURIComponent(repo.branch)}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' }, signal: signal ?? AbortSignal.timeout(20_000) },
    )
    if (treeRes.status === 409) {
      return { repo: repo.name, candidates: [], totalFiles: 0, totalBytes: 0, truncated: false, viaCdn: false }
    }
    if (!treeRes.ok) throw new Error(describeFailure(treeRes.status, treeRes.headers))
    const tree = (await treeRes.json()) as { tree?: TreeEntry[]; truncated?: boolean }
    entries = tree.tree ?? []
    truncated = Boolean(tree.truncated)
  } catch (error) {
    if (signal?.aborted) throw error
    const alternative = await fetchCdnTree(repo)
    if (!alternative) throw error
    entries = alternative
    viaCdn = true
  }

  const blobs = entries.filter((entry) => entry.type === 'blob')
  return {
    repo: repo.name,
    candidates: entries.filter(isModelled).slice(0, SAFETY_FILE_LIMIT),
    totalFiles: blobs.length,
    totalBytes: blobs.reduce((sum, blob) => sum + (blob.size ?? 0), 0),
    truncated,
    viaCdn,
  }
}

/** Counts the lines of every text file, reporting partial districts as it goes. */
export async function fetchDistrict(
  repo: RepoSummary,
  tree: RepoTree,
  signal?: AbortSignal,
  onProgress?: (district: DistrictData) => void,
): Promise<DistrictData> {
  const files: CityFile[] = []
  let lastEmitted = 0

  await mapLimit(tree.candidates, 24, async (entry) => {
    const file = await readFileLines(repo, entry, tree.viaCdn, signal)
    if (!file) return null
    files.push(file)
    // Let the district grow as its lines are counted instead of at the end.
    if (onProgress && files.length - lastEmitted >= 150) {
      lastEmitted = files.length
      onProgress(buildDistrict(repo, files, tree, false))
    }
    return file
  })

  return buildDistrict(repo, files, tree, true)
}

function buildDistrict(repo: RepoSummary, files: CityFile[], tree: RepoTree, complete: boolean): DistrictData {
  return {
    repo: repo.name,
    files: [...files],
    lines: files.reduce((sum, file) => sum + file.lines, 0),
    bytes: tree.totalBytes,
    totalFiles: tree.totalFiles,
    treeTruncated: tree.truncated,
    complete,
    fetchedAt: Date.now(),
  }
}

async function readFileLines(
  repo: RepoSummary,
  entry: TreeEntry,
  viaCdn: boolean,
  signal?: AbortSignal,
): Promise<CityFile | null> {
  const primary = viaCdn ? cdnFileUrl(repo, entry.path) : rawUrl(repo, entry.path)
  const secondary = viaCdn ? rawUrl(repo, entry.path) : cdnFileUrl(repo, entry.path)
  for (const url of [primary, secondary]) {
    if (signal?.aborted) return null
    try {
      const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(15_000) })
      if (!res.ok) continue
      const text = await res.text()
      const language = languageFor(entry.path)
      return {
        path: entry.path,
        lines: countLines(text),
        bytes: entry.size ?? text.length,
        language: language.label,
        color: language.color,
      }
    } catch {
      if (signal?.aborted) return null
    }
  }
  return null
}

/** jsDelivr mirrors every public repo with CORS, so the map survives GitHub's rate limit. */
async function fetchCdnTree(repo: RepoSummary): Promise<TreeEntry[] | null> {
  try {
    const res = await fetch(
      `https://data.jsdelivr.com/v1/packages/gh/${CITY_OWNER}/${repo.name}@${encodeURIComponent(repo.branch)}`,
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return null
    const json = (await res.json()) as { files?: CdnNode[] }
    const entries: TreeEntry[] = []
    const walk = (nodes: CdnNode[], prefix: string) => {
      for (const node of nodes) {
        const path = prefix ? `${prefix}/${node.name}` : node.name
        if (node.type === 'directory') walk(node.files ?? [], path)
        else entries.push({ path, type: 'blob', size: node.size ?? 0 })
      }
    }
    walk(json.files ?? [], '')
    return entries.length > 0 ? entries : null
  } catch {
    return null
  }
}

export function rawUrl(repo: RepoSummary, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${RAW}/${CITY_OWNER}/${repo.name}/${encodeURIComponent(repo.branch)}/${encoded}`
}

function cdnFileUrl(repo: RepoSummary, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://cdn.jsdelivr.net/gh/${CITY_OWNER}/${repo.name}@${encodeURIComponent(repo.branch)}/${encoded}`
}

export function fileUrl(repo: RepoSummary, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${repo.url}/blob/${encodeURIComponent(repo.branch)}/${encoded}`
}

export function countLines(text: string): number {
  if (!text) return 0
  let lines = 1
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) lines += 1
  }
  if (text.endsWith('\n')) lines -= 1
  return Math.max(0, lines)
}

function describeFailure(status: number, headers: Headers): string {
  if (status === 403 || status === 429) {
    const reset = headers.get('x-ratelimit-reset')
    if (reset) {
      const minutes = Math.max(1, Math.ceil((Number(reset) * 1000 - Date.now()) / 60_000))
      return `GitHub's anonymous rate limit is used up. It resets in about ${minutes} min.`
    }
    return "GitHub's anonymous rate limit is used up for this network right now."
  }
  if (status === 404) return 'That GitHub profile or repository is not public any more.'
  return `GitHub answered ${status}.`
}

/** Run tasks with a fixed number of workers, dropping failures instead of all-or-nothing. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      const value = await task(items[index], index)
      if (value !== null) results[index] = value
    }
  })
  await Promise.all(workers)
  return results.filter((value): value is R => value !== undefined)
}

const cacheKey = (repo: string) => `${CACHE_PREFIX}${repo}`

export function readCachedDistrict(repo: string): DistrictData | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(repo))
    if (!raw) return null
    const parsed = JSON.parse(raw) as DistrictData
    if (!parsed || !Array.isArray(parsed.files) || Date.now() - parsed.fetchedAt > CACHE_TTL) return null
    return { ...parsed, complete: true }
  } catch {
    return null
  }
}

export function writeCachedDistrict(district: DistrictData): void {
  try {
    window.localStorage.setItem(cacheKey(district.repo), JSON.stringify(district))
  } catch {
    // Storage is full or blocked: the map still works, it just fetches again.
  }
}
