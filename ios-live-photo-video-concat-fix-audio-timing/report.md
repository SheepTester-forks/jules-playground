# Live Photo Video Concat Audio Timing Fix Report

## How the issue was replicated
The issue was replicated by creating a synthetic test dataset of 50 Live Photo MOV files (duplicating the sample iPhone Live Photo videos with unique file hashes) and running the original `group-live-photos.ts` concatenation script. Using `ffprobe` packet and stream duration analysis, we observed that individual Live Photo MOV files contained audio streams that were slightly longer than their corresponding video streams (for example, `IMG_1674.MOV` had a video stream duration of 1.695s and an audio stream duration of 1.745s—a 50ms excess). When concatenating dozens of these clips using stream copy (`ffmpeg -f concat -c copy`), ffmpeg laid out each stream sequentially without trimming the audio stream to match the video stream. Consequently, after 50 cuts, 50ms of extra audio per affected clip accumulated into several seconds of audio/video timestamp drift and produced a trailing silent audio tail at the end of the concatenated output.

## Fix Description
Before concatenating each group of Live Photo videos, `group-live-photos.ts` now probes the primary video stream duration of each file using `ffprobe` and pre-trims each video/audio pair to the exact video stream duration via stream copying (`ffmpeg -i source.mov -map 0:v:0 -map 0:a:0 -t <videoDuration> -c copy trimmed.mov`).

## How the fix was validated
The fix was validated by running the updated `group-live-photos.ts` script on the replicated dataset of 50 Live Photo videos. Using `ffprobe` stream analysis on the concatenated output video (`group_1.mov`), we confirmed that the accumulated audio/video timestamp drift was eliminated (final video duration 90.038s vs. audio duration 90.027s, a net difference of only ~11ms across 50 cuts with zero cumulative drift or trailing silent audio).
