// Exploration script to parse photos.txt
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

console.log(`Parsed ${entries.length} entries.`);

// Inspect characters in the first timeStr
if (entries.length > 0) {
  const firstTime = entries[0].timeStr;
  console.log(`First timeStr: "${firstTime}"`);
  console.log("Characters:");
  for (let i = 0; i < firstTime.length; i++) {
    const char = firstTime[i];
    const code = firstTime.charCodeAt(i);
    console.log(`  [${i}]: '${char}' (code: ${code})`);
  }
}

// Print all parsed entries for inspection
for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  console.log(`${i+1}: ${entry.dateStr} | ${entry.timeStr} | ${entry.filename}`);
}
