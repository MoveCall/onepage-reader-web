import { inspectCpfont } from './binary';
import { normalizeBuildSizes } from './intervals';
import type {
  BuildEvent,
  CpfontBuildRequest,
  CpfontOutput,
  FontSource,
  FontStyleId,
} from './types';

export const MAX_SOURCE_BYTES = 128 * 1024 * 1024;
const STYLE_IDS = new Set(['0', '1', '2', '3']);

export interface CpfontBuildInputState {
  family: string;
  fontSizes: string;
  presetIds: string[];
  customRanges: string;
  styles: Partial<Record<number, FontSource>>;
  fallbacks: FontSource[];
}

export interface CpfontBuildCallbacks {
  onEvent?: (event: BuildEvent) => void;
  onComplete?: (outputs: CpfontOutput[]) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export interface CpfontBuildHandle {
  cancel(): void;
}

export function totalSourceFileBytes(files: readonly { size: number }[]): number {
  let total = 0;
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      throw new Error(`File size must be a nonnegative safe integer: ${file.size}`);
    }
    total += file.size;
    if (!Number.isSafeInteger(total)) throw new Error('Total file size exceeds the safe integer range');
  }
  return total;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  try {
    const serialized = JSON.stringify(error);
    if (serialized) return new Error(serialized);
  } catch {
    // Fall back to String for circular or otherwise unserializable values.
  }
  return new Error(String(error));
}

export function isLikelyOutOfMemoryError(error: unknown): boolean {
  const message = normalizeError(error).message.toLowerCase();
  return message.includes('out of memory')
    || message.includes('memory access out of bounds')
    || /cannot (?:enlarge|grow) memory/.test(message)
    || /array ?buffer .*allocation failed/.test(message);
}

function isBuildEvent(value: unknown): value is BuildEvent {
  if (!isRecord(value) || typeof value.message !== 'string') return false;
  if (value.type === 'log') return true;
  return value.type === 'progress'
    && typeof value.percent === 'number'
    && Number.isFinite(value.percent)
    && value.percent >= 0
    && value.percent <= 100;
}

interface OutputExpectation {
  outputs: Array<{ name: string; size: number }>;
  styleIds: number[];
}

function sanitizeExpectedFamilyName(value: string): string {
  const family = value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (family === '') {
    throw new Error('Font family must contain at least one letter, number, underscore, or hyphen');
  }
  return family;
}

function parseFontSizes(value: string): number[] {
  const tokens = value.split(',');
  if (tokens.length === 0 || tokens.some((token) => !/^\d+$/.test(token.trim()))) {
    throw new Error('Font sizes must be comma-separated integers');
  }
  return tokens.map((token) => Number.parseInt(token.trim(), 10));
}

function validateSource(source: FontSource, role: string): FontSource {
  if (!isRecord(source) || typeof source.label !== 'string' || source.label.trim() === '') {
    throw new Error(`${role} font source needs a label`);
  }
  if (!(source.bytes instanceof ArrayBuffer)) {
    throw new Error(`${role} font source must use an ArrayBuffer`);
  }
  if (source.bytes.byteLength === 0) {
    throw new Error(`${role} font source is empty`);
  }
  return { label: source.label.trim(), bytes: source.bytes };
}

export function createBuildRequest(state: CpfontBuildInputState): CpfontBuildRequest {
  const family = sanitizeExpectedFamilyName(state.family);
  if (!Array.isArray(state.presetIds)) throw new Error('Font presets must be an array');
  if (!Array.isArray(state.fallbacks)) throw new Error('Font fallbacks must be an array');
  if (state.fallbacks.length > 2) throw new Error('At most two fallback fonts are allowed');
  if (!isRecord(state.styles)) throw new Error('Font styles must be an object');

  const styleEntries = Object.entries(state.styles);
  for (const [styleId] of styleEntries) {
    if (!STYLE_IDS.has(styleId)) throw new Error(`Invalid font style ID: ${styleId}`);
  }
  if (state.styles[0] === undefined) throw new Error('A regular font is required');

  const presetIds = state.presetIds.map((presetId) => {
    if (typeof presetId !== 'string') throw new Error('Font preset IDs must be strings');
    return presetId.trim().toLowerCase();
  });
  if (typeof state.customRanges !== 'string') throw new Error('Custom ranges must be text');
  const customRanges = state.customRanges.trim();
  const sizes = normalizeBuildSizes(
    parseFontSizes(state.fontSizes),
    presetIds,
    customRanges,
  );

  const styles: Partial<Record<FontStyleId, FontSource>> = {};
  let totalSourceBytes = 0;
  for (const [rawStyleId, source] of styleEntries) {
    if (source === undefined) continue;
    const styleId = Number(rawStyleId) as FontStyleId;
    const validated = validateSource(source, `Style ${styleId}`);
    styles[styleId] = validated;
    totalSourceBytes += validated.bytes.byteLength;
  }
  const fallbacks = state.fallbacks.map((source, index) => {
    const validated = validateSource(source, `Fallback ${index + 1}`);
    totalSourceBytes += validated.bytes.byteLength;
    return validated;
  });
  if (totalSourceBytes > MAX_SOURCE_BYTES) {
    throw new Error('Selected font sources exceed the 128 MB limit');
  }

  return {
    family,
    sizes,
    presetIds: [...presetIds],
    customRanges,
    styles,
    fallbacks,
  };
}

