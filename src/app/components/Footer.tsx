import { ArrowUpRight } from 'lucide-react'

import { site } from '../../data/site'
import { Lines, Magnetic, Reveal } from './motion'
import { useLocalTime } from './Nav'

export function Footer() {
  const time = useLocalTime()
  const github = site.socials.find((s) => s.label === 'GitHub')?.href ?? 'https://github.com/jason1015-coder'
  const elsewhere = [
    { label: 'GitHub profile', href: github },
    { label: 'All repositories', href: `${github}?tab=repositories` },
  ]

  return (
    <footer id="contact" className="mt-32 border-t border-line sm:mt-44">
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
          <div>
            <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-faint">Contact / GitHub</p>
            <Lines
              as="h2"
              className="font-display mt-5 text-[clamp(44px,7vw,112px)]"
              lines={['Let’s make the', <>thing you <span className="text-accent">wish existed</span></>]}
            />
            <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Magnetic>
                <a
                  href={github}
                  className="inline-flex h-13 items-center gap-2 rounded-[12px] bg-accent px-6 text-[15px] font-medium text-bg transition-colors hover:bg-[#7cb9ff]"
                >
                  github.com/{site.handle}
                  <ArrowUpRight className="size-4" />
                </a>
              </Magnetic>
              <p className="mono max-w-[260px] text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-faint">
                {site.available ? site.availability : 'Heads down — issues are still read'}
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 sm:p-8">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/10 blur-3xl" />
              <p className="mono relative text-[10px] uppercase tracking-[0.16em] text-faint">Elsewhere</p>
              <ul className="relative mt-5 divide-y divide-line border-y border-line">
                {elsewhere.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="group flex items-center justify-between gap-4 py-3.5 text-[14.5px] text-fg/90 transition-colors hover:text-accent">
                      {item.label}
                      <ArrowUpRight className="size-4 shrink-0 text-faint transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="relative mt-5 text-[13px] leading-relaxed text-muted">
                Bugs, ideas and pull requests are all welcome in the open. If one of these tools should exist, that is usually how it starts.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-24 grid gap-6 border-t border-line pt-8 text-[13px] sm:grid-cols-3">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {site.socials.map((s) => (
              <li key={s.label}>
                <a href={s.href} className="link-draw text-muted transition-colors hover:text-fg">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mono text-[11px] text-faint sm:text-center">
            {site.location}, {time}
          </p>
          <p className="mono text-[11px] text-faint sm:text-right">
            © {new Date().getFullYear()} {site.name} · open source on GitHub
          </p>
        </div>
      </div>
    </footer>
  )
}
