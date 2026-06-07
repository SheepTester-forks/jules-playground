import { ZipReader, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.34/index.js";

const zipData = await Deno.readFile("Photos-3-001.zip");
const zipReader = new ZipReader(new Uint8ArrayReader(zipData));
const entries = await zipReader.getEntries();

console.log("Original ZIP file entries:");
for (let i = 0; i < Math.min(3, entries.length); i++) {
  const entry = entries[i];
  console.log(`Entry: ${entry.filename}`);
  console.log(`  lastModDate: ${entry.lastModDate}`);
  console.log(`  raw lastModDate (MS-DOS): ${entry.rawLastModDate}`);
  // Let's inspect the entry object properties
  console.log(`  Keys:`, Object.keys(entry));
  // In zipjs, raw extra fields are sometimes parsed or available
  // Let's see if we can find extra fields
  // @ts-ignore
  console.log(`  extraField:`, entry.extraField);
}
await zipReader.close();