function deriveOutputExpectation(request: CpfontBuildRequest): OutputExpectation {
  const family = sanitizeExpectedFamilyName(request.family);
  const sizes = normalizeBuildSizes(
    request.sizes,
    request.presetIds,
    request.customRanges,
  );
  const styleIds = ([0, 1, 2, 3] as const).filter(
    (styleId) => request.styles[styleId] !== undefined,
  );
  return {
    outputs: sizes.map((size) => ({ name: `${family}_${size}.cpfont`, size })),
    styleIds,
  };
}

function validateOutputs(value: unknown, expected: OutputExpectation): CpfontOutput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid worker completion: outputs must be a nonempty array');
  }

  const inspectedOutputs = value.map((output, index) => {
    if (
      !isRecord(output)
      || typeof output.name !== 'string'
      || output.name.trim() === ''
      || !Number.isInteger(output.size)
      || (output.size as number) <= 0
      || !(output.bytes instanceof Uint8Array)
    ) {
      throw new Error(`Invalid worker output at index ${index}`);
    }
    const metadata = inspectCpfont(output.bytes);
    return {
      output: output as unknown as CpfontOutput,
      styleIds: metadata.styles.map(({ styleId }) => styleId),
    };
  });

  if (inspectedOutputs.length !== expected.outputs.length) {
    throw new Error(
      `Worker returned ${inspectedOutputs.length} outputs; expected ${expected.outputs.length}`,
    );
  }
  for (const [index, inspected] of inspectedOutputs.entries()) {
    const { output, styleIds } = inspected;
    if (
      styleIds.length !== expected.styleIds.length
      || styleIds.some((styleId, styleIndex) => styleId !== expected.styleIds[styleIndex])
    ) {
      throw new Error(
        `Worker output ${index} style IDs do not match the request: `
        + `expected ${expected.styleIds.join(',')}, received ${styleIds.join(',')}`,
      );
    }
    const expectedOutput = expected.outputs[index];
    if (output.size !== expectedOutput.size || output.name !== expectedOutput.name) {
      throw new Error(
        `Worker output ${index} does not match the request: expected `
        + `${expectedOutput.name} at size ${expectedOutput.size}`,
      );
    }
  }
  return inspectedOutputs.map(({ output }) => output);
}

function collectInputTransfers(request: CpfontBuildRequest): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  const addSource = (source: FontSource | undefined): void => {
    if (source?.bytes instanceof ArrayBuffer) buffers.add(source.bytes);
  };

  for (const source of Object.values(request.styles)) addSource(source);
  for (const source of request.fallbacks) addSource(source);
  return [...buffers];
}

export function startCpfontBuild(
  request: CpfontBuildRequest,
  callbacks: CpfontBuildCallbacks,
): CpfontBuildHandle {
  let worker: Worker | undefined;
  let settled = false;
  let terminated = false;

  const terminate = (): void => {
    if (terminated) return;
    terminated = true;
    worker?.terminate();
  };

  const fail = (error: unknown): void => {
    if (settled) return;
    settled = true;
    terminate();
    callbacks.onError?.(normalizeError(error));
  };

  const handle: CpfontBuildHandle = {
    cancel(): void {
      if (settled) return;
      settled = true;
      terminate();
      callbacks.onCancel?.();
    },
  };

  let expectedOutputs: OutputExpectation;
  try {
    expectedOutputs = deriveOutputExpectation(request);
  } catch (error) {
    fail(error);
    return handle;
  }

  try {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  } catch (error) {
    fail(error);
    return handle;
  }

  worker.onmessage = (messageEvent: MessageEvent<unknown>): void => {
    if (settled) return;
    const message = messageEvent.data;
    if (!isRecord(message) || typeof message.type !== 'string') {
      fail(new Error('Invalid worker response'));
      return;
    }

    if (message.type === 'event') {
      if (!isBuildEvent(message.event)) {
        fail(new Error('Invalid worker event'));
        return;
      }
      callbacks.onEvent?.(message.event);
      return;
    }

    if (message.type === 'error') {
      if (typeof message.message !== 'string' || message.message === '') {
        fail(new Error('Invalid worker error response'));
      } else {
        fail(new Error(message.message));
      }
      return;
    }

    if (message.type === 'complete') {
      let outputs: CpfontOutput[];
      try {
        outputs = validateOutputs(message.outputs, expectedOutputs);
      } catch (error) {
        fail(error);
        return;
      }
      settled = true;
      terminate();
      callbacks.onComplete?.(outputs);
      return;
    }

    fail(new Error(`Invalid worker response type: ${message.type}`));
  };

  worker.onerror = (event: ErrorEvent): void => {
    fail(event.error ?? new Error(event.message || 'Worker failed'));
  };

  try {
    worker.postMessage({ type: 'build', request }, collectInputTransfers(request));
  } catch (error) {
    fail(error);
  }

  return handle;
}
