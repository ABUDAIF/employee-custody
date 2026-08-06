const { PrismaClient } = require('@prisma/client')

const supabaseUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

async function check() {
  console.log('🔍 Testing DB connection & fetching records...')
  const employees = await prisma.employee.findMany()
  console.log(`Employees count: ${employees.length}`)

  const entries = await prisma.ledgerEntry.findMany({ take: 5 })
  console.log(`Ledger entries count: ${entries.length}`)
  console.log('Sample entries:', entries)

  await prisma.$disconnect()
}

check().catch(err => {
  console.error('❌ DB Error:', err)
})
