// Kullanimdaki t('anahtar') cagrilarini sozlukle karsilastirir.
// Kullanim: node scripts/check-i18n.mjs
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const srcDir = path.join(root, 'src')
const messagesDir = path.join(srcDir, 'i18n', 'messages')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

// 1) Sozlukteki anahtarlar
const keys = new Map()
for (const file of fs.readdirSync(messagesDir)) {
  if (!file.endsWith('.ts') || file === 'index.ts') continue
  const text = fs.readFileSync(path.join(messagesDir, file), 'utf8')
  for (const match of text.matchAll(/'([^']+)':\s*\{\s*\r?\n\s*en:/g)) {
    const key = match[1]
    if (keys.has(key)) console.log(`DUPLICATE KEY: ${key} (${file})`)
    keys.set(key, file)
  }
}

// 2) Kodda kullanilan anahtarlar
const usage = new Map()
for (const file of walk(srcDir)) {
  if (file.includes(`${path.sep}i18n${path.sep}messages${path.sep}`)) continue
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue
    for (const match of line.matchAll(/\bt\(\s*'([^']+)'/g)) {
      const key = match[1]
      const rel = path.relative(root, file)
      if (!usage.has(key)) usage.set(key, new Set())
      usage.get(key).add(rel)
    }
  }
}

const missing = []
for (const [key, files] of usage) {
  if (!keys.has(key)) missing.push({ key, files: [...files] })
}

console.log(`Sozlukte ${keys.size} anahtar, kodda ${usage.size} tekil anahtar kullanimi.`)
if (missing.length) {
  console.log(`\nEKSIK ${missing.length} ANAHTAR:`)
  for (const item of missing.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  - ${item.key}  (${item.files.join(', ')})`)
  }
  process.exitCode = 1
} else {
  console.log('\nTum kullanilan anahtarlar sozlukte mevcut.')
}

const unused = [...keys.keys()].filter((key) => !usage.has(key))
console.log(`\nKodda kullanilmayan ${unused.length} anahtar (bilgi):`)
console.log(unused.sort().join('\n'))
