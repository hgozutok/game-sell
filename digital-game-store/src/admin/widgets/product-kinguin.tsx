// @ts-nocheck — @medusajs/ui 4.x compound component typing katiligindan; vite/esbuild runtime tip kontrolu yapmaz
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"

// Urun detay sayfasinda Kinguin baglanti bilgisini gosterir.
// Not: ekstra API cagrisi yapilmaz — katalog ucu tum tabloyu taradigi icin
// urun detayini bloke ediyordu; veriler product.metadata uzerinden okunur.
const ProductKinguinWidget = ({ data }: { data?: any }) => {
  const product = data
  if (!product) return null

  const metadata = product.metadata || {}
  const kinguinId = metadata.kinguin_id
  const isKinguin = metadata.provider === "kinguin" || metadata.source === "kinguin"

  if (!isKinguin && !kinguinId) return null

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Kinguin</Heading>
      </div>
      <div className="px-6 py-3 grid grid-cols-2 gap-y-3">
        <Text size="small" className="text-ui-fg-subtle">
          Baglanti
        </Text>
        <Text size="small">
          {kinguinId ? (
            <Badge size="2xsmall" color="green">
              kinguinId: {kinguinId}
            </Badge>
          ) : (
            <Badge size="2xsmall" color="grey">
              bagli degil
            </Badge>
          )}
        </Text>

        {metadata.platform && (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Platform
            </Text>
            <Text size="small">{metadata.platform}</Text>
          </>
        )}

        {metadata.region && (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Bolge
            </Text>
            <Text size="small">{metadata.region}</Text>
          </>
        )}

        {metadata.original_price != null && (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Tedarikci maliyeti
            </Text>
            <Text size="small">
              {Number(metadata.original_price).toFixed(2)}{" "}
              {String(metadata.provider_currency || "eur").toUpperCase()}
            </Text>
          </>
        )}

        {metadata.last_price_update && (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Son fiyat guncellemesi
            </Text>
            <Text size="small">
              {new Date(metadata.last_price_update).toLocaleString("tr-TR")}
            </Text>
          </>
        )}

        {metadata.provider_product_id && (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Tedarikci urun id
            </Text>
            <Text size="small">{metadata.provider_product_id}</Text>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductKinguinWidget
