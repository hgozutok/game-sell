// @ts-nocheck — @medusajs/ui 4.0.25 compound component typing katiligindan; vite/esbuild runtime tip kontrolu yapmaz
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import { Container, Heading, Table, Badge, Text, Button } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { adminFetch, money } from "../../lib/api"

function KinguinDashboard() {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)

  const balance = useQuery({
    queryKey: ["kinguin-balance"],
    queryFn: () => adminFetch("/admin/kinguin/balance"),
    refetchInterval: 60000,
  })

  const logs = useQuery({
    queryKey: ["kinguin-sync-logs"],
    queryFn: () => adminFetch("/admin/kinguin/sync-logs?limit=10"),
    refetchInterval: 15000,
  })

  const syncNow = useMutation({
    mutationFn: (type: string) =>
      adminFetch("/admin/kinguin/sync-now", {
        method: "POST",
        body: { type },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kinguin-sync-logs"] })
      queryClient.invalidateQueries({ queryKey: ["kinguin-balance"] })
      setSyncing(false)
    },
  })

  const b = balance.data

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y divide-dashed p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">Kinguin</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Katalog senkronizasyonu, fiyatlama ve fulfillment yonetimi
            </Text>
          </div>
          <div className="flex items-center gap-x-3">
            <Badge size="2xsmall" color={b?.order_mode === "live" ? "red" : "green"}>
              {b?.order_mode === "live" ? "ORDER MODE: LIVE" : "ORDER MODE: READONLY"}
            </Badge>
            <Button
              size="small"
              variant="secondary"
              loading={syncing}
              onClick={() => {
                setSyncing(true)
                syncNow.mutate("full")
              }}
            >
              Senkronize et (10 sayfa)
            </Button>
          </div>
        </div>
        <div className="px-6 py-3 flex items-center gap-x-8">
          <div>
            <Text size="xsmall" className="text-ui-fg-subtle">Kinguin bakiyesi</Text>
            <Text size="small" weight="plus" className={b?.low_balance ? "text-ui-fg-error" : ""}>
              {b ? `${b.balance.toFixed(2)} EUR` : "-"} {b?.low_balance ? "(dusuk!)" : ""}
            </Text>
          </div>
          <div>
            <Text size="xsmall" className="text-ui-fg-subtle">Min bakiye esigi</Text>
            <Text size="small">{b ? `${b.min_balance} EUR` : "-"}</Text>
          </div>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Senkronizasyon kayitlari</Heading>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Tur</Table.HeaderCell>
              <Table.HeaderCell>Durum</Table.HeaderCell>
              <Table.HeaderCell>Toplam</Table.HeaderCell>
              <Table.HeaderCell>Eklenen</Table.HeaderCell>
              <Table.HeaderCell>Guncellenen</Table.HeaderCell>
              <Table.HeaderCell>Hata</Table.HeaderCell>
              <Table.HeaderCell>Onay bekleyen</Table.HeaderCell>
              <Table.HeaderCell>Baslangic</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(logs.data?.logs || []).map((log: any) => (
              <Table.Row key={log.id}>
                <Table.Cell>{log.type}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={log.status === "completed" ? "green" : log.status === "failed" ? "red" : "orange"}>
                    {log.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{log.items_total}</Table.Cell>
                <Table.Cell>{log.items_added}</Table.Cell>
                <Table.Cell>{log.items_updated}</Table.Cell>
                <Table.Cell className={log.items_failed > 0 ? "text-ui-fg-error" : ""}>
                  {log.items_failed}
                </Table.Cell>
                <Table.Cell>{log.pending_approvals}</Table.Cell>
                <Table.Cell>{log.started_at ? new Date(log.started_at).toLocaleString("tr-TR") : "-"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default KinguinDashboard

export const config = defineRouteConfig({
  label: "Kinguin",
  icon: Sparkles,
})
