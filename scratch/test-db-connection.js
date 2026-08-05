const { PrismaClient } = require('@prisma/client')

const supabaseUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

async function testConn() {
  try {
    console.log("🔍 Querying Supabase Employees...")
    const employees = await prisma.employee.findMany()
    console.log(`✅ Employees count: ${employees.length}`)
    console.log("Employees:", JSON.stringify(employees, null, 2))

    console.log("🔍 Querying Supabase Ledger Entries...")
    const entries = await prisma.ledgerEntry.findMany()
    console.log(`✅ Ledger entries count: ${entries.length}`)
  } catch (err) {
    console.error("❌ DB Query Error:", err)
  } finally {
    await prisma.$disconnect()
  }
}

testConn()
