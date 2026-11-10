import JSZip from 'jszip';

export type EncodingOption = 'auto' | 'utf-8' | 'gb18030' | 'big5';
export type SplitMode = 'auto' | 'none' | 'custom';

export interface Chapter {
  title: string;
  paragraphs: string[];
}

export interface TxtAnalysis {
  encoding: string;
  text: string;
  chapters: Chapter[];
  totalChars: number;
}

export interface EpubBuildOptions {
  title: string;
  author?: string;
  language?: string;
  chapters: Chapter[];
  identifier?: string;
  modifiedDate?: Date;
}

/**
 * Default chapter title pattern supporting Chinese and English novels:
 * - 第X章 / 第X节 / 第X回 / 第X卷 / 第X集 / 第X部 / 第X篇 (with optional prefix like 正文 / 卷一)
 * - 楔子 / 序章 / 序言 / 引子 / 前言 / 尾声 / 后记 / 番外
 * - Chapter 1 / CHAPTER IV / Part 1 / Book 1
 */
export const DEFAULT_CHAPTER_REGEX =
  /^\s*(?:(?:正文\s*)?(?:第\s*[零一二三四五六七八九十百千万〇两0-9]+\s*[卷集部]\s*)?第\s*[零一二三四五六七八九十百千万〇两0-9]+\s*[章节回卷集部篇](?:\s*$|[\s：:——、.\-].*)|(?:楔子|序章|序言|引子|前言|尾声|后记|番外)(?:\s*$|[\s：:——、.\-].*)|(?:Chapter|CHAPTER|Part|PART|Book|BOOK)\s+(?:\d+|[IVXLCDM]+)(?:\s*$|[\s.:：\-].*))\s*$/;

const MAX_HEADING_LENGTH = 70;

/**
 * Detect encoding of a raw TXT buffer and decode into a string.
 */
export function decodeTxtBuffer(
  buffer: ArrayBuffer | Uint8Array,
  encoding: EncodingOption = 'auto',
): { encoding: string; text: string } {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (encoding !== 'auto') {
    const decoder = new TextDecoder(encoding, { fatal: false });
    return { encoding: encoding.toUpperCase(), text: stripBom(decoder.decode(bytes)) };
  }

  // Check BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const decoder = new TextDecoder('utf-8');
    return { encoding: 'UTF-8', text: stripBom(decoder.decode(bytes)) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const decoder = new TextDecoder('utf-16le');
    return { encoding: 'UTF-16LE', text: stripBom(decoder.decode(bytes)) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const decoder = new TextDecoder('utf-16be');
    return { encoding: 'UTF-16BE', text: stripBom(decoder.decode(bytes)) };
  }

  // Try strict UTF-8
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return { encoding: 'UTF-8', text: stripBom(utf8Decoder.decode(bytes)) };
  } catch {
    // Not valid UTF-8; fall through to GB18030 / Big5 detection
  }

  // Try GB18030 (superset of GBK / GB2312) and Big5
  const gbText = tryDecode(bytes, 'gb18030');
  const big5Text = tryDecode(bytes, 'big5');

  if (gbText !== null && big5Text !== null) {
    const gbScore = scoreCjkText(gbText);
    const big5Score = scoreCjkText(big5Text);
    if (big5Score > gbScore) {
      return { encoding: 'Big5', text: stripBom(big5Text) };
    }
    return { encoding: 'GB18030', text: stripBom(gbText) };
  }
  if (gbText !== null) {
    return { encoding: 'GB18030', text: stripBom(gbText) };
  }
  if (big5Text !== null) {
    return { encoding: 'Big5', text: stripBom(big5Text) };
  }

  // Fallback to non-fatal GB18030 or UTF-8
  try {
    const fallbackGb = new TextDecoder('gb18030', { fatal: false });
    return { encoding: 'GB18030', text: stripBom(fallbackGb.decode(bytes)) };
  } catch {
    const fallbackUtf8 = new TextDecoder('utf-8', { fatal: false });
    return { encoding: 'UTF-8', text: stripBom(fallbackUtf8.decode(bytes)) };
  }
}

