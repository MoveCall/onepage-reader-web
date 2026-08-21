import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initFreeType from '@zkl2333/freetype-wasm';
import { describe, expect, it, vi } from 'vitest';
import { inspectCpfont } from './binary';
import { buildCpfontFamily } from './builder';
import type { BuildEvent, CpfontBuildRequest } from './types';

function fixtureBytes(path: string): ArrayBuffer {
  const bytes = readFileSync(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function makeRequest(overrides: Partial<CpfontBuildRequest> = {}): CpfontBuildRequest {
  return {
    family: 'ABeeZee',
    sizes: [12, 14],
    presetIds: [],
    customRanges: '',
    styles: {
      0: {
        label: 'ABeeZee-Regular.ttf',
        bytes: fixtureBytes('tests/fixtures/fonts/ABeeZee-Regular.ttf'),
      },
    },
    fallbacks: [],
    ...overrides,
  };
}

const wasmBinary = new Uint8Array(readFileSync(fileURLToPath(
  import.meta.resolve('@zkl2333/freetype-wasm/freetype.wasm'),
)));

describe('buildCpfontFamily', () => {
  it('builds deterministic valid v4 files for multiple point sizes', async () => {
    const events: BuildEvent[] = [];
    const outputs = await buildCpfontFamily(makeRequest(), {
      wasmBinary,
      onEvent: (event) => events.push(event),
    });

    expect(outputs.map(({ name }) => name)).toEqual([
      'ABeeZee_12.cpfont',
      'ABeeZee_14.cpfont',
    ]);
    expect(outputs.map(({ size }) => size)).toEqual([12, 14]);
    for (const output of outputs) {
      const metadata = inspectCpfont(output.bytes);
      expect(metadata).toMatchObject({ version: 4, flags: 1, styleCount: 1 });
    }
    expect(events.at(-1)).toEqual({ type: 'progress', percent: 100, message: 'Complete' });
    expect(events.some((event) => event.type === 'log' && /ABeeZee_12\.cpfont/.test(event.message)))
      .toBe(true);
  });

  it('sorts sizes and styles and sanitizes the output family name', async () => {
    const font = fixtureBytes('tests/fixtures/fonts/ABeeZee-Regular.ttf');
    const outputs = await buildCpfontFamily(makeRequest({
      family: '  A Bee/Zee!  ',
      sizes: [14, 12, 14],
      styles: {
        3: { label: 'bold italic', bytes: font.slice(0) },
        0: { label: 'regular', bytes: font.slice(0) },
      },
    }), { wasmBinary });

    expect(outputs.map(({ name }) => name)).toEqual([
      'A_Bee_Zee_12.cpfont',
      'A_Bee_Zee_14.cpfont',
    ]);
    expect(inspectCpfont(outputs[0].bytes).styles.map(({ styleId }) => styleId)).toEqual([0, 3]);
  });

  it('requires a regular face, at least one size, and a usable family name', async () => {
    await expect(buildCpfontFamily(makeRequest({ styles: {} }), { wasmBinary })).rejects.toThrow(
      /regular/i,
    );
    await expect(buildCpfontFamily(makeRequest({ sizes: [] }), { wasmBinary })).rejects.toThrow(
      /size/i,
    );
    await expect(buildCpfontFamily(makeRequest({ family: '!!!' }), { wasmBinary })).rejects.toThrow(
      /family/i,
    );
  });

  it('validates every font buffer before initializing FreeType', async () => {
    const events: BuildEvent[] = [];
    const request = makeRequest({
      fallbacks: [{ label: 'empty fallback', bytes: new ArrayBuffer(0) }],
    });

    await expect(buildCpfontFamily(request, {
      wasmBinary,
      onEvent: (event) => events.push(event),
    })).rejects.toThrow(/empty fallback/i);

    expect(events).toEqual([]);
  });

  it('preserves the failing source label and destroys partial resources exactly once', async () => {
    const probeFt = await initFreeType({ wasmBinary });
    const probeFace = probeFt.newFace(new Uint8Array(
      fixtureBytes('tests/fixtures/fonts/ABeeZee-Regular.ttf'),
    ));
    const faceDestroy = vi.spyOn(Object.getPrototypeOf(probeFace), 'destroy');
    const ftDestroy = vi.spyOn(Object.getPrototypeOf(probeFt), 'destroy');
    probeFace.destroy();
    probeFt.destroy();
    faceDestroy.mockClear();
    ftDestroy.mockClear();

    try {
      let failure: unknown;
      try {
        await buildCpfontFamily(makeRequest({
          fallbacks: [{ label: 'broken.ttf', bytes: new ArrayBuffer(4) }],
        }), { wasmBinary });
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toContain('broken.ttf');
      expect((failure as Error).cause).toBeInstanceOf(Error);
      expect(faceDestroy).toHaveBeenCalledOnce();
      expect(ftDestroy).toHaveBeenCalledOnce();
    } finally {
      faceDestroy.mockRestore();
      ftDestroy.mockRestore();
    }
  });

  it('preserves a failing style source label', async () => {
    await expect(buildCpfontFamily(makeRequest({
      styles: { 0: { label: 'broken-regular.ttf', bytes: new ArrayBuffer(4) } },
    }), { wasmBinary })).rejects.toThrow(/broken-regular\.ttf/);
  });

  it('adds firmware UI sizes and rasterizes real fallback CJK coverage', async () => {
    const cjkRequest = makeRequest({
      sizes: [12],
      presetIds: ['cjk-sc'],
    });
    const baseline = await buildCpfontFamily(cjkRequest, { wasmBinary });
    const outputs = await buildCpfontFamily(makeRequest({
      ...cjkRequest,
      fallbacks: [{
        label: 'SubsetCjk-U4E00.ttf',
        bytes: fixtureBytes('tests/fixtures/fonts/SubsetCjk-U4E00.ttf'),
      }],
    }), { wasmBinary });

    expect(outputs.map(({ size }) => size).slice(0, 2)).toEqual([8, 10]);
    expect(outputs.at(-1)?.size).toBe(12);
    for (const [index, output] of outputs.entries()) {
      const baselineGlyphs = inspectCpfont(baseline[index].bytes).styles[0].glyphCount;
      const fallbackGlyphs = inspectCpfont(output.bytes).styles[0].glyphCount;
      expect(fallbackGlyphs).toBe(baselineGlyphs + 1);
    }
  }, 30_000);
});
