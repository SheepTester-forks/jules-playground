import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args)
    const stderrLines: string[] = []

    child.stderr.on('data', data => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        if (line.trim()) {
          stderrLines.push(line)
          if (stderrLines.length > 20) {
            stderrLines.shift()
          }
        }
      }
    })

    child.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        const errorMsg =
          stderrLines.length > 0
            ? `\nLast few lines of error output:\n${stderrLines.join('\n')}`
            : ''
        reject(new Error(`Command failed with code ${code}${errorMsg}`))
      }
    })

    child.on('error', err => {
      reject(err)
    })
  })
}

async function getContainerDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      filePath
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  )
  const data = JSON.parse(stdout)
  const dur = parseFloat(data.format?.duration || '0')
  return isNaN(dur) ? 0 : dur
}

async function main() {
  const dirPath = __dirname
  const srcFiles = ['IMG_1667.MOV', 'IMG_1668.MOV', 'IMG_1669.MOV', 'IMG_1670.MOV', 'IMG_1674.MOV']

  const testDir = path.join(dirPath, 'test_validation_tmp')
  const normDir = path.join(testDir, 'norm')
  await fs.mkdir(testDir, { recursive: true })
  await fs.mkdir(normDir, { recursive: true })

  console.log('Duplicating sample Live Photo videos to create 50 test files...')
  const testFiles: string[] = []
  let count = 0
  for (let loop = 0; loop < 10; loop++) {
    for (const src of srcFiles) {
      const fileName = `test_${count.toString().padStart(3, '0')}.mov`
      const srcPath = path.join(dirPath, src)
      const dstPath = path.join(testDir, fileName)
      await fs.copyFile(srcPath, dstPath)
      testFiles.push(dstPath)
      count++
    }
  }

  console.log('Normalizing 50 test files with clip duration alignment...')
  const normFiles: string[] = []
  for (let i = 0; i < testFiles.length; i++) {
    const srcPath = testFiles[i]
    const normPath = path.join(normDir, `norm_${i.toString().padStart(3, '0')}.mov`)
    const dur = await getContainerDuration(srcPath)

    await runCommand('ffmpeg', [
      '-y',
      '-i',
      srcPath,
      '-filter_complex',
      '[0:v:0]tpad=stop_mode=clone:stop_duration=2,fps=30[v];[0:a:0]apad[a]',
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      dur.toString(),
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'pcm_s16le',
      normPath
    ])
    normFiles.push(normPath)
  }

  let concatContent = ''
  for (const normPath of normFiles) {
    const escaped = normPath.replace(/'/g, "'\\''")
    concatContent += `file '${escaped}'\n`
  }

  const concatTxt = path.join(testDir, 'concat_fix.txt')
  const outputMov = path.join(testDir, 'output_fix.mov')
  await fs.writeFile(concatTxt, concatContent, 'utf8')

  console.log('Concatenating 50 normalized files using stream copy concat demuxer...')
  await runCommand('ffmpeg', [
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatTxt,
    '-c',
    'copy',
    '-y',
    outputMov
  ])

  console.log('\nProbing concatenated output with ffprobe...')
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=index,codec_type,duration,start_time,nb_frames',
    '-show_entries', 'format=duration',
    '-of', 'json',
    outputMov
  ])

  const probe = JSON.parse(stdout)
  let videoDur = 0
  let audioDur = 0

  for (const s of probe.streams) {
    if (s.codec_type === 'video' && s.index === 0) {
      videoDur = parseFloat(s.duration)
    } else if (s.codec_type === 'audio') {
      audioDur = parseFloat(s.duration)
    }
  }

  console.log(`Format duration: ${probe.format?.duration}s`)
  console.log(`Video Stream 0 duration: ${videoDur.toFixed(6)}s`)
  console.log(`Audio Stream duration: ${audioDur.toFixed(6)}s`)
  console.log(`Duration desync (Audio - Video): ${(audioDur - videoDur).toFixed(6)}s`)

  // Cleanup test_validation_tmp
  await fs.rm(testDir, { recursive: true, force: true }).catch(() => {})
}

main().catch(console.error)
