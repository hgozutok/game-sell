// @ts-nocheck — @medusajs/ui 4.0.25 compound component typing katiligindan; vite/esbuild runtime tip kontrolu yapmaz
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShoppingBag } from "@medusajs/icons"
import { Container, Heading, Text, Button, Badge, Table } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { adminFetch, money } from "../../../lib/api"

const STATE_COLORS: Record<string, any> = {
  awaiting_approval: "orange",
  awaiting_provider_mode: "orange",
  pending_fulfillment: "blue",
  provider_order_placed: "blue",
  retrying: "orange",
  failed: "red",
  delivered: "green",
  rejected: "grey",
}

function FulfillmentQueuePage() {
  const queryClient = useQueryClient()

  const queue = useQuery({
    queryKey: ["kinguin-queue"],
    queryFn: () => adminFetch("/admin/kinguin/fulfillment-queue"),
    refetchInterval: 15000,
  })

  const approve = useMutation({
    mutationFn: (orderId: string) =>
      adminFetch("/admin/kinguin/fulfillment-queue/approve", {
        method: "POST",
        body: { order_id: orderId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kinguin-queue"] }),
  })

  const reject = useMutation({
    mutationFn: (orderId: string) =>
      adminFetch("/admin/kinguin/fulfillment-queue/reject", {
        method: "POST",
        body: { order_id: orderId },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kinguin-queue"] }),
  })

  const k = queue.data?.kinguin

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y divide-dashed p-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <Heading level="h1">Fulfillment kuyrugu</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manuel onay bekleyen odenen siparisler
            </Text>
          </div>
          <div className="flex items-center gap-x-3">
            <Badge size="2xsmall" color={k?.order_mode === "live" ? "red" : "green"}>
              {k?.order_mode === "live" ? "LIVE" : "READONLY"}
            </Badge>
            <Text size="small">
              Bakiye: <b>{k ? `${Number(k.balance ?? 0).toFixed(2)} EUR` : "-"}</b> (min {k?.min_balance})
            </Text>
          </div>
        </div>
      </Container>

      <Container className="p-0">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Siparis</Table.HeaderCell>
              <Table.HeaderCell>E-posta</Table.HeaderCell>
              <Table.HeaderCell>Urunler</Table.HeaderCell>
              <Table.HeaderCell>Toplam</Table.HeaderCell>
              <Table.HeaderCell>Durum</Table.HeaderCell>
              <Table.HeaderCell>Hata / Aciklama</Table.HeaderCell>
              <Table.HeaderCell>Islem</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(queue.data?.orders || []).map((o: any) => (
              <Table.Row key={o.id}>
                <Table.Cell>#{o.display_id ?? o.id.slice(-8)}</Table.Cell>
                <Table.Cell>{o.email}</Table.Cell>
                <Table.Cell>
                  {(o.items || [])
                    .map((i: any) => `${i.title} x${i.quantity}`)
                    .join(", ")
                    .slice(0, 60)}
                </Table.Cell>
                <Table.Cell>{money(o.total)}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={STATE_COLORS[o.metadata?.fulfillment_state] ?? "grey"}>
                    {o.metadata?.fulfillment_state}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {(o.metadata?.fulfillment_error || "-").toString().slice(0, 80)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-x-2">
                    <Button
                      size="small"
                      variant="primary"
                      loading={approve.isPending && approve.variables === o.id}
                      disabled={k?.order_mode !== "live"}
                      onClick={() => approve.mutate(o.id)}
                    >
                      Onayla
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      loading={reject.isPending && reject.variables === o.id}
                      onClick={() => {
                        if (window.confirm("Siparis iptal edilecek. Emin misiniz?")) {
                          reject.mutate(o.id)
                        }
                      }}
                    >
                      Reddet
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {(!queue.data || queue.data.count === 0) && (
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <Text size="small" className="text-ui-fg-subtle p-3">
                    Kuyruk bos.
                    {k?.order_mode !== "live" &&
                      " (READONLY modda onay devre disi — siparis canliya gecirildikten sonra islenir)"}
                  </Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default FulfillmentQueuePage

export const config = defineRouteConfig({
  label: "Kinguin Siparisler",
  icon: ShoppingBag,
})
