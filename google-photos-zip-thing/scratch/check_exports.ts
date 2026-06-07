import * as zip from "https://deno.land/x/zipjs@v2.7.34/index.js";

console.log("Exported keys:");
console.log(Object.keys(zip));

// Print details of some promising export classes
for (const key of Object.keys(zip)) {
  if (key.toLowerCase().includes("writer") || key.toLowerCase().includes("reader") || key.toLowerCase().includes("stream")) {
    console.log(`- ${key}:`, typeof (zip as any)[key]);
  }
}
