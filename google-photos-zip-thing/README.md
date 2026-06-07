# Google Photos ZIP Timestamp Restorer

This directory contains a solution to fix missing photo/video timestamps in Google Photos Takeout archives before reuploading them (e.g. to bypass storage limits using a Pixel device).

## Background & Problem Statement
- **Problem**: When downloading photos from Google Photos UI as a ZIP (`Photos-3-001.zip`), Google Photos does not preserve metadata/timestamps on files that lack embedded EXIF date/time. When reuploaded, they default to "today" on Google Photos, breaking chronological order.
- **Source Data**: 
  - `photos.txt` has 50 manually curated entries (including exact local times and timezone offsets) copied from the Google Photos UI.
  - There are 8 duplicate `RECAP.mp4` instances in `photos.txt` which correspond to `RECAP.mp4`, `RECAP(1).mp4`, `RECAP(2).mp4` ... `RECAP(7).mp4` in the ZIP archive in sequential order.
- **Verification**: We verified that:
  - There are exactly 50 photo entries in `photos.txt`.
  - There are exactly 50 files in the ZIP archive.
  - All entries map perfectly, with no extra photos or extra timing entries.

## How to Run the Restorer

Run the script using Deno:

```sh
deno run --allow-read=. --allow-write=. fix_zip_timings.ts
```

This will output `Photos-3-001-fixed.zip` which contains the same 50 files but with corrected MS-DOS timestamps matching the local timings in `photos.txt`.

## How the Restorer Works

1. **Alignment & Mapping**: Maps entries in `photos.txt` to ZIP filenames. Duplicates like `RECAP.mp4` are mapped sequentially (e.g., `RECAP.mp4` -> `RECAP.mp4`, next -> `RECAP(1).mp4`, and so on).
2. **Missing Year Resolution**: For entries without a year (e.g., `Apr 17` when taken in the current year 2026), the script extracts the year from the filename (e.g., `PXL_20260417_...` -> `2026`).
3. **MS-DOS Local Time Preservation**: Creates a Javascript `Date` using local time components on the executing machine. Since `zipjs` reads these local components when encoding MS-DOS time, the encoded timestamp inside the ZIP will represent the correct local time of the photo, regardless of what timezone the Deno script is executed under.
4. **Streaming Compression**: Reads files dynamically using custom `DenoFileReader` / `DenoFileWriter` stream classes to perform the process with a negligible memory footprint (max ~23MB for the largest file instead of buffer loading the 578MB ZIP).

## Directory Structure
- [fix_zip_timings.ts](file:///home/sheep/remove-if-unused/jules-playground/google-photos-zip-thing/fix_zip_timings.ts): The main restore script.
- [photos.txt](file:///home/sheep/remove-if-unused/jules-playground/google-photos-zip-thing/photos.txt): Manually curated timestamp entries.
- [scratch/](file:///home/sheep/remove-if-unused/jules-playground/google-photos-zip-thing/scratch/): Exploration and test scripts used during development.
