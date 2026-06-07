I have 500 MB of photos/videos on Google Photos that are taking up storage. I can bypass the storage limit by downloading them (Photos-3-001.zip), deleting them, then reuploading them on my Pixel.

However, it looks like the zip file of photos did not preserve the timing on Google Photos, and since some photos don't have timings in their EXIF data, when reuploaded, Google Photos will move them to today, which isn't ideal.

I have manually went through and copy-pasted the timings and file names from the Google Photos UI into photos.txt.

Note: There are apparently 8 instances of RECAP.mp4. I have checked, and they seem to correspond to RECAP.mp4, RECAP (1).mp4, RECAP (2).mp4, and so on inside the zip file, in order based on photos.txt.

Please confirm:

- There are 50 photos
- There are no extra photos nor extra timing entries

Deliverable:

- A Node TypeScript script that I can run with

  ```sh
  node insert-name-here.ts
  ```

  and will output a new zip file with the correct zip entry timings.
