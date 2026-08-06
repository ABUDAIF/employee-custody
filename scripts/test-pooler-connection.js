const { PrismaClient } = require('@prisma/client')

const poolerUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient({
  datasources: { db: { url: poolerUrl } }
})

async function check() {
  console.log('🔍 Testing Supabase Pooler Port 6543 connection...')
  const count = await prisma.employee.count()
  console.log(`✅ Employees count via Port 6543: ${count}`)
  await prisma.$disconnect()
}

check().catch(err => {
  console.error('❌ Pooler Error:', err)
})
