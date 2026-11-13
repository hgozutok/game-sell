const { Client } = require("pg")

const conn = process.env.DATABASE_URL || "postgres://nida:Pn8152495!@localhost:5432/medusa-digital-store"

async function main() {
  const c = new Client({ connectionString: conn })
  await c.connect()
  const users = await c.query('select id, email, created_at from "user" order by created_at')
  console.log("USERS:", users.rows)
  const products = await c.query("select count(*)::int as n from product")
  const orders = await c.query('select count(*)::int as n from "order"')
  const customers = await c.query("select count(*)::int as n from customer")
  console.log("COUNTS:", { products: products.rows[0].n, orders: orders.rows[0].n, customers: customers.rows[0].n })
  await c.end()
}

main().catch((e) => {
  console.error("ERR", e.message)
  process.exit(1)
})
