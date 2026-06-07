import { Writer, Reader } from "https://deno.land/x/zipjs@v2.7.34/index.js";

console.log("Writer properties:");
console.log(Object.getOwnPropertyNames(Writer.prototype));
console.log("Writer constructor arguments:");
console.log(Writer.toString());

console.log("Reader properties:");
console.log(Object.getOwnPropertyNames(Reader.prototype));
console.log("Reader constructor arguments:");
console.log(Reader.toString());

// Let's create an instance of Writer and see its properties
const w = new Writer();
console.log("Writer instance keys:", Object.keys(w));
console.log("Writer instance values:", w);
