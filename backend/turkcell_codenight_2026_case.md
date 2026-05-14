
# TURKCELL CODENIGHT 2026
## TelcoGuard — Gerçek Zamanlı Şebeke İzleme ve Anomali Tespit Platformu

| Kriter | Detay |
|--------|-------|
| **Süre** | 10 Saat (18:00 – 04:00) |
| **Takım** | 3 Kişi |
| **AI Araçları** | Tamamen Serbest |
| **Backend** | Zorunlu (serbest dil/framework) |
| **Veritabanı** | En az 1 ilişkisel DB zorunlu |
| **Frontend** | Web veya Mobil (en az 1 platform) |

---

## İçindekiler

1. [Proje Tanımı](#1-proje-tanımı)
2. [Fonksiyonel Gereksinimler](#2-fonksiyonel-gereksinimler)
3. [Teknik Gereksinimler](#3-teknik-gereksinimler)
4. [Veritabanı Şeması](#4-veritabanı-şeması)
5. [API Endpoint Referansı](#5-api-endpoint-referansı)
6. [Kullanıcı Akışları](#6-kullanıcı-akışları)
7. [Simülatör Teknik Detayı](#7-simülatör-teknik-detayı)
8. [Örnek Seed Data](#8-örnek-seed-data)
9. [Kurallar](#9-kurallar)
10. [Teslimat](#10-teslimat)
11. [Önerilen Zaman Planı](#11-önerilen-zaman-planı)

---

## 1. Proje Tanımı

Turkcell'in şebeke operasyon merkezinin (NOC) kullandığı bir izleme platformunu geliştireceksiniz. Baz istasyonlarından akan telemetri verisi (sinyal güçlülüğü, paket kaybı, gecikme, CPU/bellek kullanımı, bağlı kullanıcı sayısı) gerçek zamanlı olarak işlenecek, görselleştirilecek ve anormal değerler tespit edildiğinde operatörlere alarm üretilecek.

Platform; bir **telemetri simülatörü** (veri üreten), bir **anomali tespit motoru** (kuralları işleyen), bir **alarm yönetim sistemi** (iş akışı) ve bir **canlı dashboard** (görselleştirme) olmak üzere dört temel bileşenden oluşur.

### 1.1 Senaryo

Turkcell şebekesinde yüzlerce baz istasyonu bulunmaktadır. Her istasyon düzenli aralıklarla performans metrikleri gönderir. Normal koşullarda metrikler belirli aralıklarda seyreder. Bir istasyonun CPU'su aniden %95'e çıktığında, paket kaybı eşik değeri aştığında veya bağlı kullanıcı sayısı beklenmedik biçimde düştüğünde operatörün bunu anında görmesi, alarmı değerlendirmesi ve müdahale sürecini başlatması gerekir.

### 1.2 Kullanıcı Rolleri

| Rol | Kim? | Ne Yapar? |
|-----|------|-----------|
| **NOC Operatörü** | 7/24 şebeke izleyen teknisyen | Dashboard izler, alarmları değerlendirir, saha mühendisine atar |
| **Saha Mühendisi** | Sahada müdahale eden mühendis | Atanan alarmları görür, müdahale eder, çözüm notu yazar |
| **Şebeke Yöneticisi** | Stratejik karar verici | Özet dashboard görür, trend ve bölge analizi yapar |

---

## 2. Fonksiyonel Gereksinimler

### 2.1 Kullanıcı Yönetimi (Zorunlu)

- Kullanıcı kaydı ve giriş (e-posta + şifre veya GSM + OTP simülasyonu)
- JWT tabanlı kimlik doğrulama
- Rol bazlı erişim: NOC Operatörü, Saha Mühendisi, Şebeke Yöneticisi, Admin
- Her rol için farklı dashboard görünümü ve yetki kapsamı

### 2.2 Baz İstasyonu ve Metrik Tanımları (Zorunlu)

- Baz istasyonu kaydı: ad, kod (BSC-001 formatı), konum (lat/lng), bölge, kapasite, tip (4G/5G)
- İstasyon durumu: Aktif, Uyarı, Kritik, Çevrimdışı
- Harita üzerinde tüm istasyonların durumuna göre renk kodlu gösterimi (yeşil/sarı/kırmızı/gri)

**Her istasyonun izlenecek metrikleri ve eşik değerleri:**

| Metrik | Birim | Normal Aralık | Uyarı Eşiği | Kritik Eşiği |
|--------|-------|---------------|-------------|--------------|
| CPU Kullanımı | % | 10-60 | > 75 | > 90 |
| Bellek Kullanımı | % | 20-70 | > 80 | > 95 |
| Paket Kaybı | % | 0-2 | > 5 | > 10 |
| Gecikme (Latency) | ms | 5-30 | > 50 | > 100 |
| Sinyal Güçlüğü (RSSI) | dBm | -70 ile -30 | < -80 | < -90 |
| Bağlı Kullanıcı | adet | 50-500 | > 800 veya < 10 | > 950 veya = 0 |

### 2.3 Telemetri Simülatörü (Zorunlu)

Gerçek baz istasyonu verisi kullanmayacaksınız. Kendi simülatörünüzü geliştirmeniz gerekiyor:

- Her istasyon için 3-5 saniye aralıklarla rastgele ama gerçekçi metrik üretimi
- Normal mod: metrikler normal aralıkta salınır (base ± noise yaklaşımıyla)
- Anomali enjeksiyonu: API üzerinden belirli bir istasyona anomali tetikleyebilmeniz gerekiyor

**Desteklenmesi gereken anomali senaryoları (en az 3 tanesi):**

| Senaryo | Davranış | Ne Olmalı? |
|---------|----------|------------|
| **CPU Spike** | CPU %95+ sürekli 30sn | Alarm üretilmeli: Kritik CPU |
| **Kullanıcı Düşüşü** | Bağlı kullanıcı %80 ani düşüş | Alarm üretilmeli: Kapsama kaybı |
| **Latency Burst** | Gecikme 200ms+ sürekli 1dk | Alarm üretilmeli: Bağlantı sorunu |
| **Paket Fırtınası** | Paket kaybı %15+ dalgalı | Alarm üretilmeli: Konfigürasyon hatası |
| **İstasyon Çöküşü** | Tüm metrikler 0, veri gelmiyor | Alarm üretilmeli: İstasyon çevrimdışı |

### 2.4 Anomali Tespit Motoru (Zorunlu)

Simülatörün ölçüm göndermesi üretmesi yetmez — sisteminizin metrikleri analiz edip anormal durumları tespit etmesi gerekiyor. Aşağıdaki yöntemlerden en az birini uygulayın:

- **Threshold (Minimum):** Yukarıdaki tablodaki eşik değerlerini kontrol edin. Eşik aşıldığında alarm
- **Hareketli Ortalama:** Son N ölçümün ortalamasından anlamlı sapma olduğunda alarm
- **Z-Score:** Metrik değerinin ortalamadan kaç standart sapma uzakta olduğunu hesaplayın. |z| > 2 uyarı, |z| > 3 kritik
- **Korelasyon:** Birden fazla metrikte eş zamanlı bozulma varsa (CPU + latency birlikte yükseliyor) alarm şiddetini artır

> **Not:** Birden fazla yöntemi birleştirmeniz ekstra değerlendirilir. Eşik değerleri veritabanında konfigüre edilebilir olmalı, hard-coded olmamalı.

### 2.5 Alarm Yönetimi (Zorunlu)

Anomali tespit edildiğinde alarm üretilmeli ve aşağıdaki yaşam döngüsüne sahip olmalıdır:

- **Otomatik alarm üretimi:** hangi istasyon, hangi metrik, şiddet seviyesi, zaman
- **Alarm seviyeleri:** Uyarı (sarı) ve Kritik (kırmızı)
- **Alarm durumu:** Açık → Kabul Edildi → Müdahale Ediliyor → Çözüldü
- Alarmı saha mühendisine atayabilme
- Saha mühendisi alarmı kapatırken çözüm açıklaması yazmalı
- Alarm geçmişi: tarih, seviye, istasyon ve duruma göre filtreleme
- **Tekrar eden alarm birleştirme:** aynı istasyonun aynı metriki için 5dk içinde yeni alarm açılmamalı, mevcut alarm güncellensin

### 2.6 Dashboard ve Görselleştirme (Zorunlu)

- **Canlı özet panel:** toplam istasyon, aktif alarm sayısı, kritik alarm sayısı
- **Harita görünümü:** istasyonlar durumuna göre yeşil/sarı/kırmızı/gri pin
- **İstasyon detay paneli:** tıklanan istasyonun tüm metriklerinin zaman serisi grafikleri (son 5-10 dakika)
- **Alarm listesi:** filtrelenebilir tablo, renk kodlu şiddet, durum göstergesi
- **Metrik grafikleri:** çizgi grafik ile zaman serisi gösterimi, eşik çizgileri görünür olmalı

### 2.7 Bonus Özellikler (Opsiyonel)

- Gerçek zamanlı veri akışı (WebSocket/SSE) ile canlı grafik güncellemesi
- Metrik korelasyon analizi: birden fazla metrikteki eş zamanlı bozulmayı tespit
- Bölge bazlı özet: şehir/bölge düzeyinde sağlık skoru
- Alarm önceliklendirme: etkilenen kullanıcı sayısına göre otomatik öncelik
- SLA takibi: uptime yüzdesi hesaplama ve gösterimi
- Export: alarm ve metrik verilerini CSV olarak indirme

---

## 3. Teknik Gereksinimler

### 3.1 Backend

- Dil/Framework: serbestsiniz — Node.js, Python, Java, C#, Go...
- RESTful API tasarımı
- Authentication: JWT + Refresh Token
- Simülatör modülü: ayrı servis veya backend içi background job
- Anomali tespit motoru: simülatörden bağımsız çalışan kural işleyici
- Input validasyonu ve global hata yönetimi

### 3.2 Veritabanı

- En az bir ilişkisel veritabanı (PostgreSQL, MySQL, SQL Server)
- Telemetri verisi için ek olarak zaman serisi DB (TimescaleDB, InfluxDB) veya NoSQL (MongoDB, Redis) kullanımı önerilir ama zorunlu değil
- Seed data: en az 15 baz istasyonu, 3 farklı bölge, eşik konfigürasyonları
- Telemetri verisi için uygun indeksleme (station_id + timestamp)
- Migration dosyaları ile versiyonlanmış şema

### 3.3 Frontend

Web veya mobil uygulama geliştirilebilir. Her iki seçeneğe de eşit puan verilir.

- Harita entegrasyonu (Google Maps, Mapbox, Leaflet)
- Gerçek zamanlı güncellenen çizgi grafikleri (Recharts, Chart.js, D3.js...)
- Dashboard layout: özet kartlar + harita + alarm listesi + metrik grafikleri tek ekranda
- Loading, error ve empty state yönetimi

### 3.4 Mimari

- Katmanlı mimari: API — Servis — Repository katmanları ayrışmış olmalı
- Simülatör, ana API'den bağımsız çalışabilmeli
- Eşikler hard-coded değil, veritabanından okunmalı
- API versiyonlama (`/api/v1/...`) ve standart response formatı

---

## 4. Veritabanı Şeması (Referans)

Aşağıdaki şema öneridir. Genişletebilir veya kendi tasarımınızı kullanabilirsiniz.

### BaseStations

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| id | UUID / SERIAL | Evet | Primary Key |
| code | VARCHAR(20) | Evet | BSC-001 formatında benzersiz kod |
| name | VARCHAR(200) | Evet | İstasyon adı (örn: Levent-K1) |
| latitude / longitude | DECIMAL | Evet | Konum |
| region | VARCHAR(50) | Evet | Bölge (Marmara, Ege...) |
| type | ENUM | Evet | LTE, NR_5G |
| capacity | INTEGER | Evet | Maks. kullanıcı kapasitesi |
| status | ENUM | Evet | ACTIVE, WARNING, CRITICAL, OFFLINE |

### Metrics (Zaman Serisi)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| id | BIGSERIAL | Evet | Primary Key |
| station_id | FK → BaseStations | Evet | Kaynak istasyon |
| timestamp | TIMESTAMPTZ | Evet | Ölçüm anı |
| cpu_usage | DECIMAL(5,2) | Evet | CPU % |
| memory_usage | DECIMAL(5,2) | Evet | Bellek % |
| packet_loss | DECIMAL(5,2) | Evet | Paket kaybı % |
| latency | DECIMAL(8,2) | Evet | Gecikme (ms) |
| rssi | DECIMAL(6,2) | Evet | Sinyal güçlüğü (dBm) |
| connected_users | INTEGER | Evet | Bağlı kullanıcı |

### Alarms

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| id | UUID / SERIAL | Evet | Primary Key |
| station_id | FK → BaseStations | Evet | Kaynak istasyon |
| metric_name | VARCHAR(50) | Evet | Hangi metrik tetikledi |
| severity | ENUM | Evet | WARNING, CRITICAL |
| status | ENUM | Evet | OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED |
| message | TEXT | Evet | Alarm açıklaması |
| assigned_to | FK → Users | Hayır | Atanan saha mühendisi |
| resolution_note | TEXT | Hayır | Çözüm açıklaması |
| created_at | TIMESTAMPTZ | Evet | Alarm zamanı |
| resolved_at | TIMESTAMPTZ | Hayır | Çözüm zamanı |

> **Ek olarak** `ThresholdConfigs` tablosu oluşturmanız beklenir: her metrik için uyarı ve kritik eşikleri, yön (above/below) ve aktiflik durumu.

---

## 5. API Endpoint Referansı

### 5.1 Auth

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/auth/register` | Kayıt |
| POST | `/api/v1/auth/login` | Giriş, JWT dönüşü |

### 5.2 Stations & Metrics

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/stations` | Tüm istasyonlar (durum, konum) |
| GET | `/api/v1/stations/:id` | İstasyon detayı |
| GET | `/api/v1/stations/:id/metrics?from=X&to=Y` | Zaman serisi metrikleri |
| GET | `/api/v1/stations/:id/metrics/latest` | Son ölçüm |
| POST | `/api/v1/stations/:id/metrics` | Metrik gönder (simülatör) |
| GET | `/api/v1/dashboard/summary` | Özet istatistikler |

### 5.3 Alarms

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/alarms?severity=X&status=Y&station=Z` | Alarmları filtrele |
| PATCH | `/api/v1/alarms/:id/acknowledge` | Alarmı kabul et |
| PATCH | `/api/v1/alarms/:id/assign` | Saha mühendisine ata |
| PATCH | `/api/v1/alarms/:id/resolve` | Çözüldü işaretle + çözüm notu |

### 5.4 Simulator Control

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/v1/simulator/start` | Simülatörü başlat |
| POST | `/api/v1/simulator/stop` | Simülatörü durdur |
| POST | `/api/v1/simulator/inject-anomaly` | Anomali enjekte et (station_id, type, duration) |

---

## 6. Kullanıcı Akışları

### 6.1 NOC Operatörü

1. Dashboard'a giriş → 2. Haritada tüm istasyonları gör → 3. Alarm geldiğinde alarm listesine bak → 4. Alarmı kabul et → 5. İstasyonun metrik geçmişine bak → 6. Alarmı saha mühendisine ata veya kendi çöz.

### 6.2 Saha Mühendisi

1. Atanan alarmları gör → 2. İstasyon detayını ve metrik geçmişini incele → 3. Müdahale et → 4. Alarmı çözüm notuyla kapat.

### 6.3 Sunum Demo Akışı

Sunumunuzda aşağıdaki uçtan uca akışı canlı gösterin:

1. Simülatörü başlat → harita yeşil → 2. Anomali enjekte et → 3. Pin kırmızıya döner + alarm listesine düşer + grafikte spike görünür → 4. Alarmı kabul et ve ata → 5. Çözüm notuyla kapat → 6. İstasyon yeşile döner.

> **Kritik:** Bu uçtan uca akışı başarıyla gösteremezseniz diğer özellikler ikincil kalır.

---

## 7. Simülatör Teknik Detayı

### 7.1 Metrik Üretim Yaklaşımı

Her istasyon için bağımsız metrik üretin. Önerilen formül:

```
deger = base + random(-noise, +noise)
```

**Örnek:** CPU için `base = 35`, `noise = 15` ise değerler her tick'te 20-50 arasında salınır.

### 7.2 Anomali Enjeksiyonu

`POST /api/v1/simulator/inject-anomaly` request formatı:

```json
{
  "station_id": "uuid",
  "anomaly_type": "CPU_SPIKE | USER_DROP | LATENCY_BURST | PACKET_STORM | STATION_DOWN",
  "duration_seconds": 60
}
```

Simülatör, belirtilen süre boyunca ilgili metrikleri anormal değerlere çeker. Süre dolduğunda normal moduna döner.

### 7.3 Önemli Tavsiye

> Simülatör çalışmıyorsa hiçbir şey çalışmaz. İlk 2 saatte simülatörün metrik üretip veritabanına yazdığından emin olun. Her şeyi paralel başlatmaya çalışmak yerine önce veri akacak boruyu sağlamlaştırın.

---

## 8. Örnek Seed Data

İstanbul, Ankara veya İzmir'den birini seçerek en az 15 istasyon tanımlayın. Koordinatlar gerçekçi olmalıdır:

| Kod | Ad | Bölge | Tip | Kapasite |
|-----|-----|-------|-----|----------|
| BSC-001 | Levent-K1 | Marmara | NR_5G | 1000 |
| BSC-002 | Kadıköy-M3 | Marmara | LTE | 800 |
| BSC-003 | Taksim-A2 | Marmara | NR_5G | 1200 |
| ... | ... | ... | ... | ... |

> **En az 15 istasyon tanımlayın.**

---

## 9. Kurallar

### 9.1 Genel

- Takım: 3 kişi, değiştirilemez
- Süre: 18:00 – 04:00 (10 saat, uzatma yok)
- Tüm takımlar aynı case'i çözer
- AI araçları (Copilot, ChatGPT, Claude, Cursor vb.) tamamen serbest
- Boş proje scaffold/boilerplate ile başlamak serbest
- Önceden yazılmış iş mantığı kodu ile başlamak yasak

### 9.2 Diskalifiye Koşulları

- Backend olmayan projeler değerlendirme dışıdır
- Veritabanı olmayan projeler değerlendirme dışıdır
- Simülatörü olmayan (statik veri gösteren) projeler değerlendirme dışıdır
- Çalışmayan (build edilemeyen) projeler değerlendirme dışıdır

---

## 10. Teslimat

### 10.1 Kod

- GitHub/GitLab repository (public veya davetli erişim)
- Ana branch'te çalışır durumda kod
- Anlamlı commit geçmişi (tek commit kabul edilmez)
- `.gitignore`, `.env.example` dosyaları

### 10.2 Dokümantasyon

- `README.md`: proje açıklaması, kurulum, teknoloji stack, ekran görüntüleri
- API dokümantasyonu (Swagger/Postman/README içi)
- Anomali tespit algoritmasının açıklaması (hangi yöntem, neden, nasıl)

### 10.3 Sunum (Maks. 10 Dakika)

- **Canlı demo (3-4dk):** Simülatör başlat → Anomali enjekte → Alarm üretilir → Atama → Çözüm
- **Teknik mimari (3dk):** diyagram, simülatör-backend-frontend akışı, anomali tespit yaklaşımı
- **Zorluklar ve çözümler (2dk)**
- **Bonus özellikler (1dk)**

---

## 11. Önerilen Zaman Planı

Bu plan bir öneridir; kendi stratejinizi belirleyebilirsiniz.

| Saat | Süre | Aktivite |
|------|------|----------|
| 18:00 - 18:45 | 45 dk | Case okuma, strateji, teknoloji seçimi, iş bölümü (öneri: 1 simülatör, 1 API, 1 frontend) |
| 18:45 - 20:00 | 1.25 saat | Proje iskeleti, DB şeması, auth, istasyon CRUD, simülatör temel çerçevesi |
| 20:00 - 22:00 | 2 saat | Simülatör metrik üretimi, anomali tespit motoru, alarm CRUD, dashboard iskeleti |
| 22:00 - 22:30 | 30 dk | Ara + durum değerlendirme. **Kritik:** simülatör çalışıyor mu? Alarm üretiliyor mu? |
| 22:30 - 01:00 | 2.5 saat | Harita, grafik bileşenleri, alarm yönetim paneli, anomali enjeksiyon API |
| 01:00 - 02:30 | 1.5 saat | Test, bug fix, end-to-end demo kontrolü, UI polish |
| 02:30 - 03:30 | 1 saat | Dokümantasyon, README, sunum hazırlığı |
| 03:30 - 04:00 | 30 dk | Son kontroller, demo rehearsal, teslimat |

---

> Sorularınız için mentorlara danışabilirsiniz. Mentorlar teknik yönlendirme yapabilir ancak kod yazamazlar.

**Başarılar! 📡 Şebeke sağlam, kod sağlam.**
