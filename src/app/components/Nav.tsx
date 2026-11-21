import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { site } from '../../data/site'
import { cx } from '../lib/cx'

export function useLocalTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: site.timezone }).format(new Date()))
    tick()
    const id = window.setInterval(tick, 15_000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

export function Nav() {
  const time = useLocalTime()
  const location = useLocation()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setHidden(y > last && y > 120)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const link = (to: string, label: string, active: boolean) => (
    <NavLink
      key={to}
      to={to}
      className={cx('link-draw text-[13.5px] transition-colors', active ? 'text-fg' : 'text-muted hover:text-fg')}
    >
      {label}
    </NavLink>
  )

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        hidden && '-translate-y-full',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="round size-2 rounded-full bg-accent" />
          <span className="font-display text-[19px] leading-none">{site.name}</span>
          <span className="mono hidden text-[10.5px] text-faint sm:inline">/{site.handle}</span>
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7">
          {link('/#city', 'City', location.hash === '#city')}
          <a href="https://github.com/jason1015-coder" className="link-draw text-[13.5px] text-muted transition-colors hover:text-fg">
            GitHub
          </a>
          <span className="mono hidden items-center gap-2 border-l border-line pl-5 text-[11px] tabular-nums text-faint lg:inline-flex">
            {site.location} {time}
          </span>
        </nav>
      </div>
    </header>
  )
}
