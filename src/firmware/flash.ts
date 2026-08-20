// Client-side firmware flasher for the OnePage reader (ESP32-C61), built on
// esptool-js. Runs entirely in the browser over Web Serial — the firmware is
// fetched same-origin and streamed straight to the chip.
//
// The flasher normally uploads esptool-js's C61 stub to RAM, then flashes at
// full speed. Some ESP32-C61 ROM revisions are ahead of esptool-js, so those
// fall back internally to the slower ROM bootloader path.
import { ESPLoader, Transport } from 'esptool-js';
import { ESP32C61ROM } from 'esptool-js/lib/targets/esp32c61.js';
import c61Stub from './stubs/esp32c61-esptool-4.11.0.json';

export class NoSerialError extends Error {}

export interface FlashOpts {
  /** Same-origin URL of the merged 0x0 flash image. */
  binUrl: string;
  /** Flash offset for a merged image (0). */
  offset: number;
  onProgress: (written: number, total: number) => void;
  onLog: (msg: string) => void;
}

const ESP32_C61_EXTRA_MAGICS = new Set([0x4f81606f, 0x5de1706f]);
const ESP32_C61_STUB_UNSUPPORTED_MAGICS = new Set<number>();

const C61_WATCHDOG_REGS = {
  rtcWdtProtect: 0x600b1c00 + 0x0018,
  rtcWdtConfig0: 0x600b1c00 + 0x0000,
  rtcWdtConfig1: 0x600b1c00 + 0x0004,
  rtcWdtKey: 0x50d83aa1,
  swdProtect: 0x600b1c00 + 0x0020,
  swdConf: 0x600b1c00 + 0x001c,
  swdKey: 0x50d83aa1,
  swdAutoFeed: 1 << 18,
};

function padTo(data: Uint8Array, alignment: number, value = 0xff): Uint8Array {
  const paddedLength = Math.ceil(data.length / alignment) * alignment;
  if (paddedLength === data.length) return data;

  const padded = new Uint8Array(paddedLength);
  padded.fill(value);
  padded.set(data);
  return padded;
}

function slicePaddedBlock(data: Uint8Array, offset: number, blockSize: number): Uint8Array {
  const end = Math.min(offset + blockSize, data.length);
  const block = data.slice(offset, end);
  if (block.length === blockSize) return block;

  const padded = new Uint8Array(blockSize);
  padded.fill(0xff);
  padded.set(block);
  return padded;
}

function appendInt(loader: any, data: Uint8Array, value: number): Uint8Array {
  return loader._appendArray(data, loader._intToByteArray(value >>> 0));
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const decoded = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    decoded[i] = binary.charCodeAt(i);
  }
  return decoded;
}

