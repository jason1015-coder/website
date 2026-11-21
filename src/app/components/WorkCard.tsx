import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'

import type { Project } from '../../data/site'
import { cx } from '../lib/cx'
import { CodeWindow } from './CodeWindow'

export function WorkCard({ project, index = 0 }: { project: Project; index?: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [hover, setHover] = useState(false)
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 })
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 })
  const large = project.size === 'large'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, delay: (index % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={cx(large ? 'md:col-span-2' : 'md:col-span-1')}
    >
      <Link
        ref={ref}
        to={`/work/${project.slug}`}
        className="group relative block"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={(e) => {
          const rect = ref.current?.getBoundingClientRect()
          if (!rect) return
          x.set(e.clientX - rect.left)
          y.set(e.clientY - rect.top)
        }}
      >
        <div
          className={cx(
            'relative overflow-hidden rounded-[24px] border border-line bg-surface transition-colors duration-500 group-hover:border-line-strong',
            large ? 'aspect-[16/10] sm:aspect-[16/8.5]' : 'aspect-[4/3]',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-70"
            style={{ background: `radial-gradient(60% 60% at 50% 30%, ${project.tint}22, transparent 70%)` }}
          />
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
          <div className={cx('absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5', large ? 'p-6 sm:p-12 lg:p-16' : 'p-5 sm:p-8')}>
            <div className="w-full max-w-[560px]">
              <CodeWindow
                file={project.snippet.file}
                lines={project.snippet.lines}
                tint={project.tint}
                size={large ? 'large' : 'small'}
                className="shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]"
              />
            </div>
          </div>
          <motion.span
            aria-hidden
            style={{ x, y }}
            className={cx(
              'pointer-events-none absolute left-0 top-0 hidden -translate-x-1/2 -translate-y-1/2 items-center rounded-[10px] bg-accent px-3.5 py-2 text-[12.5px] font-medium text-bg transition-[opacity,scale] duration-300 md:flex',
              hover ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
            )}
          >
            Read case study
          </motion.span>
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[28px] sm:text-[32px]">{project.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {project.stack.slice(0, 4).map((item) => (
                <li key={item} className="mono rounded-[6px] border border-line px-2 py-1 text-[10.5px] uppercase tracking-[0.06em] text-faint">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="shrink-0 text-right text-[13px] text-muted">
            {project.category}
            <span className="mono mt-1 block text-[11.5px] tabular-nums text-faint">{project.year}</span>
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
