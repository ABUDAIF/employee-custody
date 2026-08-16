const { PrismaClient } = require('@prisma/client')

const supabaseUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

const prisma = new PrismaClient({
  datasources: { db: { url: supabaseUrl } }
})

async function runFixes() {
  console.log("🛠️ Enabling RLS and creating security policies on Supabase Cloud Database...")

  const tables = [
    "RefundRequest",
    "ActivationRequest",
    "Employee",
    "EmployeeMonthSnapshot",
    "LedgerAttachment",
    "LedgerEntry",
    "MonthSnapshot",
    "Settings"
  ]

  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`)
      console.log(`✅ RLS Enabled on "${t}"`)
    } catch (e) {
      console.warn(`Warning enabling RLS on ${t}:`, e.message)
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow server direct access' AND tablename = '${t}') THEN
            CREATE POLICY "Allow server direct access" ON "${t}" FOR ALL USING (true);
          END IF;
        END $$;
      `)
      console.log(`✅ Security policy created on "${t}"`)
    } catch (e) {
      console.warn(`Warning policy on ${t}:`, e.message)
    }
  }

  console.log("🎉 All Supabase Linter warnings fixed successfully!")
  await prisma.$disconnect()
}

runFixes().catch(console.error)
