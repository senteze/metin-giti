[English](README.md) | **Türkçe**

# Metin Giti

**Metin Giti**, Obsidian içinde tekil Markdown (`.md`) notları için geliştirilmiş; `commit`, `branch`, `merge` gibi teknik Git karmaşası olmadan çalışan, tamamen insan odaklı doğrusal sürüm geçmişi eklentisidir.

## Temel Özellikler

- **Hızlı ve Manuel Sürüm Kaydetme**
  - Sol şerit (ribbon) ve komut paleti üzerinden pencere açmadan tek tıkla **Hızlı Sürüm Kaydet** veya özel ad ve açıklamayla **Sürüm Kaydet**.
  - Dosya bazlı otomatik isimlendirme tercihi: sıralı numara (`v1, v2, v3...`) veya tarih ve saat (`GG.AA.YYYY SS:DD`).

- **Akıllı Otomatik Yedekleme ve Taşınmaya Dayanıklı Takip**
  - Ayarlanabilir bekleme süresiyle (dakika cinsinden debounce) arka planda sessiz yedekleme ve durum çubuğu göstergesi.
  - Geri yükleme koruması sayesinde eski bir sürüme dönüldüğünde gereksiz otomatik yedek tetiklenmez.
  - SHA-256 içerik özetiyle birebir aynı içerikler tekrar kaydedilmez; dosya başına en fazla son 30 otomatik yedek tutulur, manuel kayıtlar asla otomatik silinmez.
  - **Tüm dosyalar** veya **Sadece takip edilen dosyalar** modu; otomatik tamamlamalı (`AbstractInputSuggest`) yol seçici, kasa varlık doğrulaması, yeşil bağlantı durumu ikonu, geçmişi kirletmeyen **Test Et** butonu ve dosya taşınsa bile takibi koruyan `autoBackupTracked` üst verisi.

- **Doğrusal Zaman Çizelgesi Paneli (`metin-giti-timeline`)**
  - Manuel kayıtları en yeni en üstte olacak şekilde sürüm adı, tarih-saat ve açıklamasıyla listeler.
  - Aradaki otomatik yedekleri katlanabilir gruplar halinde toplayarak görsel kalabalığı önler.
  - **Eski Haline Dön** (mevcut içerik geçmişte yoksa önce güvenlik yedeği alır), **Dışa Aktar** (aynı klasöre çakışmasız `.md` kopyası oluşturur) ve **Sil** (onay penceresi ve SHA-256 güvenli snapshot temizliğiyle tekil sürüm silme) aksiyonları sunar.

- **2 Sütunlu Yan Yana Bölüm Farkı ve Parçalı Geri Kazanım (`metin-giti-diff`)**
  - Notları Markdown başlıklarına (`#`–`####`) göre bölümlere ayırır; herhangi iki sürümü veya bir sürümü **Güncel Hal** ile **Yan Yana** (varsayılan) ya da **Tek Sütun** görünümünde karşılaştırır.
  - Kelime bazlı vurgulama (`diffWords`), değişmeyen bölümleri gizleme filtresi, **Yer Değiştir** butonlu sol/sağ seçiciler ve zaman çizelgesinden **2 Sürüm Karşılaştır** seçimi içerir.
  - **Parçayı Kopyala** ve **Güncel Dosyaya Al** butonlarıyla eski sürümlerdeki bölümleri tek tıkla geri kazandırır.

- **Sol Dosya Gezgini Rozetleri ve Güvenli Silme**
  - Sol dosya gezgininde sürüm geçmişi bulunan `.md` notlarının yanında canlı sürüm sayısı rozeti (tıklandığında notun zaman çizelgesini açar) ve otomatik yedekleme kapsamındaki klasörlerde koruma ikonu gösterir.
  - Geçmişi olan bir not silindiğinde **Geçmişi Koru** veya **Geçmişi de Sil** onay penceresi sunar.

- **Çift Dilli Arayüz (TR / EN) ve Temiz Depolama**
  - Obsidian diline (`moment.locale()`) otomatik uyum sağlar veya **Ayarlar → Metin Giti** üzerinden (`Otomatik`, `Türkçe`, `English`) seçilebilir.
  - Notların YAML frontmatter alanına dokunmaz. Tüm verileri kasa kökündeki gizli `.metin-giti/` klasöründe `app.vault.adapter` üzerinden (masaüstü ve mobil uyumlu) saklar.

## Kurulum

### Manuel Kurulum

1. `main.js`, `manifest.json` ve `styles.css` dosyalarını kasanızdaki `<Kasanız>/.obsidian/plugins/metin-giti/` klasörüne kopyalayın.
2. Obsidian'da **Ayarlar → Topluluk eklentileri** bölümünden **Metin Giti** eklentisini etkinleştirin.

### Geliştirici Kurulumu

```bash
npm install
npm run build
```

## Ekran Görüntüleri

<!-- Ekran görüntüleri buraya eklenecektir:
![Zaman Çizelgesi](docs/timeline.png)
![Yan Yana Karşılaştırma](docs/diff-split.png)
-->

## Lisans

[MIT](LICENSE)
