# OpenCellID Türkcell Veri Çekme

OpenCellID'in public harita endpoint'inden ya da token izin verirse veri indirme akışından gerçek Turkcell baz istasyonu verilerini çekmek için kullanılan script.

## Kurulum

No extra Python packages are required. The script uses the standard library.

## Kullanım

```bash
# Temel kullanım (yaklaşık 2000 istasyon, SQL + JSON)
python3 fetch_opencellid.py YOUR_API_KEY

# Sadece SQL output
python3 fetch_opencellid.py YOUR_API_KEY --output sql

# Sadece JSON output
python3 fetch_opencellid.py YOUR_API_KEY --output json

# 2000 istasyon hedefi
python3 fetch_opencellid.py YOUR_API_KEY --limit 2000
```

## Örnek

```bash
python3 fetch_opencellid.py 1234567890abcdef --output both --limit 30
```

## Çıktı

Script başarılı olursa şu dosyaları oluşturur:
- `base_stations_opencellid.sql` — SQL INSERT statements
- `base_stations_opencellid.json` — JSON format

## Veri Kaynağı

- **Endpoint:** `https://opencellid.org/ajax/getCells.php`
- **Filtre:** Türkiye (MCC 286) + Turkcell net değeri `1`
- **Dağılım:** Marmara, Ege, İç Anadolu, Akdeniz, Karadeniz, Güneydoğu ve Doğu Anadolu arasında dengeli toplama
- **Format:** GeoJSON FeatureCollection
- **Teknoloji:** OpenCellID'deki `radio` alanından LTE / NR_5G türetimi

## API Anahtarı Alma

1. https://opencellid.org/ adresini ziyaret et
2. API anahtarını al
3. Script'i çalıştır

> Not: Public map endpoint anahtar olmadan da çalışabilir. Script, anahtar verilirse `key` query parametresi olarak iletir.

## Notlar

- Script, public map endpoint'i için standart kütüphane kullanır
- Koordinatlar gerçek konumlardan alınır
- Bölgeler koordinatlara göre otomatik belirlenir
- Kapasite tahmini teknoloji türüne göre yapılır
