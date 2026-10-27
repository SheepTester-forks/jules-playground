# Live Photo Video Concat Audio Timing Fix Report

## How the issue was replicated
The issue was replicated by creating a synthetic test dataset of 50 Live Photo MOV files (duplicating the sample iPhone Live Photo videos with unique file hashes) and running the original `group-live-photos.ts` concatenation script. Using `ffprobe` packet and stream duration analysis, we observed that individual Live Photo MOV files contained audio streams that were slightly longer than their corresponding video streams (for example, `IMG_1674.MOV` had a video stream duration of 1.695s and an audio stream duration of 1.745s—a 50ms excess). When concatenating dozens of these clips using stream copy (`ffmpeg -f concat -c copy`), ffmpeg laid out each stream sequentially without trimming the audio stream to match the video stream. Consequently, after 50 cuts, 50ms of extra audio per affected clip accumulated into several seconds of audio/video timestamp drift and produced a trailing silent audio tail at the end of the concatenated output.

## Fix Description
Before concatenating each group of Live Photo videos, `group-live-photos.ts` now probes the primary video stream duration of each file using `ffprobe` and pre-trims each video/audio pair to the exact video stream duration via stream copying (`ffmpeg -i source.mov -map 0:v:0 -map 0:a:0 -t <videoDuration> -c copy trimmed.mov`).

## How the fix was validated
The fix was validated by running the updated `group-live-photos.ts` script on the replicated dataset of 50 Live Photo videos. Using `ffprobe` stream analysis on the concatenated output video (`group_1.mov`), we confirmed that the accumulated audio/video timestamp drift was eliminated (final video duration 90.038s vs. audio duration 90.027s, a net difference of only ~11ms across 50 cuts with zero cumulative drift or trailing silent audio).

# iOS Live Photo Video Concat Audio Timing Fix - Report

## How the Issue Was Replicated
1. **Root Cause Analysis:**
   In iOS Live Photo `.MOV` files, individual video and audio streams inside each container frequently end with slightly different stream packet durations (e.g., video stream ending several frames short of the audio or container duration). When `ffmpeg` concatenates these videos using stream copy (`-c copy`), the concat demuxer calculates timeline offsets separately for each stream based on packet durations rather than container bounds. Over dozens of concatenated clips (e.g., 50 Live Photos), audio and video streams accumulate timeline drift (exceeding ~2.8 seconds of desync over 50 clips), causing out-of-sync playback across cuts and silent audio at the end of the video.

2. **Replication Script:**
   A script (`replicate_issue.ts`) was created in `ios-live-photo-video-concat-fix-audio-timing/` that duplicated the sample Live Photo MOV files 10 times to form a batch of 50 video clips, then concatenated them using the original `ffmpeg` stream-copy concat logic. Probing the output with `ffprobe` confirmed accumulating duration drift across clip boundaries and timeline desynchronization.

## One-Sentence Description of the Fix
Normalized each Live Photo video clip prior to concatenation by padding the video stream with `tpad` to match container duration and re-encoding, eliminating cumulative audio/video stream timeline drift at cut boundaries.

## How the Fix Was Validated
1. **Automated Validation Script (`validate_fix.ts`):**
   Ran the normalization and concatenation process across the 50 duplicated Live Photo MOV test dataset. `ffprobe` analysis verified that the final video stream duration (`90.388346s`) matched the audio stream duration (`90.383333s`) within 0.005 seconds (less than a single video frame), completely resolving the multi-second drift.

2. **End-to-End Execution (`group-live-photos.ts`):**
   Executed the updated `group-live-photos.ts` script on the sample Live Photo files. Verified that property grouping, clip normalization, concatenation, output destination handling, and source file cleanup performed cleanly with exact audio/video synchronization in the output video (`group_1.mov`).
