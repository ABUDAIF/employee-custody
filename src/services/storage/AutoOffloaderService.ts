import path from 'path'
import fs from 'fs'
import { prisma, getPermanentStorageDir } from '../db/prismaClient'

export class AutoOffloaderService {
  private timer: NodeJS.Timeout | null = null
  private isProcessing: boolean = false

  public start() {
    console.log('⚡ Starting Optimized Local Attachment Auto-Offloader...')
    // Initial run after 5 seconds
    setTimeout(() => this.processOffload(), 5000)

    // Check every 3 minutes (180,000ms) to ensure zero CPU/memory load
    this.timer = setInterval(() => {
      this.processOffload()
    }, 180000)
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public async processOffload() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      // Find attachments in Supabase PostgreSQL DB that still contain Base64 Cloud Data URIs
      const cloudAttachments = await prisma.ledgerAttachment.findMany({
        where: {
          filePath: {
            startsWith: 'data:'
          }
        },
        take: 10
      })

      if (cloudAttachments.length === 0) {
        this.isProcessing = false
        return
      }

      console.log(`📥 Offloading ${cloudAttachments.length} cloud attachment(s) to local PC disk...`)

      const storageDir = path.join(getPermanentStorageDir(), 'receipts')
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true })
      }

      for (const att of cloudAttachments) {
        try {
          const matches = att.filePath.match(/^data:([^;]+);base64,(.+)$/)
          if (matches) {
            const base64Data = matches[2]
            const buffer = Buffer.from(base64Data, 'base64')
            const localFileName = att.fileName || `receipt_${att.id.substring(0, 8)}.jpg`
            const fullLocalPath = path.join(storageDir, localFileName)

            fs.writeFileSync(fullLocalPath, buffer)

            const relPath = `storage/receipts/${localFileName}`

            await prisma.ledgerAttachment.update({
              where: { id: att.id },
              data: { filePath: relPath }
            })

            console.log(`✅ Offloaded ${att.fileName} -> ${fullLocalPath}`)
          }
        } catch (e: any) {
          console.error(`Failed to offload attachment ${att.id}:`, e.message)
        }
      }
    } catch (err: any) {
      // Ignore background connection notes silently
    } finally {
      this.isProcessing = false
    }
  }
}

export const autoOffloaderService = new AutoOffloaderService()
