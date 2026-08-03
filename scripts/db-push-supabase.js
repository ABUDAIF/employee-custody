const { execSync } = require('child_process')

// Port 5432 is Session Pooler in Supabase which supports DDL migrations & tables creation!
const supabaseSessionUrl = "postgresql://postgres.rhvzptjnvzthormqxnkc:01150823229Ad@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

console.log("🚀 Executing Prisma DB Push via Session Pooler (port 5432)...")

process.env.DATABASE_URL = supabaseSessionUrl

try {
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: supabaseSessionUrl }
  })
  console.log("✅ Tables successfully created on Supabase Cloud PostgreSQL!")
} catch (err) {
  console.error("❌ Failed to push schema:", err.message)
}
