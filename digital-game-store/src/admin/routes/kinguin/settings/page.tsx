// @ts-nocheck — @medusajs/ui 4.0.25 compound component typing katiligindan; vite/esbuild runtime tip kontrolu yapmaz
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Adjustments } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Select, Switch, Label, Badge } from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { adminFetch } from "../../../lib/api"

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label size="small">{label}</Label>
      {children}
    </div>
  )
}

function SettingsPage() {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ["kinguin-settings"],
    queryFn: () => adminFetch("/admin/kinguin/settings"),
  })

  const [form, setForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (settings.data) {
      const s = settings.data
      setForm({
        auto_fulfill_enabled: s.auto_fulfill_enabled,
        order_mode: s.order_mode,
        min_balance: s.min_balance,
        stop_on_negative_margin: s.stop_on_negative_margin,
        sync_interval_minutes: s.sync_interval_minutes,
        sync_prices: s.sync_prices,
        sync_stock: s.sync_stock,
        sync_info: s.sync_info,
        sync_new_products: s.sync_new_products,
        hide_on_zero_stock: s.hide_on_zero_stock,
        auto_reprice: s.auto_reprice,
        max_price_change_pct: s.max_price_change_pct,
        default_margin_pct: s.default_margin_pct,
        min_profit_pct: s.min_profit_pct,
        rounding_rule: s.rounding_rule,
      })
    }
  }, [settings.data])

  const save = useMutation({
    mutationFn: (patch: any) =>
      adminFetch("/admin/kinguin/settings", { method: "POST", body: patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kinguin-settings"] }),
  })

  const s = form
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  if (settings.isLoading) return <Container className="p-6">Yukleniyor...</Container>

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Fulfillment ayarlari</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Otomatik siparis akisi ve para harcama guvenligi
          </Text>
        </div>
        <div className="px-6 py-2">
          <Field label="Otomatik fulfill (odenen siparis otomatik islenir)">
            <Switch checked={!!s.auto_fulfill_enabled} onCheckedChange={(c) => set("auto_fulfill_enabled", c)} />
          </Field>
          <Field label="Kinguin siparis modu">
            <div className="flex items-center gap-x-3">
              <Badge size="2xsmall" color={s.order_mode === "live" ? "red" : "green"}>
                {s.order_mode === "live" ? "LIVE — para harcar" : "READONLY — siparis yok"}
              </Badge>
              {s.order_mode === "readonly" ? (
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Canliya gecis: odenen siparisler GERCEK Kinguin siparisi olacak ve bakiyeden dusulecek. Emin misiniz?"
                      )
                    ) {
                      set("order_mode", "live")
                    }
                  }}
                >
                  Canliya gec
                </Button>
              ) : (
                <Button size="small" variant="secondary" onClick={() => set("order_mode", "readonly")}>
                  Readonly'a don
                </Button>
              )}
            </div>
          </Field>
          <Field label="Min bakiye esigi (EUR)">
            <Input
              type="number"
              className="w-[120px]"
              value={s.min_balance ?? 0}
              onChange={(e) => set("min_balance", Number(e.target.value))}
            />
          </Field>
          <Field label="Zararina satisi engelle">
            <Switch checked={!!s.stop_on_negative_margin} onCheckedChange={(c) => set("stop_on_negative_margin", c)} />
          </Field>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Senkronizasyon ayarlari</Heading>
        </div>
        <div className="px-6 py-2">
          <Field label="Periyot (dakika)">
            <Select
              value={String(s.sync_interval_minutes)}
              onValueChange={(v) => set("sync_interval_minutes", Number(v))}
            >
              <Select.Trigger className="w-[160px]">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="15">15 dakika</Select.Item>
                <Select.Item value="60">1 saat</Select.Item>
                <Select.Item value="360">6 saat</Select.Item>
                <Select.Item value="1440">24 saat</Select.Item>
              </Select.Content>
            </Select>
          </Field>
          <Field label="Fiyat senkronu">
            <Switch checked={!!s.sync_prices} onCheckedChange={(c) => set("sync_prices", c)} />
          </Field>
          <Field label="Stok senkronu">
            <Switch checked={!!s.sync_stock} onCheckedChange={(c) => set("sync_stock", c)} />
          </Field>
          <Field label="Urun bilgisi senkronu">
            <Switch checked={!!s.sync_info} onCheckedChange={(c) => set("sync_info", c)} />
          </Field>
          <Field label="Yeni urunleri ekle">
            <Switch checked={!!s.sync_new_products} onCheckedChange={(c) => set("sync_new_products", c)} />
          </Field>
          <Field label="Stok 0 -> otomatik gizle">
            <Switch checked={!!s.hide_on_zero_stock} onCheckedChange={(c) => set("hide_on_zero_stock", c)} />
          </Field>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Fiyatlandirma</Heading>
        </div>
        <div className="px-6 py-2">
          <Field label="Varsayilan marj (%)">
            <Input
              type="number"
              className="w-[120px]"
              value={s.default_margin_pct ?? 0}
              onChange={(e) => set("default_margin_pct", Number(e.target.value))}
            />
          </Field>
          <Field label="Max fiyat degisim esigi (%) — uzerinde onaya duser">
            <Input
              type="number"
              className="w-[120px]"
              value={s.max_price_change_pct ?? 0}
              onChange={(e) => set("max_price_change_pct", Number(e.target.value))}
            />
          </Field>
          <Field label="Min kar (%)">
            <Input
              type="number"
              className="w-[120px]"
              value={s.min_profit_pct ?? 0}
              onChange={(e) => set("min_profit_pct", Number(e.target.value))}
            />
          </Field>
          <Field label="Yuvarlama">
            <Select value={s.rounding_rule} onValueChange={(v) => set("rounding_rule", v)}>
              <Select.Trigger className="w-[160px]">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">Yok</Select.Item>
                <Select.Item value="ninety_nine">X.99</Select.Item>
              </Select.Content>
            </Select>
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-ui-border-base">
          <Button
            variant="primary"
            loading={save.isPending}
            onClick={() => save.mutate(form)}
          >
            Ayarlari kaydet
          </Button>
          {save.isSuccess && (
            <Text size="small" className="text-ui-fg-success ml-3">Kaydedildi</Text>
          )}
        </div>
      </Container>

      <AuditLogSection />
    </div>
  )
}

