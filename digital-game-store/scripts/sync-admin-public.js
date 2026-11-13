/**
 * medusa build, admin bundle'ini dist/public/admin altina yazar; ancak medusa start
 * /app yolunu public/admin uzerinden servis eder. Kopyalanmazsa eski bundle servis
 * edilir ve admin eklentileri (Kinguin) kaybolur.
 */
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..")
const src = path.join(root, "dist", "public", "admin")
const dest = path.join(root, "public", "admin")

if (!fs.existsSync(src)) {
  console.log("[sync-admin-public] dist/public/admin bulunamadi, atlandi")
  process.exit(0)
}

fs.mkdirSync(dest, { recursive: true })
fs.cpSync(src, dest, { recursive: true, force: true })
console.log("[sync-admin-public] admin bundle public/admin icine kopyalandi")
