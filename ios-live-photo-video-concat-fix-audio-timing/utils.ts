import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function computeHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath)
  const hashSum = crypto.createHash('sha256')
  hashSum.update(fileBuffer)
  return hashSum.digest('hex')
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function getUniquePath(dir: string, fileName: string): Promise<string> {
  let targetPath = path.join(dir, fileName)
  if (!(await exists(targetPath))) {
    return targetPath
  }

  const ext = path.extname(fileName)
  const name = path.basename(fileName, ext)
  let counter = 1

  while (await exists(targetPath)) {
    targetPath = path.join(dir, `${name}_${counter}${ext}`)
    counter++
  }

  return targetPath
}

export async function safeMove(srcPath: string, dstPath: string): Promise<void> {
  try {
    await fs.rename(srcPath, dstPath)
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      await fs.copyFile(srcPath, dstPath)
      await fs.unlink(srcPath)
    } else {
      throw err
    }
  }
}

export async function getContainerDuration(filePath: string): Promise<number> {
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
