import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

export const SUPABASE_URL = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

export function getPermanentStorageDir(): string {
  let baseDataDir: string
  if (process.env.USER_DATA_PATH) {
    baseDataDir = process.env.USER_DATA_PATH
  } else {
    try {
      const { app } = require('electron')
      if (app && typeof app.getPath === 'function') {
        baseDataDir = app.getPath('userData')
      } else {
        baseDataDir = path.join(process.env.APPDATA || process.env.USERPROFILE || process.cwd(), 'EmployeeCustodyData')
      }
    } catch {
      baseDataDir = path.join(process.env.APPDATA || process.env.USERPROFILE || process.cwd(), 'EmployeeCustodyData')
    }
  }

  const storageDir = path.join(baseDataDir, 'storage')
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true })
  }
  return storageDir
}

const activeDatabaseUrl = process.env.DATABASE_URL || SUPABASE_URL
console.log('🌐 Connected to Cloud Database (Supabase PostgreSQL 24/7)')

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: activeDatabaseUrl
    }
  }
})

export async function initDatabase() {
  try {
    const existingSettings = await prisma.settings.findFirst()
    if (!existingSettings) {
      await prisma.settings.create({
        data: {
          id: 1,
          companyName: 'شركة العهد المالية',
          autoBackupEnabled: true
        }
      })
      console.log('✅ Default Settings created in Supabase Cloud PostgreSQL.')
    }
  } catch (err: any) {
    console.warn('Database initialization note:', err.message)
  }
}