function tryDecode(bytes: Uint8Array, label: string): string | null {
  try {
    return new TextDecoder(label, { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function scoreCjkText(text: string): number {
  let score = 0;
  const sampleLength = Math.min(text.length, 8000);
  for (let i = 0; i < sampleLength; i++) {
    const code = text.charCodeAt(i);
    // Common CJK Unified Ideographs and ASCII/punctuation
    if ((code >= 0x4e00 && code <= 0x9fa5) || (code >= 0x20 && code <= 0x7e) || code === 0x0a || code === 0x0d) {
      score += 1;
    } else if (code === 0xfffd) {
      score -= 10;
    }
  }
  return score;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export interface SplitChapterOptions {
  mode: SplitMode;
  customPattern?: string;
  fallbackTitle?: string;
  prologueTitle?: string;
}

/**
 * Split decoded TXT content into chapters.
 */
export function splitChapters(text: string, options: SplitChapterOptions): Chapter[] {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const fallbackTitle = options.fallbackTitle?.trim() || '正文';
  const prologueTitle = options.prologueTitle?.trim() || '前言';

  if (options.mode === 'none') {
    const paragraphs = lines.map((line) => line.trim()).filter((line) => line.length > 0);
    return [
      {
        title: fallbackTitle,
        paragraphs: paragraphs.length > 0 ? paragraphs : [''],
      },
    ];
  }

  let matcher: RegExp;
  if (options.mode === 'custom') {
    const rawPattern = options.customPattern?.trim();
    if (!rawPattern) {
      throw new Error('Custom regular expression cannot be empty.');
    }
    matcher = new RegExp(rawPattern);
  } else {
    matcher = DEFAULT_CHAPTER_REGEX;
  }

  const chapters: Chapter[] = [];
  let currentTitle: string | null = null;
  let currentParagraphs: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const isHeading = trimmed.length <= MAX_HEADING_LENGTH && matcher.test(trimmed);
    if (isHeading) {
      if (currentTitle !== null) {
        chapters.push({ title: currentTitle, paragraphs: currentParagraphs });
      } else if (currentParagraphs.length > 0) {
        chapters.push({ title: prologueTitle, paragraphs: currentParagraphs });
      }
      currentTitle = trimmed;
      currentParagraphs = [];
    } else {
      currentParagraphs.push(trimmed);
    }
  }

  if (currentTitle !== null) {
    chapters.push({ title: currentTitle, paragraphs: currentParagraphs });
  } else if (currentParagraphs.length > 0) {
    chapters.push({ title: fallbackTitle, paragraphs: currentParagraphs });
  }

  if (chapters.length === 0) {
    return [{ title: fallbackTitle, paragraphs: [''] }];
  }

  return chapters;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

const STYLE_CSS = `body {
  margin: 0;
  padding: 0 4%;
  line-height: 1.65;
}
h1, h2 {
  font-size: 1.25em;
  font-weight: bold;
  margin: 1.2em 0 0.8em;
  line-height: 1.35;
}
p {
  margin: 0 0 0.65em 0;
  text-indent: 2em;
  text-align: justify;
}
`;

function buildChapterXhtml(chapter: Chapter, lang: string): string {
  const safeTitle = escapeXml(chapter.title);
  const bodyParagraphs =
    chapter.paragraphs.length > 0
      ? chapter.paragraphs.map((p) => `    <p>${escapeXml(p)}</p>`).join('\n')
      : '    <p></p>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
    <h2>${safeTitle}</h2>
${bodyParagraphs}
  </body>
</html>
`;
}

function buildNavXhtml(title: string, chapters: Chapter[], lang: string): string {
  const items = chapters
    .map((ch, idx) => {
      const file = `chapter_${String(idx + 1).padStart(4, '0')}.xhtml`;
      return `        <li><a href="${file}">${escapeXml(ch.title)}</a></li>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(lang)}" lang="${escapeXml(lang)}">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeXml(title)}</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>
`;
}

function buildTocNcx(id: string, title: string, chapters: Chapter[]): string {
  const navPoints = chapters
    .map((ch, idx) => {
      const order = idx + 1;
      const file = `chapter_${String(order).padStart(4, '0')}.xhtml`;
      return `    <navPoint id="navPoint-${order}" playOrder="${order}">
      <navLabel>
        <text>${escapeXml(ch.title)}</text>
      </navLabel>
      <content src="${file}"/>
    </navPoint>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(id)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>
`;
}

function buildContentOpf(options: {
  id: string;
  title: string;
  author: string;
  language: string;
  modifiedIso: string;
  chapters: Chapter[];
}): string {
  const { id, title, author, language, modifiedIso, chapters } = options;
  const manifestItems = chapters
    .map((_, idx) => {
      const num = String(idx + 1).padStart(4, '0');
      return `    <item id="ch${num}" href="chapter_${num}.xhtml" media-type="application/xhtml+xml"/>`;
    })
    .join('\n');

  const spineItems = chapters
    .map((_, idx) => {
      const num = String(idx + 1).padStart(4, '0');
      return `    <itemref idref="ch${num}"/>`;
    })
    .join('\n');

  const creatorLine = author
    ? `\n    <dc:creator>${escapeXml(author)}</dc:creator>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${escapeXml(id)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>${creatorLine}
    <dc:language>${escapeXml(language)}</dc:language>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>
`;
}

/**
 * Package parsed chapters into a valid EPUB Uint8Array.
 */
export async function buildEpubBytes(options: EpubBuildOptions): Promise<Uint8Array> {
  const title = options.title.trim() || 'Untitled';
  const author = (options.author ?? '').trim();
  const language = (options.language ?? 'zh-CN').trim() || 'zh-CN';
  const id = options.identifier ?? `urn:uuid:${generateUuid()}`;
  const date = options.modifiedDate ?? new Date();
  const modifiedIso = date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const chapters = options.chapters.length > 0 ? options.chapters : [{ title, paragraphs: [''] }];

  const zip = new JSZip();

  // EPUB specification requires mimetype to be the first entry and stored uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', CONTAINER_XML, { compression: 'DEFLATE' });

  zip.file('OEBPS/style.css', STYLE_CSS, { compression: 'DEFLATE' });
  zip.file('OEBPS/toc.ncx', buildTocNcx(id, title, chapters), { compression: 'DEFLATE' });
  zip.file('OEBPS/nav.xhtml', buildNavXhtml(title, chapters, language), { compression: 'DEFLATE' });
  zip.file(
    'OEBPS/content.opf',
    buildContentOpf({ id, title, author, language, modifiedIso, chapters }),
    { compression: 'DEFLATE' },
  );

  chapters.forEach((chapter, index) => {
    const filename = `OEBPS/chapter_${String(index + 1).padStart(4, '0')}.xhtml`;
    zip.file(filename, buildChapterXhtml(chapter, language), { compression: 'DEFLATE' });
  });

  return zip.generateAsync({ type: 'uint8array' });
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizeEpubFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ');
  return `${cleaned || 'book'}.epub`;
}
