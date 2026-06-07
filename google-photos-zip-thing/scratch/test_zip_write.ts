import { ZipReader, ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from "https://deno.land/x/zipjs@v2.7.34/index.js";

const zipData = await Deno.readFile("Photos-3-001.zip");
const zipReader = new ZipReader(new Uint8ArrayReader(zipData));
const entries = await zipReader.getEntries();

// Let's take the first entry
const firstEntry = entries[0];
console.log(`Original first entry: ${firstEntry.filename}, time: ${firstEntry.lastModDate}`);

// Write to a new zip
const outWriter = new Uint8ArrayWriter();
const zipWriter = new ZipWriter(outWriter);

// Let's read the data of the first entry
const entryData = await firstEntry.getData(new Uint8ArrayWriter());

// We set the lastModDate to a specific test date
const testDate = new Date("2025-05-23T18:13:00-07:00");
console.log(`Setting lastModDate to: ${testDate.toString()} (UTC: ${testDate.toUTCString()})`);

await zipWriter.add(firstEntry.filename, new Uint8ArrayReader(entryData), {
  lastModDate: testDate,
});

await zipWriter.close();
await zipReader.close();

// Read it back and check the date
const newZipData = outWriter.getData();
const verifyReader = new ZipReader(new Uint8ArrayReader(newZipData));
const verifyEntries = await verifyReader.getEntries();
console.log(`Written first entry: ${verifyEntries[0].filename}, time: ${verifyEntries[0].lastModDate}`);
await verifyReader.close();
