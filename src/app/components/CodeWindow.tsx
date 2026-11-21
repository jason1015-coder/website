import { cx } from '../lib/cx'

const tone = (line: string) => {
  if (line.startsWith('+')) return 'text-accent'
  if (line.startsWith('-')) return 'text-danger'
  if (line.startsWith('~')) return 'text-[#ffc46b]'
  if (line.startsWith('//')) return 'text-faint'
  if (line.startsWith('$')) return 'text-accent'
  return 'text-fg/80'
}

/**
 * The project cover: a small, honest code window. No stock photography, and
 * the snippet is real enough to say what the project was about.
 */
export function CodeWindow({
  file,
  lines,
  tint,
  className,
  size = 'small',
}: {
  file: string
  lines: string[]
  tint: string
  className?: string
  size?: 'small' | 'large'
}) {
  return (
    <div className={cx('relative overflow-hidden rounded-[16px] border border-line bg-[#0b0f0d]', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-20 size-52 rounded-full opacity-25 blur-3xl"
        style={{ background: tint }}
      />
      <div className="relative flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
        <span className="round size-[7px] rounded-full bg-line-strong" />
        <span className="round size-[7px] rounded-full bg-line-strong/70" />
        <span className="round size-[7px] rounded-full bg-line-strong/40" />
        <span className="mono ml-2 truncate text-[10.5px] text-faint">{file}</span>
      </div>
      <div className="relative overflow-x-auto px-3 py-3.5 sm:px-4">
        <pre className={cx('mono leading-[1.85]', size === 'large' ? 'text-[12px] sm:text-[13.5px]' : 'text-[10.5px] sm:text-[11.5px]')}>
          <code>
            {lines.map((line, i) => (
              <span key={i} className="flex gap-3 whitespace-pre">
                <span className="w-3 shrink-0 select-none text-right text-faint/45">{i + 1}</span>
                <span className={tone(line)}>{line || ' '}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}
