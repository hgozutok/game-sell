$ErrorActionPreference = 'Stop'
$path = (Resolve-Path 'publish\README.md').Path
$txt = [IO.File]::ReadAllText($path)

$section3 = @'
## 3) Yayın: Cloudflare Tunnel (birincil)

TLS ve yönlendirme **Cloudflare Tunnel** ile yapılır: sunucuda 80/443 açmak, sertifika
yönetmek gerekmez. Tünel host'ta çalışır ve loopback portlarına bağlanır.

Tünelin **Public Hostnames** tablosu:

| Hostname | Service |
|---|---|
| `hupiplay.uk` | `http://127.0.0.1:13000` |
| `www.hupiplay.uk` | `http://127.0.0.1:13000` |
| `new.hupiplay.uk` | `http://127.0.0.1:13000` |
| `api.hupiplay.uk` | `http://127.0.0.1:13100` |

> cloudflared bir konteyner içinde ve bu compose ağındaysa `http://storefront:3000`
> ve `http://backend:9000` de kullanılabilir. Host'ta çalışıyorsa yukarıdaki loopback
> adresleri geçerlidir.

Public hostname eklenince Cloudflare DNS kaydını (`CNAME → <uuid>.cfargotunnel.com`,
proxied) otomatik oluşturur; elle A kaydı gerekmez.

Doğrulama:

```bash
curl -I https://new.hupiplay.uk                    # 200
curl -I https://new.hupiplay.uk/_next/static/...   # 200 (chunk'lar da gelmeli)
sudo systemctl status cloudflared                   # veya: docker logs <cloudflared>
```

### 530 / ChunkLoadError teşhisi

`530` = Cloudflare origin'e ulaşamıyor. Sırayla kontrol:

1. Hostname tünelde tanımlı mı? (Zero Trust → Networks → Tunnels → Public Hostnames)
2. cloudflared bağlı mı? Logda `Registered tunnel connection` görünmeli.
3. Service adresi doğru mu? Host modunda `127.0.0.1:13000`, konteyner modunda `storefront:3000`.
4. DNS kaydı Cloudflare'de **proxied** mi?

### Opsiyonel: yerel Nginx (127.0.0.1:8080, TLS'siz)

Tünel kullanmıyorsanız veya arada yerel bir proxy istiyorsanız `nginx/hupiplay.conf`
kullanılabilir. Bu dosya 80/443 ve sertifika kullanmaz; yalnızca `127.0.0.1:8080`
portunu dinler ve `Host` başlığına göre mağazaya/backende yönlendirir. Böylece sunucudaki
başka uygulamalarla çakışmaz.

```bash
sudo cp nginx/hupiplay.conf /etc/nginx/sites-available/hupiplay.conf
sudo ln -sf /etc/nginx/sites-available/hupiplay.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
curl -I -H "Host: hupiplay.uk" http://127.0.0.1:8080/
```

Bu proxy'yi tünelle birlikte kullanacaksanız tünel service adreslerini
`http://127.0.0.1:8080` yapın.

### Yeni alt alan adı ekleme (ör. `new.hupiplay.uk`)

1. **Tünel:** Zero Trust → Networks → Tunnels → Public Hostnames → `new.hupiplay.uk` →
   `http://127.0.0.1:13000` ekle. DNS kaydı otomatik oluşur.
2. **CORS:** `.env` içindeki `STORE_CORS / ADMIN_CORS / AUTH_CORS` listelerinde
   `https://new.hupiplay.uk` bulunmalı (bu pakette ekli). Sonra:
   ```bash
   docker compose up -d --force-recreate backend
   ```
3. **Kanonik adres:** sitemap/kanonik `NEXT_PUBLIC_SITE_URL` değerini kullanır. `new.`
   kalıcı adres olacaksa `.env`'de `NEXT_PUBLIC_SITE_URL=https://new.hupiplay.uk` yapıp
   `docker compose up -d --build storefront`.

'@

$section3 = $section3 -replace "`r`n", "`n"

# 1) Bölüm 3'ü değiştir
$txt = [regex]::Replace($txt, '(?s)## 3\).*?(?=## 4\))', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $section3 })

# 2) Diğer certbot/Nginx referanslarını düzelt
$txt = [regex]::Replace($txt, '(?m)^- Nginx \+ certbot.*$', '- Cloudflare Tunnel (cloudflared) veya yerel Nginx (opsiyonel, TLS''siz)')
$txt = [regex]::Replace($txt, '(?m)^Origin''de ge.*$', 'Tünel kullanıyorsanız origin sertifikası gerekmez; proxy''siz (gri bulut) kullanacaksanız A kaydı + sertifika gerekir.')
$txt = [regex]::Replace($txt, '(?m)^\| HTTP''de kald.*$', '| HTTP''de kaldı | Cloudflare SSL modunu Full (strict) yapın; tünelde hostname tanımlı mı kontrol edin |')

[IO.File]::WriteAllText($path, $txt, (New-Object System.Text.UTF8Encoding($false)))

# 3) Kontrol
$after = [IO.File]::ReadAllText($path)
"baslik dogru: " + $after.Contains('## 3) Yay' + [char]0x0131 + 'n: Cloudflare Tunnel')
"certbot kaldi mi: " + $after.Contains('certbot')
"sections:"
Select-String -Path $path -Pattern '^## ' | ForEach-Object { $_.LineNumber.ToString() + ": " + $_.Line }
