// @ts-nocheck — @medusajs/ui 4.0.25 compound component typing katiligindan; vite/esbuild runtime tip kontrolu yapmaz
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Select, Badge, Table, Checkbox } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { adminFetch, money } from "../../../lib/api"

function CatalogPage() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState("")
  const [listed, setListed] = useState("all")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [marginOverride, setMarginOverride] = useState("")
  const [liveQuery, setLiveQuery] = useState("")

  const products = useQuery({
    queryKey: ["kinguin-catalog", q, listed, page],
    queryFn: () =>
      adminFetch(
        `/admin/kinguin/products?page=${page}&limit=25${listed !== "all" ? `&listed=${listed}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`
      ),
  })

  const selectedIds = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k)

  const listMutation = useMutation({
    mutationFn: (unlist: boolean) =>
      adminFetch(`/admin/kinguin/products/${unlist ? "unlist" : "list"}`, {
        method: "POST",
        body: {
          ids: selectedIds,
          ...(marginOverride ? { margin_override_pct: Number(marginOverride) } : {}),
        },
      }),
    onSuccess: () => {
      setSelected({})
      queryClient.invalidateQueries({ queryKey: ["kinguin-catalog"] })
    },
  })

  const liveSearch = useMutation({
    mutationFn: (query: string) =>
      adminFetch("/admin/kinguin/products/search", { method: "POST", body: { query } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kinguin-catalog"] }),
  })

  const rows = products.data?.products || []

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y divide-dashed p-0">
        <div className="px-6 py-4 flex items-center justify-between gap-x-4">
          <div className="flex items-center gap-x-3 flex-1">
            <Input
              placeholder="Katalogda ara (isim / kinguinId)"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              className="flex-1"
            />
            <Select value={listed} onValueChange={(v) => { setListed(v); setPage(1) }}>
              <Select.Trigger className="w-[180px]">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">Tumu</Select.Item>
                <Select.Item value="true">Listedeki</Select.Item>
                <Select.Item value="false">Liste disi</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-center gap-x-2">
            <Button size="small" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Onceki
            </Button>
            <Text size="small">Sayfa {page}</Text>
            <Button size="small" variant="secondary" onClick={() => setPage((p) => p + 1)}>
              Sonraki
            </Button>
          </div>
        </div>

        <div className="px-6 py-3 flex items-center gap-x-3 border-b border-ui-border-base">
          <Input
            placeholder="Canli Kinguin aramasi (min 3 karakter)"
            value={liveQuery}
            onChange={(e) => setLiveQuery(e.target.value)}
            className="flex-1"
          />
          <Button
            size="small"
            variant="secondary"
            loading={liveSearch.isPending}
            disabled={liveQuery.length < 3}
            onClick={() => liveSearch.mutate(liveQuery)}
          >
            Canli ara & katalogla senkronla
          </Button>
        </div>

        <div className="px-6 py-3 flex items-center gap-x-4 border-b border-ui-border-base">
          <Text size="small" weight="plus">Secili: {selectedIds.length}</Text>
          <Input
            placeholder="Marj override %"
            type="number"
            value={marginOverride}
            onChange={(e) => setMarginOverride(e.target.value)}
            className="w-[140px]"
          />
          <Button
            size="small"
            variant="primary"
            disabled={selectedIds.length === 0 || listMutation.isPending}
            loading={listMutation.isPending}
            onClick={() => listMutation.mutate(false)}
          >
            Magazada listele
          </Button>
          <Button
            size="small"
            variant="danger"
            disabled={selectedIds.length === 0 || listMutation.isPending}
            onClick={() => listMutation.mutate(true)}
          >
            Listedten kaldir
          </Button>
          {listMutation.data && (
            <Text size="small" className="text-ui-fg-subtle">
              listelenen: {listMutation.data.listed}/{listMutation.data.total}
              {listMutation.data.blocked_negative_margin > 0
                ? ` | zarar guard: ${listMutation.data.blocked_negative_margin} engellendi`
                : ""}
            </Text>
          )}
        </div>
      </Container>

      <Container className="p-0">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell></Table.HeaderCell>
              <Table.HeaderCell>Urun</Table.HeaderCell>
              <Table.HeaderCell>Platform</Table.HeaderCell>
              <Table.HeaderCell>Stok</Table.HeaderCell>
              <Table.HeaderCell>Maliyet (EUR)</Table.HeaderCell>
              <Table.HeaderCell>Durum</Table.HeaderCell>
              <Table.HeaderCell>Onay</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((p: any) => (
              <Table.Row key={p.id}>
                <Table.Cell>
                  <Checkbox
                    checked={!!selected[p.id]}
                    onCheckedChange={(c) =>
                      setSelected((s) => ({ ...s, [p.id]: c === true }))
                    }
                  />
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" weight="plus">{p.name}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    kinguinId: {p.kinguin_id}
                  </Text>
                </Table.Cell>
                <Table.Cell>{p.platform ?? "-"}</Table.Cell>
                <Table.Cell>{p.qty}</Table.Cell>
                <Table.Cell>{money(p.price, "eur")}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={p.store_listed ? "green" : "grey"}>
                    {p.store_listed ? "listed" : "liste disi"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {p.pending_price != null ? (
                    <Badge size="2xsmall" color="orange">
                      {money(p.pending_price)} bekliyor
                    </Badge>
                  ) : (
                    "-"
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </div>
  )
}

export default CatalogPage

export const config = defineRouteConfig({
  label: "Kinguin Katalog",
  icon: MagnifyingGlass,
})
