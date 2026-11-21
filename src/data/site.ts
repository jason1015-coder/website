// Everything about you lives here. The pages read from this file.
// Source: github.com/jason1015-coder profile and public repository READMEs.

export const site = {
  name: 'Jason C',
  handle: 'jason1015-coder',
  role: 'Hobbyist developer & toolmaker',
  location: 'Coventry, UK',
  timezone: 'Europe/London',
  available: true,
  availability: 'Open to opportunities and interesting side projects',
  intro:
    'A hobbyist developer in Coventry, making browser extensions and developer tools for problems I actually have. There is also Scriptura, a Qt and Rust code editor. I read the docs first, most of the time.',
  socials: [
    { label: 'GitHub', href: 'https://github.com/jason1015-coder' },
    { label: 'Scriptura docs', href: 'https://docs.nanocollective.org/collective/whitepapers/scriptura/' },
    { label: 'Nano Collective', href: 'https://nanocollective.org' },
  ],
  stats: [
    { value: '10', label: 'public repos' },
    { value: '5', label: 'tools built' },
    { value: '2', label: 'years on GitHub' },
  ],
}

export interface Project {
  slug: string
  title: string
  client: string
  category: string
  year: string
  tint: string
  summary: string
  stack: string[]
  role: string[]
  metrics: { value: string; label: string }[]
  link?: string
  body: string[]
  size: 'large' | 'small'
  snippet: { file: string; lines: string[] }
}

