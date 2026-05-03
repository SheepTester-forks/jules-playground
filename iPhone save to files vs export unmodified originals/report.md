# Analysis of Byte Differences: iPhone "Save to Files" vs "Export Unmodified Originals"

This report details the investigation into byte-wise differences between image pairs extracted from two archives.

## Archive 1: IMG_0108 (iMessage Photo)

**Files:**
- `IMG_0108.jpg` (Save to Files)
- `IMG_0108 2.JPG` (Export Unmodified Originals)

### Findings:
1.  **Re-encoding:** Contrary to the expectation that these might be byte-identical, `IMG_0108.jpg` (Save to Files) appears to be a re-encoded version of the original. The filesizes differ significantly (1.72 MB vs 1.80 MB), and binary comparison shows differences throughout the file, including the image data blocks.
2.  **Metadata Differences:**
    *   **Orientation:** The "Export Unmodified" version has an Orientation tag of "Rotated 180", while the "Save to Files" version is "Horizontal (normal)". This indicates that "Save to Files" likely applied the rotation and re-encoded the image.
    *   **Thumbnail:** The "Export Unmodified" version contains a JPEG thumbnail in its EXIF metadata, which is missing in the "Save to Files" version.
    *   **GPS Data:** Both versions **contain GPS data**. The hypothesis that location was stripped in the "Save to Files" version was **not supported** by the metadata analysis; both files have identical GPS coordinates.
3.  **Structure:** `IMG_0108.jpg` includes a JFIF header (`FFE0`), which is typical of many JPEG encoders but often omitted in camera-original EXIF-JPEGs.

## Archive 2: IMG_0229 (Plane Camera Photo)

**Files:**
- `IMG_0229.HEIC` (Save to Files)
- `IMG_0229 2.HEIC` (Export Unmodified Originals)

### Findings:
1.  **Time Zone/Offset:** The hypothesis regarding time zone adjustment was **confirmed**.
    *   `IMG_0229.HEIC` (Save to Files) has an EXIF `OffsetTime` of `+02:00`.
    *   `IMG_0229 2.HEIC` (Export Unmodified) has an EXIF `OffsetTime` of `-07:00`.
    *   The `DateTimeOriginal` and `DateTimeDigitized` fields are also shifted by 9 hours (09:50:02 vs 00:50:02), reflecting the change in offset.
2.  **Binary Differences:** The files are nearly identical in size, but binary differences are present in the metadata section (starting at offset `0x472`) and throughout the file. HEIC files often encapsulate metadata and image items in a way that shifting even a few bytes of metadata can cause offsets in the rest of the file's structure.

## Summary of Hypotheses

| Archive | Initial Hypothesis | Finding |
| :--- | :--- | :--- |
| Archive 1 | Location stripped in "Save to Files" | **Incorrect.** Location was preserved, but the image was re-encoded and orientation was baked in. |
| Archive 2 | Time zone retroactively fixed | **Correct.** The "Save to Files" version has a different time offset and local time. |

## Proof of Work
The following scripts were used for analysis:
- `analyze_archive1.py`: Detailed EXIF comparison for Archive 1.
- `analyze_archive2.py`: Detailed EXIF comparison for Archive 2.
- `analyze_img_3592.py`: Comparison script for IMG_3592 metadata and binary data.
- `compare_binary.py`: Binary difference location and magnitude analysis.

## Archive 3: IMG_3592 (Outdoor Photo)

**Files:**
- `IMG_3592.jpg` (Save to Files)
- `IMG_3592.JPG` (Export Unmodified Originals)

### Findings:
1.  **Re-encoding:** Similar to Archive 1, "Save to Files" re-encoded the image. The filesizes differ (2.93 MB for Save to Files vs 2.92 MB for Unmodified). Binary comparison shows differences starting from the metadata header and continuing throughout the file, indicating a full re-compression.
2.  **JFIF Header:** Both files surprisingly contain a JFIF header. Usually, camera-original JPEGs skip the JFIF marker in favor of EXIF, but iPhone 17 (per metadata) seems to include both in some cases, or the "Unmodified Original" in this instance also had it.
3.  **Metadata Stripping:**
    *   **Thumbnail:** The "Export Unmodified" version contains a JPEG thumbnail (approx 30KB), which is completely removed in the "Save to Files" version.
    *   **MakerNotes:** Several Apple-specific MakerNote tags were removed or altered. Notably, Tag `0x005E` (which contains a `bplist` identifying internal camera state) is present in the unmodified version but missing in the "Save to Files" version.
4.  **Preservation:** GPS data, Orientation, and Timestamps were preserved identically between both versions.

## Archive 4: IMG_8099 (HEIC Photo)

**Files:**
- `save to files/IMG_8099.HEIC`
- `export unmodified originals/IMG_8099.HEIC`

### Findings:
1.  **Time Zone/Offset:** Similar to Archive 2, the time zone was adjusted.
    *   `save to files` version: `OffsetTime` is `-04:00`, local time is `21:40:54`.
    *   `export unmodified` version: `OffsetTime` is `-07:00`, local time is `18:40:54`.
2.  **Subsecond Data:** The "Save to Files" version contains `SubSecTime` (538), which is missing in the "Export Unmodified" version.
3.  **Metadata Stripping & Addition:**
    *   **MakerNote Tag 0x005E:** Present in the unmodified version but stripped in the "Save to Files" version (consistent with Archive 3).
    *   **Tiling Metadata:** The "Save to Files" version includes `TileWidth` and `TileLength` tags which are absent in the unmodified version.
4.  **Binary Comparison:** The files are not identical. The "Save to Files" version is slightly larger (1846170 vs 1846152 bytes). Binary differences start early at offset `0x28`.
5.  **HEIF Structure & Image Data:**
    *   **Box Analysis:** Both files have a standard `ftyp` -> `meta` -> `mdat` structure, but the content of every box differs.
    *   **Pixel Data:** Comparison using Pillow confirms that **pixel data is IDENTICAL** when decoded.
    *   **Compressed Bitstream (mdat):** Despite the identical pixels, the `mdat` boxes (which hold the compressed image data) are **99.62% different** in terms of byte-for-byte matching. This confirms that "Save to Files" doesn't just swap metadata; it repacks the entire HEIF container, which substantially shifts or re-encodes the compressed bitstream, even though the final decoded visual information remains unchanged.
