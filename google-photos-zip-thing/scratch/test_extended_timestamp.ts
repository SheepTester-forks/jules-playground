import { ZipReader, ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from "https://deno.land/x/zipjs@v2.7.34/index.js";

const zipData = await Deno.readFile("Photos-3-001.zip");
const zipReader = new ZipReader(new Uint8ArrayReader(zipData));
const entries = await zipReader.getEntries();
const entryData = await entries[0].getData(new Uint8ArrayWriter());
await zipReader.close();

// Let's try writing with different options
const outWriter = new Uint8ArrayWriter();
const zipWriter = new ZipWriter(outWriter);

const testDate = new Date("2025-05-23T18:13:00-07:00");

// Let's see if options like extendedTimestamp or utcOnly are supported
await zipWriter.add("test.mp4", new Uint8ArrayReader(entryData), {
  lastModDate: testDate,
  // We can pass options and see if they are type-checked or work
  // @ts-ignore
  extendedTimestamp: false,
});

await zipWriter.close();

// Read it back and check
const verifyReader = new ZipReader(new Uint8ArrayReader(outWriter.getData()));
const verifyEntries = await verifyReader.getEntries();
const verifyEntry = verifyEntries[0];
console.log("Written entry properties:");
console.log(`  lastModDate: ${verifyEntry.lastModDate}`);
console.log(`  rawLastModDate: ${verifyEntry.rawLastModDate}`);
console.log(`  extraField:`, verifyEntry.extraField);
console.log(`  extraFieldExtendedTimestamp:`, verifyEntry.extraFieldExtendedTimestamp);
console.log(`  extraFieldNTFS:`, verifyEntry.extraFieldNTFS);
await verifyReader.close();
