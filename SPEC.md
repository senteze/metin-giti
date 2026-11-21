# Metin Giti — Teknik Şartname (SPEC)

## 1. Proje Tanımı
**Metin Giti**, Obsidian içinde tek bir `.md` dosyası için doğrusal (branch/merge olmayan) sürüm kontrolü sağlayan bir topluluk eklentisidir. Kullanıcıların notlarının geçmişini zahmetsizce saklamasını, adlandırılmış manuel sürümler oluşturmasını ve arka planda sessizce otomatik yedekler almasını amaçlar.

## 2. Dil ve Terminoloji
- Arayüz tamamen doğal **Türkçe** olacaktır (ör. `"Sürüm Kaydet"`, `"Eski Haline Dön"`, `"Parçayı Al"`).
- `commit`, `branch`, `repo`, `checkout`, `merge` gibi teknik Git terimleri kullanıcı arayüzünde **kesinlikle yasaktır**.

## 3. Mimari ve Teknoloji Kısıtları
- **Saf TypeScript** + **Obsidian DOM yardımcıları** (`createEl`, `createDiv`, `createSpan`) kullanılacaktır.
- React, Svelte veya benzeri harici UI kütüphaneleri **kullanılmayacaktır**.
- `innerHTML` ve `outerHTML` kullanımı **kesinlikle yasaktır**.
- Mobil uyumluluk için Node `fs` veya Electron'a özgü API'ler yerine Obsidian'ın yerleşik API'leri kullanılacaktır.

## 4. Depolama Yapısı
- Tüm veriler kasa (vault) kökünde `.metin-giti/` gizli klasöründe saklanır.
- Tüm dosya okuma, yazma, silme ve klasör oluşturma işlemleri Node `fs` yerine `app.vault.adapter` üzerinden yapılacaktır.

```text
.metin-giti/
├── index.json
└── history/
    └── <docId>/
        ├── meta.json
        └── <versionId>.md
```

## 5. Dosya Takibi
- Notların YAML frontmatter alanına **DOKUNULMAYACAKTIR**.
- `.metin-giti/index.json` içinde `dosyaYolu -> docId` eşleşmesi tutulacaktır.
- Dosya yeniden adlandırma ve silme işlemleri `vault.on('rename')` ve `vault.on('delete')` olayları ile dinlenerek `index.json` güncel tutulacaktır.

## 6. Sürüm Saklama Kuralları
- Her sürüm `.metin-giti/history/<docId>/<versionId>.md` dosyası olarak tam metin (snapshot) şeklinde saklanır.
- Sürüm üst verileri (kimlik, tür, etiket, açıklama, tarih, içerik özeti/hash) `.metin-giti/history/<docId>/meta.json` dosyasında tutulur.
- **Hash Tekilleştirme:** İçerik hash kontrolü yapılarak son sürümle birebir aynı içeriğe sahip notlar tekrar kaydedilmeyecektir.
- **Otomatik Yedek Sınırı:** Otomatik yedekler dosya başına **son 30** adet ile sınırlı olacaktır; 30'u aşan en eski otomatik yedekler ve ilgili `.md` dosyaları temizlenir.
- **Manuel Kayıt Koruması:** Kullanıcının elle kaydettiği sürümler **asla otomatik silinmeyecektir**.

## 7. Stil ve CSS Kuralları
- Tüm CSS sınıfları `.mg-` ön eki alacaktır (ör. `.mg-modal-actions`, `.mg-status-bar`).
- Sabit renk kodları yerine Obsidian CSS değişkenleri (`var(--background-primary)`, `var(--text-normal)`, `var(--text-muted)`, `var(--background-modifier-border)` vb.) kullanılacaktır.
