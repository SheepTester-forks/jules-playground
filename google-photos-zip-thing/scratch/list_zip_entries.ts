import { ZipReader, Uint8ArrayReader } from "https://deno.land/x/zipjs@v2.7.34/index.js";

const zipData = await Deno.readFile("Photos-3-001.zip");
const zipReader = new ZipReader(new Uint8ArrayReader(zipData));

const entries = await zipReader.getEntries();
console.log(`Zip has ${entries.length} entries:`);

for (const entry of entries) {
  console.log(`- ${entry.filename} (directory: ${entry.directory}, size: ${entry.uncompressedSize}, time: ${entry.lastModDate})`);
}

await zipReader.close();