function applyC61Compat(chip: any) {
  chip.SUPPORTS_ENCRYPTED_FLASH = true;
  chip.FLASH_ENCRYPTED_WRITE_ALIGN = 16;
  chip.MEMORY_MAP = [
    [0x00000000, 0x00010000, 'PADDING'],
    [0x42000000, 0x44000000, 'DROM'],
    [0x40800000, 0x40860000, 'DRAM'],
    [0x40800000, 0x40860000, 'BYTE_ACCESSIBLE'],
    [0x4004ac00, 0x40050000, 'DROM_MASK'],
    [0x40000000, 0x4004ac00, 'IROM_MASK'],
    [0x42000000, 0x44000000, 'IROM'],
    [0x40800000, 0x40860000, 'IRAM'],
    [0x50000000, 0x50004000, 'RTC_IRAM'],
    [0x50000000, 0x50004000, 'RTC_DRAM'],
    [0x600fe000, 0x60100000, 'MEM_INTERNAL2'],
  ];

  chip.getChipRevision = async (loader: any) => {
    const major = await chip.getMajorChipVersion(loader);
    const minor = await chip.getMinorChipVersion(loader);
    return major * 100 + minor;
  };
  chip.getUartDevBufNo = async (loader: any) => {
    const revision = await chip.getChipRevision(loader);
    return revision <= 2 ? 0x4084f5ec : 0x4084f5e4;
  };
  chip.usesUsbJtagSerial = async (loader: any) => {
    const revision = await chip.getChipRevision(loader);
    const usbJtagValue = revision <= 2 ? 3 : 4;
    const uartDevBufNo = await chip.getUartDevBufNo(loader);
    const uartNo = (await loader.readReg(uartDevBufNo)) & 0xff;
    loader.info(
      `C61 UART console: revision ${revision}, UARTDEV_BUF_NO 0x${uartDevBufNo.toString(16)} = ${uartNo}, USB-JTAG expects ${usbJtagValue}.`
    );
    return uartNo === usbJtagValue;
  };
  chip.postConnect = async (loader: any) => {
    if (!(await chip.usesUsbJtagSerial(loader))) return;

    loader.info('USB-Serial/JTAG mode detected; disabling watchdogs before stub upload.');
    await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtProtect, C61_WATCHDOG_REGS.rtcWdtKey);
    await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtConfig0, 0);
    await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtProtect, 0);

    await loader.writeReg(C61_WATCHDOG_REGS.swdProtect, C61_WATCHDOG_REGS.swdKey);
    const swdConf = await loader.readReg(C61_WATCHDOG_REGS.swdConf);
    await loader.writeReg(C61_WATCHDOG_REGS.swdConf, swdConf | C61_WATCHDOG_REGS.swdAutoFeed);
    await loader.writeReg(C61_WATCHDOG_REGS.swdProtect, 0);
  };

  return chip;
}

async function detectChipWithC61Compat(loader: any, mode: 'usb_reset' | 'default_reset' | 'no_reset', onLog: (msg: string) => void) {
  await loader.detectChip(mode);
  if (loader.chip) return;

  const magic = (await loader.readReg(loader.CHIP_DETECT_MAGIC_REG_ADDR)) >>> 0;
  loader.onePageChipMagic = magic;
  onLog(`Chip magic: 0x${magic.toString(16)}`);
  if (ESP32_C61_EXTRA_MAGICS.has(magic)) {
    loader.chip = applyC61Compat(new ESP32C61ROM());
    onLog('Detected chip via compatibility map: ESP32-C61');
    return;
  }

  throw new Error(`Connected, but esptool-js could not detect chip magic 0x${magic.toString(16)}.`);
}

