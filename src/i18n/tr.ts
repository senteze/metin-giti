export const tr = {
	// Commands & Ribbon
	cmdShowHistory: 'Sürüm Geçmişini Göster',
	cmdSaveVersion: 'Sürüm Kaydet',
	cmdQuickSave: 'Hızlı Sürüm Kaydet',
	cmdToggleTracking: 'Bu dosya için sürüm takibini aç/kapat',

	// Notices
	noticeOpenNoteFirst: 'Sürüm kaydetmek için önce bir not açmalısınız.',
	noticeQuickSaved: 'Hızlı sürüm kaydedildi: {label}',
	noticeNoChangesQuick: 'Değişiklik yok, yeni sürüm alınmadı',
	noticeUnsupportedFile: 'Bu dosya türü desteklenmiyor.',
	noticeSaveError: 'Sürüm kaydedilirken bir hata oluştu.',
	noticeTrackingDisabled: '"{name}" için sürüm takibi kapatıldı.',
	noticeTrackingEnabled: '"{name}" sürüm takibine alındı.',
	noticeHistoryDeleted: 'Dosya sürüm geçmişi silindi',
	noticeVersionSaved: 'Sürüm kaydedildi.',
	noticeNoChangesSinceLast: 'Son sürümden bu yana değişiklik yok.',

	// Settings
	settingLanguageName: 'Dil / Language',
	settingLanguageDesc: 'Eklenti arayüzünün görüntüleneceği dili seçin.',
	settingLanguageAuto: 'Otomatik (Obsidian dili)',
	settingLanguageTr: 'Türkçe',
	settingLanguageEn: 'English',
	settingAutoBackupName: 'Otomatik yedekleme',
	settingAutoBackupDesc:
		'Etkin notta değişiklik yapıldığında arka planda sessizce yedek alır.',
	settingIntervalName: 'Otomatik yedekleme bekleme süresi (dakika)',
	settingIntervalDesc:
		'Son değişiklikten sonra otomatik yedek alınmadan önce beklenecek süre (en az 1 dakika).',
	settingTrackingModeName: 'Takip modu',
	settingTrackingModeDesc:
		'Otomatik yedeklemenin tüm notlar için mi yoksa yalnızca seçtiğiniz notlar için mi çalışacağını belirleyin.',
	settingTrackingAll: 'Tüm dosyalar',
	settingTrackingOnly: 'Sadece takip edilen dosyalar',
	settingNamingFormatName: 'Varsayılan / Hızlı kayıt isimlendirme biçimi',
	settingNamingFormatDesc:
		'Dosya için özel bir seçim yapılmadığında kullanılacak varsayılan etiket biçimini seçin.',
	namingOptionDate: 'Tarih ve saat (GG.AA.YYYY SS:DD)',
	namingOptionSequence: 'Sıralı numara (v1, v2, v3...)',
	settingExplorerBadgesName: 'Dosya gezgininde sürüm rozetlerini göster',
	settingExplorerBadgesDesc:
		'Sol dosya gezgininde sürüm geçmişi olan notların yanında sürüm sayısı rozetini gösterir.',
	settingTrackedPathsName: 'Takip edilen dosya ve klasörler',
	settingTrackedPathsDesc:
		'Dosya yolu (örn. Notlar/tez.md) veya klasör yolu (örn. Projeler/ ya da Dersler/Mekatronik) ekleyin.',
	settingTrackedPathsPlaceholder: 'Örn. Projeler/ veya Notlar/tez.md',
	btnAddTrackedPath: 'Ekle',
	btnRemoveTrackedPath: 'Kaldır',
	btnTestTrackedPath: 'Test Et',
	settingTrackedPathsEmpty: 'Henüz takip edilen dosya veya klasör eklenmedi.',
	noticePathNotFound: 'Belirtilen dosya veya klasör kasada bulunamadı',
	noticeTestSuccess: '"{path}" için otomatik yedekleme bağlantısı doğrulandı.',
	noticeTestStorageError: 'Depolama erişimi doğrulanamadı.',
	tooltipAutoBackupConnected: 'Otomatik yedekleme bağlı ve aktif',
	tooltipPathNotFound: 'Klasör/dosya bulunamadı',
	tooltipFolderAutoBackupActive: 'Otomatik yedekleme aktif',

	// Status bar
	statusAutoBackupOff: 'Oto-yedek kapalı',
	statusLastBackupEmpty: 'Son yedek: —',
	statusLastBackupTime: 'Son yedek: {time}',

	// Save Version Modal
	modalSaveTitle: 'Sürüm Kaydet',
	modalNotePrefix: 'Not: ',
	modalVersionName: 'Sürüm adı',
	modalVersionNameDescSeq:
		'Boş bırakırsanız otomatik olarak "{label}" atanır.',
	modalVersionNameDescDate:
		'Boş bırakırsanız tarih ve saat etiketi ("{label}") atanır.',
	modalFileNamingName: 'Bu dosya için otomatik isimlendirme',
	modalFileNamingDesc:
		'Sürüm adı boş bırakıldığında ve hızlı kayıtta kullanılacak biçim.',
	modalDescName: 'Açıklama',
	modalDescDesc:
		'İsteğe bağlı olarak bu sürümde neler değiştiğini yazın.',
	modalDescPlaceholder: 'Örn. Giriş bölümü yeniden düzenlendi',
	btnCancel: 'İptal',
	btnSave: 'Kaydet',

	// Restore Confirm Modal
	modalRestoreTitle: 'Eski Haline Dön',
	modalRestorePrefix: '"{name}" notunu ',
	modalRestoreSuffix:
		' ({date}) sürümüne döndürmek istediğinizden emin misiniz?',
	modalRestoreSafetyNote:
		'Güvenliğiniz için mevcut içerik önce sessizce otomatik yedek olarak kaydedilecektir.',
	btnRestore: 'Eski Haline Dön',

	// Delete History Modal
	modalDeleteHistoryTitle: 'Sürüm Geçmişi Silinsin mi?',
	modalDeleteHistorySuffix:
		' silindi. Bu dosyaya ait {count} adet kayıtlı sürüm geçmişi de kalıcı olarak silinsin mi?',
	btnKeepHistory: 'Geçmişi Koru',
	btnDeleteHistory: 'Geçmişi de Sil',

	// Delete Version Modal
	modalDeleteVersionTitle: 'Sürümü Sil',
	modalDeleteVersionMessage:
		'"{label}" sürümü kalıcı olarak silinsin mi? Bu işlem geri alınamaz.',
	btnDelete: 'Sil',
	noticeVersionDeleted: '"{label}" sürümü silindi.',

	// Timeline View
	timelineDisplayText: 'Sürüm Geçmişi',
	timelineEmptyOpenNote: 'Sürüm geçmişini görmek için bir not açın.',
	timelineEmptyNoVersions: 'Bu not için henüz kayıtlı sürüm yok.',
	timelineNoActiveNote: 'Etkin not yok',
	btnQuickSave: 'Hızlı Kaydet',
	btnCompareTwo: '2 Sürüm Karşılaştır',
	btnCancelSelection: 'Seçimi İptal Et',
	labelCurrentVersion: 'Güncel Hal',
	labelSelectedCount: 'Seçilen: {count}/2',
	btnCompareSelected: 'Seçilenleri Karşılaştır',
	autoBackupGroupShow: '{count} otomatik yedek — görmek için tıkla',
	autoBackupGroupHide: '{count} otomatik yedek — gizlemek için tıkla',
	autoBackupCardTitle: 'Oto-yedek • {label}',
	btnCompare: 'Karşılaştır',
	btnExport: 'Dışa Aktar',
	noticeVersionReadError: 'Seçilen sürümün içeriği okunamadı.',
	noticeRestoredTo: 'Not "{label}" sürümüne döndürüldü.',
	noticeExported: 'Sürüm dışa aktarıldı: {fileName}',
	noticeExportError: 'Sürüm dışa aktarılırken bir hata oluştu.',

	// Diff View
	diffTabTitle: '{basename} — Karşılaştırma',
	diffDisplayText: 'Sürüm Karşılaştırma',
	diffEmptySelect: 'Karşılaştırmak için sağ panelden bir sürüm seçin.',
	diffEmptyMissingFile: 'Karşılaştırılan dosya artık kasada bulunmuyor.',
	diffEmptyReadError: 'Seçilen sürümlerden birinin içeriği okunamadı.',
	diffUnknownVersion: 'Bilinmeyen Sürüm',
	diffHeaderTitle:
		'{fileName} — "{leftLabel}" ile "{rightLabel}" Karşılaştırması',
	diffStatChanged: '{count} değişen',
	diffStatRemoved: '{count} silinen',
	diffStatAdded: '{count} eklenen',
	diffLayoutSplit: 'Yan Yana',
	diffLayoutUnified: 'Tek Sütun',
	diffShowUnchanged: 'Değişmeyen bölümleri göster ({count})',
	diffLeftSelectorLabel: 'Sol (Yeni / Güncel):',
	diffRightSelectorLabel: 'Sağ (Eski / Karşılaştırılan):',
	diffSwapLabel: 'Yer Değiştir',
	diffNoDifferences: 'Seçilen iki sürüm arasında hiçbir fark yok.',
	btnCopySnippet: 'Parçayı Kopyala',
	tooltipCopySnippet:
		'Sağ sütundaki "{label}" sürümünden bu bölümü panoya kopyala',
	btnApplySnippet: 'Güncel Dosyaya Al',
	tooltipApplySnippet:
		'Sağ sütundaki "{label}" sürümünden bu bölümü güncel dosyaya al',
	diffSectionAbsentRight: 'Bu bölüm karşılaştırılan sürümde yok',
	diffSectionAbsentLeft: 'Bu bölüm sol taraftaki metinde yok',
	diffStatusChanged: 'Değişti',
	diffStatusRemoved: 'Silindi',
	diffStatusAdded: 'Eklendi',
	diffStatusUnchanged: 'Değişmedi',
	noticeCopiedSnippet: '"{label}" bölüm içeriği panoya kopyalandı.',
	noticeCopyError: 'Bölüm kopyalanamadı.',
	noticeAppliedSnippet:
		'"{title}" bölümü ("{label}") güncel dosyaya alındı.',
	noticeApplyError: 'Bölüm güncel dosyaya alınırken bir hata oluştu.',

	// Markdown sections
	introSectionTitle: 'Giriş / Başlıksız Bölüm',

	// File Explorer Badges
	badgeManualCount: '{count} manuel sürüm',
	badgeAutoCount: '{count} otomatik yedek',
} as const;

export type TranslationKey = keyof typeof tr;
