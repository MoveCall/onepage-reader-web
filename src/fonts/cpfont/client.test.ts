import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { packCpfont } from './binary';
import {
  MAX_SOURCE_BYTES,
  createBuildRequest,
  isLikelyOutOfMemoryError,
  startCpfontBuild,
  totalSourceFileBytes,
} from './client';
import type { CpfontBuildRequest, CpfontOutput } from './types';

class FakeWorker {
  static instances: FakeWorker[] = [];
  static constructionError: unknown;
  static postError: unknown;

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  transferLists: Transferable[][] = [];
  terminated = false;
  terminateCalls = 0;

  constructor(public readonly url: URL, public readonly options: WorkerOptions) {
    if (FakeWorker.constructionError !== undefined) throw FakeWorker.constructionError;
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown, transfer: Transferable[] = []): void {
    if (FakeWorker.postError !== undefined) throw FakeWorker.postError;
    this.posted.push(message);
    this.transferLists.push(transfer);
  }

  terminate(): void {
    this.terminated = true;
    this.terminateCalls += 1;
  }

  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  fail(message: string, error?: unknown): void {
    this.onerror?.({ message, error } as ErrorEvent);
  }
}

function makeRequest(): CpfontBuildRequest {
  return {
    family: 'Test',
    sizes: [12],
    presetIds: [],
    customRanges: '',
    styles: {
      0: { label: 'regular.ttf', bytes: new ArrayBuffer(4) },
    },
    fallbacks: [],
  };
}

function validOutput(
  size = 12,
  family = 'Test',
  styleIds: Array<0 | 1 | 2 | 3> = [0],
): CpfontOutput {
  return {
    name: `${family}_${size}.cpfont`,
    size,
    bytes: packCpfont(styleIds.map((styleId) => ({
      styleId,
      intervals: [],
      glyphs: [],
      advanceY: size,
      ascender: Math.max(0, size - 3),
      descender: -3,
    }))),
  };
}

describe('createBuildRequest', () => {
  const regular = { label: 'regular.ttf', bytes: new ArrayBuffer(4) };

  it('sanitizes the family deterministically and reuses source buffers', () => {
    const fallbackBytes = new ArrayBuffer(8);
    const request = createBuildRequest({
      family: '  A Bee/Zee!  ',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: { 0: { label: ' regular.ttf ', bytes: regular.bytes } },
      fallbacks: [{ label: ' fallback.otf ', bytes: fallbackBytes }],
    });

    expect(request.family).toBe('A_Bee_Zee');
    expect(request.styles).not.toBe(regular);
    expect(request.styles[0]).toEqual({ label: 'regular.ttf', bytes: regular.bytes });
    expect(request.styles[0]?.bytes).toBe(regular.bytes);
    expect(request.fallbacks[0].bytes).toBe(fallbackBytes);
  });

  it('parses the default sizes and preserves style IDs 0 through 3', () => {
    const request = createBuildRequest({
      family: 'Test',
      fontSizes: '12,14,16,18',
      presetIds: [],
      customRanges: '',
      styles: {
        0: regular,
        1: { label: 'bold.ttf', bytes: new ArrayBuffer(4) },
        2: { label: 'italic.ttf', bytes: new ArrayBuffer(4) },
        3: { label: 'bold-italic.ttf', bytes: new ArrayBuffer(4) },
      },
      fallbacks: [],
    });

    expect(request.sizes).toEqual([12, 14, 16, 18]);
    expect(Object.keys(request.styles)).toEqual(['0', '1', '2', '3']);
  });

  it('adds firmware UI sizes when a CJK preset is selected', () => {
    const request = createBuildRequest({
      family: 'Test',
      fontSizes: '12, 14',
      presetIds: ['cjk-sc'],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    });

    expect(request.sizes).toEqual([8, 10, 12, 14]);
  });

  it('adds firmware UI sizes for custom CJK ranges', () => {
    const request = createBuildRequest({
      family: 'Test',
      fontSizes: '14,12,14',
      presetIds: [],
      customRanges: '(0x4E00-0x4E10)',
      styles: { 0: regular },
      fallbacks: [],
    });

    expect(request.sizes).toEqual([8, 10, 12, 14]);
  });

  it('requires a regular font and rejects malformed size input', () => {
    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '12,14,16,18',
      presetIds: [],
      customRanges: '',
      styles: {},
      fallbacks: [],
    })).toThrow(/regular/i);

    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '12, nope',
      presetIds: [],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    })).toThrow(/size/i);

    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '12,,14',
      presetIds: [],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    })).toThrow(/size/i);

    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '',
      presetIds: [],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    })).toThrow(/size/i);
  });

  it.each([
    ['empty label', { label: '   ', bytes: new ArrayBuffer(4) }],
    ['empty buffer', { label: 'regular.ttf', bytes: new ArrayBuffer(0) }],
    ['invalid buffer', { label: 'regular.ttf', bytes: new Uint8Array(4) }],
  ])('rejects a font source with an %s', (_label, invalidSource) => {
    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: { 0: invalidSource as never },
      fallbacks: [],
    })).toThrow(/font|source|buffer|label/i);
  });

  it('validates presets and custom ranges before returning a request', () => {
    const state = {
      family: 'Test',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    };

    expect(() => createBuildRequest({
      ...state,
      presetIds: ['not-a-preset'],
    })).toThrow(/preset/i);
    expect(() => createBuildRequest({
      ...state,
      customRanges: '0x4E00-0x4E10',
    })).toThrow(/range/i);
  });

  it('rejects unusable family names and inputs outside the four styles and two fallbacks', () => {
    const baseState = {
      family: 'Test',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: { 0: regular },
      fallbacks: [],
    };

    expect(() => createBuildRequest({ ...baseState, family: '中文字体' })).toThrow(/family/i);
    expect(() => createBuildRequest({
      ...baseState,
      styles: { ...baseState.styles, 4: regular } as never,
    })).toThrow(/style/i);
    expect(() => createBuildRequest({
      ...baseState,
      fallbacks: [regular, regular, regular],
    })).toThrow(/fallback/i);
  });

  it('caps the total source font input at 128 MB', () => {
    expect(() => createBuildRequest({
      family: 'Test',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: {
        0: { label: 'regular.ttf', bytes: new ArrayBuffer(64 * 1024 * 1024) },
      },
      fallbacks: [{
        label: 'fallback.ttf',
        bytes: new ArrayBuffer(64 * 1024 * 1024 + 1),
      }],
    })).toThrow(/128 MB/i);
  });

  it('allows exactly 128 MB of selected source entries', () => {
    const sharedBytes = new ArrayBuffer(64 * 1024 * 1024);
    const request = createBuildRequest({
      family: 'Test',
      fontSizes: '12',
      presetIds: [],
      customRanges: '',
      styles: { 0: { label: 'regular.ttf', bytes: sharedBytes } },
      fallbacks: [{ label: 'fallback.ttf', bytes: sharedBytes }],
    });

    expect(request.styles[0]?.bytes).toBe(sharedBytes);
    expect(request.fallbacks[0].bytes).toBe(sharedBytes);
  });
});

