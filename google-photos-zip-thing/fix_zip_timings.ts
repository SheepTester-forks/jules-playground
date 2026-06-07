import {
  ZipReader,
  ZipWriter,
  Reader,
  Writer,
  Uint8ArrayReader,
  Uint8ArrayWriter,
} from "https://deno.land/x/zipjs@v2.7.34/index.js";

// Custom Reader for Deno FsFile to support streaming zip reading
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

// Custom Writer for Deno FsFile to support streaming zip writing
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

interface PhotoEntry {
  dateStr: string;
  timeStr: string;
  filename: string;
  extra: string;
}

const months: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

// Parse date and time from the photos.txt structure and construct a Date representing
// the local time in the executing system's local time zone, so that zipjs encodes
// exactly the correct local time fields in the MS-DOS timestamp.
function parseEntryDate(entry: PhotoEntry, mappedZipName: string): Date {
  const dateMatch = entry.dateStr.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:,\s+(\d{4}))?$/);
  if (!dateMatch) {
    throw new Error(`Failed to parse date: "${entry.dateStr}"`);
  }
  const monthStr = dateMatch[1];
  const day = parseInt(dateMatch[2], 10);
  let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : null;

  // If the year is missing (e.g. current year), try extracting it from the filename
  if (year === null) {
    const fileDateMatch = mappedZipName.match(/20\d{6}/);
    if (fileDateMatch) {
      year = parseInt(fileDateMatch[0].substring(0, 4), 10);
    } else {
      year = 2026; // Default fallback to current year
    }
  }

  const month = months[monthStr];
  if (!month) {
    throw new Error(`Invalid month: "${monthStr}"`);
  }

  const normalizedTimeStr = entry.timeStr.replace(/\s+/g, ' ').replace(/\u202f/g, ' ');
  const timeMatch = normalizedTimeStr.match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT([+-]\d{2}):(\d{2})$/i);
  if (!timeMatch) {
    throw new Error(`Failed to parse time: "${entry.timeStr}"`);
  }

  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3].toUpperCase();

  if (ampm === "PM" && hour < 12) {
    hour += 12;
  } else if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  return new Date(year, month - 1, day, hour, minute, 0);
}

async function main() {
  const inputZipPath = "Photos-3-001.zip";
  const outputZipPath = "Photos-3-001-fixed.zip";
  const textFilePath = "photos.txt";

  console.log("=========================================");
  console.log("Google Photos ZIP Timestamp Restorer");
  console.log("=========================================");

  // 1. Read and parse photos.txt
  console.log(`Reading ${textFilePath}...`);
  let textContent = "";
  try {
    textContent = await Deno.readTextFile(textFilePath);
  } catch (err) {
    console.error(`Error: Could not read ${textFilePath}:`, err.message);
    Deno.exit(1);
  }

  const lines = textContent.split(/\r?\n/);
  const entries: PhotoEntry[] = [];
  for (let i = 0; i < lines.length; i += 5) {
    if (i + 3 >= lines.length) break;
    const dateStr = lines[i].trim();
    const timeStr = lines[i + 1].trim();
    const filename = lines[i + 2].trim();
    const extra = lines[i + 3].trim();
    if (dateStr || timeStr || filename || extra) {
      entries.push({ dateStr, timeStr, filename, extra });
    }
  }

  console.log(`Parsed ${entries.length} photo entries from ${textFilePath}.`);
  if (entries.length !== 50) {
    console.warn(`Warning: Expected 50 photo entries, but found ${entries.length}.`);
  }

  // 2. Open input ZIP and read entries
  console.log(`Opening input archive ${inputZipPath}...`);
  let inFile: Deno.FsFile;
  try {
    inFile = await Deno.open(inputZipPath, { read: true });
  } catch (err) {
    console.error(`Error: Could not open ${inputZipPath}:`, err.message);
    Deno.exit(1);
  }

  const stat = await inFile.stat();
  const reader = new DenoFileReader(inFile, stat.size);
  const zipReader = new ZipReader(reader);
  const zipEntries = await zipReader.getEntries();

  console.log(`Found ${zipEntries.length} entries inside the ZIP.`);
  if (zipEntries.length !== 50) {
    console.warn(`Warning: Expected 50 files in the ZIP, but found ${zipEntries.length}.`);
  }

  // 3. Map entries from photos.txt to ZIP filenames
  const mappedFiles: Array<{ entry: PhotoEntry; zipEntry: any; targetZipName: string }> = [];
  let recapCount = 0;

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    let targetZipName = entry.filename;
    
    // Map multiple RECAP.mp4 instances sequentially to RECAP.mp4, RECAP(1).mp4, RECAP(2).mp4, etc.
    if (targetZipName === "RECAP.mp4") {
      if (recapCount === 0) {
        targetZipName = "RECAP.mp4";
      } else {
        targetZipName = `RECAP(${recapCount}).mp4`;
      }
      recapCount++;
    }

    const zipEntry = zipEntries.find((ze) => ze.filename === targetZipName);
    if (!zipEntry) {
      console.error(`Error: Could not find ZIP entry for mapped filename: ${targetZipName}`);
      zipReader.close();
      inFile.close();
      Deno.exit(1);
    }

    mappedFiles.push({ entry, zipEntry, targetZipName });
  }

  console.log("Successfully aligned all entries between photos.txt and the ZIP archive.");

  // 4. Create the output ZIP file
  console.log(`Creating output archive ${outputZipPath}...`);
  let outFile: Deno.FsFile;
  try {
    outFile = await Deno.open(outputZipPath, { write: true, create: true, truncate: true });
  } catch (err) {
    console.error(`Error: Could not create ${outputZipPath}:`, err.message);
    zipReader.close();
    inFile.close();
    Deno.exit(1);
  }

  const writer = new DenoFileWriter(outFile);
  const zipWriter = new ZipWriter(writer);

  // 5. Process entries one by one, streaming data
  console.log("Starting writing files with updated timestamps...");
  for (let i = 0; i < mappedFiles.length; i++) {
    const { entry, zipEntry, targetZipName } = mappedFiles[i];
    const targetDate = parseEntryDate(entry, targetZipName);

    console.log(
      `[${(i + 1).toString().padStart(2, "0")}/50] Restoring ${targetZipName.padEnd(50)} -> Time: ${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, "0")}-${targetDate.getDate().toString().padStart(2, "0")} ${targetDate.getHours().toString().padStart(2, "0")}:${targetDate.getMinutes().toString().padStart(2, "0")}`
    );

    // Extract file data into memory
    const data = await zipEntry.getData(new Uint8ArrayWriter());

    // Write to the output ZIP with the corrected date
    await zipWriter.add(targetZipName, new Uint8ArrayReader(data), {
      lastModDate: targetDate,
      extendedTimestamp: false,
    });
  }

  // 6. Finalize
  console.log("Finalizing ZIP archive headers...");
  await zipWriter.close();
  await zipReader.close();
  inFile.close();
  outFile.close();

  console.log("=========================================");
  console.log("Success! Created corrected archive:");
  console.log(`- Path: ${outputZipPath}`);
  console.log("All entries restored with correct local timestamps.");
  console.log("=========================================");
}

if (import.meta.main) {
  await main();
}
