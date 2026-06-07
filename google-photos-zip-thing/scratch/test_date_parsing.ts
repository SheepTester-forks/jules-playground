// Test script to parse dates and offsets
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

const months: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

function parseEntryDate(entry: PhotoEntry): Date {
  // Parse date line
  const dateMatch = entry.dateStr.match(/^([A-Za-z]{3})\s+(\d{1,2})(?:,\s+(\d{4}))?$/);
  if (!dateMatch) {
    throw new Error(`Failed to parse date: "${entry.dateStr}"`);
  }
  const monthStr = dateMatch[1];
  const day = parseInt(dateMatch[2], 10);
  let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : null;

  if (year === null) {
    // Try to extract year from filename, e.g. PXL_20260417_...
    const fileDateMatch = entry.filename.match(/20\d{6}/);
    if (fileDateMatch) {
      year = parseInt(fileDateMatch[0].substring(0, 4), 10);
    } else {
      year = 2026; // Fallback to current year
    }
  }

  const month = months[monthStr];
  if (!month) {
    throw new Error(`Invalid month: "${monthStr}"`);
  }

  // Parse time line
  // Example: Fri, 6:13 PMGMT-07:00
  // Character 8239 is narrow no-break space. We normalize whitespace.
  const normalizedTimeStr = entry.timeStr.replace(/\s+/g, ' ').replace(/\u202f/g, ' ');
  const timeMatch = normalizedTimeStr.match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*GMT([+-]\d{2}):(\d{2})$/i);
  if (!timeMatch) {
    throw new Error(`Failed to parse time: "${entry.timeStr}" (normalized: "${normalizedTimeStr}")`);
  }

  let hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const ampm = timeMatch[3].toUpperCase();
  const tzSign = timeMatch[4][0];
  const tzHour = parseInt(timeMatch[4].substring(1), 10);
  const tzMin = parseInt(timeMatch[5], 10);

  if (ampm === "PM" && hour < 12) {
    hour += 12;
  } else if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  // Construct Date object in UTC
  // We can format a ISO 8601 string: YYYY-MM-DDTHH:mm:00[+-]HH:mm
  const yearPad = year.toString().padStart(4, '0');
  const monthPad = month.toString().padStart(2, '0');
  const dayPad = day.toString().padStart(2, '0');
  const hourPad = hour.toString().padStart(2, '0');
  const minPad = minute.toString().padStart(2, '0');
  const tzOffset = `${tzSign}${tzHour.toString().padStart(2, '0')}:${tzMin.toString().padStart(2, '0')}`;

  const isoStr = `${yearPad}-${monthPad}-${dayPad}T${hourPad}:${minPad}:00${tzOffset}`;
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Date created from ISO string: "${isoStr}"`);
  }
  return date;
}

for (let idx = 0; idx < entries.length; idx++) {
  const entry = entries[idx];
  const date = parseEntryDate(entry);
  console.log(`${(idx+1).toString().padStart(2, '0')}: File: ${entry.filename.padEnd(50)} | UTC: ${date.toUTCString()} | Local: ${date.toString()}`);
}
