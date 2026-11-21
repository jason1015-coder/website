import { motion } from 'motion/react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'

import { bySlug, projects } from '../../data/site'
import { CodeWindow } from '../components/CodeWindow'
import { Lines, Reveal } from '../components/motion'

const ease = [0.22, 1, 0.36, 1] as const

export function Work() {
  const { slug } = useParams()
  const project = slug ? bySlug(slug) : undefined
  if (!project) return <Navigate to="/" replace />
  const index = projects.findIndex((p) => p.slug === project.slug)
  const next = projects[(index + 1) % projects.length]

  return (
    <article className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-8 sm:pt-36">
      <Link to="/#work" className="inline-flex h-9 items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-4" />
        All work
      </Link>

      <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
            {project.client} <span className="mx-2 text-line-strong">/</span> {project.category}
          </p>
          <Lines as="h1" className="font-display mt-4 text-[clamp(54px,10vw,148px)]" lines={[project.title]} />
        </div>
        <Reveal delay={0.2} className="max-w-md text-pretty text-[17px] leading-relaxed text-muted lg:pb-4">
          {project.summary}
        </Reveal>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.2, ease }}
        className="relative mt-12 overflow-hidden rounded-[24px] border border-line bg-surface p-5 sm:p-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(70% 80% at 50% 0%, ${project.tint}20, transparent 70%)` }}
        />
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-[720px]">
          <CodeWindow file={project.snippet.file} lines={project.snippet.lines} tint={project.tint} size="large" />
        </div>
      </motion.div>

      <Reveal className="mt-10 grid gap-6 border-y border-line py-8 sm:grid-cols-3">
        {project.metrics.map((metric) => (
          <div key={metric.label}>
            <p className="font-display text-[40px] leading-none sm:text-[52px]">{metric.value}</p>
            <p className="mono mt-2 text-[10.5px] uppercase tracking-[0.14em] text-faint">{metric.label}</p>
          </div>
        ))}
      </Reveal>

      <div className="mt-16 grid gap-12 lg:grid-cols-[300px_1fr] lg:gap-24">
        <Reveal>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 text-[14px] lg:grid-cols-1">
            {[
              ['Project', project.client],
              ['Year', project.year],
              ['Role', project.role.join(', ')],
            ].map(([label, value]) => (
              <div key={label} className="border-t border-line pt-3">
                <dt className="mono text-[10.5px] uppercase tracking-[0.14em] text-faint">{label}</dt>
                <dd className="mt-1.5 text-fg">{value}</dd>
              </div>
            ))}
            <div className="border-t border-line pt-3">
              <dt className="mono text-[10.5px] uppercase tracking-[0.14em] text-faint">Stack</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {project.stack.map((item) => (
                  <span key={item} className="rounded-[7px] border border-line bg-surface px-2.5 py-1 text-[12.5px] text-fg/85">
                    {item}
                  </span>
                ))}
              </dd>
            </div>
            {project.link && (
              <div className="border-t border-line pt-3">
                <a href={project.link} className="link-draw inline-flex items-center gap-1 font-medium">
                  View on GitHub
                  <ArrowUpRight className="size-4" />
                </a>
              </div>
            )}
          </dl>
        </Reveal>
        <div className="max-w-2xl">
          {project.body.map((paragraph, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <p className={`text-pretty leading-relaxed text-fg/90 ${i === 0 ? 'font-display text-[26px] leading-[1.25] sm:text-[34px]' : 'mt-6 text-[16.5px] text-muted'}`}>{paragraph}</p>
            </Reveal>
          ))}
        </div>
      </div>

      <Link to={`/work/${next.slug}`} className="group mt-28 block border-t border-line pt-10 sm:mt-36">
        <p className="mono text-[10.5px] uppercase tracking-[0.18em] text-faint">Next project</p>
        <div className="mt-4 flex items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-[clamp(44px,8vw,120px)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3">{next.title}</h2>
            <p className="mono mt-2 text-[11px] uppercase tracking-[0.14em] text-faint">
              {next.category} / {next.year}
            </p>
          </div>
          <ArrowUpRight className="mb-2 size-10 shrink-0 text-faint transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent sm:size-14" />
        </div>
      </Link>
    </article>
  )
}
