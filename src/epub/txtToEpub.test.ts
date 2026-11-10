import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  buildEpubBytes,
  decodeTxtBuffer,
  sanitizeEpubFilename,
  splitChapters,
} from './txtToEpub';

describe('decodeTxtBuffer', () => {
  it('decodes UTF-8 text automatically', () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('第一章 初遇\n那是一个晴朗的早晨。');
    const result = decodeTxtBuffer(bytes, 'auto');
    expect(result.encoding).toBe('UTF-8');
    expect(result.text).toBe('第一章 初遇\n那是一个晴朗的早晨。');
  });

  it('decodes GB18030 / GBK encoded Chinese text automatically', () => {
    // "第一章 测试" in GBK:
    // 第 (B5 DA) 一 (D2 BB) 章 (D5 C2) ' ' (20) 测 (B2 E2) 试 (CA D4)
    const gbkBytes = new Uint8Array([0xb5, 0xda, 0xd2, 0xbb, 0xd5, 0xc2, 0x20, 0xb2, 0xe2, 0xca, 0xd4]);
    const result = decodeTxtBuffer(gbkBytes, 'auto');
    expect(result.encoding).toBe('GB18030');
    expect(result.text).toBe('第一章 测试');
  });
});

describe('splitChapters', () => {
  it('splits Chinese chapters and preserves prologue text', () => {
    const sample = [
      '这本书写给喜欢墨水屏的人。',
      '',
      '第一章 启程',
      '第一段内容。',
      '第二段内容。',
      '',
      '第二章 归途',
      '归途的第一段。',
    ].join('\n');

    const chapters = splitChapters(sample, {
      mode: 'auto',
      prologueTitle: '前言',
      fallbackTitle: '正文',
    });

    expect(chapters).toEqual([
      { title: '前言', paragraphs: ['这本书写给喜欢墨水屏的人。'] },
      { title: '第一章 启程', paragraphs: ['第一段内容。', '第二段内容。'] },
      { title: '第二章 归途', paragraphs: ['归途的第一段。'] },
    ]);
  });

  it('supports single-flow mode without splitting chapters', () => {
    const sample = '第一章 启程\n第一段内容。\n第二章 归途\n第二段内容。';
    const chapters = splitChapters(sample, {
      mode: 'none',
      fallbackTitle: '全书正文',
    });
    expect(chapters).toEqual([
      {
        title: '全书正文',
        paragraphs: ['第一章 启程', '第一段内容。', '第二章 归途', '第二段内容。'],
      },
    ]);
  });

  it('supports custom regex splitting', () => {
    const sample = '=== 01 ===\n段落一\n=== 02 ===\n段落二';
    const chapters = splitChapters(sample, {
      mode: 'custom',
      customPattern: '^===\\s*\\d+\\s*===$',
    });
    expect(chapters).toEqual([
      { title: '=== 01 ===', paragraphs: ['段落一'] },
      { title: '=== 02 ===', paragraphs: ['段落二'] },
    ]);
  });
});

describe('buildEpubBytes', () => {
  it('generates a valid EPUB archive with mimetype, container, opf, ncx, nav, and chapters', async () => {
    const epubBytes = await buildEpubBytes({
      title: '测试小说 & <OnePage>',
      author: '壹頁作者',
      language: 'zh-CN',
      chapters: [
        { title: '第一章 开始', paragraphs: ['第一段 <内容> & 符号。', '第二段。'] },
        { title: '第二章 结束', paragraphs: ['尾声段落。'] },
      ],
    });

    const zip = await JSZip.loadAsync(epubBytes);
    expect(await zip.file('mimetype')?.async('string')).toBe('application/epub+zip');
    expect(await zip.file('META-INF/container.xml')?.async('string')).toContain('OEBPS/content.opf');

    const opf = await zip.file('OEBPS/content.opf')?.async('string');
    expect(opf).toContain('<dc:title>测试小说 &amp; &lt;OnePage&gt;</dc:title>');
    expect(opf).toContain('<dc:creator>壹頁作者</dc:creator>');
    expect(opf).toContain('href="chapter_0001.xhtml"');
    expect(opf).toContain('href="chapter_0002.xhtml"');

    const ch1 = await zip.file('OEBPS/chapter_0001.xhtml')?.async('string');
    expect(ch1).toContain('<h2>第一章 开始</h2>');
    expect(ch1).toContain('<p>第一段 &lt;内容&gt; &amp; 符号。</p>');
  });

  it('sanitizes epub filenames safely', () => {
    expect(sanitizeEpubFilename('  My:Book/Name?  ')).toBe('My_Book_Name_.epub');
  });
});
