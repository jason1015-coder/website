import { motion } from 'motion/react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { site } from '../../data/site'
import { CitySection } from '../components/city/CitySection'
import { Magnetic, Parallax } from '../components/motion'

const ease = [0.22, 1, 0.36, 1] as const

export function Home() {
  return (
    <>
      {/* Hero: name and portrait on one line, one block of copy below. */}
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <HeroField />
        <div className="relative mx-auto w-full max-w-[1400px] px-5 pb-10 pt-28 sm:px-8 sm:pb-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            className="mono flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-muted"
          >
            <span className="inline-flex items-center gap-2 text-accent">
              <span className="round size-1.5 animate-pulse rounded-full bg-accent" />
              {site.available ? 'Open to opportunities' : 'Heads down'}
            </span>
            <span className="text-faint">/</span>
            <span>{site.location}</span>
            <span className="text-faint">/</span>
            <span>{site.role}</span>
          </motion.div>

          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-5 sm:gap-x-8">
            <h1 className="font-display text-[clamp(56px,11.5vw,176px)]">
              {site.name.split(' ').map((word, i) => (
                <span key={word} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
                  <motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.1, delay: 0.2 + i * 0.1, ease }}>
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.5, ease }}
              className="relative mb-1 shrink-0 sm:mb-2"
            >
              <div aria-hidden className="pointer-events-none absolute -inset-4 rounded-[28px] bg-[radial-gradient(closest-side,rgb(88_166_255/0.22),transparent)] blur-xl" />
              <Parallax
                src={`${import.meta.env.BASE_URL}images/avatar.jpg`}
                alt={site.name}
                className="relative size-[clamp(84px,13vw,164px)] rounded-[20px]"
                strength={3}
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6, ease }}
            className="mt-8 max-w-2xl"
          >
            <p className="font-display text-balance text-[26px] leading-[1.12] sm:text-[32px]">
              I build the things I <span className="text-accent">wished existed</span>.
            </p>
            <p className="mt-4 text-pretty text-[16.5px] leading-relaxed text-muted sm:text-[17.5px]">{site.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Link to="/#city" className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-accent px-6 text-[14.5px] font-medium text-bg transition-colors hover:bg-[#7cb9ff]">
                  Explore the city
                  <ArrowRight className="size-4" />
                </Link>
              </Magnetic>
              <a href="https://github.com/jason1015-coder" className="link-draw inline-flex h-12 items-center gap-1.5 px-2 text-[14.5px] text-fg">
                GitHub
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="mt-12 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:max-w-2xl sm:gap-8"
          >
            {site.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{stat.label}</dt>
                <dd className="font-display mt-1.5 text-[34px] leading-none text-fg sm:text-[42px]">{stat.value}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </section>

      {/* Stack ticker */}
      <div className="overflow-hidden border-y border-line py-4" aria-hidden>
        <ul className="mono flex w-max animate-marquee items-center gap-8 whitespace-nowrap text-[12px] uppercase tracking-[0.16em] text-muted">
          {[...site.marquee, ...site.marquee].map((item, i) => (
            <li key={i} className="flex items-center gap-8">
              {item}
              <span className="round size-1 rounded-full bg-accent/70" />
            </li>
          ))}
        </ul>
      </div>

      {/* The work, as a city rather than a grid of cards. */}
      <CitySection />
    </>
  )
}

// A quiet blueprint grid, a blue glow and two drifting colour fields behind
// the hero. It fades into the canvas before the hero copy starts.
function HeroField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_55%,transparent_97%)]">
      <div className="absolute inset-0 grid-lines" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6, ease }} className="absolute inset-0">
        <div className="round absolute -top-[30%] right-[-10%] h-[85%] w-[65%] animate-drift-a rounded-full bg-[radial-gradient(closest-side,rgb(88_166_255/0.22),transparent)] blur-3xl" />
        <div className="round absolute top-[8%] left-[-14%] h-[75%] w-[55%] animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(216_180_254/0.08),transparent)] blur-3xl" />
      </motion.div>
      <div className="grain absolute inset-0" />
    </div>
  )
}