export default SettingsPage

function AuditLogSection() {
  const [show, setShow] = useState(false)
  const logs = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => adminFetch("/admin/audit-logs?limit=50"),
    enabled: show,
  })

  return (
    <Container className="p-0">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <Heading level="h1">Audit log</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Ayar ve yonetim eylemlerinin denetim kaydi
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setShow((v) => !v)}>
          {show ? "Gizle" : "Goster"}
        </Button>
      </div>
      {show && (
        <div className="px-6 pb-6 overflow-x-auto">
          {logs.isLoading ? (
            <Text size="small">Yukleniyor...</Text>
          ) : (logs.data?.logs || []).length === 0 ? (
            <Text size="small">Kayit yok</Text>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ui-fg-subtle border-b border-ui-border-base">
                  <th className="py-2 pr-4">Zaman</th>
                  <th className="py-2 pr-4">Eylem</th>
                  <th className="py-2 pr-4">Varlik</th>
                  <th className="py-2 pr-4">Aktor</th>
                  <th className="py-2">Degisiklik</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data?.logs || []).map((l: any) => (
                  <tr key={l.id} className="border-b border-ui-border-base last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge size="2xsmall">{l.action}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {l.entity}
                      {l.entity_id ? `:${String(l.entity_id).slice(0, 12)}` : ""}
                    </td>
                    <td className="py-2 pr-4">{l.actor_id || "-"}</td>
                    <td className="py-2 font-mono text-xs">
                      {l.diff ? JSON.stringify(l.diff).slice(0, 120) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Kinguin Ayarlar",
  icon: Adjustments,
})
