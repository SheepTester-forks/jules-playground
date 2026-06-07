import { ZipReader, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.34/index.js";

// Read and parse photos.txt
const content = await Deno.readTextFile("photos.txt");
const lines = content.split(/\r?\n/);

interface PhotoEntry {
  dateStr: string;
  timeStr: string;
  filename: string;
  extra: string;
}

const entries: PhotoEntry[] = [];
for (let i = 0; i < lines.length; i += 5) {
  if (i + 3 >= lines.length) break;
  const dateStr = lines[i].trim();
  const timeStr = lines[i+1].trim();
  const filename = lines[i+2].trim();
  const extra = lines[i+3].trim();
  if (dateStr || timeStr || filename || extra) {
    entries.push({ dateStr, timeStr, filename, extra });
  }
}

// Read ZIP entries
const zipData = await Deno.readFile("Photos-3-001.zip");
const zipReader = new ZipReader(new Uint8ArrayReader(zipData));
const zipEntries = await zipReader.getEntries();
await zipReader.close();

console.log(`Number of entries in photos.txt: ${entries.length}`);
console.log(`Number of files in ZIP: ${zipEntries.length}`);

// Map entries from photos.txt to ZIP entries
const mappedZipFiles = new Set<string>();
const mappingErrors: string[] = [];

// To map RECAP.mp4, we keep track of how many we've seen
let recapCount = 0;

for (let idx = 0; idx < entries.length; idx++) {
  const entry = entries[idx];
  let targetZipName = entry.filename;
  if (targetZipName === "RECAP.mp4") {
    if (recapCount === 0) {
      targetZipName = "RECAP.mp4";
    } else {
      targetZipName = `RECAP(${recapCount}).mp4`;
    }
    recapCount++;
  }

  // Find if there is a zip entry with this name
  const found = zipEntries.find(ze => ze.filename === targetZipName);
  if (found) {
    mappedZipFiles.add(targetZipName);
  } else {
    mappingErrors.push(`Entry ${idx+1} (${entry.filename} -> ${targetZipName}) not found in ZIP.`);
  }
}

console.log(`Successfully mapped ZIP files: ${mappedZipFiles.size}`);

// Find any ZIP files that weren't mapped
const extraZipFiles: string[] = [];
for (const ze of zipEntries) {
  if (!mappedZipFiles.has(ze.filename)) {
    extraZipFiles.push(ze.filename);
  }
}

if (mappingErrors.length > 0) {
  console.log("Mapping errors:");
  for (const err of mappingErrors) {
    console.log(`  - ${err}`);
  }
}

if (extraZipFiles.length > 0) {
  console.log("ZIP files not associated with any photos.txt entry:");
  for (const f of extraZipFiles) {
    console.log(`  - ${f}`);
  }
}

if (entries.length === 50 && zipEntries.length === 50 && mappingErrors.length === 0 && extraZipFiles.length === 0) {
  console.log("\nCONFIRMED:");
  console.log("- There are exactly 50 photos.");
  console.log("- There are no extra photos nor extra timing entries.");
} else {
  console.log("\nWARNING: Validation failed!");
}
