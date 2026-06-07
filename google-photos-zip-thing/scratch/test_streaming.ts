import { ZipReader, ZipWriter, Reader, Writer, Uint8ArrayReader, Uint8ArrayWriter } from "https://deno.land/x/zipjs@v2.7.34/index.js";

class DenoFileReader extends Reader {
  constructor(private file: Deno.FsFile, public size: number) {
    super();
  }

  async readUint8Array(offset: number, length: number): Promise<Uint8Array> {
    await this.file.seek(offset, Deno.SeekMode.Start);
    const buffer = new Uint8Array(length);
    let bytesRead = 0;
    while (bytesRead < length) {
      const n = await this.file.read(buffer.subarray(bytesRead));
      if (n === null) break;
      bytesRead += n;
    }
    return buffer.subarray(0, bytesRead);
  }
}

class DenoFileWriter extends Writer {
  constructor(private file: Deno.FsFile) {
    super();
    this.size = 0;
  }

  async writeUint8Array(data: Uint8Array): Promise<void> {
    let bytesWritten = 0;
    while (bytesWritten < data.length) {
      const n = await this.file.write(data.subarray(bytesWritten));
      bytesWritten += n;
    }
    this.size += data.length;
  }
}

// Test by reading the first entry and writing it to a new file using streaming
const inFile = await Deno.open("Photos-3-001.zip", { read: true });
const stat = await inFile.stat();
const reader = new DenoFileReader(inFile, stat.size);

const zipReader = new ZipReader(reader);
const entries = await zipReader.getEntries();
const entry = entries[0];
console.log(`First entry: ${entry.filename}, size: ${entry.uncompressedSize}`);

const outFile = await Deno.open("scratch/test_stream_out.zip", { write: true, create: true, truncate: true });
const writer = new DenoFileWriter(outFile);
const zipWriter = new ZipWriter(writer);

const entryData = await entry.getData(new Uint8ArrayWriter());
console.log(`Extracted ${entry.filename} data into memory: ${entryData.length} bytes.`);

await zipWriter.add(entry.filename, new Uint8ArrayReader(entryData), {
  lastModDate: new Date(),
  extendedTimestamp: false,
});

await zipWriter.close();
await zipReader.close();
inFile.close();
outFile.close();
console.log("Success!");
