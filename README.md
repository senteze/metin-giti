# Metin Giti

**Metin Giti**, Obsidian içinde tek bir `.md` dosyası için geliştirilmiş; `commit`, `branch`, `merge` gibi teknik Git karmaşası olmadan çalışan, tamamen Türkçe ve insan odaklı doğrusal sürüm kontrol eklentisidir.

## Temel Özellikler

- **Tek Tıkla Hızlı Kayıt ve Dosya Bazlı İsimlendirme**
  - Sol şerit (ribbon) ve komut paleti üzerinden pencere açmadan anında **Hızlı Sürüm Kaydet** veya açıklamalı **Sürüm Kaydet**.
  - Her dosya için ayrı ayrı seçilebilen otomatik isimlendirme biçimi: sıralı numara (`v1, v2, v3...`) veya tarih ve saat (`GG.AA.YYYY SS:DD`).

- **Sessiz Otomatik Yedekleme**
  - Ayarlanabilir bekleme süresi (debounce) ile son düzenlemeden sonra arka planda sessiz yedekleme.
  - Geri yükleme koruması sayesinde eski bir sürüme dönüldüğünde gereksiz otomatik yedek tetiklenmez.
  - SHA-256 içerik özetiyle birebir aynı içerikler tekrar kaydedilmez; dosya başına en fazla son 30 otomatik yedek tutulur, manuel kayıtlar asla otomatik silinmez.

- **Doğrusal Zaman Çizelgesi Paneli**
  - Sağ kenar çubuğunda aktif notun sürüm geçmişini en yeni en üstte olacak şekilde listeler.
  - Manuel kayıtlar arasındaki otomatik yedekleri katlanabilir gruplar halinde toplayarak görsel kalabalığı önler.
  - **Eski Haline Dön** işleminde mevcut içerik geçmişte yoksa önce güvenlik yedeği alır; **Dışa Aktar** ile seçilen sürümü aynı klasöre bağımsız `.md` dosyası olarak kaydeder.

- **Bölüm Bazlı 2 Sütunlu Fark Karşılaştırma ve Parçalı Geri Kazanım**
  - Notları Markdown başlıklarına (`#` – `####`) göre bölümlere ayırarak **Yan Yana** (varsayılan) veya **Tek Sütun** görünümünde karşılaştırır.
  - Değişen satırlarda kelime bazlı vurgulama yapar; değişmeyen bölümleri gizleyip gösterme filtresi ve esnek iki sürüm seçimi sunar.
  - Eski sürümlerdeki bölümleri tek tıkla **Parçayı Kopyala** veya **Güncel Dosyaya Al** ile geri kazandırır.

- **Sol Dosya Gezgini Rozetleri ve Güvenli Silme**
  - Sol dosya gezgininde sürüm geçmişi bulunan notların yanında canlı sürüm sayısı rozeti gösterir (tıklandığında ilgili notun zaman çizelgesini açar).
  - Sürüm geçmişi olan bir not silindiğinde geçmişin korunması veya kalıcı olarak silinmesi için onay penceresi sunar.

- **Temiz ve Taşınabilir Depolama**
  - Notların YAML frontmatter alanına dokunmaz.
  - Tüm geçmiş verilerini kasa kökündeki gizli `.metin-giti/` klasöründe (`app.vault.adapter` üzerinden, masaüstü ve mobil uyumlu) saklar; dosya taşıma/yeniden adlandırmada geçmişi korur.

## Kurulum

### Manuel Kurulum

1. Eklentinin `main.js`, `manifest.json` ve `styles.css` dosyalarını kasanızdaki `.obsidian/plugins/metin-giti/` klasörüne kopyalayın.
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
