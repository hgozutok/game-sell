import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/product"
import KinguinModule from "../modules/kinguin"

// Kinguin katalog kaydini Medusa variant ile esle. Import rotasi bu linki kurar;
// admin urun widget'i ve senkronizasyon bu linkten medusa_product_id cikarir.
export default defineLink(
  KinguinModule.linkable.kinguinProduct,
  ProductModule.linkable.productVariant
)
