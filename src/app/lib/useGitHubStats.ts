// The hero's three GitHub figures — public repos, total commits and years on
// GitHub — read together from GitHub and cached as one entry for half an hour.
// The baked-in numbers in site.ts stand in only if GitHub refuses a request.

import { useEffect, useState } from 'react'

import { CITY_OWNER } from './githubCity'

const API = 'https://api.github.com'
const CACHE_KEY = 'github-stats:v1'
const CACHE_TTL = 30 * 60 * 1000
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000

export interface GitHubStats {
  repos: number | null
  commits: number | null
  years: number | null
}

interface CacheEntry {
  repos: number
  commits: number
  createdAt: string
  at: number
}

export function useGitHubStats(): GitHubStats {
  const [stats, setStats] = useState<GitHubStats>(() => fromCache(readCache()))

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const cached = readCache()
    if (cached) setStats(fromCache(cached))
    if (cached && Date.now() - cached.at < CACHE_TTL) return () => controller.abort()

    const load = async () => {
      try {
        const [userRes, reposRes] = await Promise.all([
          fetch(`${API}/users/${CITY_OWNER}`, {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
          }),
          fetch(`${API}/users/${CITY_OWNER}/repos?per_page=100&sort=pushed`, {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
          }),
        ])
        if (!userRes.ok || !reposRes.ok) return

        const user = (await userRes.json()) as { created_at?: string }
        const repos = (await reposRes.json()) as { name: string; fork: boolean; archived: boolean }[]
        if (!user.created_at) return

        const owned = repos.filter((repo) => !repo.fork && !repo.archived).map((repo) => repo.name)
        const counts = await Promise.all(
          owned.map(async (name) => {
            try {
              return await countCommits(name, controller.signal)
            } catch {
              return null
            }
          }),
        )
        // A partial answer would undercount the total, so keep the old numbers.
        if (!active || counts.some((count) => count === null)) return

        const entry: CacheEntry = {
          repos: repos.length,
          commits: counts.reduce<number>((running, count) => running + (count ?? 0), 0),
          createdAt: user.created_at,
          at: Date.now(),
        }
        if (entry.commits > 0) {
          setStats(fromCache(entry))
          writeCache(entry)
        }
      } catch {
        // Rate limited or offline: keep whatever number we already show.
      }
    }

    void load()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return stats
}

async function countCommits(repo: string, signal: AbortSignal): Promise<number> {
  const res = await fetch(`${API}/repos/${CITY_OWNER}/${repo}/commits?per_page=1`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  })
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  const link = res.headers.get('link')
  if (!link) {
    const body = (await res.json()) as unknown[]
    return Array.isArray(body) ? body.length : 0
  }
  // <...&page=2>; rel="next", <...&page=343>; rel="last"
  const last = /[?&]page=(\d+)>;\s*rel="last"/.exec(link)
  return last ? Number(last[1]) : 1
}

function fromCache(entry: CacheEntry | null): GitHubStats {
  if (!entry) return { repos: null, commits: null, years: null }
  return { repos: entry.repos, commits: entry.commits, years: yearsSince(entry.createdAt) }
}

/** Whole years since the account was created, so it advances without a refetch. */
function yearsSince(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.floor((Date.now() - created) / YEAR_MS))
}

function readCache(): CacheEntry | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (
      !parsed ||
      typeof parsed.repos !== 'number' ||
      typeof parsed.commits !== 'number' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.at !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage full or blocked: the numbers are still correct for this visit.
  }
}
