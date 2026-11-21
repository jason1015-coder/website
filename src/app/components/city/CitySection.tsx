import { ArrowUpRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  CITY_OWNER,
  fetchDistrict,
  fetchRepos,
  fetchTree,
  mapLimit,
  readCachedDistrict,
  writeCachedDistrict,
  type DistrictData,
  type RepoSummary,
  type RepoTree,
} from '../../lib/githubCity'
import { Lines, Reveal } from '../motion'
import { CityScene, type CityStats, type HoverEvent } from './scene'

type Status = 'loading' | 'live' | 'error'

const EMPTY_STATS: CityStats = { districts: 0, buildings: 0, lines: 0, bytes: 0 }

export function CitySection() {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<CityScene | null>(null)
  const appliedRef = useRef(new Map<string, number>())

  const [repos, setRepos] = useState<RepoSummary[]>([])
  const [districts, setDistricts] = useState<Record<string, DistrictData>>({})
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [failures, setFailures] = useState<string[]>([])
  const [hover, setHover] = useState<HoverEvent | null>(null)
  const [stats, setStats] = useState<CityStats>(EMPTY_STATS)
  const [attempt, setAttempt] = useState(0)
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [source, setSource] = useState<'github' | 'fallback' | null>(null)

  useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const scene = new CityScene(element, { onHover: setHover, onStats: setStats })
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    appliedRef.current.clear()
    sceneRef.current?.setRepos(repos)
  }, [repos])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    for (const district of Object.values(districts)) {
      // Files stream in per repo, so apply each district whenever it grows.
      if (appliedRef.current.get(district.repo) === district.files.length) continue
      appliedRef.current.set(district.repo, district.files.length)
      scene.setDistrict(district)
    }
    // Re-apply once the plots exist (repos arrives just after cached districts).
  }, [districts, repos])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setStatus('loading')
    setError('')
    setFailures([])

    async function survey() {
      try {
        const { repos: list, source: listSource } = await fetchRepos(controller.signal)
        if (!active) return
        setSource(listSource)

        const cached: Record<string, DistrictData> = {}
        for (const repo of list) {
          const hit = readCachedDistrict(repo.name)
          if (hit) cached[repo.name] = hit
        }
        if (Object.keys(cached).length > 0) {
          setDistricts(cached)
          setSyncedAt(Math.max(...Object.values(cached).map((district) => district.fetchedAt)))
        }

        // Measure the trees first, so each district gets enough ground for
        // every file it will hold instead of resizing once files arrive.
        const trees = new Map<string, RepoTree>()
        await mapLimit(
          list.filter((repo) => !cached[repo.name]),
          4,
          async (repo) => {
            try {
              const tree = await fetchTree(repo, controller.signal)
              trees.set(repo.name, tree)
              return tree
            } catch {
              return null
            }
          },
        )
        if (!active) return

        setRepos(
          list.map((repo) => ({
            ...repo,
            fileCount: cached[repo.name]?.files.length ?? trees.get(repo.name)?.candidates.length,
          })),
        )
        setStatus('live')

        const pending = list.filter((repo) => !cached[repo.name])
        for (let index = 0; index < pending.length; index += 2) {
          const batch = pending.slice(index, index + 2)
          const results = await Promise.all(
            batch.map(async (repo) => {
              const tree = trees.get(repo.name)
              if (!tree) return repo.name
              try {
                return await fetchDistrict(repo, tree, controller.signal, (partial) => {
                  if (!active) return
                  setDistricts((previous) => ({ ...previous, [repo.name]: partial }))
                })
              } catch {
                return repo.name
              }
            }),
          )
          if (!active) return

          const failed: string[] = []
          const next: Record<string, DistrictData> = {}
          for (const result of results) {
            if (typeof result === 'string') {
              failed.push(result)
              continue
            }
            if (result.complete) writeCachedDistrict(result)
            next[result.repo] = result
          }
          if (Object.keys(next).length > 0) {
            setDistricts((previous) => ({ ...previous, ...next }))
            setSyncedAt(Date.now())
          }
          if (failed.length > 0) setFailures((previous) => [...previous, ...failed])
        }
      } catch (caught) {
        if (!active) return
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'GitHub could not be reached.')
      }
    }

    void survey()
    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  const surveyed = Object.values(districts).filter((district) => district.complete).length
  const totalRepos = Math.max(1, repos.length)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const progress = surveyed / totalRepos
    if (hover) {
      const { payload } = hover
      scene.setPet({
        mood: 'live',
        headline: payload.title,
        detail:
          payload.kind === 'file'
            ? `${payload.lines.toLocaleString('en-GB')} lines · ${payload.language ?? 'file'}`
            : `${payload.shown ?? 0}/${payload.files ?? 0} files · ★ ${payload.stars ?? 0}`,
        progress,
      })
      return
    }
    scene.setPet({
      mood: status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'live',
      headline: status === 'error' ? 'offline' : status === 'loading' ? 'surveying' : `${stats.buildings} buildings`,
      detail:
        status === 'error'
          ? 'github said no'
          : status === 'loading'
            ? 'reading github…'
            : `${stats.lines.toLocaleString('en-GB')} lines · ${surveyed}/${totalRepos} repos`,
      progress,
    })
  }, [hover, status, stats, surveyed, totalRepos])

  const legend = useMemo(() => {
    const counts = new Map<string, { count: number; color: string }>()
    for (const district of Object.values(districts)) {
      for (const file of district.files) {
        const entry = counts.get(file.language) ?? { count: 0, color: file.color }
        entry.count += 1
        counts.set(file.language, entry)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([label, value]) => ({ label, ...value }))
  }, [districts])

  const totalFiles = Object.values(districts).reduce((sum, district) => sum + district.totalFiles, 0)
  const stage = stageRef.current
  const canvasLayer = canvasRef.current
  // Pointer coordinates come from the canvas, while the card is positioned in
  // the stage, so keep the canvas offset between them.
  let layerX = 0
  let layerY = 0
  let viewHeight = 0
  if (stage && canvasLayer) {
    const stageBox = stage.getBoundingClientRect()
    const layerBox = canvasLayer.getBoundingClientRect()
    layerX = layerBox.left - stageBox.left
    layerY = layerBox.top - stageBox.top
    viewHeight = layerBox.height
  }
  // Keep the card inside the stage horizontally, and above the cursor when
  // there is not enough room below it.
  const cardWidth = Math.min(306, Math.max(200, (stage?.clientWidth ?? 306) - 24))
  const maxLeft = Math.max(8, (stage?.clientWidth ?? 0) - cardWidth - 8)
  const cardLeft = Math.min(layerX + (hover?.x ?? 0) + 18, maxLeft)
  const flipY = Boolean(hover && hover.y + 250 > viewHeight)

  return (
    <section id="city" className="mx-auto max-w-[1400px] scroll-mt-20 px-5 pt-24 sm:px-8 sm:pt-32">
      <div className="flex items-end justify-between gap-6">
        <Lines as="h2" className="font-display text-[44px] sm:text-[64px]" lines={['The city I built']} />
        <Reveal className="mono hidden pb-2 text-[11.5px] uppercase tracking-[0.14em] text-faint sm:block">
          live from github.com/{CITY_OWNER}
        </Reveal>
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-2xl text-pretty text-[16.5px] leading-relaxed text-muted">
          Every repository gets a district on the sand table, every file a building. Height is lines of code, footprint
          is file size, and it is all read from GitHub as you watch. Drag to walk around the table, scroll to lean in.
          The tamagotchi keeps an eye on the loading and reads out whatever you hover.
        </p>
        <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:gap-x-10">
          {[
            { label: 'districts', value: String(repos.length || '–') },
            { label: 'buildings', value: stats.buildings ? stats.buildings.toLocaleString('en-GB') : '–' },
            { label: 'lines', value: stats.lines ? compact(stats.lines) : '–' },
            { label: 'files', value: totalFiles ? compact(totalFiles) : '–' },
          ].map((item) => (
            <div key={item.label}>
              <dt className="mono text-[10px] uppercase tracking-[0.14em] text-faint">{item.label}</dt>
              <dd className="font-display mt-1 text-[28px] leading-none tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        ref={stageRef}
        className="relative mt-10 overflow-hidden rounded-[24px] border border-line bg-[radial-gradient(90%_80%_at_50%_0%,#16201c,#0a0d0c_70%)]"
      >
        <div
          ref={canvasRef}
          role="img"
          aria-label="A 3D sand table where each GitHub repository is a district and each file is a building, with a tamagotchi sitting beside it."
          className="relative h-[clamp(440px,70vh,740px)] w-full touch-none"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <p className="mono flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">
            <span className={`round size-1.5 rounded-full ${status === 'error' ? 'bg-danger' : 'bg-accent'} ${status === 'loading' ? 'animate-pulse' : ''}`} />
            sand table / {status === 'error' ? 'offline' : status === 'loading' ? 'surveying' : 'live'}
          </p>
          <p className="mono hidden text-[10px] uppercase tracking-[0.14em] text-faint sm:block">
            drag · scroll · hover a tower
          </p>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-[180px]">
            <p className="mono text-[10px] uppercase tracking-[0.14em] text-faint">
              {surveyed}/{repos.length || '–'} districts surveyed
            </p>
            <div className="mt-2 h-[2px] w-full max-w-[220px] overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-accent transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round((surveyed / totalRepos) * 100)}%` }}
              />
            </div>
            {failures.length > 0 && (
              <p className="mono mt-2 text-[10px] uppercase tracking-[0.1em] text-danger">
                {failures.length} repo{failures.length > 1 ? 's' : ''} skipped
              </p>
            )}
          </div>
          <p className="mono text-right text-[10px] uppercase leading-relaxed tracking-[0.12em] text-faint">
            area = repo size · height = lines
            <br />
            every text file · binaries skipped
          </p>
        </div>

        {status === 'loading' && surveyed === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="mono animate-pulse text-[11px] uppercase tracking-[0.18em] text-accent">
              pouring the sand…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="rounded-[18px] border border-line bg-bg/85 px-6 py-6 backdrop-blur">
              <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-danger">github unreachable</p>
              <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-muted">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mono mt-5 rounded-[10px] border border-line-strong px-4 py-2 text-[10.5px] uppercase tracking-[0.14em] text-fg transition-colors hover:border-accent hover:text-accent"
              >
                try again
              </button>
            </div>
          </div>
        )}

        {hover && (
          <div
            className="pointer-events-none absolute z-20 w-[min(306px,calc(100%-24px))] rounded-[14px] border border-line-strong bg-bg/92 p-3.5 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.85)] backdrop-blur-md"
            style={{
              left: cardLeft,
              top: flipY ? undefined : layerY + hover.y + 16,
              bottom: flipY ? (stage?.clientHeight ?? 0) - layerY - hover.y + 16 : undefined,
            }}
          >
            {hover.payload.kind === 'file' ? (
              <>
                <p className="mono text-[10px] uppercase tracking-[0.14em] text-faint">{hover.payload.subtitle}</p>
                <p className="mono mt-1.5 line-clamp-2 break-all text-[12.5px] leading-snug text-fg">
                  {hover.payload.title}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3">
                  <div>
                    <dt className="mono text-[9.5px] uppercase tracking-[0.12em] text-faint">lines</dt>
                    <dd className="text-[14px] tabular-nums text-fg">{hover.payload.lines.toLocaleString('en-GB')}</dd>
                  </div>
                  <div>
                    <dt className="mono text-[9.5px] uppercase tracking-[0.12em] text-faint">size</dt>
                    <dd className="text-[14px] tabular-nums text-fg">{formatBytes(hover.payload.bytes)}</dd>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className="round size-1.5 rounded-full" style={{ background: hover.payload.color }} />
                    <span className="mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      {hover.payload.language}
                    </span>
                  </div>
                </dl>
                <p className="mono mt-2.5 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.12em] text-accent">
                  {hover.payload.hint}
                  <ArrowUpRight className="size-3" />
                </p>
              </>
            ) : (
              <>
                <p className="mono text-[10px] uppercase tracking-[0.14em] text-faint">district</p>
                <p className="font-display mt-1 text-[21px] leading-tight">{hover.payload.title}</p>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{hover.payload.subtitle}</p>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-t border-line pt-3">
                  <div>
                    <dt className="mono text-[9.5px] uppercase tracking-[0.1em] text-faint">files</dt>
                    <dd className="text-[13px] tabular-nums text-fg">
                      {hover.payload.shown}/{hover.payload.files}
                    </dd>
                  </div>
                  <div>
                    <dt className="mono text-[9.5px] uppercase tracking-[0.1em] text-faint">lines</dt>
                    <dd className="text-[13px] tabular-nums text-fg">{compact(hover.payload.lines)}</dd>
                  </div>
                  <div>
                    <dt className="mono text-[9.5px] uppercase tracking-[0.1em] text-faint">stars</dt>
                    <dd className="text-[13px] tabular-nums text-fg">{hover.payload.stars ?? 0}</dd>
                  </div>
                </dl>
                <p className="mono mt-2.5 flex items-center gap-1 text-[9.5px] uppercase tracking-[0.12em] text-accent">
                  {hover.payload.hint}
                  <ArrowUpRight className="size-3" />
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mono mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[10px] uppercase tracking-[0.13em] text-faint">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {legend.length === 0 && <li>reading languages…</li>}
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="round size-1.5 rounded-full" style={{ background: item.color }} />
              {item.label} <span className="text-fg/40">{item.count}</span>
            </li>
          ))}
        </ul>
        <p className="text-right">
          {source === 'fallback' ? 'github api limited · files via jsDelivr' : source === 'github' ? 'live from the github api' : 'connecting…'}
          {syncedAt ? ` · synced ${new Date(syncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          {' · '}click a tower to open the file
        </p>
      </div>
    </section>
  )
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}k`
  return value.toLocaleString('en-GB')
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}
