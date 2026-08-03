import path from 'path'
import fs from 'fs'
import { getPermanentStorageDir } from '../db/prismaClient'

export class FileManager {
  private static get baseDir(): string {
    return getPermanentStorageDir()
  }

  public static getEmployeesDir(): string {
    const dir = path.join(this.baseDir, 'employees')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  public static getReceiptsDir(): string {
    const dir = path.join(this.baseDir, 'receipts')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  public static getCompanyDir(): string {
    const dir = path.join(this.baseDir, 'company')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  public static getBackupsDir(): string {
    const dir = path.join(this.baseDir, 'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  public static saveFile(targetSubdir: 'employees' | 'receipts' | 'company' | 'backups', fileName: string, buffer: Buffer): string {
    const targetDir = path.join(this.baseDir, targetSubdir)
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })

    const fullPath = path.join(targetDir, fileName)
    fs.writeFileSync(fullPath, buffer)
    return path.relative(this.baseDir, fullPath).replace(/\\/g, '/')
  }

  public static getAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath)
  }

  public static fileExists(relativePath: string): boolean {
    return fs.existsSync(this.getAbsolutePath(relativePath))
  }
}
