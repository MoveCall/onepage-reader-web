// Client-side firmware flasher for the OnePage reader (ESP32-C61), built on
// esptool-js. Runs entirely in the browser over Web Serial — the firmware is
// fetched same-origin and streamed straight to the chip.
//
// Two paths, differing only in whether the flasher stub is uploaded:
//  - stub (default): upload esptool-js's C61 stub to RAM, then flash at full
//    speed. esptool-js 0.6.0 ships stub_flasher_32c61.json, so this works on
//    C61 (the same approach crossmux.com uses).
//  - no-stub: skip the stub and flash via the chip's ROM bootloader. Slower,
//    but a fallback for boards where the stub won't come up.
import { ESPLoader, Transport } from 'esptool-js';

export class NoSerialError extends Error {}

export interface FlashOpts {
  /** Same-origin URL of the merged 0x0 flash image. */
  binUrl: string;
  /** Flash offset for a merged image (0). */
  offset: number;
  /** Skip the flasher stub and use the ROM bootloader (slower). */
  noStub?: boolean;
  onProgress: (written: number, total: number) => void;
  onLog: (msg: string) => void;
}

export async function flash(opts: FlashOpts): Promise<void> {
  if (!('serial' in navigator)) {
    throw new NoSerialError('Web Serial unavailable');
  }

  // Prompt the user to pick the serial port (must be user-gesture initiated).
  const port = await navigator.serial.requestPort();
  const transport = new Transport(port, false);

  // 115200 keeps the ROM handshake reliable; crossmux uses the same rate.
  const loader = new ESPLoader({
    transport,
    baudrate: 115200,
    romBaudrate: 115200,
    // Route esptool-js's own logging into our UI.
    terminal: {
      clean: () => {},
      writeLine: (data: string) => opts.onLog(data),
      write: (data: string) => opts.onLog(data),
    },
  });

  try {
    opts.onLog('Detecting chip…');
    await loader.detectChip();

    if (!opts.noStub) {
      // Uploads stub_flasher_32c61.json to RAM and switches to it. Full speed.
      await loader.runStub();
    }

    opts.onLog('Downloading firmware…');
    const bin = new Uint8Array(await (await fetch(opts.binUrl)).arrayBuffer());

    await loader.writeFlash({
      fileArray: [{ data: bin, address: opts.offset }],
      // 'keep' preserves the image's own header (mode/freq/size) — don't rewrite it.
      flashSize: 'keep',
      flashMode: 'keep',
      flashFreq: 'keep',
      // Required for the no-stub path (ROM bootloader only handles compressed
      // writes here); harmless and faster with the stub too.
      compress: true,
      eraseAll: false,
      reportProgress: (_i, written, total) => opts.onProgress(written, total),
    });

    opts.onLog('Rebooting…');
    await loader.after('hard_reset');
  } finally {
    // Always release the port so a retry (or another app) can reopen it.
    try {
      await transport.disconnect();
    } catch {
      /* ignore */
    }
  }
}
