export const languages = {
  en: 'English',
  zh: '中文',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  caption: string;
};

type LogEntry = { when: string; title: string; body: string; tag: string };

type FirmwareContent = {
  eyebrow: string;
  title: string;
  lede: string;
  // Browser (Web Serial) flow
  webTitle: string;
  webLede: string;
  connectBtn: string;
  browserNote: string;
  unsupported: string;
  // Live flash status
  connecting: string;
  flashing: string;
  flashDone: string;
  flashErr: string;
  noSerial: string;
  logTitle: string;
  // Shared safety notes
  notesTitle: string;
  notes: string[];
};

type FontsContent = {
  eyebrow: string;
  title: string;
  lede: string;
  familyLabel: string;
  familyHint: string;
  familyPlaceholder: string;
  sizesLabel: string;
  sizesHint: string;
  facesLabel: string;
  facesHint: string;
  styles: { regular: string; bold: string; italic: string; bolditalic: string };
  fallbacksLabel: string;
  fallbacksHint: string;
  fallback1: string;
  fallback2: string;
  required: string;
  optional: string;
  coverageLabel: string;
  coverageHint: string;
  presetNames: Record<string, string>;
  customLabel: string;
  customHint: string;
  buildBtn: string;
  cancelBtn: string;
  building: string;
  cancelled: string;
  complete: string;
  progressLabel: string;
  logTitle: string;
  resultsTitle: string;
  downloadAll: string;
  download: string;
  installTitle: string;
  installSteps: string[];
  errNoFont: string;
  errFileType: string;
  errTooLarge: string;
  errOom: string;
  errFailed: string;
};

type TxtToEpubContent = {
  eyebrow: string;
  title: string;
  lede: string;
  fileLabel: string;
  fileHint: string;
  titleLabel: string;
  titlePlaceholder: string;
  authorLabel: string;
  authorPlaceholder: string;
  encodingLabel: string;
  encodingHint: string;
  encodingOptions: {
    auto: string;
    utf8: string;
    gb18030: string;
    big5: string;
  };
  splitLabel: string;
  splitHint: string;
  splitOptions: {
    auto: string;
    none: string;
    custom: string;
  };
  customRegexLabel: string;
  customRegexPlaceholder: string;
  customRegexHint: string;
  prologueTitle: string;
  fallbackTitle: string;
  buildBtn: string;
  building: string;
  complete: string;
  previewTitle: string;
  resultsTitle: string;
  download: string;
  detectedInfo: string;
  chaptersUnit: string;
  charsUnit: string;
  usageTitle: string;
  usageSteps: string[];
  errNoFile: string;
  errFileType: string;
  errEmptyRegex: string;
  errInvalidRegex: string;
  errFailed: string;
};

type ShowcaseContent = {
  design: {
    eyebrow: string;
    title: string;
    lede: string;
    pillars: { num: string; title: string; body: string }[];
    dxfCaptions: { front: string; right: string; usb: string };
    videoLabel: string;
  };
  interfaces: {
    eyebrow: string;
    title: string;
    lede: string;
    diagramAlt: string;
    callouts: { num: string; title: string; desc: string }[];
    navBarEyebrow: string;
    navBarTitle: string;
    navBarBody: string;
    navBarKeys: { key: string; label: string }[];
  };
  engineering: {
    eyebrow: string;
    title: string;
    lede: string;
    points: { title: string; body: string }[];
    archLabel: string;
    archAlt: string;
    structureTitle: string;
    pcb: { title: string; lines: string[] };
    stack: { title: string; lines: string[] };
    assembly: { title: string; lines: string[] };
    notes: {
      bootTitle: string;
      bootBody: string;
      sdTitle: string;
      sdBody: string;
      screenTitle: string;
      screenBody: string;
    };
  };
  ai: {
    eyebrow: string;
    badge: string;
    title: string;
    body: string;
    cards: { title: string; body: string; img: string; alt: string }[];
    tags: string[];
  };
  photos: {
    eyebrow: string;
    title: string;
    lede: string;
  };
};

