import path from 'path'
import fs from 'fs'
import { prisma, getPermanentStorageDir } from '../db/prismaClient'

export class AutoOffloaderService {
  private timer: NodeJS.Timeout | null = null

  public start() {
    console.log('🔄 Starting Local Attachment Auto-Offloader (Cloud Database Cost-Optimization)...')
    // Run initial offload after 3 seconds
    setTimeout(() => this.processOffload(), 3000)

    // Run offload check every 30 seconds
    this.timer = setInterval(() => {
      this.processOffload()
    }, 30000)
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public async processOffload() {
    try {
      // Find attachments in Supabase PostgreSQL DB that still contain heavy Base64 Cloud Data URIs
      const cloudAttachments = await prisma.ledgerAttachment.findMany({
        where: {
          filePath: {
            startsWith: 'data:'
          }
        },
        take: 20
      })

      if (cloudAttachments.length === 0) return

      console.log(`📥 Found ${cloudAttachments.length} cloud attachment(s) to offload to local PC disk...`)

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

            // 1. Save file buffer permanently on local Windows PC disk
            fs.writeFileSync(fullLocalPath, buffer)

            const relPath = `storage/receipts/${localFileName}`

            // 2. Wipe heavy Base64 data from Supabase DB and replace with lightweight local relative path
            await prisma.ledgerAttachment.update({
              where: { id: att.id },
              data: { filePath: relPath }
            })

            console.log(`✅ Offloaded attachment ${att.fileName} -> ${fullLocalPath} (DB Space Cleared!)`)
          }
        } catch (e: any) {
          console.error(`Failed to offload attachment ${att.id}:`, e.message)
        }
      }
    } catch (err: any) {
      console.warn('AutoOffloader warning:', err.message)
    }
  }
}

export const autoOffloaderService = new AutoOffloaderService()