export const projects: Project[] = [
  {
    slug: 'scriptura',
    title: 'Scriptura',
    client: 'Nano Collective',
    category: 'Code editor',
    year: '2026',
    tint: '#58a6ff',
    summary:
      'An open-source code editor built on Qt 6 and Rust: a C++ UI, a safe Rust backend, and no trackers or big-company telemetry.',
    stack: ['C++', 'Rust', 'Qt 6', 'CMake', 'C FFI'],
    role: ['Architecture', 'Qt UI', 'Rust backend'],
    metrics: [
      { value: '7', label: 'GitHub stars' },
      { value: 'MIT', label: 'licensed' },
      { value: 'pre-1.0', label: 'active development' },
    ],
    link: 'https://github.com/jason1015-coder/scriptura',
    body: [
      'Scriptura is the editor I wanted: fast, local-first, and not owned by anyone with an ad business. The UI is pure Qt 6 widgets in C++; the backend is a Rust static library handling LSP, DAP, the event bus, task running, workspaces and config.',
      'The interesting problem is the seam between the two. A thin C++ adapter layer bridges Qt signals and slots into Rust callbacks over a C FFI, with JSON strings for the complex payloads. All state and protocol handling stays in safe Rust; the UI layer never parses a language server message.',
      'It is pre-1.0 and honest about it. Themes already ship as single-file JSON plugins, and the roadmap is a local-first AI assistant built on Nanocoder, inline completion, and hardening toward a real v1. It is built with the Nano Collective, and it needs a second maintainer as much as it needs code.',
    ],
    size: 'large',
    snippet: {
      file: 'src/rust_backend/src/lib.rs',
      lines: [
        'pub fn register(host: &mut Host) {',
        '    host.on("lsp", lsp::handle);',
        '    host.on("workspace", workspace::handle);',
        '    host.on("dap", dap::handle);',
        '}',
        '// Qt 6 for the UI · Rust for the truth',
      ],
    },
  },
  {
    slug: 'weather-ext',
    title: 'Weather',
    client: 'Personal project',
    category: 'Browser extension',
    year: '2026',
    tint: '#7ee6c4',
    summary:
      'A Chromium side-panel weather extension for five saved cities and a nine-day forecast, with no ads and no API key.',
    stack: ['JavaScript', 'Manifest V3', 'Side panel API', 'Open-Meteo'],
    role: ['Design', 'Implementation'],
    metrics: [
      { value: '5', label: 'saved cities' },
      { value: '9-day', label: 'forecast' },
      { value: '0', label: 'ads or trackers' },
    ],
    link: 'https://github.com/jason1015-coder/weather-ext',
    body: [
      'I got tired of weather apps and ad-heavy forecast tabs, so I built the smallest version I would actually use: a side panel that opens next to whatever I am doing and tells me the next nine days.',
      'Each location gets real-time conditions, feels-like, humidity, wind, pressure, visibility and air quality, plus 24-hour temperature and humidity trend charts. The panel’s gradient shifts with the temperature and collapses when you do not need it.',
      'Data comes from Open-Meteo, which is free and needs no API key, so there is no account, no quota and no server of mine in the middle. It needs Chromium 114 or newer for the side-panel API.',
    ],
    size: 'small',
    snippet: {
      file: 'src/forecast.js',
      lines: [
        'const data = await fetch(',
        '  `https://api.open-meteo.com/v1/forecast`',
        ').then((r) => r.json())',
        '// 5 cities · 9 days · no API key',
      ],
    },
  },
  {
    slug: 'extension-manager',
    title: 'Extension Manager',
    client: 'Personal project',
    category: 'Browser extension',
    year: '2026',
    tint: '#ffc46b',
    summary:
      'A dashboard for every extension you have installed, because chrome://extensions was never meant to be a management screen.',
    stack: ['JavaScript', 'Manifest V3', 'chrome.management'],
    role: ['Design', 'Implementation'],
    metrics: [
      { value: '1', label: 'permission' },
      { value: '3', label: 'list filters' },
      { value: 'live', label: 'event updates' },
    ],
    link: 'https://github.com/jason1015-coder/manager-ext',
    body: [
      'Digging through chrome://extensions to find one thing is a small daily annoyance, so this extension turns it into a proper list: icon, name, description, version and how each one was installed — unpacked, sideloaded, Web Store or built in.',
      'You can enable, disable or remove from one place, search live, filter by state, and jump straight to an extension’s options page. It listens to chrome.management events, so the list stays accurate while it is open.',
      'Two Chrome constraints shaped the design. An extension cannot modify its own state, so the manager excludes itself. And no regular extension can install another; the best available UI is a deep link into chrome://extensions with developer-mode instructions, so that is what the install helper does instead of pretending.',
    ],
    size: 'small',
    snippet: {
      file: 'src/manager.js',
      lines: [
        'chrome.management.getAll((all) => {',
        '  render(all.filter((e) => e.id !== selfId))',
        '})',
        '// discover · toggle · remove',
      ],
    },
  },
  {
    slug: 'audio-432',
    title: '432Hz Audio Engine',
    client: 'Personal project',
    category: 'Audio extension',
    year: '2026',
    tint: '#d8b4fe',
    summary:
      'Retunes any web audio or video to A=432Hz in real time, with a tape-style tempo mode and a WSOLA pitch mode.',
    stack: ['JavaScript', 'Web Audio API', 'AudioWorklet', 'GPL-3.0'],
    role: ['DSP', 'Extension'],
    metrics: [
      { value: '2', label: 'retune modes' },
      { value: 'realtime', label: 'no re-download' },
      { value: 'GPL-3.0', label: 'licensed' },
    ],
    link: 'https://github.com/jason1015-coder/audio-pitch-converter',
    body: [
      'Some music sounds better at 432Hz, and the usual options are Audacity, a 432Hz converter site that uploads your file, or a paid plugin. This extension does it in the browser, on whatever is already playing.',
      'Tempo mode slows playback proportionally, tape-style, which drops the pitch to 432Hz and works on almost any site with no setup. Pitch mode keeps the tempo intact using a WSOLA pitch-shift AudioWorklet, at the cost of needing CORS-accessible audio and a user gesture before the audio graph can start.',
      'The two modes exist because the honest answer depends on the source: one is universal and changes the tempo, the other preserves timing and cannot reach every player. The UI says which is which instead of hiding the trade-off.',
    ],
    size: 'large',
    snippet: {
      file: 'src/engine.js',
      lines: [
        "if (mode === 'pitch') {",
        "  node = new AudioWorkletNode(ctx, 'wsola-shift')",
        "  node.parameters.get('ratio').value = 432 / 440",
        '}',
        '// tempo: tape-style · pitch: WSOLA',
      ],
    },
  },
  {
    slug: 'quick-notes',
    title: 'Quick Notes',
    client: 'Personal project',
    category: 'Browser extension',
    year: '2026',
    tint: '#fca5a5',
    summary:
      'A floating notepad on any website, with notes that persist per domain and never leave the browser.',
    stack: ['JavaScript', 'Manifest V3', 'Content scripts', 'chrome.storage'],
    role: ['Design', 'Implementation'],
    metrics: [
      { value: '0', label: 'dependencies' },
      { value: '400ms', label: 'autosave debounce' },
      { value: 'local', label: 'storage only' },
    ],
    link: 'https://github.com/jason1015-coder/quick-note-ext',
    body: [
      'I wanted somewhere to leave a thought about a specific page — a PR to revisit, a snippet that finally made sense — without opening a notes app and losing the context.',
      'The notepad is a draggable widget injected by a content script, keyed by domain, so GitHub and Stack Overflow each keep their own note. It saves as you type behind a 400ms debounce, collapses out of the way, and has a popup for a quick overview of everything.',
      'It is vanilla JavaScript with no build step and no dependencies, and every note lives in chrome.storage.local. No accounts, no servers, no analytics — which also means no sync, a trade-off I would make again for a notes tool.',
    ],
    size: 'small',
    snippet: {
      file: 'src/content.js',
      lines: [
        'chrome.storage.local.set({',
        '  [`qn:${location.host}`]: note,',
        '})',
        '// per-site · autosaved · never uploaded',
      ],
    },
  },
  {
    slug: 'star-tamagotchi',
    title: 'Star Tamagotchi',
    client: 'Profile project',
    category: 'README experiment',
    year: '2026',
    tint: '#c8f169',
    summary:
      'A pixel pet that lives in my GitHub profile README and evolves as stars arrive on any repo I wrote.',
    stack: ['JavaScript', 'SVG', 'GitHub Actions', 'Markdown'],
    role: ['Concept', 'Implementation'],
    metrics: [
      { value: '5', label: 'evolution stages' },
      { value: '100', label: 'stars to legend' },
      { value: '1', label: 'hungry pixel pet' },
    ],
    link: 'https://github.com/jason1015-coder/jason1015-coder',
    body: [
      'The profile README needed something better than a list of badges. So there is a tamagotchi in it: an egg at zero stars, hatching at five, sprouting at fifteen, getting chonk at forty and crowned at a hundred.',
      'Stars on any repository I wrote feed it, not just the profile repo. A scheduled workflow and a star event both trigger the update, with a five-minute poll as a safety net, so the pet wakes up within seconds of a star without anyone herding it.',
      'The whole thing is generated SVG and a small script — the drawing is code, the state is a star count, and the joke is that a README can be a tiny product if you treat it like one.',
    ],
    size: 'small',
    snippet: {
      file: '.github/workflows/feed.yml',
      lines: [
        'on:',
        '  watch:',
        '    types: [started]',
        'jobs:',
        '  feed:',
        '    runs-on: ubuntu-latest',
        '// egg at 0 · legend at 100',
      ],
    },
  },
]

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug)
