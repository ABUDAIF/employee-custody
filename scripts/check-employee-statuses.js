const { PrismaClient } = require('@prisma/client')

const supabaseUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

async function check() {
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, status: true }
  })
  console.log('Employees in DB with status:', employees)

  const activeCount = await prisma.employee.count({ where: { status: 'ACTIVE' } })
  console.log(`Active count (status='ACTIVE'): ${activeCount}`)

  const totalCount = await prisma.employee.count()
  console.log(`Total employee count: ${totalCount}`)

  const depositsAgg = await prisma.ledgerEntry.aggregate({
    where: { OR: [{ type: 'DEPOSIT' }, { type: 'OPENING_BALANCE' }] },
    _sum: { amount: true }
  })
  console.log('Deposits agg:', depositsAgg)

  const expensesAgg = await prisma.ledgerEntry.aggregate({
    where: { type: 'EXPENSE' },
    _sum: { amount: true }
  })
  console.log('Expenses agg:', expensesAgg)

  await prisma.$disconnect()
}

check().catch(console.error)
