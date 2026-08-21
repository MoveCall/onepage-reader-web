import wasmUrl from '@zkl2333/freetype-wasm/freetype.wasm?url';
import { buildCpfontFamily } from './builder';
import type { BuildEvent, CpfontBuildRequest, CpfontOutput } from './types';

interface WorkerHost {
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

interface WorkerDependencies {
  fetch: typeof fetch;
  wasmUrl: string;
}

interface BuildMessage {
  type: 'build';
  request: CpfontBuildRequest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBuildMessage(value: unknown): value is BuildMessage {
  if (!isRecord(value) || value.type !== 'build' || !isRecord(value.request)) return false;
  const request = value.request;
  return typeof request.family === 'string'
    && Array.isArray(request.sizes)
    && Array.isArray(request.presetIds)
    && typeof request.customRanges === 'string'
    && isRecord(request.styles)
    && Array.isArray(request.fallbacks);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error || 'Unknown worker error';
  try {
    const serialized = JSON.stringify(error);
    if (serialized) return serialized;
  } catch {
    // Fall back to String for circular or otherwise unserializable values.
  }
  return String(error);
}

function outputTransfers(outputs: readonly CpfontOutput[]): ArrayBuffer[] {
  const buffers = new Set<ArrayBuffer>();
  for (const output of outputs) buffers.add(output.bytes.buffer as ArrayBuffer);
  return [...buffers];
}

export function createCpfontWorkerHandler(
  host: WorkerHost,
  dependencies: WorkerDependencies = { fetch: globalThis.fetch, wasmUrl },
): (event: MessageEvent<unknown>) => Promise<void> {
  let buildStarted = false;

  return async (event: MessageEvent<unknown>): Promise<void> => {
    if (!isBuildMessage(event.data)) {
      host.postMessage({ type: 'error', message: 'Invalid worker build message' });
      return;
    }
    if (buildStarted) {
      host.postMessage({ type: 'error', message: 'Already building in this worker' });
      return;
    }
    buildStarted = true;

    try {
      const response = await dependencies.fetch.call(globalThis, dependencies.wasmUrl);
      if (!response.ok) {
        throw new Error(`FreeType WASM request failed with status ${response.status}`);
      }
      const wasmBinary = new Uint8Array(await response.arrayBuffer());
      const onEvent = (buildEvent: BuildEvent): void => {
        host.postMessage({ type: 'event', event: buildEvent });
      };
      const outputs = await buildCpfontFamily(event.data.request, { wasmBinary, onEvent });
      host.postMessage({ type: 'complete', outputs }, outputTransfers(outputs));
    } catch (error) {
      host.postMessage({ type: 'error', message: errorMessage(error) });
    }
  };
}

type WorkerRuntime = WorkerHost & {
  document?: unknown;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};

const runtime = globalThis as unknown as Partial<WorkerRuntime>;
if (typeof runtime.postMessage === 'function' && runtime.document === undefined) {
  const host = runtime as WorkerRuntime;
  host.onmessage = createCpfontWorkerHandler(host);
}
