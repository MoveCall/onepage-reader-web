import initFreeType, { type Face } from '@zkl2333/freetype-wasm';
import { inspectCpfont, packCpfont } from './binary';
import { normalizeBuildSizes, resolveIntervals } from './intervals';
import { rasterizeStyle } from './rasterize';
import type {
  BuildEvent,
  CpfontBuildRequest,
  CpfontOutput,
  FontSource,
  FontStyleId,
  RasterStyle,
} from './types';

export interface CpfontBuildOptions {
  wasmBinary: Uint8Array;
  onEvent?: (event: BuildEvent) => void;
}

const STYLE_IDS = [0, 1, 2, 3] as const satisfies readonly FontStyleId[];

function sanitizeFamilyName(value: string): string {
  const family = value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (family === '') {
    throw new Error('Font family must contain at least one letter, number, underscore, or hyphen');
  }
  return family;
}

function sourceBytes(source: FontSource): Uint8Array {
  if (!(source.bytes instanceof ArrayBuffer) || source.bytes.byteLength === 0) {
    throw new Error(`Font source is empty: ${source.label || 'unnamed font'}`);
  }
  return new Uint8Array(source.bytes);
}

function createFace(
  ft: Awaited<ReturnType<typeof initFreeType>>,
  bytes: Uint8Array,
  source: FontSource,
  role: string,
): Face {
  const label = source.label || 'unnamed font';
  try {
    return ft.newFace(bytes);
  } catch (cause) {
    const detail = cause instanceof Error && cause.message ? `: ${cause.message}` : '';
    throw new Error(`Failed to create ${role} face from "${label}"${detail}`, { cause });
  }
}

function emit(options: CpfontBuildOptions, event: BuildEvent): void {
  options.onEvent?.(event);
}

export async function buildCpfontFamily(
  request: CpfontBuildRequest,
  options: CpfontBuildOptions,
): Promise<CpfontOutput[]> {
  const family = sanitizeFamilyName(request.family);
  const regular = request.styles[0];
  if (!regular) throw new Error('A regular font is required');
  if (!(options.wasmBinary instanceof Uint8Array) || options.wasmBinary.byteLength === 0) {
    throw new Error('FreeType WASM binary is required');
  }
  if (request.sizes.length === 0) throw new Error('At least one font size is required');

  const sizes = normalizeBuildSizes(
    request.sizes,
    request.presetIds,
    request.customRanges,
  );
  const intervals = resolveIntervals(request.presetIds, request.customRanges);
  const styleSources = STYLE_IDS.flatMap((styleId) => {
    const source = request.styles[styleId];
    return source ? [{ styleId, source, bytes: sourceBytes(source) }] : [];
  });
  const fallbackSources = request.fallbacks.map((source, index) => ({
    source,
    role: `fallback ${index + 1}`,
    bytes: sourceBytes(source),
  }));

  emit(options, { type: 'progress', percent: 0, message: 'Initializing FreeType' });
  const ft = await initFreeType({ wasmBinary: options.wasmBinary });
  const createdFaces: Face[] = [];
  let buildFailed = false;
  try {
    const styleFaces = styleSources.map(({ styleId, source, bytes }) => {
      const face = createFace(ft, bytes, source, `style ${styleId}`);
      createdFaces.push(face);
      return { styleId, face };
    });
    const fallbackFaces = fallbackSources.map(({ source, role, bytes }) => {
      const face = createFace(ft, bytes, source, role);
      createdFaces.push(face);
      return face;
    });

    const outputs: CpfontOutput[] = [];
    const totalStyles = sizes.length * styleFaces.length;
    let completedStyles = 0;
    for (const size of sizes) {
      const rasterStyles: RasterStyle[] = [];
      for (const { styleId, face } of styleFaces) {
        emit(options, {
          type: 'log',
          message: `Rasterizing style ${styleId} at ${size} pt`,
        });
        rasterStyles.push(rasterizeStyle(
          ft,
          face,
          fallbackFaces,
          size,
          intervals,
          styleId,
        ));
        completedStyles += 1;
        emit(options, {
          type: 'progress',
          percent: Math.min(90, Math.round((completedStyles / totalStyles) * 90)),
          message: `Rasterized ${completedStyles} of ${totalStyles} styles`,
        });
      }

      const bytes = packCpfont(rasterStyles);
      inspectCpfont(bytes);
      const name = `${family}_${size}.cpfont`;
      outputs.push({ name, size, bytes });
      emit(options, { type: 'log', message: `Built ${name} (${bytes.byteLength} bytes)` });
    }

    emit(options, { type: 'progress', percent: 100, message: 'Complete' });
    return outputs;
  } catch (error) {
    buildFailed = true;
    throw error;
  } finally {
    let cleanupError: unknown;
    for (let index = createdFaces.length - 1; index >= 0; index -= 1) {
      try {
        createdFaces[index].destroy();
      } catch (error) {
        cleanupError ??= error;
      }
    }
    try {
      ft.destroy();
    } catch (error) {
      cleanupError ??= error;
    }
    if (!buildFailed && cleanupError !== undefined) throw cleanupError;
  }
}
