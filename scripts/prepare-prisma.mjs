import { cp, rm, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const generated = 'node_modules/.prisma/client'
const target = 'node_modules/@prisma/client/.prisma/client'

if (!existsSync(generated)) {
  console.error('Generated Prisma client not found. Run `npm run prisma:generate` first.')
  process.exit(1)
}

await rm(target, { recursive: true, force: true })
await cp(generated, target, { recursive: true })
console.log('Staged Prisma client into @prisma/client/.prisma/client')

const entryFiles = [
  'node_modules/@prisma/client/default.js',
  'node_modules/@prisma/client/index.js',
  'node_modules/@prisma/client/index-browser.js',
  'node_modules/@prisma/client/edge.js',
  'node_modules/@prisma/client/default-edge.js',
]

// `require('.prisma/client/default')` is resolved by Node as a package lookup
// (it lacks the `./` prefix), which fails inside the packaged app because
// node_modules/.prisma is not a declared dependency and is not packaged.
// Rewriting it to a proper relative path makes resolution target the staged
// client at @prisma/client/.prisma/client.
const BROKEN = `require('.prisma/client/default')`
const FIXED = `require('./.prisma/client/default')`

for (const file of entryFiles) {
  if (!existsSync(file)) continue
  const content = await readFile(file, 'utf8')
  if (content.includes(FIXED)) continue
  const patched = content.split(BROKEN).join(FIXED)
  if (patched !== content) {
    await writeFile(file, patched)
    console.log(`Patched ${file}`)
  }
}
