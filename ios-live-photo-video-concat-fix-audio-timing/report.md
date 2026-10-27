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