async function romFlashBeginCompat(loader: any, size: number, address: number, opts: FlashOpts): Promise<number> {
  const blockSize = loader.FLASH_WRITE_SIZE || 0x400;
  const blocks = Math.ceil(size / blockSize);
  const eraseExact = loader.chip.getEraseSize(address, size);
  const eraseSectorAligned = Math.ceil(eraseExact / 0x1000) * 0x1000;
  const timeout = loader.timeoutPerMb(loader.ERASE_REGION_TIMEOUT_PER_MB, size);

  const attempts = [
    { label: '5-word ESP_FLASH_BEGIN', eraseSize: eraseExact, encryptedFlag: true },
    { label: '4-word ESP_FLASH_BEGIN', eraseSize: eraseExact, encryptedFlag: false },
    { label: '4-word sector-aligned ESP_FLASH_BEGIN', eraseSize: eraseSectorAligned, encryptedFlag: false },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    let pkt = new Uint8Array(0);
    pkt = appendInt(loader, pkt, attempt.eraseSize);
    pkt = appendInt(loader, pkt, blocks);
    pkt = appendInt(loader, pkt, blockSize);
    pkt = appendInt(loader, pkt, address);
    if (attempt.encryptedFlag) {
      pkt = appendInt(loader, pkt, 0);
    }

    try {
      opts.onLog(
        `Entering ROM flash mode (${attempt.label}, erase ${attempt.eraseSize}, ${blocks} x ${blockSize}).`
      );
      await loader.checkCommand(
        'enter Flash download mode',
        loader.ESP_FLASH_BEGIN,
        pkt,
        undefined,
        undefined,
        timeout
      );
      return blocks;
    } catch (err) {
      lastError = err;
      opts.onLog(`ROM flash begin failed (${attempt.label}): ${(err as Error).message}`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Could not enter ROM flash mode.');
}

async function runC61Stub(loader: any, opts: FlashOpts): Promise<void> {
  opts.onLog('Uploading ESP32-C61 stub from esptool.py v4.11.0…');
  const segments = [
    { data: decodeBase64(c61Stub.text), offset: c61Stub.text_start },
    { data: decodeBase64(c61Stub.data), offset: c61Stub.data_start },
  ];

  for (const segment of segments) {
    const length = segment.data.length;
    const blocks = Math.ceil(length / loader.ESP_RAM_BLOCK);
    await loader.memBegin(length, blocks, loader.ESP_RAM_BLOCK, segment.offset);
    for (let seq = 0; seq < blocks; seq++) {
      const from = seq * loader.ESP_RAM_BLOCK;
      const to = from + loader.ESP_RAM_BLOCK;
      await loader.memBlock(segment.data.slice(from, to), seq);
    }
  }

  opts.onLog('Running esptool.py ESP32-C61 stub…');
  await loader.memFinish(c61Stub.entry);
  const packetResult = await loader.transport.read(loader.DEFAULT_TIMEOUT);
  const packetStr = String.fromCharCode(...packetResult);
  if (packetStr !== 'OHAI') {
    throw new Error(`Failed to start ESP32-C61 stub. Unexpected response ${packetStr}`);
  }

  loader.IS_STUB = true;
  opts.onLog('Stub running at full speed.');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function watchdogResetC61(loader: any, opts: FlashOpts): Promise<void> {
  opts.onLog('Hard resetting with watchdog…');
  await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtProtect, C61_WATCHDOG_REGS.rtcWdtKey);
  await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtConfig1, 2000);
  await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtConfig0, (1 << 31) | (5 << 28) | (1 << 8) | 2);
  await loader.writeReg(C61_WATCHDOG_REGS.rtcWdtProtect, 0);
  await sleep(700);
}

async function resetAfterFlash(loader: any, opts: FlashOpts): Promise<void> {
  const usingUsbJtag =
    typeof loader.chip.usesUsbJtagSerial === 'function' &&
    (await loader.chip.usesUsbJtagSerial(loader).catch(() => false));

  if (loader.IS_STUB && usingUsbJtag) {
    await watchdogResetC61(loader, opts);
    return;
  }

  await loader.after('hard_reset', false);
}

async function writeFlashViaRom(loader: any, data: Uint8Array, address: number, opts: FlashOpts): Promise<void> {
  opts.onLog('ROM loader does not support compressed writes here; writing uncompressed.');

  let image = padTo(data, 4);
  if (typeof loader._updateImageFlashParams === 'function') {
    image = await loader._updateImageFlashParams(image, address, 'keep', 'keep', 'keep');
  }

  const uncsize = image.length;
  const blocks = await romFlashBeginCompat(loader, uncsize, address, opts);
  const blockSize = loader.FLASH_WRITE_SIZE || 0x400;
  let bytesWritten = 0;

  opts.onProgress(0, uncsize);
  for (let seq = 0; seq < blocks; seq++) {
    const offset = seq * blockSize;
    const block = slicePaddedBlock(image, offset, blockSize);
    await loader.flashBlock(block, seq, loader.DEFAULT_TIMEOUT);
    bytesWritten = Math.min(offset + block.length, uncsize);
    opts.onProgress(bytesWritten, uncsize);
  }

  opts.onLog(`Wrote ${bytesWritten} bytes at 0x${address.toString(16)}.`);
}

export async function flash(opts: FlashOpts): Promise<void> {
  if (!('serial' in navigator)) {
    throw new NoSerialError('Web Serial unavailable');
  }

  // Prompt the user to pick the serial port (must be user-gesture initiated).
  const port = await navigator.serial.requestPort();
  const transport = new Transport(port, false);
  opts.onLog(`Selected port: ${transport.getInfo() || 'unknown USB serial device'}`);

  let loader: any = null;
  let connected = false;
  let lastError: any = null;

  // Try reset strategies sequentially:
  // 1. usb_reset: Essential for ESP32-C61 native USB-Serial-JTAG
  // 2. default_reset: Classic DTR/RTS auto-reset circuit
  // 3. no_reset: Direct sync without toggling pins
  const resetModes: ('usb_reset' | 'default_reset' | 'no_reset')[] = [
    'usb_reset',
    'default_reset',
    'no_reset',
  ];

  for (const mode of resetModes) {
    loader = new ESPLoader({
      transport,
      baudrate: 115200,
      romBaudrate: 115200,
      terminal: {
        clean: () => {},
        writeLine: (data: string) => opts.onLog(data),
        write: (data: string) => opts.onLog(data),
      },
    });

    try {
      opts.onLog(`Connecting (${mode})…`);
      await detectChipWithC61Compat(loader, mode, opts.onLog);
      opts.onLog(`Detected chip: ${loader.chip.CHIP_NAME}`);
      connected = true;
      break;
    } catch (err) {
      lastError = err;
      opts.onLog(`Connect failed (${mode}): ${(err as Error).message}`);
      try {
        await transport.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  if (!connected || !loader || !loader.chip) {
    try {
      await transport.disconnect();
    } catch {
      /* ignore */
    }
    throw new Error(
      lastError?.message ||
        'Could not connect to ESP32 device. Check the cable, or hold Next Page and press Reset.'
    );
  }

  try {
    try {
      const desc = await loader.chip.getChipDescription(loader);
      opts.onLog(`Connected: ${desc}`);
    } catch {
      opts.onLog(`Connected: ${loader.chip.CHIP_NAME}`);
    }

    loader.DEFAULT_TIMEOUT = 10000;
    if (typeof loader.chip.postConnect === 'function') {
      opts.onLog('Running post-connect setup…');
      await loader.chip.postConnect(loader);
    }

    const shouldSkipStub = ESP32_C61_STUB_UNSUPPORTED_MAGICS.has(loader.onePageChipMagic);
    if (shouldSkipStub) {
      opts.onLog('Skipping flasher stub for this ESP32-C61 ROM revision; using slower ROM loader.');
      if (loader.chip.FLASH_WRITE_SIZE) {
        loader.FLASH_WRITE_SIZE = loader.chip.FLASH_WRITE_SIZE;
        opts.onLog(`Using ROM flash block size: ${loader.FLASH_WRITE_SIZE} bytes.`);
      }
    } else {
      opts.onLog('Uploading flasher stub to RAM…');
      if (loader.onePageChipMagic === 0x5de1706f) {
        await runC61Stub(loader, opts);
      } else {
        await loader.runStub();
        opts.onLog('Stub running at full speed.');
      }
    }

    opts.onLog('Downloading firmware image…');
    const response = await fetch(opts.binUrl);
    if (!response.ok) {
      throw new Error(`Could not download firmware image: HTTP ${response.status}`);
    }
    const bin = new Uint8Array(await response.arrayBuffer());
    opts.onLog(`Downloaded ${bin.length} bytes.`);

    if (loader.IS_STUB) {
      opts.onLog('Writing flash memory…');
      await loader.writeFlash({
        fileArray: [{ data: bin, address: opts.offset }],
        flashSize: 'keep',
        flashMode: 'keep',
        flashFreq: 'keep',
        compress: true,
        eraseAll: false,
        reportProgress: (_i: number, written: number, total: number) => {
          opts.onProgress(written, total);
        },
      });
    } else {
      opts.onLog('Writing flash memory with ROM loader…');
      await writeFlashViaRom(loader, bin, opts.offset, opts);
    }

    opts.onLog('Rebooting…');
    await resetAfterFlash(loader, opts);
  } finally {
    // Always release the port so a retry (or another app) can reopen it.
    try {
      await transport.disconnect();
    } catch {
      /* ignore */
    }
  }
}
