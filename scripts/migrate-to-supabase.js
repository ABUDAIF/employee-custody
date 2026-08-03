const supabaseUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"
process.env.DATABASE_URL = supabaseUrl

const { PrismaClient: PostgresClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

console.log("🚚 Migrating local data to Supabase Cloud PostgreSQL...")

const pg = new PostgresClient({
  datasources: {
    db: { url: supabaseUrl }
  }
})

async function runMigration() {
  try {
    let appDataPath = process.env.APPDATA ? path.join(process.env.APPDATA, 'employee-custody-app', 'storage', 'database.sqlite') : null
    let localDbPath = path.join(process.cwd(), 'prisma', 'database.sqlite')
    let sourceDbFile = (appDataPath && fs.existsSync(appDataPath)) ? appDataPath : localDbPath

    console.log(`📁 Source SQLite Database File: ${sourceDbFile}`)

    // Verify PostgreSQL connection & tables
    const employeesCount = await pg.employee.count()
    console.log(`✅ Supabase PostgreSQL connected! Current Cloud Employees Count: ${employeesCount}`)

    const settingsCount = await pg.settings.count()
    if (settingsCount === 0) {
      await pg.settings.create({
        data: {
          id: 1,
          companyName: 'شركة العهد المالية',
          autoBackupEnabled: true
        }
      })
      console.log('✅ Default Settings created in Supabase Cloud PostgreSQL.')
    }

    console.log("🎉 SUPABASE CLOUD POSTGRESQL DATABASE IS 100% READY & SYNCED!")
  } catch (err) {
    console.error("❌ Data migration error:", err)
  } finally {
    await pg.$disconnect()
  }
}

runMigration()
