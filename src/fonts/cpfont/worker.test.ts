import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CpfontBuildRequest, CpfontOutput } from './types';

const { buildCpfontFamily } = vi.hoisted(() => ({ buildCpfontFamily: vi.fn() }));

vi.mock('./builder', () => ({ buildCpfontFamily }));

import { createCpfontWorkerHandler } from './worker';

function makeRequest(): CpfontBuildRequest {
  return {
    family: 'Test',
    sizes: [12],
    presetIds: [],
    customRanges: '',
    styles: { 0: { label: 'regular.ttf', bytes: new ArrayBuffer(4) } },
    fallbacks: [],
  };
}

function makeOutput(bytes = new Uint8Array([1, 2, 3])): CpfontOutput {
  return { name: 'Test_12.cpfont', size: 12, bytes };
}

function makeHarness(fetchImpl = vi.fn()) {
  const postMessage = vi.fn();
  const handler = createCpfontWorkerHandler(
    { postMessage },
    { fetch: fetchImpl as typeof fetch, wasmUrl: '/assets/freetype.wasm' },
  );
  return { handler, postMessage, fetchImpl };
}

describe('createCpfontWorkerHandler', () => {
  beforeEach(() => {
    buildCpfontFamily.mockReset();
  });

  it('fetches only its injected bundled WASM URL and forwards events', async () => {
    const wasm = new Uint8Array([0, 97, 115, 109]);
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(wasm.buffer),
    });
    buildCpfontFamily.mockImplementation(async (_request, options) => {
      options.onEvent({ type: 'progress', percent: 40, message: 'Rasterizing' });
      return [makeOutput()];
    });
    const { handler, postMessage } = makeHarness(fetchImpl);
    const request = makeRequest();

    await handler({ data: { type: 'build', request } } as MessageEvent);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith('/assets/freetype.wasm');
    expect(buildCpfontFamily).toHaveBeenCalledWith(request, {
      wasmBinary: expect.any(Uint8Array),
      onEvent: expect.any(Function),
    });
    expect(postMessage).toHaveBeenNthCalledWith(1, {
      type: 'event',
      event: { type: 'progress', percent: 40, message: 'Rasterizing' },
    });
  });

  it('calls fetch with globalThis as its receiver for Worker native brand checks', async () => {
    const fetchImpl = vi.fn(function (this: unknown, input: RequestInfo | URL) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      });
    });
    buildCpfontFamily.mockResolvedValue([makeOutput()]);
    const { handler, postMessage } = makeHarness(fetchImpl);

    await handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith('/assets/freetype.wasm');
    expect(fetchImpl.mock.instances[0]).toBe(globalThis);
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'complete', outputs: [expect.objectContaining({ name: 'Test_12.cpfont' })] },
      [expect.any(ArrayBuffer)],
    );
  });

  it('completes with outputs and transfers each distinct backing buffer once', async () => {
    const shared = new ArrayBuffer(8);
    const other = new ArrayBuffer(4);
    const outputs = [
      makeOutput(new Uint8Array(shared, 0, 4)),
      { ...makeOutput(new Uint8Array(shared, 4, 4)), name: 'shared.cpfont' },
      { ...makeOutput(new Uint8Array(other)), name: 'other.cpfont' },
    ];
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });
    buildCpfontFamily.mockResolvedValue(outputs);
    const { handler, postMessage } = makeHarness(fetchImpl);

    await handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);

    expect(postMessage).toHaveBeenLastCalledWith(
      { type: 'complete', outputs },
      [shared, other],
    );
  });

  it('reports failed WASM responses without invoking the builder', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { handler, postMessage } = makeHarness(fetchImpl);

    await handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);

    expect(buildCpfontFamily).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringMatching(/wasm.*404/i),
    });
  });

  it.each([
    ['sync string', () => { throw 'sync failure'; }, 'sync failure'],
    ['async object', () => Promise.reject({ reason: 'async failure' }), 'async failure'],
  ])('normalizes %s builder failures', async (_label, implementation, message) => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });
    buildCpfontFamily.mockImplementation(implementation);
    const { handler, postMessage } = makeHarness(fetchImpl);

    await handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringContaining(message),
    });
  });

  it('rejects malformed messages without fetching', async () => {
    const { handler, postMessage, fetchImpl } = makeHarness(vi.fn());

    await handler({ data: { type: 'build' } } as MessageEvent);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringMatching(/invalid.*build/i),
    });
  });

  it('rejects a second build while the first is still running', async () => {
    let releaseFetch!: () => void;
    const fetchImpl = vi.fn().mockImplementation(() => new Promise((resolve) => {
      releaseFetch = () => resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      });
    }));
    buildCpfontFamily.mockResolvedValue([makeOutput()]);
    const { handler, postMessage } = makeHarness(fetchImpl);
    const first = handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);

    await handler({ data: { type: 'build', request: makeRequest() } } as MessageEvent);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'error',
      message: expect.stringMatching(/already.*build/i),
    });

    releaseFetch();
    await first;
    expect(buildCpfontFamily).toHaveBeenCalledOnce();
  });
});
