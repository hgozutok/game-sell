const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..", "storefront", "src", "app")

const targets = [
  { file: path.join(root, "search", "page.tsx"), name: "SearchPage", content: "SearchPageContent" },
  {
    file: path.join(root, "checkout", "success", "page.tsx"),
    name: "CheckoutSuccessPage",
    content: "CheckoutSuccessContent",
  },
  {
    file: path.join(root, "checkout", "failed", "page.tsx"),
    name: "CheckoutFailedPage",
    content: "CheckoutFailedContent",
  },
]

for (const t of targets) {
  let src = fs.readFileSync(t.file, "utf8")
  const marker = `export default function ${t.name}()`
  const idx = src.indexOf(marker)
  if (idx !== -1) {
    src = src.slice(0, idx).replace(/\s+$/, "\n")
  }
  const wrapper = `
export default function ${t.name}() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b0d]" />}>
      <${t.content} />
    </Suspense>
  )
}
`
  fs.writeFileSync(t.file, src.replace(/\s+$/, "") + "\n\n" + wrapper.trimStart(), "utf8")
  console.log("fixed", t.file)
}