type Content = {
  nav: {
    features: string;
    notes: string;
    firmware: string;
    tools: string;
    fontTool: string;
    txtToEpub: string;
    github: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
    caption: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  features: {
    reading: Feature;
    hardware: Feature;
    webconfig: Feature;
    controls: Feature;
  };
  materials: {
    eyebrow: string;
    title: string;
    lede: string;
    items: { label: string; body: string }[];
    simLaunch: string;
    simNote: string;
  };
  log: {
    eyebrow: string;
    title: string;
    lede: string;
    entries: LogEntry[];
    nextLabel: string;
    next: { items: string; status: string }[];
  };
  about: {
    eyebrow: string;
    title: string;
    body: string[];
  };
  footer: {
    tagline: string;
    openSource: string;
    rights: string;
    pvLabel: string;
    uvLabel: string;
  };
  specs: {
    eyebrow: string;
    title: string;
    groups: { label: string; rows: { k: string; v: string }[] }[];
  };
  gallery: {
    eyebrow: string;
    title: string;
    dotLabel: string;
    photos: { src: string; alt: string; title: string; sub: string }[];
  };
  showcase: ShowcaseContent;
  fonts: FontsContent;
  txtToEpub: TxtToEpubContent;
  firmware: FirmwareContent;
};

export const ui: Record<Lang, Content> = {
  en: {
    nav: {
      features: 'The build',
      notes: 'Log',
      firmware: 'Firmware',
      tools: 'Tools',
      fontTool: 'Font Tool',
      txtToEpub: 'TXT to EPUB',
      github: 'GitHub',
    },
    hero: {
      eyebrow: 'Build log · 4.26-inch e-ink reader',
      title: 'OnePage — a little e-reader I’m building for myself.',
      lede: 'An open notebook for a 4.26″ e-ink reader on an ESP32-C61. Reflowable text, careful CJK typography, a phone-friendly setup. No roadmap promises — just what works so far, written down as it does.',
      caption: 'OnePage · 壹頁 — seen edge-on. It’s genuinely thin.',
      ctaPrimary: 'Read the log',
      ctaSecondary: 'GitHub',
    },
    features: {
      reading: {
        eyebrow: 'Reading',
        title: 'Getting the text to lay out properly.',
        body: 'Plain TXT and EPUB are reflowed by CrossPoint’s engine and rendered with FreeType, so glyphs stay crisp at 219 DPI. Most of my work is in the Chinese typography — line-breaking and justification that don’t look wrong.',
        points: [
          'TXT and EPUB reflow already working (HTML / Markdown ride the same path)',
          'CJK line-breaking, punctuation squeezing, and full justification',
          'Reading position kept across sleep and reboots',
        ],
        caption: 'Narrow bezels up top.',
      },
      hardware: {
        eyebrow: 'Hardware',
        title: 'Quiet, paper-like, daylight-loving.',
        body: 'A 4.26″ 800×480 panel at 219 DPI, driven 1-bit black & white for crisp text, with 4-level gray kept for covers and images. Battery-powered with deep sleep — and no frontlight, which is a choice, not an oversight.',
        points: [
          'ESP32-C61 · 16 MB flash · 2 MB PSRAM · microSD over SPI',
          '1-bit B/W for text, 4-gray for covers and pictures',
          'No frontlight: happiest in daylight — night reading needs a lamp',
        ],
        caption: 'Front — quiet, and paper-like.',
      },
      webconfig: {
        eyebrow: 'Setup',
        title: 'Configure it from your phone.',
        body: 'Seven buttons and no touchscreen make typing a WiFi password on-device miserable. So the reader hosts its own little web page — open it from any browser to set things up and push books across.',
        points: [
          'Starts its own hotspot for first-time WiFi setup, or join over your LAN',
          'Upload EPUB / TXT straight from the browser to the SD card',
          'Enter WiFi, API keys, and sync settings without the on-screen keyboard',
        ],
        caption: 'microSD slot, USB-C, and a mic hole — all in one row.',
      },
      controls: {
        eyebrow: 'Controls',
        title: 'Built for pockets and commutes.',
        body: 'Seven physical keys, no touch. A long-press key-lock stops it flipping pages in your bag, and an optional Bluetooth page-turner means your hands can stay under the blanket.',
        points: [
          'Long-press to lock; wakes locked so it won’t flip pages in a bag',
          'Optional BLE page-turner with learn-to-map buttons',
          'Page-turn direction follows the screen orientation',
        ],
        caption: 'Wake key — restrained, but easy to reach.',
      },
    },
    materials: {
      eyebrow: 'The object',
      title: 'Built to be held, not just used.',
      lede: 'An aluminium mid-frame between a white front and a white acrylic back. Light, flat, quiet in the hand — it should feel like a notebook you keep, not a gadget you charge.',
      items: [
        { label: 'Aluminium mid-frame', body: 'A thin milled frame carries the structure and the keys, and gives it a flat, sturdy edge.' },
        { label: 'White front', body: 'A clean white face around the e-ink screen. Narrow bezels, nothing blinking back at you.' },
        { label: 'White acrylic back', body: 'A smooth white acrylic shell — warm to hold, and quietly unlike the usual black slab.' },
      ],
      simLaunch: 'Try it live',
      simNote: 'The real firmware, running in your browser — my port of CrossPoint (open-source), the same reader the device runs.',
    },
    log: {
      eyebrow: 'Build log',
      title: 'What’s happened so far.',
      lede: 'Rough notes from bring-up. Newest first. Dates are approximate — this is a side project, not a release schedule.',
      entries: [
        {
          when: 'Now',
          title: 'Porting CrossPoint',
          body: 'Rather than write a reader from scratch, I’m porting CrossPoint — open-source, and already solid at TXT/EPUB reflow and CJK typography. Much faster path to something I can actually read on.',
          tag: 'In progress',
        },
        {
          when: 'Earlier',
          title: 'The mic records now',
          body: 'That PDM mic that “wouldn’t clock right” wasn’t a silicon erratum after all — it was an IDF 5.5.x driver bug in the C61’s PDM-RX clock path, and 6.1-dev fixed it. Long-press to record, software CIC down to 16 kHz, WAV to the SD card. Still a side feature, not part of reading.',
          tag: 'Done',
        },
        {
          when: 'Earlier',
          title: 'Web setup decided',
          body: 'With seven keys and no touch, typing passwords on-screen is awful. Settled on a self-hosted web page over hotspot / LAN as the real way to configure and load books.',
          tag: 'Decided',
        },
        {
          when: 'Bring-up',
          title: 'Panel drawing, screen-corruption fixed',
          body: 'Got the 4.26″ SSD1677 panel refreshing, then tracked down a tearing bug to an SPI per-transfer size limit on the C61. One bad assumption, a lot of garbled screens.',
          tag: 'Done',
        },
      ],
      nextLabel: 'On the list, roughly in order',
      next: [
        { items: 'TXT and EPUB', status: 'Stage 1' },
        { items: 'HTML & Markdown (same reflow engine)', status: 'Stage 2' },
        { items: 'CBZ comics, MOBI / AZW3 (no DRM)', status: 'Stage 3' },
        { items: 'PDF, read-only (crop + columns) — tight on memory', status: 'Maybe' },
      ],
    },
    about: {
      eyebrow: 'About this',
      title: 'A personal project, not a product.',
      body: [
        'OnePage is something I’m building for the fun of it — to read the way I like, on hardware I understand. It isn’t a startup and it isn’t chasing a market.',
        'I’m keeping the notes in the open: the decisions, the dead ends, and the occasional thing that finally works. If that’s your kind of thing, follow along.',
      ],
    },
    footer: {
      tagline: 'OnePage · 壹頁 — a 4.26″ e-ink reader.',
      openSource: 'Built on CrossPoint (MIT). My port and these notes are shared openly.',
      rights: 'A personal build log. Names and brand are still settling.',
      pvLabel: 'Views',
      uvLabel: 'Visitors',
    },
    specs: {
      eyebrow: 'Tech specs',
      title: 'The details, for the curious.',
      groups: [
        { label: 'Size & weight', rows: [
          { k: 'Dimensions', v: '66.5 × 116 × 5 mm' },
          { k: 'Weight', v: '64 g' },
        ] },
        { label: 'Display', rows: [
          { k: 'Panel', v: '4.26″ e-ink · 800×480 · 219 dpi' },
          { k: 'Rendering', v: '1-bit B/W text · 4-gray covers' },
          { k: 'Frontlight', v: 'None — on purpose' },
          { k: 'Controller', v: 'SSD1677 (SPI)' },
        ] },
        { label: 'Chip & memory', rows: [
          { k: 'SoC', v: 'ESP32-C61' },
          { k: 'Flash', v: '16 MB' },
          { k: 'PSRAM', v: '2 MB' },
        ] },
        { label: 'Storage', rows: [
          { k: 'Card', v: 'microSD over SPI' },
          { k: 'Filesystem', v: 'FAT32 only' },
        ] },
        { label: 'Controls', rows: [
          { k: 'Keys', v: '7 physical · no touch' },
          { k: 'Page-turner', v: 'Optional Bluetooth LE' },
        ] },
        { label: 'Connectivity', rows: [
          { k: 'Wireless', v: 'Wi-Fi 6 · Bluetooth LE' },
          { k: 'Port', v: 'USB-C' },
        ] },
        { label: 'Power', rows: [
          { k: 'Battery', v: '1000 mAh · rechargeable' },
          { k: 'Charging', v: 'Over USB-C' },
        ] },
      ],
    },
    gallery: {
      eyebrow: 'Renders',
      title: 'A first look at the design.',
      dotLabel: 'View photo',
      photos: [
        { src: '/gallery/OnePage-3D-a1.jpg', alt: 'OnePage — seen edge-on', title: 'Genuinely thin', sub: 'Seen edge-on' },
        { src: '/gallery/OnePage-3D-a2.jpg', alt: 'OnePage — top bezel', title: 'The top quarter', sub: 'Bezels pulled in tight' },
        { src: '/gallery/OnePage-3D-a3.jpg', alt: 'OnePage — bottom at 45°', title: 'Bottom, at 45°', sub: 'Keys and ports, all in a row' },
        { src: '/gallery/OnePage-3D-a4.jpg', alt: 'OnePage — wake key', title: 'The wake key', sub: 'Restrained, but easy to reach' },
        { src: '/gallery/OnePage-3D-a5.jpg', alt: 'OnePage — microSD slot', title: 'A little surprise', sub: 'The microSD slot has a face' },
      ],
    },
    showcase: {
      design: {
        eyebrow: 'ID Design',
        title: 'Thin, centered, symmetrical, clean.',
        lede: 'The front of OnePage tries not to look like “hardware.” The screen, keys, and ports are organized around a central axis so it feels like a quiet reading sheet rather than a dev board in a box.',
        pillars: [
          { num: '01', title: 'Thin', body: 'Compressed internal stackup for a slim, restrained profile.' },
          { num: '02', title: 'Centered', body: 'Ports and controls align to a strict central axis.' },
          { num: '03', title: 'Symmetrical', body: 'Three-segment bottom chin forms a balanced visual order.' },
          { num: '04', title: 'Clean', body: 'Anything that can stay hidden stays off the front face.' },
        ],
        dxfCaptions: {
          front: 'FRONT · DXF CONVERSION',
          right: 'RIGHT EDGE',
          usb: 'USB EDGE',
        },
        videoLabel: 'Watch on Bilibili · MoveCall ↗',
      },
      interfaces: {
        eyebrow: 'Interfaces & controls',
        title: 'Every key and port, in its place.',
        lede: 'Side page-turn keys paired with a three-segment bottom navigation bar — full control without a touchscreen.',
        diagramAlt: 'OnePage ports and buttons diagram',
        callouts: [
          { num: '01', title: 'Wake / AI', desc: 'Short press to wake · Long press for AI' },
          { num: '02', title: 'Page Up', desc: 'Previous page' },
          { num: '03', title: 'Page Down', desc: 'Next page' },
          { num: '04', title: 'USB-C', desc: 'Charging, debugging & firmware updates' },
          { num: '05', title: 'Micro SD', desc: 'Required to boot (FAT32); shows “Micro SD Error” if missing' },
          { num: '06', title: 'Lanyard Hole', desc: 'Built-in corner loop for easy carry' },
        ],
        navBarEyebrow: 'FRONT NAVIGATION BAR',
        navBarTitle: 'Three-segment bottom navigation bar',
        navBarBody: 'Left for Back, center rocker for Left / Right navigation, right for OK. The front and back panels are bonded with adhesive for a seamless body.',
        navBarKeys: [
          { key: 'Back', label: 'Return' },
          { key: 'Left / Right', label: 'Navigate' },
          { key: 'OK', label: 'Confirm' },
        ],
      },
      engineering: {
        eyebrow: 'Engineering & structure',
        title: 'Making everything coexist quietly in 5 mm.',
        lede: 'The hard part isn’t cramming features in — it’s getting them to share a thin enclosure without getting in each other’s way.',
        points: [
          { title: 'Shared SPI bus', body: 'The e-paper display and Micro SD card share the SPI bus, preserving full expansion within tight GPIO limits.' },
          { title: 'On-demand peripheral power', body: 'The SD card and PDM microphone power up only when needed, cutting idle loads during deep sleep.' },
          { title: 'ADC resistor-ladder keys', body: 'Four-way front navigation runs through an ADC resistor ladder to save GPIO pins.' },
          { title: 'Reliable recovery', body: 'Direct USB-C debugging and hardware boot-mode entry keep DIY firmware hacking safe.' },
        ],
        archLabel: 'SYSTEM ARCHITECTURE',
        archAlt: 'OnePage System Architecture Diagram',
        structureTitle: 'PCB & structural craft',
        pcb: {
          title: '01 · Mainboard',
          lines: [
            'Layers: 4-layer PCB',
            'Finished thickness: 0.80 ± 0.10 mm',
            'Stackup: JLC04081H-3313',
          ],
        },
        stack: {
          title: '02 · Structural Stack',
          lines: [
            'Front: High-clarity PET panel (0.4 mm)',
            'Mid-frame: CNC anodized aluminum',
            'Back: Acrylic panel (0.5 mm)',
          ],
        },
        assembly: {
          title: '03 · Assembly',
          lines: [
            'Layered screen / mainboard / battery stack',
            'Individually aligned physical keycaps',
            'Bonded front & back panels (test before final bonding)',
          ],
        },
        notes: {
          bootTitle: 'Entering Boot Mode manually',
          bootBody: 'Hold down the “Page Down” button, short-press Reset with a pin, release Reset first, then release “Page Down” to enter download mode.',
          sdTitle: 'Micro SD boot requirement',
          sdBody: 'OnePage boots its system from the FAT32 Micro SD card. Without a card inserted, the device will not boot and displays “Micro SD Card Error”.',
          screenTitle: 'Handle the e-paper glass with care',
          screenBody: 'The e-ink glass substrate is fragile — avoid point pressure, bending, or pressing hard objects against the panel during assembly.',
        },
      },
      ai: {
        eyebrow: 'Easter Egg · AI Experimental',
        badge: 'EXPERIMENTAL FIRMWARE BRANCH',
        title: 'Beyond reading, a quiet experiment with AI.',
        body: 'AI features live on a separate experimental firmware branch so the main reading firmware stays rock-solid. It connects to agent frameworks like OpenClaw, Hermes, and DeepSeek Harness to explore lightweight AI interaction on e-paper.',
        cards: [
          {
            title: 'Chat & Q&A',
            body: 'Natural-language conversation, knowledge Q&A, and lightweight task interaction on e-ink.',
            img: 'https://image.lceda.cn/oshwhub/pullImage/04c3698e83c74e4fa464179ae96be236.png',
            alt: 'OnePage AI Chat and Q&A',
          },
          {
            title: 'Text-to-Image',
            body: 'Generate images from natural-language prompts and render them dithered for the e-paper screen.',
            img: 'https://image.lceda.cn/oshwhub/pullImage/b83107f997b04a8aaf67f8b8b40b4ec6.png',
            alt: 'OnePage AI Text to Image',
          },
          {
            title: 'Agent Execution',
            body: 'Testing real-world multi-step agent actions — like ordering a coffee straight from the reader.',
            img: 'https://image.lceda.cn/oshwhub/pullImage/64e13bf84b0d4b5baca2833de1924c06.jpg',
            alt: 'OnePage AI Agent Execution',
          },
        ],
        tags: ['OpenClaw', 'Hermes', 'DeepSeek Harness', 'Experimental'],
      },
      photos: {
        eyebrow: 'In the wild',
        title: 'Real-world photos.',
        lede: 'Actual builds on the desk and in the hand.',
      },
    },
    fonts: {
      eyebrow: 'Font tool',
      title: 'Build fonts for OnePage.',
      lede: 'Build CrossPoint-compatible .cpfont files for OnePage, entirely in your browser. Your source fonts never leave this device.',
      familyLabel: 'Font family',
      familyHint: 'Used for the output folder and filenames. Use ASCII letters, numbers, underscores, or hyphens.',
      familyPlaceholder: 'e.g. LXGW_WenKai',
      sizesLabel: 'Font sizes',
      sizesHint: 'Comma-separated point sizes from 6 to 48. CJK coverage also adds firmware UI sizes 8 and 10.',
      facesLabel: 'Style fonts',
      facesHint: 'Choose TTF or OTF files. Regular is required; each selected style is stored in every output.',
      styles: { regular: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'Bold Italic' },
      fallbacksLabel: 'Regular fallbacks',
      fallbacksHint: 'Optional TTF/OTF fonts used in order when a glyph is missing from a style font.',
      fallback1: 'Fallback 1',
      fallback2: 'Fallback 2',
      required: 'required',
      optional: 'optional',
      coverageLabel: 'Character coverage',
      coverageHint: 'Choose the official CrossPoint sets you need. Base ASCII, common punctuation, and U+FFFD are always included.',
      presetNames: {
        reading: 'Reading',
        default: 'Default multilingual',
        'latin-ext': 'Latin Extended',
        greek: 'Greek',
        cyrillic: 'Cyrillic',
        vietnamese: 'Vietnamese',
        hebrew: 'Hebrew',
        arabic: 'Arabic',
        armenian: 'Armenian',
        georgian: 'Georgian',
        ethiopic: 'Ethiopic',
        cherokee: 'Cherokee',
        tifinagh: 'Tifinagh',
        bengali: 'Bengali',
        thai: 'Thai',
        hangul: 'Korean (Hangul)',
        'cjk-sc': 'Simplified Chinese',
        'cjk-tc': 'Traditional Chinese',
        'cjk-jp': 'Japanese',
        symbols: 'Symbols',
        'ipa-chars': 'IPA characters',
      },
      customLabel: 'Custom Unicode ranges',
      customHint: 'Optional strict ranges, comma-separated: (0x2900-0x29FF),(0x2E00-0x2EFF)',
      buildBtn: 'Build .cpfont',
      cancelBtn: 'Cancel',
      building: 'Building fonts…',
      cancelled: 'Build cancelled.',
      complete: 'Build complete.',
      progressLabel: 'Font build progress',
      logTitle: 'Build details',
      resultsTitle: 'Generated files',
      downloadAll: 'Download all (.zip)',
      download: 'Download',
      installTitle: 'How to install',
      installSteps: [
        'Keep the generated names in the form <Family>_<size>.cpfont.',
        'Place the files under /.fonts/<Family>/ or /fonts/<Family>/ on the SD card.',
        'Reboot OnePage or rescan fonts, then select the family in the reader.',
      ],
      errNoFont: 'Choose a Regular TTF or OTF font first.',
      errFileType: 'Only TTF and OTF source fonts are supported in this release.',
      errTooLarge: 'Selected source fonts exceed the 128 MB limit.',
      errOom: 'Not enough browser memory. Try fewer character sets, font sizes, or styles.',
      errFailed: 'Could not build the font.',
    },
    txtToEpub: {
      eyebrow: 'TXT to EPUB',
      title: 'Pack TXT files into clean EPUBs.',
      lede: 'Convert plain-text books into standard EPUB files with automatic encoding detection (UTF-8 / GBK / GB18030 / Big5) and smart chapter splitting — entirely in your browser.',
      fileLabel: 'TXT file',
      fileHint: 'Select a .txt file from your device. Everything runs locally without uploading.',
      titleLabel: 'Book title',
      titlePlaceholder: 'Defaults to the TXT filename',
      authorLabel: 'Author (optional)',
      authorPlaceholder: 'e.g. Anonymous',
      encodingLabel: 'Text encoding',
      encodingHint: 'Auto-detect handles UTF-8, GBK / GB18030, and Big5 automatically.',
      encodingOptions: {
        auto: 'Auto-detect (UTF-8 / GBK / GB18030 / Big5)',
        utf8: 'UTF-8',
        gb18030: 'GB18030 / GBK (Simplified Chinese)',
        big5: 'Big5 (Traditional Chinese)',
      },
      splitLabel: 'Chapter splitting',
      splitHint: 'Detect standard Chinese / English chapter headings, use a custom regex, or pack as a single flow.',
      splitOptions: {
        auto: 'Smart chapter detection (Chinese & English)',
        none: 'No splitting (pack as single chapter)',
        custom: 'Custom regular expression',
      },
      customRegexLabel: 'Custom chapter regex',
      customRegexPlaceholder: '^\\s*第[零一二三四五六七八九十百千万0-9]+[章节回].*$',
      customRegexHint: 'Matched against each trimmed line (up to 70 characters).',
      prologueTitle: 'Prologue',
      fallbackTitle: 'Full Text',
      buildBtn: 'Build .epub',
      building: 'Building EPUB…',
      complete: 'EPUB ready to download.',
      previewTitle: 'Detected chapters preview',
      resultsTitle: 'Generated file',
      download: 'Download .epub',
      detectedInfo: 'Encoding: {encoding} · {chars} {charsUnit} · {chapters} {chaptersUnit}',
      chaptersUnit: 'chapters',
      charsUnit: 'characters',
      usageTitle: 'How to use on OnePage',
      usageSteps: [
        'Choose your .txt book; the tool automatically detects UTF-8 or GBK / GB18030 encoding.',
        'Check the detected chapter list or switch to single-chapter mode if the text has no headings.',
        'Download the generated .epub and transfer it to your OnePage SD card via USB or the built-in Wi-Fi web page.',
      ],
      errNoFile: 'Choose a .txt file first.',
      errFileType: 'Please select a .txt plain text file.',
      errEmptyRegex: 'Enter a custom regular expression or switch to smart detection.',
      errInvalidRegex: 'Invalid regular expression syntax.',
      errFailed: 'Could not build the EPUB file.',
    },
    firmware: {
      eyebrow: 'Firmware',
      title: 'Flash OnePage onto your device.',
      lede: 'OnePage runs my port of CrossPoint. Plug the reader in over USB and flash the latest build straight from this page — no tools to install.',
      webTitle: 'Flash from the browser',
      webLede: 'Plug the reader in over USB, then connect and flash. Works in Chrome, Edge, and other Chromium browsers that support Web Serial.',
      connectBtn: 'Connect & flash',
      browserNote: 'Your browser talks to the chip directly — nothing is uploaded to a server.',
      unsupported: 'This browser can’t flash over USB (no Web Serial). Use Chrome or Edge on desktop.',
      connecting: 'Connecting — pick your device’s serial port…',
      flashing: 'Flashing… keep the cable connected.',
      flashDone: 'Done. The reader is rebooting into the new firmware.',
      flashErr: 'Flash failed. Check the cable, or hold Next Page and press Reset to retry.',
      noSerial: 'This browser has no Web Serial. Use Chrome or Edge on desktop.',
      logTitle: 'Flash log',
      notesTitle: 'Before you flash',
      notes: [
        'Wake the device from sleep before flashing.',
        'This replaces whatever firmware is currently on the device. Your books and settings live on the SD card and are untouched.',
        'If the flash fails, hold the Next Page button, short-press Reset once, then release the Reset button first to force download mode, and retry.',
        'A wrong-chip image won’t brick the board — it just won’t boot. Reflash the correct one.',
      ],
    },
  },
  zh: {
    nav: {
      features: '在做什么',
      notes: '手记',
      firmware: '固件',
      tools: '工具',
      fontTool: '字体工具',
      txtToEpub: 'TXT 转 EPUB',
      github: 'GitHub',
    },
    hero: {
      eyebrow: '开发手记 · 4.26 英寸墨水屏阅读器',
      title: '壹頁 —— 给自己折腾的一台小阅读器。',
      lede: '一台基于 ESP32-C61 的 4.26″ 墨水屏阅读器的公开笔记本。可重排的正文、用心的中文排版、配套手机配置。不画大饼 —— 只记录目前真正跑通的东西。',
      caption: '壹頁 · OnePage —— 侧面看过去，它真的很薄。',
      ctaPrimary: '看手记',
      ctaSecondary: 'GitHub',
    },
    features: {
      reading: {
        eyebrow: '阅读',
        title: '把字排好这件事。',
        body: '纯文本和 EPUB 由移植来的 CrossPoint 引擎重排，用 FreeType 渲染，219 DPI 下字形依然锐利。我花力气最多的是中文排版 —— 让断行和两端对齐不至于看着别扭。',
        points: [
          'TXT 和 EPUB 重排都已跑通（HTML / Markdown 同一套）',
          '中文避头尾、标点挤压、两端对齐',
          '休眠和重启后都记得读到哪',
        ],
        caption: '上方边框，收得很窄。',
      },
      hardware: {
        eyebrow: '硬件',
        title: '安静、像纸、爱阳光。',
        body: '4.26″ 800×480 面板，219 DPI，正文走 1-bit 纯黑白保证字锐，封面和图片留给 4 级灰阶。电池供电 + 深度睡眠 —— 而且故意不做前光，是选择，不是疏忽。',
        points: [
          'ESP32-C61 · 16 MB Flash · 2 MB PSRAM · microSD（SPI）',
          '正文 1-bit 黑白，封面图片 4 级灰阶',
          '没有前光：白天最舒服，夜里读书得自己点盏灯',
        ],
        caption: '正面 —— 安静，像纸。',
      },
      webconfig: {
        eyebrow: '配置',
        title: '用手机来配。',
        body: '七个按键、没有触摸，在屏上敲 WiFi 密码太难受。于是阅读器自己托管了一个网页 —— 用任何浏览器打开就能配置、传书。',
        points: [
          '首次配网自己开热点，或联网后走局域网地址',
          '浏览器里直接把 EPUB / TXT 传到 SD 卡',
          'WiFi、API Key、同步设置都不用屏上软键盘',
        ],
        caption: 'microSD 卡槽、USB-C、麦克风孔 —— 一排排开。',
      },
      controls: {
        eyebrow: '操作',
        title: '为口袋和通勤而做。',
        body: '七个实体键，无触摸。长按锁键，免得在包里乱翻页；还能选配蓝牙翻页器，手不用伸出被窝。',
        points: [
          '长按锁定；唤醒后保持锁定，包里不会乱翻页',
          '可选蓝牙翻页器，学习式按键映射',
          '翻页方向跟随屏幕朝向',
        ],
        caption: '唤醒键 —— 克制，但顺手。',
      },
    },
    materials: {
      eyebrow: '这个物件',
      title: '是拿在手里的东西，不只是个设备。',
      lede: '白色正面与白色亚克力背面之间，夹着一圈铝合金中框。轻、薄、安静 —— 想让它握起来像一本随身的本子，而不是一个要充电的数码产品。',
      items: [
        { label: '铝合金中框', body: '一圈铣削的薄中框撑起结构、也承载按键，带来平整扎实的边缘手感。' },
        { label: '白色正面', body: '墨水屏四周是干净的白色面板，窄边框，不会有任何东西朝你闪烁。' },
        { label: '白色亚克力背面', body: '光滑的白色亚克力背壳 —— 握着温润，安静地区别于一众黑色板砖。' },
      ],
      simLaunch: '让它跑起来',
      simNote: '浏览器里跑的就是设备上的固件 —— 我移植的开源 CrossPoint，直接拿来用，没有从头再写一套。',
    },
    log: {
      eyebrow: '开发手记',
      title: '到目前为止发生了什么。',
      lede: '点屏阶段的零散笔记，新的在上。日期是大概 —— 这是个副业项目，不是发布计划。',
      entries: [
        {
          when: '现在',
          title: '移植 CrossPoint',
          body: '与其从头写一套阅读器，不如直接移植开源的 CrossPoint —— 它的 TXT/EPUB 重排和中文排版都已经很成熟。这样能最快让它变成一台真能读书的机器。',
          tag: '进行中',
        },
        {
          when: '之前',
          title: '麦克风能录了',
          body: '那个「一直时钟不对」的 PDM 麦克风，最后不是硅片 erratum —— 是 IDF 5.5.x 在 C61 PDM-RX 时钟路径上的驱动 bug，换到 6.1-dev 就修好了。长按录音、软件 CIC 抽到 16kHz、存成 WAV。仍是支线功能，不进阅读主线。',
          tag: '完成',
        },
        {
          when: '之前',
          title: '定了网页配置',
          body: '七个键、没触摸，在屏上敲密码太痛苦。最终定下自托管网页，走热点 / 局域网，作为配置和传书的正经入口。',
          tag: '已定',
        },
        {
          when: '点屏期',
          title: '屏点亮了，花屏修好了',
          body: '先让 4.26″ 的 SSD1677 面板刷起来，又把撕裂花屏的 bug 追到 C61 单次 SPI 传输大小的限制上。一个错误假设，换来一堆花屏。',
          tag: '完成',
        },
      ],
      nextLabel: '待办，大致按顺序',
      next: [
        { items: 'TXT 和 EPUB', status: '阶段一' },
        { items: 'HTML 与 Markdown（同一套重排引擎）', status: '阶段二' },
        { items: 'CBZ 漫画、MOBI / AZW3（无 DRM）', status: '阶段三' },
        { items: 'PDF 只读（裁边 + 分栏）—— 内存吃紧', status: '也许' },
      ],
    },
    about: {
      eyebrow: '关于',
      title: '一个个人项目，不是产品。',
      body: [
        '壹頁是我纯为兴趣做的东西 —— 想按自己喜欢的方式读书，在自己摸得透的硬件上。它不是创业，也不在抢什么市场。',
        '我会把笔记一直放在明处：那些决定、走过的死胡同、偶尔终于跑通的小确幸。要是你也喜欢这种，就一起围观吧。',
      ],
    },
    footer: {
      tagline: '壹頁 · OnePage —— 一台 4.26″ 墨水屏阅读器。',
      openSource: '基于开源的 CrossPoint（MIT）。我的移植和这些笔记都公开分享。',
      rights: '一份个人开发记录。名字和品牌还在慢慢定。',
      pvLabel: '总访问量',
      uvLabel: '访客数',
    },
    specs: {
      eyebrow: '参数',
      title: '给好奇的人，写在最后。',
      groups: [
        { label: '尺寸与重量', rows: [
          { k: '尺寸', v: '66.5 × 116 × 5 mm' },
          { k: '重量', v: '64 g' },
        ] },
        { label: '显示', rows: [
          { k: '面板', v: '4.26″ 墨水屏 · 800×480 · 219 dpi' },
          { k: '渲染', v: '正文 1-bit 黑白 · 封面 4 灰阶' },
          { k: '前光', v: '没有 —— 故意的' },
          { k: '控制器', v: 'SSD1677（SPI）' },
        ] },
        { label: '芯片与内存', rows: [
          { k: '主控', v: 'ESP32-C61' },
          { k: 'Flash', v: '16 MB' },
          { k: 'PSRAM', v: '2 MB' },
        ] },
        { label: '存储', rows: [
          { k: '卡', v: 'microSD（SPI）' },
          { k: '文件系统', v: '仅 FAT32' },
        ] },
        { label: '操作', rows: [
          { k: '按键', v: '7 个实体键 · 无触摸' },
          { k: '翻页器', v: '可选蓝牙 LE' },
        ] },
        { label: '连接', rows: [
          { k: '无线', v: 'Wi-Fi 6 · 蓝牙 LE' },
          { k: '接口', v: 'USB-C' },
        ] },
        { label: '电源', rows: [
          { k: '电池', v: '1000 mAh · 可充电' },
          { k: '充电', v: '经 USB-C' },
        ] },
      ],
    },
    gallery: {
      eyebrow: '渲染',
      title: '先看看它的样子。',
      dotLabel: '查看照片',
      photos: [
        { src: '/gallery/OnePage-3D-a1.jpg', alt: '壹頁 —— 侧面', title: '它真的很薄', sub: '立起来给你看' },
        { src: '/gallery/OnePage-3D-a2.jpg', alt: '壹頁 —— 上边框', title: '上方那 1/4', sub: '边框收得很窄' },
        { src: '/gallery/OnePage-3D-a3.jpg', alt: '壹頁 —— 底部 45°', title: '底部 45° 视角', sub: '三段式按键和接口，一排排开' },
        { src: '/gallery/OnePage-3D-a4.jpg', alt: '壹頁 —— 唤醒键', title: '唤醒键特写', sub: '克制，但顺手' },
        { src: '/gallery/OnePage-3D-a5.jpg', alt: '壹頁 —— microSD 卡槽', title: '意外惊喜', sub: 'micro SD 那块，长了一张脸' },
      ],
    },
    showcase: {
      design: {
        eyebrow: 'ID 设计',
        title: '薄、居中、对称、简洁。',
        lede: 'OnePage 的正面尽量不强调「硬件感」。屏幕、按键和接口尽可能围绕中轴组织，让整机在第一眼更像一块完整的阅读载体，而不是一块装进外壳里的开发板。',
        pillars: [
          { num: '01', title: '薄', body: '压缩结构堆叠，侧面尽量收敛。' },
          { num: '02', title: '居中', body: '接口和操作区域服从中轴关系。' },
          { num: '03', title: '对称', body: '下巴三段按键形成完整秩序。' },
          { num: '04', title: '简洁', body: '能隐藏的功能，不主动出现在正面。' },
        ],
        dxfCaptions: {
          front: 'FRONT · DXF CONVERSION',
          right: 'RIGHT EDGE',
          usb: 'USB EDGE',
        },
        videoLabel: '在 Bilibili 观看演示视频 · MoveCall ↗',
      },
      interfaces: {
        eyebrow: '接口与交互说明',
        title: '按键与接口，各就各位。',
        lede: '侧边翻页 + 三段式正面底部导航，不依赖触摸屏也能顺畅完成全部核心操作。',
        diagramAlt: 'OnePage 接口与交互说明图',
        callouts: [
          { num: '01', title: 'Wake / AI', desc: '短按唤醒 · 长按 AI' },
          { num: '02', title: 'Page Up', desc: '上一页' },
          { num: '03', title: 'Page Down', desc: '下一页' },
          { num: '04', title: 'USB-C', desc: '充电 / 调试 / 固件维护' },
          { num: '05', title: 'Micro SD', desc: '系统启动必需（FAT32）；无卡时无法开机并提示 Micro SD 卡错误' },
          { num: '06', title: 'Lanyard Hole', desc: '挂绳孔 / 便携携带' },
        ],
        navBarEyebrow: 'FRONT NAVIGATION BAR',
        navBarTitle: '三段式底部导航条',
        navBarBody: '左侧返回、中间左右导航、右侧确认。整机采用前后面板贴合方案，保持正背面一体平整。',
        navBarKeys: [
          { key: 'Back', label: '返回' },
          { key: 'Left / Right', label: '左右导航' },
          { key: 'OK', label: '确认' },
        ],
      },
      engineering: {
        eyebrow: '工程与结构设计',
        title: '在 5 mm 厚度里安静共存。',
        lede: '真正困难的不是把功能塞进去，而是让这些东西在一台轻薄阅读器里安静地共存。',
        points: [
          { title: '共享总线', body: '电子纸与 Micro SD 共用 SPI，在有限 IO 下保留完整扩展能力。' },
          { title: '低功耗外设', body: 'SD 与麦克风按需上电，休眠时尽量切断非必要负载。' },
          { title: '实体按键复用', body: '正面四方向操作通过 ADC 电阻梯实现，减少 GPIO 占用。' },
          { title: '可靠升级', body: 'USB 调试与硬件恢复入口保证 DIY 阶段的可维护性。' },
        ],
        archLabel: 'SYSTEM ARCHITECTURE',
        archAlt: 'OnePage 系统架构图',
        structureTitle: 'PCB 与结构工艺',
        pcb: {
          title: '01 · 主板',
          lines: [
            '板子层数：4 层板',
            '成品板厚：0.80 ± 0.10 mm',
            '层叠结构：JLC04081H-3313（通用免费）',
          ],
        },
        stack: {
          title: '02 · 结构堆叠',
          lines: [
            '正面：PET 高透明面板（0.4 mm）',
            '中框：CNC 铝合金（本色阳极氧化）',
            '背面：透明亚克力背板（0.5 mm）',
          ],
        },
        assembly: {
          title: '03 · 装配',
          lines: [
            '屏幕 / 主板 / 电池分层堆叠',
            '实体按键独立定位',
            '整体性更强（面板粘接固定，调试建议在粘接前完成）',
          ],
        },
        notes: {
          bootTitle: '手动进入 Boot 模式',
          bootBody: '按住「下一页」键不放，用针短按一次 Reset，随后先松开 Reset，再松开「下一页」键，即可进入 Boot 模式。',
          sdTitle: 'Micro SD 启动说明',
          sdBody: 'OnePage 只能使用 FAT32 格式的 Micro SD 卡启动系统。若未插入 Micro SD 卡，设备不能开机，并会显示「Micro SD 卡错误」。',
          screenTitle: '电子纸屏幕注意机械压力',
          screenBody: '电子墨水屏玻璃基板较脆，装配、运输与拆机时请避免局部受压、弯折或硬物顶压屏幕。',
        },
      },
      ai: {
        eyebrow: '彩蛋功能 · AI Experimental',
        badge: 'EXPERIMENTAL FIRMWARE BRANCH',
        title: '阅读器之外，偷偷试了一点 AI。',
        body: 'AI 功能目前仍处于测试阶段，使用单独的固件分支进行实验，不影响主阅读固件的稳定性。现阶段已经接入 OpenClaw、Hermes 与 DeepSeek Harness 等 AI 智能体 / Agent 方案，用来探索电子墨水设备上的轻量 AI 交互。',
        cards: [
          {
            title: '对话与问答',
            body: '通过设备与 AI 智能体进行自然语言对话、知识问答与简单任务交互。',
            img: 'https://image.lceda.cn/oshwhub/pullImage/04c3698e83c74e4fa464179ae96be236.png',
            alt: 'OnePage AI 对话与问答示意',
          },
          {
            title: '对话生图',
            body: '从自然语言请求生成图像，再以适合电子纸的方式展示结果。',
            img: 'https://image.lceda.cn/oshwhub/pullImage/b83107f997b04a8aaf67f8b8b40b4ec6.png',
            alt: 'OnePage AI 对话生图示意',
          },
          {
            title: 'Agent 执行',
            body: '测试由智能体执行现实任务，例如点咖啡等具备动作链的 Agent 场景。',
            img: 'https://image.lceda.cn/oshwhub/pullImage/64e13bf84b0d4b5baca2833de1924c06.jpg',
            alt: 'OnePage AI Agent 执行示意',
          },
        ],
        tags: ['OpenClaw', 'Hermes', 'DeepSeek Harness', 'Experimental'],
      },
      photos: {
        eyebrow: '视觉展示',
        title: '真机实拍。',
        lede: '桌面上与握在手里的真实模样。',
      },
    },
    fonts: {
      eyebrow: '字体工具',
      title: '生成 OnePage 字体。',
      lede: '在浏览器里生成 OnePage 可直接读取的 CrossPoint .cpfont 字体。源字体始终留在你的设备上。',
      familyLabel: '字体家族名',
      familyHint: '用于输出目录和文件名，仅使用 ASCII 字母、数字、下划线或连字符。',
      familyPlaceholder: '例如 LXGW_WenKai',
      sizesLabel: '字体字号',
      sizesHint: '输入 6–48 的整数，用英文逗号分隔。包含中日韩文字时会自动补充固件 UI 所需的 8、10 号。',
      facesLabel: '字形字体',
      facesHint: '请选择 TTF 或 OTF 文件。常规体必填；每个已选字形都会写入所有输出文件。',
      styles: { regular: '常规', bold: '粗体', italic: '斜体', bolditalic: '粗斜体' },
      fallbacksLabel: '常规回退字体',
      fallbacksHint: '可选；字形字体缺字时，会按顺序从这些 TTF/OTF 字体中查找。',
      fallback1: '回退字体 1',
      fallback2: '回退字体 2',
      required: '必填',
      optional: '可选',
      coverageLabel: '字符覆盖',
      coverageHint: '按需选择 CrossPoint 官方字符集。基础 ASCII、常用标点和 U+FFFD 始终包含。',
      presetNames: {
        reading: '阅读常用',
        default: '默认多语言',
        'latin-ext': '拉丁扩展',
        greek: '希腊文',
        cyrillic: '西里尔文',
        vietnamese: '越南文',
        hebrew: '希伯来文',
        arabic: '阿拉伯文',
        armenian: '亚美尼亚文',
        georgian: '格鲁吉亚文',
        ethiopic: '埃塞俄比亚文',
        cherokee: '切罗基文',
        tifinagh: '提非纳文',
        bengali: '孟加拉文',
        thai: '泰文',
        hangul: '韩文（谚文）',
        'cjk-sc': '简体中文',
        'cjk-tc': '繁体中文',
        'cjk-jp': '日文',
        symbols: '符号',
        'ipa-chars': '国际音标字符',
      },
      customLabel: '自定义 Unicode 区间',
      customHint: '可选，使用严格格式并以英文逗号分隔：(0x2900-0x29FF),(0x2E00-0x2EFF)',
      buildBtn: '生成 .cpfont',
      cancelBtn: '取消',
      building: '正在生成字体…',
      cancelled: '已取消生成。',
      complete: '字体生成完成。',
      progressLabel: '字体生成进度',
      logTitle: '生成详情',
      resultsTitle: '生成的文件',
      downloadAll: '全部下载（.zip）',
      download: '下载',
      installTitle: '怎么安装',
      installSteps: [
        '保留 <Family>_<size>.cpfont 格式的文件名。',
        '把文件放进 SD 卡的 /.fonts/<Family>/ 或 /fonts/<Family>/ 目录。',
        '重启 OnePage 或重新扫描字体，然后在阅读器中选择这个字体家族。',
      ],
      errNoFont: '请先选择常规体 TTF 或 OTF 字体。',
      errFileType: '当前版本只支持 TTF 和 OTF 源字体。',
      errTooLarge: '所选源字体总大小超过 128 MB 限制。',
      errOom: '浏览器内存不足，请减少字符集、字号或字形样式后重试。',
      errFailed: '无法生成字体。',
    },
    txtToEpub: {
      eyebrow: 'TXT 转 EPUB',
      title: '把 TXT 打包成干净的 EPUB。',
      lede: '在浏览器本地把纯文本小说或文稿转成标准 EPUB 电子书，支持自动编码识别（UTF-8 / GBK / GB18030 / Big5）与智能分章，全程不上传文件。',
      fileLabel: 'TXT 文件',
      fileHint: '选择设备上的 .txt 文件，所有转换均在浏览器本地完成。',
      titleLabel: '书名',
      titlePlaceholder: '默认使用 TXT 文件名',
      authorLabel: '作者（可选）',
      authorPlaceholder: '例如 佚名',
      encodingLabel: '文本编码',
      encodingHint: '自动识别可兼容 UTF-8、GBK / GB18030 与 Big5 编码。',
      encodingOptions: {
        auto: '自动识别（UTF-8 / GBK / GB18030 / Big5）',
        utf8: 'UTF-8',
        gb18030: 'GB18030 / GBK（简体中文）',
        big5: 'Big5（繁体中文）',
      },
      splitLabel: '分章方式',
      splitHint: '支持智能匹配常见中英文章节标题、自定义正则表达式，或直接不拆分打包。',
      splitOptions: {
        auto: '智能分章（中英文章节标题）',
        none: '不分章（整书单章打包）',
        custom: '自定义正则表达式',
      },
      customRegexLabel: '自定义章节正则',
      customRegexPlaceholder: '^\\s*第[零一二三四五六七八九十百千万0-9]+[章节回].*$',
      customRegexHint: '按行匹配（单行不超过 70 字时识别为标题）。',
      prologueTitle: '前言',
      fallbackTitle: '正文',
      buildBtn: '生成 .epub',
      building: '正在生成 EPUB…',
      complete: 'EPUB 已生成，可以下载。',
      previewTitle: '识别到的章节目录',
      resultsTitle: '生成的文件',
      download: '下载 .epub',
      detectedInfo: '编码：{encoding} · 共 {chars} {charsUnit} · 识别为 {chapters} {chaptersUnit}',
      chaptersUnit: '章',
      charsUnit: '字',
      usageTitle: '怎么传到 OnePage',
      usageSteps: [
        '选择本地 .txt 文件，工具会自动识别 UTF-8 或 GBK / GB18030 编码并提取章节。',
        '如有需要可查看下方识别到的章节目录，或切换为「不分章」直接打包。',
        '下载生成的 .epub 文件，通过 SD 卡读卡器或阅读器自带的局域网网页传书即可阅读。',
      ],
      errNoFile: '请先选择一个 .txt 文件。',
      errFileType: '请选择 .txt 纯文本文件。',
      errEmptyRegex: '请输入自定义正则表达式，或切换回智能分章。',
      errInvalidRegex: '正则表达式语法有误，请检查。',
      errFailed: '无法生成 EPUB 文件。',
    },
    firmware: {
      eyebrow: '固件',
      title: '把 OnePage 烧进你的设备。',
      lede: 'OnePage 跑的是我移植的 CrossPoint。用 USB 接上阅读器，直接在这个页面烧最新固件 —— 不用装任何工具。',
      webTitle: '浏览器直接烧录',
      webLede: '用 USB 把阅读器接上，然后点连接并烧录。支持 Web Serial 的浏览器（Chrome、Edge 等 Chromium 内核）可用。',
      connectBtn: '连接并烧录',
      browserNote: '浏览器直接和芯片通信 —— 不会上传到任何服务器。',
      unsupported: '当前浏览器不支持 USB 烧录（无 Web Serial）。请在桌面版 Chrome / Edge 使用。',
      connecting: '连接中 —— 请选择设备对应的串口…',
      flashing: '烧录中…… 请保持数据线连接。',
      flashDone: '完成。阅读器正在重启进入新固件。',
      flashErr: '烧录失败。检查数据线，或按住下一页键并短按 Reset 重试。',
      noSerial: '此浏览器不支持 Web Serial。请用桌面版 Chrome / Edge。',
      logTitle: '烧录日志',
      notesTitle: '烧录前须知',
      notes: [
        '请退出休眠状态下烧录固件。',
        '这会覆盖设备上现有的固件。你的书和设置都在 SD 卡里，不受影响。',
        '烧录失败的话，按住下一页按键，短按一次 Reset，随后先松开 Reset 键强制进入下载模式，再重试。',
        '烧错芯片的镜像不会变砖 —— 只是开不了机，重新烧对的即可。',
      ],
    },
  },
};

/** Site base path (e.g. '/onepage-reader-web/'); '/' in dev. Always ends with '/'. */
const BASE = import.meta.env.BASE_URL;

/** Build a locale-aware, base-prefixed href. en is the default (no locale prefix); zh is /zh/. */
export function localizedPath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  let locale = lang === 'en' ? (clean === '/' ? '/' : clean) : clean === '/' ? '/zh/' : `/zh${clean}`;
  // Astro emits dir-style pages (dist/log/index.html), so keep a trailing slash to
  // avoid a 301 hop on every internal link. Skip files that carry an extension.
  if (!locale.endsWith('/') && !locale.slice(locale.lastIndexOf('/') + 1).includes('.')) locale += '/';
  // BASE ends with '/', so drop the leading slash of the locale path when joining.
  return BASE + locale.slice(1);
}
