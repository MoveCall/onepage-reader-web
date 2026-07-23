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

type FontsContent = {
  eyebrow: string;
  title: string;
  lede: string;
  familyLabel: string;
  familyHint: string;
  familyPlaceholder: string;
  facesLabel: string;
  facesHint: string;
  styles: { regular: string; bold: string; italic: string; bolditalic: string };
  required: string;
  optional: string;
  coverageLabel: string;
  coverageHint: string;
  presetNames: Record<string, string>;
  presetHints: Record<string, string>;
  extraLabel: string;
  extraHint: string;
  extraPlaceholder: string;
  customLabel: string;
  customHint: string;
  dropHints: string;
  dropHintsHint: string;
  buildBtn: string;
  building: string;
  resultsTitle: string;
  downloadAll: string;
  download: string;
  saved: string;
  installTitle: string;
  installSteps: string[];
  errNoFont: string;
  errFailed: string;
};

type Content = {
  nav: {
    features: string;
    notes: string;
    fontTool: string;
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
  fonts: FontsContent;
};

export const ui: Record<Lang, Content> = {
  en: {
    nav: {
      features: 'The build',
      notes: 'Log',
      fontTool: 'Font Tool',
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
        { src: '/gallery/IMG_0397.JPG', alt: 'OnePage — seen edge-on', title: 'Genuinely thin', sub: 'Seen edge-on' },
        { src: '/gallery/IMG_0398.JPG', alt: 'OnePage — top bezel', title: 'The top quarter', sub: 'Bezels pulled in tight' },
        { src: '/gallery/IMG_0399.JPG', alt: 'OnePage — bottom at 45°', title: 'Bottom, at 45°', sub: 'Keys and ports, all in a row' },
        { src: '/gallery/IMG_0400.JPG', alt: 'OnePage — wake key', title: 'The wake key', sub: 'Restrained, but easy to reach' },
        { src: '/gallery/IMG_0401.JPG', alt: 'OnePage — microSD slot', title: 'A little surprise', sub: 'The microSD slot has a face' },
      ],
    },
    fonts: {
      eyebrow: 'Font tool',
      title: 'Trim a font down for the SD card.',
      lede: 'OnePage reads TTF/OTF fonts straight from the SD card — but a full CJK font is 10–16 MB. This trims one down to just the characters you need, right here in your browser. Nothing is uploaded.',
      familyLabel: 'Output name',
      familyHint: 'Used for the downloaded filename. Letters, numbers, and dashes.',
      familyPlaceholder: 'e.g. LXGW WenKai',
      facesLabel: 'Font files',
      facesHint: 'Regular is required; the other styles are optional and get the same coverage.',
      styles: { regular: 'Regular', bold: 'Bold', italic: 'Italic', bolditalic: 'Bold Italic' },
      required: 'required',
      optional: 'optional',
      coverageLabel: 'Character coverage',
      coverageHint: 'Pick what your books need. More coverage = larger file. Base Latin and common punctuation are always kept.',
      presetNames: {
        'chinese-full': 'Chinese · GB2312 (6763)',
        'chinese-l1': 'Chinese · common (3755)',
        'cjk-punct': 'CJK punctuation & full-width',
        'cjk-all': 'All CJK ideographs',
        'latin-ext': 'Latin Extended',
        greek: 'Greek',
        cyrillic: 'Cyrillic',
        symbols: 'Symbols & arrows',
      },
      presetHints: {
        'chinese-full': 'Recommended for Chinese',
        'chinese-l1': 'Smaller',
        'cjk-all': '~20k glyphs, large',
        'cjk-punct': '',
        'latin-ext': '',
        greek: '',
        cyrillic: '',
        symbols: '',
      },
      extraLabel: 'Extra characters to keep',
      extraHint: 'Paste any text — every character in it is kept. Handy for a specific book or a name.',
      extraPlaceholder: 'Paste text whose characters must be kept…',
      customLabel: 'Custom Unicode ranges',
      customHint: 'Comma-separated hex ranges, e.g. (0x2900-0x29FF),(0x2E00-0x2EFF)',
      dropHints: 'Drop hinting (smaller file)',
      dropHintsHint: 'OnePage renders 1-bit at 219 DPI and benefits from hinting — leave this off unless size is critical.',
      buildBtn: 'Trim font',
      building: 'Trimming…',
      resultsTitle: 'Trimmed files',
      downloadAll: 'Download all (.zip)',
      download: 'Download',
      saved: 'saved',
      installTitle: 'How to install',
      installSteps: [
        'Download the trimmed font file (or the zip).',
        'Copy it to your SD card under /fonts/ (create the folder if needed).',
        'Pop the card back in — the font shows up in the reader’s font settings.',
      ],
      errNoFont: 'Please choose at least a Regular font file.',
      errFailed: 'Could not trim that file — it may be an unsupported or broken font.',
    },
  },
  zh: {
    nav: {
      features: '在做什么',
      notes: '手记',
      fontTool: '字体工具',
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
        { src: '/gallery/IMG_0397.JPG', alt: '壹頁 —— 侧面', title: '它真的很薄', sub: '立起来给你看' },
        { src: '/gallery/IMG_0398.JPG', alt: '壹頁 —— 上边框', title: '上方那 1/4', sub: '边框收得很窄' },
        { src: '/gallery/IMG_0399.JPG', alt: '壹頁 —— 底部 45°', title: '底部 45° 视角', sub: '三段式按键和接口，一排排开' },
        { src: '/gallery/IMG_0400.JPG', alt: '壹頁 —— 唤醒键', title: '唤醒键特写', sub: '克制，但顺手' },
        { src: '/gallery/IMG_0401.JPG', alt: '壹頁 —— microSD 卡槽', title: '意外惊喜', sub: 'micro SD 那块，长了一张脸' },
      ],
    },
    fonts: {
      eyebrow: '字体工具',
      title: '把字体瘦身后丢进 SD 卡。',
      lede: 'OnePage 直接读 SD 卡里的 TTF/OTF 字体 —— 但一套完整中文字库有 10–16 MB。这个工具就在你浏览器里，把字体裁到只剩你需要的字。全程不上传。',
      familyLabel: '输出名称',
      familyHint: '用作下载文件名。字母、数字、连字符。',
      familyPlaceholder: '例如 霞鹜文楷',
      facesLabel: '字体文件',
      facesHint: 'Regular 必填；其余字重可选，使用相同的字符覆盖。',
      styles: { regular: '常规', bold: '粗体', italic: '斜体', bolditalic: '粗斜体' },
      required: '必填',
      optional: '可选',
      coverageLabel: '字符覆盖',
      coverageHint: '按你的书需要勾选。覆盖越多，文件越大。基础拉丁字母和常用标点始终保留。',
      presetNames: {
        'chinese-full': '中文 · GB2312（6763）',
        'chinese-l1': '中文 · 常用（3755）',
        'cjk-punct': '中日韩标点 & 全角',
        'cjk-all': '全部中日韩汉字',
        'latin-ext': '拉丁扩展',
        greek: '希腊文',
        cyrillic: '西里尔文',
        symbols: '符号 & 箭头',
      },
      presetHints: {
        'chinese-full': '中文推荐',
        'chinese-l1': '更小',
        'cjk-all': '约 2 万字，很大',
        'cjk-punct': '',
        'latin-ext': '',
        greek: '',
        cyrillic: '',
        symbols: '',
      },
      extraLabel: '额外保留的字符',
      extraHint: '粘贴任意文字 —— 里面出现的每个字都会被保留。适合某本书或某个名字。',
      extraPlaceholder: '粘贴需要保留其中字符的文字…',
      customLabel: '自定义 Unicode 区间',
      customHint: '逗号分隔的十六进制区间，例如 (0x2900-0x29FF),(0x2E00-0x2EFF)',
      dropHints: '去掉 hinting（文件更小）',
      dropHintsHint: 'OnePage 在 219 DPI 下做 1-bit 渲染，hinting 有帮助 —— 除非特别在意体积，否则别勾。',
      buildBtn: '瘦身字体',
      building: '正在瘦身…',
      resultsTitle: '瘦身后的文件',
      downloadAll: '全部下载（.zip）',
      download: '下载',
      saved: '已减小',
      installTitle: '怎么安装',
      installSteps: [
        '下载瘦身后的字体文件（或 zip）。',
        '拷到 SD 卡的 /fonts/ 目录（没有就新建）。',
        '把卡插回设备 —— 字体会出现在阅读器的字体设置里。',
      ],
      errNoFont: '请至少选择一个 Regular 字体文件。',
      errFailed: '无法瘦身该文件 —— 可能是不支持或损坏的字体。',
    },
  },
};

/** Site base path (e.g. '/onepage-reader-web/'); '/' in dev. Always ends with '/'. */
const BASE = import.meta.env.BASE_URL;

/** Build a locale-aware, base-prefixed href. en is the default (no locale prefix); zh is /zh/. */
export function localizedPath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const locale = lang === 'en' ? (clean === '/' ? '/' : clean) : clean === '/' ? '/zh/' : `/zh${clean}`;
  // BASE ends with '/', so drop the leading slash of the locale path when joining.
  return BASE + locale.slice(1);
}