describe('totalSourceFileBytes', () => {
  it('totals selected file sizes without reading their contents', () => {
    const first = { size: 40, arrayBuffer: vi.fn() };
    const second = { size: 2, arrayBuffer: vi.fn() };

    expect(totalSourceFileBytes([first, second])).toBe(42);
    expect(first.arrayBuffer).not.toHaveBeenCalled();
    expect(second.arrayBuffer).not.toHaveBeenCalled();
  });

  it('supports the inclusive 128 MiB boundary and exposes the shared limit', () => {
    expect(MAX_SOURCE_BYTES).toBe(128 * 1024 * 1024);
    expect(totalSourceFileBytes([
      { size: MAX_SOURCE_BYTES - 1 },
      { size: 1 },
    ])).toBe(MAX_SOURCE_BYTES);
    expect(totalSourceFileBytes([
      { size: MAX_SOURCE_BYTES },
      { size: 1 },
    ])).toBe(MAX_SOURCE_BYTES + 1);
  });

  it('rejects invalid file-size metadata', () => {
    expect(() => totalSourceFileBytes([{ size: -1 }])).toThrow(/file size/i);
    expect(() => totalSourceFileBytes([{ size: Number.NaN }])).toThrow(/file size/i);
  });
});

describe('startCpfontBuild', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    FakeWorker.constructionError = undefined;
    FakeWorker.postError = undefined;
    vi.stubGlobal('Worker', FakeWorker);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('forwards progress, validates completion, and terminates its worker', () => {
    const onEvent = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onEvent, onComplete, onError });
    const worker = FakeWorker.instances[0];

    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.url.pathname).toMatch(/\/worker\.ts$/);
    expect(worker.url.href).toBe(new URL('./worker.ts', import.meta.url).href);
    expect(worker.posted).toEqual([{ type: 'build', request: expect.any(Object) }]);
    worker.emit({ type: 'event', event: { type: 'progress', percent: 50, message: 'Half' } });
    worker.emit({ type: 'complete', outputs: [validOutput()] });

    expect(onEvent).toHaveBeenCalledWith({ type: 'progress', percent: 50, message: 'Half' });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
    expect(worker.terminateCalls).toBe(1);
  });

  it('transfers each distinct input buffer once without changing the request shape', () => {
    const shared = new ArrayBuffer(4);
    const other = new ArrayBuffer(8);
    const request = makeRequest();
    request.styles = {
      0: { label: 'regular.ttf', bytes: shared },
      2: { label: 'italic.ttf', bytes: other },
    };
    request.fallbacks = [{ label: 'fallback.ttf', bytes: shared }];

    startCpfontBuild(request, {});
    const worker = FakeWorker.instances[0];

    expect(worker.posted).toEqual([{ type: 'build', request }]);
    expect(worker.transferLists).toEqual([[shared, other]]);
  });

  it('forwards valid log events and rejects malformed worker events', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onEvent, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({ type: 'event', event: { type: 'log', message: 'Started' } });
    worker.emit({ type: 'event', event: { type: 'progress', percent: 'half', message: 'Bad' } });

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith({ type: 'log', message: 'Started' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/invalid.*event/i),
    }));
    expect(worker.terminateCalls).toBe(1);
  });

  it('rejects corrupt files returned by the worker as failures', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({
      type: 'complete',
      outputs: [{ name: 'bad.cpfont', size: 12, bytes: new Uint8Array([1, 2, 3]) }],
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/header/i) }));
    expect(worker.terminated).toBe(true);
  });

  it('binds completion to normalized CJK sizes, sanitized family, and selected styles', () => {
    const request = makeRequest();
    request.family = '  A Bee/Zee!  ';
    request.sizes = [14, 12, 14];
    request.presetIds = ['cjk-sc'];
    request.styles[2] = { label: 'italic.ttf', bytes: new ArrayBuffer(4) };
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(request, { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({
      type: 'complete',
      outputs: [8, 10, 12, 14].map((size) => validOutput(size, 'A_Bee_Zee', [0, 2])),
    });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    [
      'missing',
      [validOutput(12)],
    ],
    [
      'duplicate',
      [validOutput(12), validOutput(12)],
    ],
    [
      'unrelated',
      [validOutput(18, 'Other')],
    ],
  ])('rejects %s valid cpfont outputs', (_case, outputs) => {
    const request = makeRequest();
    request.sizes = _case === 'unrelated' ? [12] : [12, 14];
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(request, { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({ type: 'complete', outputs });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/expected|output/i),
    }));
    expect(worker.terminateCalls).toBe(1);
  });

  it('rejects a valid cpfont whose styles do not match the request', () => {
    const request = makeRequest();
    request.styles[2] = { label: 'italic.ttf', bytes: new ArrayBuffer(4) };
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(request, { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({ type: 'complete', outputs: [validOutput()] });

    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/style/i),
    }));
  });

  it('reports worker errors without calling the cancellation callback', () => {
    const onError = vi.fn();
    const onCancel = vi.fn();
    startCpfontBuild(makeRequest(), { onError, onCancel });
    const worker = FakeWorker.instances[0];

    worker.emit({ type: 'error', message: 'Font is broken' });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Font is broken' }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
  });

  it('reports browser worker errors once and ignores late terminal messages', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.fail('Worker script crashed', new TypeError('Network failure'));
    worker.emit({ type: 'complete', outputs: [validOutput()] });
    worker.fail('late error');

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network failure' }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(worker.terminateCalls).toBe(1);
  });

  it.each([
    ['unknown message', { type: 'wat' }],
    ['missing output array', { type: 'complete', outputs: {} }],
    ['invalid output record', { type: 'complete', outputs: [{ name: '', size: 12, bytes: new Uint8Array() }] }],
  ])('rejects an invalid response shape: %s', (_label, response) => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit(response);

    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(worker.terminateCalls).toBe(1);
  });

  it('ignores duplicate completion and error messages', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    startCpfontBuild(makeRequest(), { onComplete, onError });
    const worker = FakeWorker.instances[0];

    worker.emit({ type: 'complete', outputs: [validOutput()] });
    worker.emit({ type: 'complete', outputs: [validOutput()] });
    worker.emit({ type: 'error', message: 'late' });

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(worker.terminateCalls).toBe(1);
  });

  it('terminates immediately and reports an explicit cancellation', () => {
    const onError = vi.fn();
    const onCancel = vi.fn();
    const build = startCpfontBuild(makeRequest(), { onError, onCancel });
    const worker = FakeWorker.instances[0];

    build.cancel();
    build.cancel();
    worker.fail('late worker error');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
    expect(worker.terminated).toBe(true);
    expect(worker.terminateCalls).toBe(1);
  });

  it('reports synchronous worker construction failures', () => {
    FakeWorker.constructionError = 'construction failed';
    const onError = vi.fn();
    const onCancel = vi.fn();

    const build = startCpfontBuild(makeRequest(), { onError, onCancel });
    build.cancel();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'construction failed' }));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('reports synchronous postMessage failures and terminates the worker once', () => {
    FakeWorker.postError = new Error('post failed');
    const onError = vi.fn();

    startCpfontBuild(makeRequest(), { onError });
    const worker = FakeWorker.instances[0];

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'post failed' }));
    expect(worker.terminateCalls).toBe(1);
  });
});

describe('isLikelyOutOfMemoryError', () => {
  it.each([
    new Error('Out of memory'),
    new WebAssembly.RuntimeError('memory access out of bounds'),
    'Cannot enlarge memory arrays to size 536870912 bytes',
    new RangeError('Array buffer allocation failed'),
  ])('recognizes browser and Emscripten allocation failures', (error) => {
    expect(isLikelyOutOfMemoryError(error)).toBe(true);
  });

  it.each([
    new Error('FreeType WASM request failed with status 404'),
    new Error('Invalid worker response'),
    'Font family must contain at least one letter',
  ])('does not misclassify unrelated failures', (error) => {
    expect(isLikelyOutOfMemoryError(error)).toBe(false);
  });
});
